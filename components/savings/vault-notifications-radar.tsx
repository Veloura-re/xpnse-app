import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  Activity,
  ChevronDown,
  ChevronUp,
  Award,
  Lock,
  Unlock,
  Coins,
  Repeat,
  ArrowDownLeft,
  ArrowUpRight,
  ExternalLink,
  Check,
  Bell,
} from 'lucide-react-native';
import { useTheme } from '@/providers/theme-provider';
import { useNotifications, Notification } from '@/providers/notification-provider';

interface VaultNotificationsRadarProps {
  businessId: string;
}

export const VaultNotificationsRadar: React.FC<VaultNotificationsRadarProps> = ({
  businessId,
}) => {
  const { colors, isDark } = useTheme();
  const { notifications, markAsRead } = useNotifications();
  const [expanded, setExpanded] = useState(false);

  // Radar Pulse Animation
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.8);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withTiming(2.2, { duration: 1800, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 200 }),
        withTiming(0, { duration: 1600, easing: Easing.out(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  // Filter for savings & vault events
  const vaultNotifications = notifications.filter((n) => {
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
  });

  const unreadVaultEvents = vaultNotifications.filter((n) => !n.read);
  const latestEvent = vaultNotifications[0] || null;

  const toggleExpanded = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setExpanded(!expanded);
  };

  const getEventIcon = (type?: Notification['type']) => {
    switch (type) {
      case 'vault_milestone':
        return <Award size={14} color="#10b981" strokeWidth={2.4} />;
      case 'vault_deposit':
        return <Lock size={14} color="#8b5cf6" strokeWidth={2.4} />;
      case 'vault_withdraw':
      case 'vault_unlocked':
        return <Unlock size={14} color="#f59e0b" strokeWidth={2.4} />;
      case 'round_up_stashed':
        return <Coins size={14} color="#06b6d4" strokeWidth={2.4} />;
      case 'scheduled_stash':
        return <Repeat size={14} color="#8b5cf6" strokeWidth={2.4} />;
      case 'wallet_deposit':
        return <ArrowDownLeft size={14} color="#10b981" strokeWidth={2.4} />;
      case 'wallet_cashout':
        return <ArrowUpRight size={14} color="#f59e0b" strokeWidth={2.4} />;
      case 'transfer_sent':
        return <ArrowUpRight size={14} color="#6366f1" strokeWidth={2.4} />;
      case 'transfer_recv':
        return <ArrowDownLeft size={14} color="#10b981" strokeWidth={2.4} />;
      default:
        return <Activity size={14} color="#10b981" strokeWidth={2.4} />;
    }
  };

  const formatTimeAgo = (dateStr?: string) => {
    if (!dateStr) return 'Just now';
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <Animated.View
      layout={LinearTransition.duration(260)}
      style={[
        styles.container,
        {
          backgroundColor: isDark ? '#080d0c' : colors.card,
          borderColor: isDark ? 'rgba(16, 185, 129, 0.22)' : 'rgba(16, 185, 129, 0.3)',
        },
      ]}
    >
      <LinearGradient
        colors={['rgba(16, 185, 129, 0.16)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.topRim}
      />

      {/* Header & Status Bar */}
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={toggleExpanded}
        style={styles.headerBar}
      >
        <View style={styles.headerLeft}>
          {/* Radar Beacon Ring */}
          <View style={styles.beaconContainer}>
            <Animated.View style={[styles.beaconWave, pulseAnimatedStyle]} />
            <View style={styles.beaconCore} />
          </View>

          <View style={styles.titleColumn}>
            <View style={styles.titleRow}>
              <Text style={[styles.titleLabel, { color: isDark ? '#f1f5f9' : colors.text }]}>
                VAULT TELEMETRY RADAR
              </Text>
              {unreadVaultEvents.length > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>
                    {unreadVaultEvents.length} NEW
                  </Text>
                </View>
              )}
            </View>

            <Text
              style={[styles.statusSubtitle, { color: isDark ? '#6ee7b7' : '#059669' }]}
              numberOfLines={1}
            >
              {latestEvent ? latestEvent.title : 'All vaults synced and monitored'}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <View
            style={[
              styles.chevronCircle,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' },
            ]}
          >
            {expanded ? (
              <ChevronUp size={16} color={colors.textSecondary} />
            ) : (
              <ChevronDown size={16} color={colors.textSecondary} />
            )}
          </View>
        </View>
      </TouchableOpacity>

      {/* Expandable Activity Drawer */}
      {expanded && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={styles.drawerBody}
        >
          <View style={styles.drawerDivider} />

          {vaultNotifications.length === 0 ? (
            <View style={styles.emptyFeed}>
              <Bell size={20} color="#64748b" />
              <Text style={styles.emptyFeedText}>
                Telemetry radar listening for deposits, milestones, and spare change stashes.
              </Text>
            </View>
          ) : (
            <View style={styles.feedList}>
              {vaultNotifications.slice(0, 4).map((item) => (
                <View
                  key={item.id}
                  style={[
                    styles.feedItem,
                    {
                      backgroundColor: isDark
                        ? item.read
                          ? 'rgba(255,255,255,0.02)'
                          : 'rgba(16, 185, 129, 0.08)'
                        : item.read
                        ? 'rgba(0,0,0,0.02)'
                        : 'rgba(16, 185, 129, 0.06)',
                      borderColor: item.read
                        ? 'rgba(255,255,255,0.04)'
                        : 'rgba(16, 185, 129, 0.25)',
                    },
                  ]}
                >
                  <View style={styles.itemIconContainer}>
                    {getEventIcon(item.type)}
                  </View>

                  <View style={styles.itemContent}>
                    <View style={styles.itemHeader}>
                      <Text
                        style={[
                          styles.itemTitle,
                          { color: isDark ? '#f8fafc' : colors.text },
                        ]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      <Text style={styles.itemTime}>
                        {formatTimeAgo(item.createdAt)}
                      </Text>
                    </View>

                    <Text
                      style={[styles.itemMessage, { color: colors.textSecondary }]}
                      numberOfLines={2}
                    >
                      {item.message}
                    </Text>
                  </View>

                  {!item.read && (
                    <TouchableOpacity
                      onPress={() => markAsRead(item.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={styles.checkButton}
                    >
                      <Check size={12} color="#10b981" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Action Footer */}
          <View style={styles.drawerFooter}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/notifications')}
              style={styles.fullHubButton}
            >
              <Text style={styles.fullHubButtonText}>Open Notifications Hub</Text>
              <ExternalLink size={13} color="#10b981" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  topRim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  beaconContainer: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  beaconWave: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.45)',
  },
  beaconCore: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10b981',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
  titleColumn: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  unreadBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.22)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  unreadBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#10b981',
    letterSpacing: 0.5,
  },
  statusSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  headerRight: {
    marginLeft: 8,
  },
  chevronCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  drawerDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 10,
  },
  emptyFeed: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  emptyFeedText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 20,
  },
  feedList: {
    gap: 8,
  },
  feedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  itemIconContainer: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemContent: {
    flex: 1,
    gap: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemTitle: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  itemTime: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '500',
    marginLeft: 6,
  },
  itemMessage: {
    fontSize: 11,
    lineHeight: 14,
  },
  checkButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  drawerFooter: {
    marginTop: 10,
    alignItems: 'center',
  },
  fullHubButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  fullHubButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10b981',
  },
});
