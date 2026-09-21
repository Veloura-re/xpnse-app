import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from './auth-provider';
import { db } from '@/config/firebase';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, arrayUnion, getDoc, writeBatch, limit, addDoc } from 'firebase/firestore';
import { Alert, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { PushNotificationService } from '@/services/push-notification-service';

// Configure how notifications are handled when app is in foreground
// Only configure on native platforms (iOS/Android), not on web
if (Platform.OS !== 'web') {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
            priority: Notifications.AndroidNotificationPriority.MAX,
        }),
    });
}

import { NotificationType } from '@/types';

export interface Notification {
    id: string;
    userId: string;
    title: string;
    message: string;
    read: boolean;
    createdAt: any;
    type?: NotificationType;
    data?: any; // For navigation
    metadata?: any;
    color?: string;
    deleted?: boolean;
}

interface NotificationState {
    notifications: Notification[];
    unreadCount: number;
    markAsRead: (notificationId: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    expoPushToken: string | null;
    sendLocalNotification: (
        title: string, 
        body: string, 
        data?: any, 
        color?: string,
        channelId?: string,
        subtitle?: string
    ) => Promise<void>;
    createNotification: (notifData: {
        userId?: string;
        title: string;
        message: string;
        type?: NotificationType;
        data?: any;
        metadata?: any;
        color?: string;
    }) => Promise<void>;
    deleteNotification: (notificationId: string) => Promise<void>;
    isLoading: boolean;
    refreshNotifications: () => Promise<void>;
    // Dynamic Island toast
    toastNotification: Notification | null;
    clearToast: () => void;
}

export const [NotificationProvider, useNotifications] = createContextHook((): NotificationState => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
    const [toastNotification, setToastNotification] = useState<Notification | null>(null);
    const notificationListener = useRef<Notifications.Subscription | undefined>(undefined);
    const responseListener = useRef<Notifications.Subscription | undefined>(undefined);

    const clearToast = () => setToastNotification(null);

    // Register for push notifications when user logs in (Native only)
    useEffect(() => {
        if (!user || Platform.OS === 'web') return;

        registerForPushNotificationsAsync().then(async (token) => {
            if (token && db && user.id) {
                setExpoPushToken(token);
                // Save token to user document
                try {
                    const userRef = doc(db, 'users', user.id);
                    await updateDoc(userRef, {
                        pushToken: token, // Keep for backward compatibility
                        pushTokens: arrayUnion(token), // Support multiple devices
                        pushTokenUpdatedAt: new Date().toISOString(),
                    });
                } catch (err) {
                    console.error('Error saving push token:', err);
                }
            }
        });

        // Handle cold-start notification response if the app was launched from a notification
        Notifications.getLastNotificationResponseAsync().then((response) => {
            if (response) {
                const data = response.notification.request.content.data;
                if (data && data.bookId) {
                    router.push(`/book/${data.bookId}`);
                } else if (data && data.path) {
                    router.push(data.path as any);
                }
            }
        });

        // Listen for notifications received while app is foregrounded
        notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
            // Notification received
        });

        // Listen for user interactions with notifications
        responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
            const data = response.notification.request.content.data;
            if (data && data.bookId) {
                // Navigate to the book
                router.push(`/book/${data.bookId}`);
            } else if (data && data.path) {
                // Generic path navigation support
                router.push(data.path as any);
            }
        });

        return () => {
            if (notificationListener.current) {
                notificationListener.current.remove();
            }
            if (responseListener.current) {
                responseListener.current.remove();
            }
        };
    }, [user]);

    const markAsRead = async (notificationId: string) => {
        if (!db) return;
        try {
            const notifRef = doc(db, 'notifications', notificationId);
            await updateDoc(notifRef, { read: true });
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const markAllAsRead = async () => {
        if (!db || !user) return;
        const unread = notifications.filter(n => !n.read);
        if (unread.length === 0) return;

        try {
            const batch = writeBatch(db);
            unread.forEach(notif => {
                if (db) {
                    const notifRef = doc(db, 'notifications', notif.id);
                    batch.update(notifRef, { read: true });
                }
            });
            await batch.commit();
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const deleteNotification = async (notificationId: string) => {
        if (!db) return;
        try {
            // Soft delete
            await updateDoc(doc(db, 'notifications', notificationId), { deleted: true });

            // Optimistic update
            setNotifications(prev => prev.filter(n => n.id !== notificationId));
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    };

    const refreshNotifications = async () => {
        setIsLoading(true);
        setTimeout(() => setIsLoading(false), 100);
    };

    const sendLocalNotification = async (
        title: string, 
        body: string, 
        data?: any, 
        color?: string,
        channelId?: string,
        subtitle?: string
    ) => {
        // Trigger Dynamic Island toast immediately
        setToastNotification({
            id: Date.now().toString(),
            userId: user?.id || '',
            title,
            message: body,
            read: false,
            createdAt: new Date().toISOString(),
            data,
            color,
        });

        if (Platform.OS === 'web') {
            return;
        }

        try {
            const resolvedChannelId = channelId || 'transactions';
            await Notifications.scheduleNotificationAsync({
                content: {
                    title,
                    subtitle,
                    body,
                    data: data || {},
                    sound: 'default',
                    color: color || '#10b981',
                    priority: Notifications.AndroidNotificationPriority.MAX,
                    vibrate: [0, 250, 250, 250],
                    badge: 1,
                },
                trigger: Platform.OS === 'android' ? { channelId: resolvedChannelId } : null,
            });
        } catch (e) {
            console.warn('Could not schedule native notification:', e);
        }
    };

    const createNotification = async (notifData: {
        userId?: string;
        title: string;
        message: string;
        type?: NotificationType;
        data?: any;
        metadata?: any;
        color?: string;
    }) => {
        const targetUserId = notifData.userId || user?.id;
        if (!targetUserId || !db) return;

        const newNotif = {
            userId: targetUserId,
            title: notifData.title,
            message: notifData.message,
            read: false,
            createdAt: new Date().toISOString(),
            type: notifData.type || 'info',
            data: notifData.data || {},
            metadata: notifData.metadata || {},
            color: notifData.color || '#10b981',
        };

        try {
            const docRef = await addDoc(collection(db, 'notifications'), newNotif);
            if (targetUserId === user?.id) {
                setToastNotification({ id: docRef.id, ...newNotif });
            }

            // Dispatch push notification to recipient device via Expo push service
            // so device receives notification even when unopened or in background
            const pushData = {
                ...(notifData.data || {}),
                ...(notifData.metadata || {}),
                notificationId: docRef.id,
            };
            PushNotificationService.sendToUser(targetUserId, {
                title: notifData.title,
                body: notifData.message,
                data: pushData,
                channelId: 'transactions',
                color: notifData.color || '#10b981',
            }).catch((pushErr) => {
                console.warn('Push notification delivery fallback:', pushErr);
            });
        } catch (err) {
            console.error('Error creating notification:', err);
        }
    };

    useEffect(() => {
        if (!user || !db) {
            setNotifications([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);

        // Resilient single-field query avoiding composite index requirements
        const q = query(
            collection(db, 'notifications'),
            where('userId', '==', user.id),
            limit(100)
        );

        let isInitialLoad = true;

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const newNotifications: Notification[] = [];
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    if (!data.deleted) {
                        newNotifications.push({ id: doc.id, ...data } as Notification);
                    }
                });

                // In-memory sorting for instant, error-free results
                newNotifications.sort((a, b) => {
                    const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
                    const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
                    return timeB - timeA;
                });

                setNotifications(newNotifications);

                if (!isInitialLoad) {
                    snapshot.docChanges().forEach((change) => {
                        if (change.type === 'added') {
                            const notif = { id: change.doc.id, ...change.doc.data() } as Notification;
                            if (!notif.read) {
                                setToastNotification(notif);
                                const payload = notif.data || notif.metadata || {};
                                sendLocalNotification(
                                    notif.title || 'Notification',
                                    notif.message,
                                    payload,
                                    notif.color
                                );
                            }
                        }
                    });
                }

                isInitialLoad = false;
                setIsLoading(false);
            },
            (error) => {
                console.error('Firestore notifications listener error:', error);
                setIsLoading(false);
            }
        );

        // Update lastActiveAt periodically while app is active
        const activityInterval = setInterval(() => {
            if (db && user.id) {
                updateDoc(doc(db, 'users', user.id), {
                    lastActiveAt: new Date().toISOString()
                }).catch(() => { });
            }
        }, 30000);

        return () => {
            unsubscribe();
            clearInterval(activityInterval);
        };
    }, [user]);

    const unreadCount = notifications.filter(n => !n.read).length;

    return {
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        expoPushToken,
        sendLocalNotification,
        createNotification,
        deleteNotification,
        isLoading,
        refreshNotifications,
        toastNotification,
        clearToast,
    };
});

async function registerForPushNotificationsAsync() {
    if (Platform.OS === 'web') {
        return null;
    }

    let token;

    if (Platform.OS === 'android') {
        // Dedicated high-priority channel for financial transactions
        await Notifications.setNotificationChannelAsync('transactions', {
            name: 'Transactions',
            description: 'Alerts for cash in, cash out, and balance updates',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#10b981',
            showBadge: true,
            sound: 'default',
            enableVibrate: true,
            enableLights: true,
            lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
            bypassDnd: false,
        });

        // Channel for workspace, book, and team management updates
        await Notifications.setNotificationChannelAsync('business_updates', {
            name: 'Workspace & Books',
            description: 'Updates when books, team members, or businesses change',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 200, 150, 200],
            lightColor: '#10b981',
            showBadge: true,
            sound: 'default',
            enableVibrate: true,
            enableLights: true,
            lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
            bypassDnd: false,
        });

        // Fallback general channel
        await Notifications.setNotificationChannelAsync('default', {
            name: 'General Alerts',
            description: 'General notifications and updates',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#10b981',
            showBadge: true,
            sound: 'default',
            enableVibrate: true,
            enableLights: true,
            lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
            bypassDnd: false,
        });
    }

    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            // Permission not granted for push notifications
            Alert.alert(
                'Enable Notifications',
                'To get notified about new entries, books, and team updates, please enable notifications in your device settings.',
                [{ text: 'OK' }]
            );
            return null;
        }

        try {
            const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
            if (!projectId) {
                console.error('❌ Project ID not found');
                return null;
            }

            token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        } catch (e) {
            console.error('❌ Error getting push token:', e);
            return null;
        }
    } else {
        // Must use physical device for push notifications
    }

    return token;
}
