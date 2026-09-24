import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, LayoutAnimation, Platform, UIManager, Alert, Modal } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useNotifications } from '@/providers/notification-provider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    Bell,
    ChevronLeft,
    ChevronDown,
    ChevronUp,
    Check,
    CheckCheck,
    Trash2,
    Circle,
    CheckCircle2,
    X,
    Sparkles,
    Award,
    Lock,
    Unlock,
    Coins,
    Repeat,
    ArrowDownLeft,
    ArrowUpRight,
    Wallet,
} from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';
import * as Haptics from 'expo-haptics';

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
    const { notifications, markAsRead, markAllAsRead, isLoading, refreshNotifications, deleteNotification, createNotification } = useNotifications();
    const { currentBusiness } = useBusiness();
    const { deviceFont, colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [activeTab, setActiveTab] = useState<'all' | 'savings' | 'books'>('all');
    const [celebrationVault, setCelebrationVault] = useState<{ name: string; target?: number } | null>(null);
    const isSelectionMode = selectedIds.size > 0;

    const isSavingsNotification = (n: any) => {
        const cat = n.data?.category || n.metadata?.category;
        if (cat === 'savings_vault') return true;
        const t = n.type || '';
        return (
            t.startsWith('vault_') ||
            t === 'round_up_stashed' ||
            t === 'scheduled_stash' ||
            t === 'wallet_deposit' ||
            t === 'wallet_cashout' ||
            t === 'transfer_sent' ||
            t === 'transfer_recv' ||
            t === 'money_request' ||
            t === 'pending_transfer'
        );
    };

    const isBooksNotification = (n: any) => !isSavingsNotification(n);

    const filteredNotifications = notifications.filter(n => {
        if (activeTab === 'savings') return isSavingsNotification(n);
        if (activeTab === 'books') return isBooksNotification(n);
        return true;
    });

    const savingsCount = notifications.filter(isSavingsNotification).length;
    const booksCount = notifications.filter(isBooksNotification).length;

    const toggleSelection = (id: string) => {
        if (Platform.OS !== 'web') {
            try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } catch (e) {}
        }
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const handleLongPress = (id: string) => {
        if (Platform.OS !== 'web') {
            try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            } catch (e) {}
        }
        if (!isSelectionMode) {
            const newSet = new Set(selectedIds);
            newSet.add(id);
            setSelectedIds(newSet);
        } else {
            toggleSelection(id);
        }
    };

    const cancelSelection = () => {
        setSelectedIds(new Set());
    };

    const handleBulkDelete = async () => {
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

    const handleMarkAllAsRead = async () => {
        if (notifications.every(n => n.read)) return;
        try {
            await markAllAsRead();
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const toggleExpand = (id: string, read: boolean) => {
        LayoutAnimation.configureNext({ duration: 100, update: { type: LayoutAnimation.Types.easeInEaseOut } });
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

    const handleSendTestNotification = async () => {
        if (Platform.OS !== 'web') {
            try {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (e) {}
        }
        await createNotification({
            title: 'Notifications Active',
            message: 'Your in-app alerts and notifications are working seamlessly.',
            type: 'success',
        });
    };

    const renderItem = ({ item, index }: { item: any, index: number }) => {
        let iconColor = item.color || '#10b981';
        let bgColor = isDark ? 'rgba(16, 185, 129, 0.12)' : '#ecfdf5';
        const titleLower = item.title?.toLowerCase() || '';
        const messageLower = item.message?.toLowerCase() || '';

        if (item.type === 'vault_milestone') {
            iconColor = '#10b981';
            bgColor = isDark ? 'rgba(16, 185, 129, 0.2)' : '#ecfdf5';
        } else if (item.type === 'vault_deposit' || item.type === 'scheduled_stash') {
            iconColor = '#8b5cf6';
            bgColor = isDark ? 'rgba(139, 92, 246, 0.18)' : '#f3e8ff';
        } else if (item.type === 'vault_withdraw' || item.type === 'vault_unlocked') {
            iconColor = '#f59e0b';
            bgColor = isDark ? 'rgba(245, 158, 11, 0.18)' : '#fef3c7';
        } else if (item.type === 'round_up_stashed') {
            iconColor = '#06b6d4';
            bgColor = isDark ? 'rgba(6, 182, 212, 0.18)' : '#cffafe';
        } else if (item.type === 'money_request' || item.type === 'pending_transfer') {
            iconColor = '#6366f1';
            bgColor = isDark ? 'rgba(99, 102, 241, 0.18)' : '#e0e7ff';
        } else if (titleLower.includes('cash in') || messageLower.includes('cash in') ||
            titleLower.includes('received') || messageLower.includes('received')) {
            iconColor = '#10b981';
            bgColor = isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5';
        } else if (titleLower.includes('cash out') || messageLower.includes('cash out') ||
            titleLower.includes('paid') || messageLower.includes('paid')) {
            iconColor = '#ef4444';
            bgColor = isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2';
        }

        const isExpanded = expandedIds.has(item.id);
        const isAnyExpanded = expandedIds.size > 0;
        const shouldBlur = isAnyExpanded && !isExpanded;

        const handleItemPress = () => {
            if (isSelectionMode) {
                toggleSelection(item.id);
                return;
            }

            if (item.type === 'vault_milestone') {
                const is100Pct = item.data?.milestonePercent === 100 || item.title?.includes('100%') || item.title?.includes('Goal Achieved');
                if (is100Pct) {
                    if (Platform.OS !== 'web') {
                        try {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        } catch (e) {}
                    }
                    setCelebrationVault({
                        name: item.data?.vaultName || 'Savings Vault',
                        target: item.data?.targetAmount,
                    });
                }
            }

            toggleExpand(item.id, item.read);
        };

        const renderItemIcon = () => {
            if (isSelectionMode) {
                return selectedIds.has(item.id) ? (
                    <CheckCircle2 size={20} color={colors.primary} />
                ) : (
                    <Circle size={20} color={colors.border} />
                );
            }

            let IconComponent = Bell;
            if (item.type === 'vault_milestone') IconComponent = Award;
            else if (item.type === 'vault_deposit') IconComponent = Lock;
            else if (item.type === 'vault_withdraw' || item.type === 'vault_unlocked') IconComponent = Unlock;
            else if (item.type === 'round_up_stashed') IconComponent = Coins;
            else if (item.type === 'scheduled_stash') IconComponent = Repeat;
            else if (item.type === 'wallet_deposit' || item.type === 'transfer_recv') IconComponent = ArrowDownLeft;
            else if (item.type === 'wallet_cashout' || item.type === 'transfer_sent') IconComponent = ArrowUpRight;
            else if (item.type === 'money_request' || item.type === 'pending_transfer') IconComponent = Wallet;

            return (
                <>
                    <IconComponent size={18} color={iconColor} />
                    {!item.read && <View style={[styles.unreadDot, { borderColor: colors.card }]} />}
                </>
            );
        };

        return (
            <TouchableOpacity
                style={[
                    styles.notificationItem,
                    { backgroundColor: colors.cardGlass, borderBottomColor: colors.borderGlass },
                    !item.read && [styles.unreadItem, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.08)' : '#f0fdf4' }],
                    index === filteredNotifications.length - 1 && styles.lastItem,
                    selectedIds.has(item.id) && [styles.selectedItem, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#dcfce7' }],
                    { overflow: 'hidden' }
                ]}
                onPress={handleItemPress}
                onLongPress={() => handleLongPress(item.id)}
                delayLongPress={500}
                activeOpacity={0.7}
            >
                <View style={[styles.iconContainer, { backgroundColor: isSelectionMode ? (selectedIds.has(item.id) ? (isDark ? 'rgba(16, 185, 129, 0.2)' : '#dcfce7') : colors.card) : bgColor }]}>
                    {renderItemIcon()}
                </View>

                <View style={styles.contentContainer}>
                    <View style={styles.headerRow}>
                        <Text style={[styles.title, { color: colors.text, fontFamily: 'SpaceGrotesk_700Bold' }, !item.read && styles.unreadText]} numberOfLines={1}>
                            {item.title}
                        </Text>
                        <Text style={[styles.time, { color: colors.textSecondary }]}>
                            {(() => {
                                const raw = item.createdAt;
                                if (!raw) return 'Just now';
                                const date = raw?.toDate ? raw.toDate() : new Date(raw);
                                return isNaN(date.getTime()) ? 'Just now' : formatDistanceToNow(date, { addSuffix: true });
                            })()}
                        </Text>
                    </View>

                    <Text
                        style={[styles.message, { color: colors.textSecondary, fontFamily: 'SpaceGrotesk_400Regular' }, isExpanded && styles.messageExpanded]}
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

            <View
                style={[styles.headerContainer, { paddingTop: insets.top + 20 }]}
            >
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.surfaceGlass, borderColor: colors.borderGlass, borderWidth: 1 }]}>
                        <ChevronLeft size={24} color={colors.text} />
                    </TouchableOpacity>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                            onPress={handleMarkAllAsRead}
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
                <Text style={[styles.appName, { color: colors.primary, fontFamily: 'SpaceGrotesk_700Bold' }]}>spndy</Text>
                <Text style={[styles.headerTitle, { fontFamily: 'SpaceGrotesk_700Bold', color: colors.text }]}>{isSelectionMode ? `${selectedIds.size} Selected` : 'Notifications'}</Text>

                {/* Category Filtering Tabs */}
                {!isSelectionMode && (
                    <View style={styles.tabsContainer}>
                        <TouchableOpacity
                            style={[
                                styles.tabPill,
                                { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' },
                                activeTab === 'all' && [styles.activeTabPill, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.16)' : '#ecfdf5', borderColor: '#10b981' }],
                            ]}
                            onPress={() => {
                                if (Platform.OS !== 'web') Haptics.selectionAsync();
                                setActiveTab('all');
                            }}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.tabText, { color: activeTab === 'all' ? '#10b981' : colors.textSecondary }]}>
                                All ({notifications.length})
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.tabPill,
                                { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' },
                                activeTab === 'savings' && [styles.activeTabPill, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.16)' : '#ecfdf5', borderColor: '#10b981' }],
                            ]}
                            onPress={() => {
                                if (Platform.OS !== 'web') Haptics.selectionAsync();
                                setActiveTab('savings');
                            }}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.tabText, { color: activeTab === 'savings' ? '#10b981' : colors.textSecondary }]}>
                                Savings & Vaults ({savingsCount})
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.tabPill,
                                { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' },
                                activeTab === 'books' && [styles.activeTabPill, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.16)' : '#ecfdf5', borderColor: '#10b981' }],
                            ]}
                            onPress={() => {
                                if (Platform.OS !== 'web') Haptics.selectionAsync();
                                setActiveTab('books');
                            }}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.tabText, { color: activeTab === 'books' ? '#10b981' : colors.textSecondary }]}>
                                Books & Ledgers ({booksCount})
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {isSelectionMode && (
                <View style={[styles.selectionBar, { backgroundColor: colors.surfaceGlass, borderColor: colors.borderGlass }]}>
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

            <View
                style={styles.contentArea}
            >
                <View style={[styles.card, { backgroundColor: colors.cardGlass, borderColor: colors.borderGlass }]}>
                    <FlatList
                        data={filteredNotifications}
                        renderItem={renderItem}
                        keyExtractor={(item) => item.id}
                        extraData={expandedIds}
                        removeClippedSubviews={true}
                        initialNumToRender={10}
                        maxToRenderPerBatch={10}
                        windowSize={5}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl refreshing={isLoading} onRefresh={refreshNotifications} tintColor={colors.primary} />
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <View style={[styles.emptyIconContainer, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#f0fdf4' }]}>
                                    <Bell size={28} color={colors.primary} />
                                </View>
                                <Text style={[styles.emptyTitle, { color: colors.text, fontFamily: 'SpaceGrotesk_700Bold' }]}>
                                    {activeTab === 'savings' ? 'No savings telemetry yet' : 'No notifications yet'}
                                </Text>
                                <Text style={[styles.emptyMessage, { color: colors.textSecondary, fontFamily: 'SpaceGrotesk_400Regular' }]}>
                                    {activeTab === 'savings'
                                        ? 'Vault allocations, milestone achievements, and round-up stashes will appear here.'
                                        : "You'll see activity, updates, and balance alerts here."}
                                </Text>
                                <TouchableOpacity
                                    style={[styles.testNotifBtn, { backgroundColor: colors.primary }]}
                                    onPress={handleSendTestNotification}
                                    activeOpacity={0.85}
                                >
                                    <Sparkles size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                                    <Text style={[styles.testNotifBtnText, { fontFamily: 'SpaceGrotesk_700Bold' }]}>
                                        Send Test Notification
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        }
                    />
                </View>
            </View>

            {/* Milestone Celebration Modal */}
            {celebrationVault && (
                <Modal
                    visible={!!celebrationVault}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setCelebrationVault(null)}
                >
                    <View style={styles.modalBackdrop}>
                        <View style={[styles.celebrationCard, { backgroundColor: isDark ? '#090e0d' : '#ffffff', borderColor: '#10b981' }]}>
                            <View style={styles.celebrationIconDisc}>
                                <Award size={36} color="#10b981" />
                            </View>
                            <Text style={styles.celebrationBadgeText}>
                                100% TARGET REACHED
                            </Text>
                            <Text style={[styles.celebrationTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
                                Goal Achieved
                            </Text>
                            <Text style={[styles.celebrationMessage, { color: colors.textSecondary }]}>
                                Vault "{celebrationVault.name}" has reached 100% of its funding goal.
                            </Text>
                            <View style={styles.celebrationActions}>
                                <TouchableOpacity
                                    style={styles.celebrationPrimaryBtn}
                                    onPress={() => {
                                        setCelebrationVault(null);
                                        router.push('/(tabs)');
                                    }}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.celebrationPrimaryBtnText}>Inspect Vault Chamber</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.celebrationSecondaryBtn}
                                    onPress={() => setCelebrationVault(null)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={[styles.celebrationSecondaryBtnText, { color: colors.textSecondary }]}>Dismiss</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            )}
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
        fontFamily: 'SpaceGrotesk_700Bold',
        color: '#10b981',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginBottom: 8,
    },
    headerTitle: {
        fontFamily: 'SpaceGrotesk_700Bold',
        fontSize: 32,
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
        fontFamily: 'SpaceGrotesk_600SemiBold',
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
        fontFamily: 'SpaceGrotesk_600SemiBold',
        color: '#1e293b',
        flex: 1,
        marginRight: 8,
    },
    unreadText: {
        color: '#0f172a',
        fontWeight: '700',
        fontFamily: 'SpaceGrotesk_700Bold',
    },
    time: {
        fontSize: 11,
        color: '#94a3b8',
        fontWeight: '500',
        fontFamily: 'SpaceGrotesk_500Medium',
    },
    message: {
        fontSize: 13,
        color: '#64748b',
        lineHeight: 18,
        fontFamily: 'SpaceGrotesk_400Regular',
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
        fontFamily: 'SpaceGrotesk_600SemiBold',
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
        fontFamily: 'SpaceGrotesk_700Bold',
        color: '#0f172a',
        marginBottom: 4,
    },
    emptyMessage: {
        fontSize: 14,
        color: '#64748b',
        textAlign: 'center',
        marginBottom: 18,
        fontFamily: 'SpaceGrotesk_400Regular',
    },
    testNotifBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 14,
        marginTop: 6,
    },
    testNotifBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontFamily: 'SpaceGrotesk_700Bold',
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
        fontFamily: 'SpaceGrotesk_600SemiBold',
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
        fontFamily: 'SpaceGrotesk_600SemiBold',
        color: '#10b981',
    },
    deleteAction: {

    },
    deleteActionText: {
        color: '#ef4444',
    },
    // Category Tabs
    tabsContainer: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 14,
    },
    tabPill: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
    },
    activeTabPill: {},
    tabText: {
        fontSize: 12,
        fontWeight: '600',
        fontFamily: 'SpaceGrotesk_600SemiBold',
    },
    // Celebration Modal
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    celebrationCard: {
        width: '100%',
        maxWidth: 360,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1.5,
        shadowColor: '#10b981',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 24,
        elevation: 16,
    },
    celebrationIconDisc: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: 'rgba(16, 185, 129, 0.18)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(16, 185, 129, 0.4)',
        marginBottom: 16,
    },
    celebrationBadgeText: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1.2,
        marginBottom: 6,
        color: '#10b981',
        fontFamily: 'SpaceGrotesk_700Bold',
    },
    celebrationTitle: {
        fontSize: 22,
        fontWeight: '800',
        marginBottom: 8,
        textAlign: 'center',
        fontFamily: 'SpaceGrotesk_700Bold',
    },
    celebrationMessage: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 18,
        marginBottom: 24,
        paddingHorizontal: 12,
        fontFamily: 'SpaceGrotesk_400Regular',
    },
    celebrationActions: {
        width: '100%',
        gap: 10,
    },
    celebrationPrimaryBtn: {
        backgroundColor: '#10b981',
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
    },
    celebrationPrimaryBtnText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '700',
        fontFamily: 'SpaceGrotesk_700Bold',
    },
    celebrationSecondaryBtn: {
        paddingVertical: 10,
        alignItems: 'center',
    },
    celebrationSecondaryBtnText: {
        fontSize: 13,
        fontWeight: '600',
        fontFamily: 'SpaceGrotesk_600SemiBold',
    },
});
