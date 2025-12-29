import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from './auth-provider';
import { db } from '@/config/firebase';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc } from 'firebase/firestore';
import { Alert, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { router } from 'expo-router';

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
        }),
    });
}

export interface Notification {
    id: string;
    userId: string;
    title: string;
    message: string;
    read: boolean;
    createdAt: any;
    type?: 'info' | 'warning' | 'error' | 'success' | 'entry_added' | 'book_created';
    data?: any; // For navigation
    metadata?: any;
    color?: string;
}

interface NotificationState {
    notifications: Notification[];
    unreadCount: number;
    markAsRead: (notificationId: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    expoPushToken: string | null;
    sendLocalNotification: (title: string, body: string, data?: any, color?: string) => Promise<void>;
    deleteNotification: (notificationId: string) => Promise<void>;
    isLoading: boolean;
    refreshNotifications: () => Promise<void>;
}

export const [NotificationProvider, useNotifications] = createContextHook((): NotificationState => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
    const notificationListener = useRef<Notifications.Subscription | undefined>(undefined);
    const responseListener = useRef<Notifications.Subscription | undefined>(undefined);

    // Register for push notifications when user logs in
    useEffect(() => {
        if (!user) return;

        registerForPushNotificationsAsync().then(token => {
            if (token && db && user.id) {
                setExpoPushToken(token);
                // Save token to user document
                updateDoc(doc(db, 'users', user.id), {
                    pushToken: token,
                    pushTokenUpdatedAt: new Date().toISOString(),
                }).catch(err => console.error('Error saving push token:', err));
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
            // Removed default redirect to prevent unwanted navigation on some devices
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
        for (const notif of unread) {
            await markAsRead(notif.id);
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

    const sendLocalNotification = async (title: string, body: string, data?: any, color?: string) => {
        if (Platform.OS === 'web') {
            console.log('🔔 Web Notification:', { title, body, color });
            return;
        }

        await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                data,
                sound: true,
                color: color, // Android only
            },
            trigger: null, // Send immediately
        });
    };

    useEffect(() => {
        if (!user || !db) {
            setNotifications([]);
            return;
        }

        const q = query(
            collection(db, 'notifications'),
            where('userId', '==', user.id),
            orderBy('createdAt', 'desc')
        );

        // Track if this is the initial load
        let isInitialLoad = true;

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newNotifications: Notification[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                if (!data.deleted) {
                    newNotifications.push({ id: doc.id, ...data } as Notification);
                }
            });

            setNotifications(newNotifications);

            // Only send push notifications for new notifications AFTER initial load
            // This prevents old notifications from showing when user logs in
            if (!isInitialLoad) {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        const notif = change.doc.data() as Notification;
                        // Determine if we should show a local notification
                        // Don't show if it's just marked as read update
                        if (!notif.read) {
                            // Send actual push notification
                            // Use metadata as data payload if available
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

            // After first snapshot, all future changes are real-time updates
            isInitialLoad = false;
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const unreadCount = notifications.filter(n => !n.read).length;

    return {
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        expoPushToken,
        sendLocalNotification,
        deleteNotification,
        isLoading,
        refreshNotifications,
    };
});

async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#10b981',
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
