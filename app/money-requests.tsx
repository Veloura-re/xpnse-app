import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  HandCoins,
  Check,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  CalendarX,
} from 'lucide-react-native';
import { useTheme } from '@/providers/theme-provider';
import { useAuth } from '@/providers/auth-provider';
import { useBusiness } from '@/providers/business-provider';
import {
  subscribeToMoneyRequests,
  respondToMoneyRequest,
  cancelMoneyRequest,
} from '@/services/savings-service';
import { MoneyRequest, MoneyRequestStatus } from '@/types';
import { formatCurrency } from '@/utils/currency-utils';
import { formatDistanceToNow } from 'date-fns';

const STATUS_CONFIG: Record<MoneyRequestStatus, { label: string; color: string; Icon: any }> = {
  pending: { label: 'Pending', color: '#f59e0b', Icon: Clock },
  approved: { label: 'Approved', color: '#10b981', Icon: CheckCircle2 },
  declined: { label: 'Declined', color: '#ef4444', Icon: XCircle },
  cancelled: { label: 'Cancelled', color: '#6b7280', Icon: Ban },
  expired: { label: 'Expired', color: '#9ca3af', Icon: CalendarX },
};

export default function MoneyRequestsScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { currentBusiness } = useBusiness();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [tab, setTab] = useState<'received' | 'sent'>('received');
  const [requests, setRequests] = useState<MoneyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const userId = user?.id || '';
  const businessId = currentBusiness?.id || '';
  const currency = currentBusiness?.currency || 'USD';
  const userName = user?.displayName || user?.name || user?.email || 'Member';

  useEffect(() => {
    if (!businessId || !userId) return;
    setLoading(true);
    const unsub = subscribeToMoneyRequests(
      businessId,
      userId,
      tab === 'received' ? 'payer' : 'requester',
      (list) => {
        setRequests(list);
        setLoading(false);
      }
    );
    return unsub;
  }, [businessId, userId, tab]);

  const handleApprove = async (req: MoneyRequest) => {
    Alert.alert(
      'Approve Request',
      `Send ${formatCurrency(req.amount, req.currency)} to ${req.requesterName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: 'default',
          onPress: async () => {
            setProcessingId(req.id);
            const res = await respondToMoneyRequest({
              businessId,
              requestId: req.id,
              payerId: userId,
              payerName: userName,
              decision: 'approved',
            });
            setProcessingId(null);
            if (!res.success) Alert.alert('Error', res.error || 'Could not approve request.');
          },
        },
      ]
    );
  };

  const handleDecline = async (req: MoneyRequest) => {
    Alert.alert(
      'Decline Request',
      `Decline ${req.requesterName}'s request for ${formatCurrency(req.amount, req.currency)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            setProcessingId(req.id);
            const res = await respondToMoneyRequest({
              businessId,
              requestId: req.id,
              payerId: userId,
              payerName: userName,
              decision: 'declined',
            });
            setProcessingId(null);
            if (!res.success) Alert.alert('Error', res.error || 'Could not decline request.');
          },
        },
      ]
    );
  };

  const handleCancel = async (req: MoneyRequest) => {
    Alert.alert('Cancel Request', 'Are you sure you want to cancel this request?', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel Request',
        style: 'destructive',
        onPress: async () => {
          setProcessingId(req.id);
          const res = await cancelMoneyRequest(businessId, req.id, userId);
          setProcessingId(null);
          if (!res.success) Alert.alert('Error', res.error || 'Could not cancel request.');
        },
      },
    ]);
  };

  const renderItem = ({ item: req }: { item: MoneyRequest }) => {
    const isExpired = req.status === 'pending' && new Date(req.expiresAt).getTime() < Date.now();
    const effectiveStatus = isExpired ? 'expired' : req.status;
    const cfg = STATUS_CONFIG[effectiveStatus] || STATUS_CONFIG.pending;
    const StatusIcon = cfg.Icon;
    const isProcessing = processingId === req.id;

    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: isDark ? '#111113' : '#ffffff',
            borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)',
          },
        ]}
      >
        <View style={styles.cardTop}>
          <View style={styles.cardLeft}>
            <Text style={[styles.memberLabel, { color: colors.textSecondary }]}>
              {tab === 'received' ? 'From' : 'To'}
            </Text>
            <Text style={[styles.memberName, { color: colors.text }]}>
              {tab === 'received' ? req.requesterName : req.payerName}
            </Text>
          </View>
          <View style={styles.cardRight}>
            <Text style={[styles.amount, { color: colors.text }]}>
              {formatCurrency(req.amount, req.currency)}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: `${cfg.color}20` }]}>
              <StatusIcon size={11} color={cfg.color} />
              <Text style={[styles.statusLabel, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
          </View>
        </View>

        {req.note ? (
          <Text style={[styles.note, { color: colors.textSecondary }]} numberOfLines={2}>
            {req.note}
          </Text>
        ) : null}

        <Text style={[styles.timestamp, { color: colors.textSecondary }]}>
          {formatDistanceToNow(new Date(req.createdAt), { addSuffix: true })}
          {req.status === 'pending' && !isExpired && (
            <Text> · expires {formatDistanceToNow(new Date(req.expiresAt), { addSuffix: true })}</Text>
          )}
          {isExpired && <Text> · expired</Text>}
        </Text>

        {/* Actions */}
        {req.status === 'pending' && !isExpired && !isProcessing && (
          <View style={styles.actions}>
            {tab === 'received' ? (
              <>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => handleDecline(req)}
                  style={[
                    styles.actionBtn,
                    {
                      backgroundColor: isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.07)',
                      borderColor: 'rgba(239,68,68,0.25)',
                    },
                  ]}
                >
                  <X size={14} color="#ef4444" />
                  <Text style={[styles.actionLabel, { color: '#ef4444' }]}>Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => handleApprove(req)}
                  style={[styles.actionBtn, { backgroundColor: '#10b981', borderColor: '#10b981' }]}
                >
                  <Check size={14} color="#ffffff" />
                  <Text style={[styles.actionLabel, { color: '#ffffff' }]}>Approve</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => handleCancel(req)}
                style={[
                  styles.actionBtn,
                  {
                    backgroundColor: isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.07)',
                    borderColor: 'rgba(239,68,68,0.25)',
                  },
                ]}
              >
                <X size={14} color="#ef4444" />
                <Text style={[styles.actionLabel, { color: '#ef4444' }]}>Cancel Request</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {isProcessing && (
          <View style={styles.processingRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.processingLabel, { color: colors.textSecondary }]}>
              Processing...
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ChevronLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <HandCoins size={18} color={colors.primary} />
            <Text style={[styles.headerTitle, { color: colors.text }]}>Money Requests</Text>
          </View>
          <View style={{ width: 38 }} />
        </View>

        {/* Tab bar */}
        <View style={[styles.tabs, { borderColor: colors.border }]}>
          {(['received', 'sent'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              activeOpacity={0.8}
              onPress={() => setTab(t)}
              style={[
                styles.tab,
                tab === t && { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)' },
              ]}
            >
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: tab === t ? colors.text : colors.textSecondary,
                    fontFamily: tab === t ? 'SpaceGrotesk_700Bold' : 'SpaceGrotesk_500Medium',
                  },
                ]}
              >
                {t === 'received' ? 'Received' : 'Sent'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : requests.length === 0 ? (
          <View style={styles.centered}>
            <HandCoins size={44} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Requests</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {tab === 'received'
                ? 'No one has requested money from you yet.'
                : "You have not sent any money requests yet."}
            </Text>
          </View>
        ) : (
          <FlatList
            data={requests}
            keyExtractor={(r) => r.id}
            renderItem={renderItem}
            contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
  list: {
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 6,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardLeft: { gap: 2 },
  memberLabel: { fontSize: 11, fontFamily: 'SpaceGrotesk_500Medium' },
  memberName: { fontSize: 16, fontFamily: 'SpaceGrotesk_700Bold' },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  amount: { fontSize: 20, fontFamily: 'SpaceGrotesk_700Bold' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  statusLabel: { fontSize: 11, fontFamily: 'SpaceGrotesk_700Bold' },
  note: { fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular' },
  timestamp: { fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular' },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  actionLabel: { fontSize: 13, fontFamily: 'SpaceGrotesk_700Bold' },
  processingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  processingLabel: { fontSize: 13, fontFamily: 'SpaceGrotesk_500Medium' },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 32,
  },
  emptyTitle: { fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold' },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_400Regular',
    textAlign: 'center',
    lineHeight: 22,
  },
});
