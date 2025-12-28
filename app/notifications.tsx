import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, LayoutAnimation, Platform, UIManager, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useNotifications } from '@/providers/notification-provider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, ChevronLeft, ChevronDown, ChevronUp, Check, CheckCheck, Trash2, Circle, CheckCircle2, X } from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';
import Animated, { FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { getFontFamily } from '@/config/font-config';
import { useBusiness } from '@/providers/business-provider';
import { useTheme } from '@/providers/theme-provider';

if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

export default function NotificationsScreen() {
    const { notifications, markAsRead, markAllAsRead, isLoading, refreshNotifications, deleteNotification } = useNotifications();
    const { currentBusiness } = useBusiness();
    const { deviceFont, colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const isSelectionMode = selectedIds.size > 0;

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const handleLongPress = (id: string) => {
        if (!isSelectionMode) {
            const newSet = new Set(selectedIds);
            newSet.add(id);
            setSelectedIds(newSet);
        }
    };

    const cancelSelection = () => {
        setSelectedIds(new Set());
    };

    const handleBulkDelete = async () => {
        // Optimistic UI updates could be tricky with multiple async calls, 
        // but existing deleteNotification is fast.
        for (const id of selectedIds) {
            deleteNotification(id);
        }
        setSelectedIds(new Set());
    };

    const handleBulkRead = async () => {
        for (const id of selectedIds) {
            markAsRead(id);
        }
        setSelectedIds(new Set());
    };

    const handleClearAll = () => {
        if (notifications.length === 0) return;

        Alert.alert(
            'Clear All Notifications',
            `Are you sure you want to delete all ${notifications.length} notification${notifications.length === 1 ? '' : 's'}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear All',
                    style: 'destructive',
                    onPress: () => {
                        notifications.forEach(notification => {
                            deleteNotification(notification.id);
                        });
                    }
                }
            ]
        );
    };

    const toggleExpand = (id: string, read: boolean) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });

        if (!read) {
            markAsRead(id);
        }
    };

    const renderItem = ({ item, index }: { item: any, index: number }) => {
        let iconColor = item.color || '#10b981';
        let bgColor = 'rgba(16, 185, 129, 0.05)'; // Default emerald bg
        const titleLower = item.title?.toLowerCase() || '';
        const messageLower = item.message?.toLowerCase() || '';

        if (titleLower.includes('cash in') || messageLower.includes('cash in') ||
            titleLower.includes('received') || messageLower.includes('received')) {
            iconColor = '#10b981'; // Green
            bgColor = '#ecfdf5';
        } else if (titleLower.includes('cash out') || messageLower.includes('cash out') ||
            titleLower.includes('paid') || messageLower.includes('paid')) {
            iconColor = '#ef4444'; // Red
            bgColor = '#fef2f2';
        }

        const isExpanded = expandedIds.has(item.id);
        const isAnyExpanded = expandedIds.size > 0;
        const shouldBlur = isAnyExpanded && !isExpanded;

        return (
            <TouchableOpacity
                style={[
                    styles.notificationItem,
                    { backgroundColor: colors.card, borderBottomColor: colors.border },
                    !item.read && [styles.unreadItem, { backgroundColor: isDark ? colors.surface : '#f8fafc' }],
                    index === notifications.length - 1 && styles.lastItem,
                    selectedIds.has(item.id) && [styles.selectedItem, { backgroundColor: isDark ? colors.surface : '#f8fafc' }],
                    { overflow: 'hidden' } // Ensure blur stays within bounds
                ]}
                onPress={() => isSelectionMode ? toggleSelection(item.id) : toggleExpand(item.id, item.read)}
                onLongPress={() => handleLongPress(item.id)}
                activeOpacity={0.7}
            >
                <View style={[styles.iconContainer, { backgroundColor: isSelectionMode ? (selectedIds.has(item.id) ? (isDark ? 'rgba(16, 185, 129, 0.1)' : '#f0fdf4') : colors.card) : bgColor }]}>
                    {isSelectionMode ? (
                        selectedIds.has(item.id) ? (
                            <CheckCircle2 size={20} color={colors.primary} />
                        ) : (
                            <Circle size={20} color={colors.border} />
                        )
                    ) : (
                        <>
                            <Bell size={18} color={iconColor} />
                            {!item.read && <View style={[styles.unreadDot, { borderColor: colors.card }]} />}
                        </>
                    )}
                </View>

                <View style={styles.contentContainer}>
                    <View style={styles.headerRow}>
                        <Text style={[styles.title, { color: colors.text }, !item.read && styles.unreadText]} numberOfLines={1}>
                            {item.title}
                        </Text>
                        <Text style={[styles.time, { color: colors.textSecondary }]}>
                            {item.createdAt ? formatDistanceToNow(new Date(item.createdAt), { addSuffix: true }) : 'Just now'}
                        </Text>
                    </View>

                    <Text
                        style={[styles.message, { color: colors.textSecondary }, isExpanded && styles.messageExpanded]}
                        numberOfLines={isExpanded ? undefined : 2}
                    >
                        {item.message}
                    </Text>

                    {isExpanded && (
                        <TouchableOpacity
                            style={[styles.deleteButton, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#fee2e2' }]}
                            onPress={() => deleteNotification(item.id)}
                        >
                            <Trash2 size={14} color="#ef4444" />
                            <Text style={styles.deleteText}>Delete</Text>
                        </TouchableOpacity>
                    )}

                </View>

                <View style={styles.chevronContainer}>
                    {isExpanded ? (
                        <ChevronUp size={16} color={colors.textSecondary} />
                    ) : (
                        <ChevronDown size={16} color={colors.textSecondary} />
                    )}
                </View>

                {shouldBlur && (
                    <View
                        style={[StyleSheet.absoluteFill, { zIndex: 10, backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.8)' }]}
                    />
                )}
            </TouchableOpacity >
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={[styles.circle1, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.05)' : 'rgba(16, 185, 129, 0.1)' }]} />
            <View style={[styles.circle2, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.03)' : 'rgba(16, 185, 129, 0.08)' }]} />

            <Animated.View
                entering={FadeIn.delay(100).duration(200)}
                style={[styles.headerContainer, { paddingTop: insets.top + 20 }]}
            >
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.card }]}>
                        <ChevronLeft size={24} color={colors.text} />
                    </TouchableOpacity>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                            onPress={markAllAsRead}
                            style={[styles.markAllButton, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#f0fdf4' }]}
                            activeOpacity={0.7}
                        >
                            <CheckCheck size={16} color={colors.primary} style={{ marginRight: 4 }} />
                            <Text style={[styles.markAllText, { color: colors.primary }]}>Mark all read</Text>
                        </TouchableOpacity>
                        {notifications.length > 0 && (
                            <TouchableOpacity
                                onPress={handleClearAll}
                                style={[styles.clearAllButton, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2', borderColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fecaca' }]}
                                activeOpacity={0.7}
                            >
                                <Trash2 size={16} color="#ef4444" style={{ marginRight: 4 }} />
                                <Text style={styles.clearAllText}>Clear all</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
                <Text style={[styles.appName, { color: colors.primary }]}>Dashboard</Text>
                <Text style={[styles.headerTitle, { fontFamily: getFontFamily(deviceFont), color: colors.text }]}>{isSelectionMode ? `${selectedIds.size} Selected` : 'Notifications'}</Text>
            </Animated.View>

            {isSelectionMode && (
                <View style={[styles.selectionBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <TouchableOpacity onPress={handleBulkRead} style={styles.actionButton}>
                        <CheckCheck size={20} color={colors.primary} />
                        <Text style={[styles.actionText, { color: colors.primary }]}>Mark Read</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleBulkDelete} style={[styles.actionButton, styles.deleteAction]}>
                        <Trash2 size={20} color="#ef4444" />
                        <Text style={[styles.actionText, styles.deleteActionText]}>Delete</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={cancelSelection} style={styles.actionButton}>
                        <X size={20} color={colors.textSecondary} />
                        <Text style={[styles.actionText, { color: colors.textSecondary }]}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            )}

            <Animated.View
                entering={FadeIn.delay(200).duration(200)}
                style={styles.contentArea}
            >
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <FlatList
                        data={notifications}
                        renderItem={renderItem}
                        keyExtractor={(item) => item.id}
                        extraData={expandedIds}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl refreshing={isLoading} onRefresh={refreshNotifications} tintColor={colors.primary} />
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <View style={[styles.emptyIconContainer, { backgroundColor: colors.surface }]}>
                                    <Bell size={24} color={colors.textSecondary} />
                                </View>
                                <Text style={[styles.emptyTitle, { color: colors.text }]}>No notifications</Text>
                                <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>You're all caught up!</Text>
                            </View>
                        }
                    />
                </View>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        overflow: 'hidden',
    },
    circle1: {
        position: 'absolute',
        top: -50,
        right: -50,
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
    },
    circle2: {
        position: 'absolute',
        bottom: -100,
        left: -50,
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: 'rgba(16, 185, 129, 0.08)',
    },
    headerContainer: {
        paddingHorizontal: 24,
        paddingBottom: 20,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    appName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#10b981',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginBottom: 8,
    },
    headerTitle: {
        fontFamily: 'AbrilFatface_400Regular',
        fontSize: 36,
        color: '#0f172a',
    },
    markAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0fdf4',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
    },
    markAllText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#10b981',
    },
    contentArea: {
        flex: 1,
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    card: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    listContent: {
        padding: 0,
    },
    notificationItem: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    lastItem: {
        borderBottomWidth: 0,
    },
    unreadItem: {
        backgroundColor: '#f8fafc',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
        position: 'relative',
    },
    unreadDot: {
        position: 'absolute',
        top: -2,
        right: -2,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#ef4444',
        borderWidth: 1.5,
        borderColor: '#fff',
    },
    contentContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    title: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1e293b',
        flex: 1,
        marginRight: 8,
    },
    unreadText: {
        color: '#0f172a',
        fontWeight: '700',
    },
    time: {
        fontSize: 11,
        color: '#94a3b8',
        fontWeight: '500',
    },
    message: {
        fontSize: 13,
        color: '#64748b',
        lineHeight: 18,
    },
    messageExpanded: {
        color: '#334155',
        marginTop: 4,
    },
    chevronContainer: {
        justifyContent: 'center',
        paddingLeft: 8,
    },
    clearAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fef2f2',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#fecaca',
    },
    clearAllText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#ef4444',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 100,
        paddingBottom: 40,
    },
    emptyIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#0f172a',
        marginBottom: 4,
    },
    emptyMessage: {
        fontSize: 14,
        color: '#64748b',
        textAlign: 'center',
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        alignSelf: 'flex-start',
        backgroundColor: '#fee2e2',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
    },
    deleteText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#ef4444',
        marginLeft: 6,
    },
    selectedItem: {
        backgroundColor: '#f8fafc',
    },
    selectionBar: {
        position: 'absolute',
        bottom: 24,
        left: 24,
        right: 24,
        backgroundColor: '#fff',
        borderRadius: 16,
        flexDirection: 'row',
        padding: 8,
        justifyContent: 'space-around',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
        zIndex: 100,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    actionButton: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 8,
        gap: 4,
    },
    actionText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#10b981',
    },
    deleteAction: {

    },
    deleteActionText: {
        color: '#ef4444',
    },
});
