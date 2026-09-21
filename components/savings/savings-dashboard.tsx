import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  PiggyBank,
  Users,
  ChevronRight,
  Clock,
  HandCoins,
  ShieldCheck,
  Target,
  Unlock,
  Sparkles,
} from 'lucide-react-native';
import { useTheme } from '@/providers/theme-provider';
import { useAuth } from '@/providers/auth-provider';
import { Business, MemberAccount, SavingsVault, WalletTransaction, RoundUpSettings } from '@/types';
import {
  getOrCreateMemberAccount,
  subscribeToMemberAccount,
  subscribeToVaults,
  subscribeToWalletTransactions,
  processDueScheduledStashes,
} from '@/services/savings-service';
import { WalletCard } from './wallet-card';
import { AddMoneyModal } from './add-money-modal';
import { SendMoneyModal } from './send-money-modal';
import { CashOutModal } from './cash-out-modal';
import { VaultsList } from './vaults-list';
import { GroupPoolCard } from './group-pool-card';
import { MoneyRequestModal } from './money-request-modal';
import { PendingTransferPrompt } from './pending-transfer-prompt';
import { RoundUpSettingsModal } from './round-up-settings-modal';
import { ScheduledStashModal } from './scheduled-stash-modal';
import { VaultNotificationsRadar } from './vault-notifications-radar';
import { formatCurrency } from '@/utils/currency-utils';

interface SavingsDashboardProps {
  business: Business;
}

export const SavingsDashboard: React.FC<SavingsDashboardProps> = ({ business }) => {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();

  const [account, setAccount] = useState<MemberAccount | null>(null);
  const [vaults, setVaults] = useState<SavingsVault[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Modal visibility states
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [showSendMoney, setShowSendMoney] = useState(false);
  const [showCashOut, setShowCashOut] = useState(false);
  const [showRequestMoney, setShowRequestMoney] = useState(false);
  const [showRoundUpModal, setShowRoundUpModal] = useState(false);
  const [showScheduledStashModal, setShowScheduledStashModal] = useState(false);
  const [fundingTargetVault, setFundingTargetVault] = useState<SavingsVault | null>(null);

  const userId = user?.id || '';
  const currency = business.currency || 'USD';

  // Initialize and subscribe
  useEffect(() => {
    if (!business.id || !userId) return;

    // Process any due recurring stashes in background
    processDueScheduledStashes(business.id, userId).catch((err) => {
      console.warn('[ScheduledStash] Auto-process notice:', err?.message);
    });

    // Ensure account exists
    getOrCreateMemberAccount(business.id, userId, currency).then((acc) => {
      setAccount(acc);
      setLoading(false);
    });

    // Real-time balance listener
    const unsubAccount = subscribeToMemberAccount(business.id, userId, (acc) => {
      if (acc) setAccount(acc);
    });

    // Real-time vaults listener
    const unsubVaults = subscribeToVaults(business.id, userId, (vaultList) => {
      setVaults(vaultList);
    });

    // Real-time recent transactions listener (limit 5)
    const unsubTransactions = subscribeToWalletTransactions(
      business.id,
      userId,
      (txList) => {
        setTransactions(txList);
      },
      5
    );

    return () => {
      unsubAccount();
      unsubVaults();
      unsubTransactions();
    };
  }, [business.id, userId, currency]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (business.id && userId) {
      await processDueScheduledStashes(business.id, userId).catch(() => {});
      const acc = await getOrCreateMemberAccount(business.id, userId, currency);
      setAccount(acc);
    }
    setRefreshing(false);
  }, [business.id, userId, currency]);

  const renderTransactionIcon = (type: WalletTransaction['type']) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownLeft size={16} color="#10B981" strokeWidth={2.5} />;
      case 'withdrawal':
        return <Landmark size={16} color="#f59e0b" strokeWidth={2} />;
      case 'transfer_sent':
        return <ArrowUpRight size={16} color="#ef4444" strokeWidth={2.5} />;
      case 'transfer_recv':
        return <ArrowDownLeft size={16} color="#10B981" strokeWidth={2.5} />;
      case 'vault_deposit':
        return <Target size={16} color="#34d399" strokeWidth={2} />;
      case 'vault_withdraw':
        return <Unlock size={16} color="#6366f1" strokeWidth={2} />;
      case 'pool_contribution':
        return <Users size={16} color="#3b82f6" strokeWidth={2} />;
      case 'round_up_deposit':
        return <Sparkles size={16} color="#10B981" strokeWidth={2} />;
      default:
        return <Clock size={16} color={colors.textSecondary} strokeWidth={2} />;
    }
  };

  const getTransactionTitle = (tx: WalletTransaction) => {
    switch (tx.type) {
      case 'deposit':
        return 'Card Top-Up Gateway';
      case 'withdrawal':
        return 'ACH Bank Settlement';
      case 'transfer_sent':
        return `Dispatched to ${tx.counterpartyName || 'Member'}`;
      case 'transfer_recv':
        return `Received from ${tx.counterpartyName || 'Member'}`;
      case 'vault_deposit':
        return `Locked in ${tx.vaultName || 'Vault'}`;
      case 'vault_withdraw':
        return `Drawn from ${tx.vaultName || 'Vault'}`;
      case 'pool_contribution':
        return 'Syndicate Treasury Pledge';
      case 'round_up_deposit':
        return `Spare Change in ${tx.vaultName || 'Vault'}`;
      default:
        return 'Ledger Entry';
    }
  };

  const isPositiveTransaction = (type: WalletTransaction['type']) => {
    return (
      type === 'deposit' ||
      type === 'transfer_recv' ||
      type === 'vault_withdraw'
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#10B981"
          colors={['#10B981']}
        />
      }
    >
      {/* 1. Spatial Vault Chamber (Hero Top Terminal) */}
      <WalletCard
        account={account}
        currency={currency}
        onAddMoney={() => setShowAddMoney(true)}
        onSendMoney={() => setShowSendMoney(true)}
        onCashOut={() => setShowCashOut(true)}
        onRequestMoney={() => setShowRequestMoney(true)}
        onOpenRoundUp={() => setShowRoundUpModal(true)}
      />

      {/* 2. Real-Time In-Context Vault Telemetry Radar */}
      <VaultNotificationsRadar businessId={business.id} />

      {/* Money Requests Quick Access Dispatch Strip */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => router.push('/money-requests')}
        style={[
          styles.requestsBanner,
          {
            backgroundColor: isDark ? '#090e0d' : colors.card,
            borderColor: isDark ? 'rgba(245, 158, 11, 0.25)' : 'rgba(245, 158, 11, 0.3)',
          },
        ]}
      >
        <LinearGradient
          colors={['rgba(245, 158, 11, 0.25)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.requestsTopRim}
        />

        <View style={styles.requestsBannerLeft}>
          <View
            style={[
              styles.requestsIconBox,
              {
                backgroundColor: isDark
                  ? 'rgba(245, 158, 11, 0.12)'
                  : 'rgba(245, 158, 11, 0.1)',
                borderColor: 'rgba(245, 158, 11, 0.25)',
              },
            ]}
          >
            <HandCoins size={17} color="#f59e0b" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.requestsHeaderRow}>
              <View style={styles.requestsBadge}>
                <Text style={styles.requestsBadgeText}>CLEARINGHOUSE</Text>
              </View>
            </View>
            <Text style={[styles.requestsBannerTitle, { color: colors.text }]}>
              Payment Requests & Claims
            </Text>
            <Text style={[styles.requestsBannerSubtitle, { color: colors.textSecondary }]}>
              Approve inbound transfers or track outstanding requests
            </Text>
          </View>
        </View>
        <ChevronRight size={17} color="#f59e0b" />
      </TouchableOpacity>

      {/* 2. Target Milestone Vaults (Sculpted Milestone Pods) */}
      <VaultsList
        vaults={vaults}
        businessId={business.id}
        userId={userId}
        spendableBalance={account?.mainBalance || 0}
        currency={currency}
        onRefresh={onRefresh}
        onOpenScheduledStash={() => setShowScheduledStashModal(true)}
        onFundVault={(vault) => {
          setFundingTargetVault(vault);
          setShowAddMoney(true);
        }}
      />

      {/* 3. Syndicate Reserve Pool (Collective Treasury) */}
      <GroupPoolCard
        business={business}
        userId={userId}
        userName={user?.displayName || user?.name || user?.email || 'Member'}
        spendableBalance={account?.mainBalance || 0}
        currency={currency}
        onRefresh={onRefresh}
      />

      {/* 4. Recent Chrono Ledger Activity Section */}
      <View style={styles.activitySection}>
        <View style={styles.activityHeader}>
          <View style={styles.activityTitleGroup}>
            <View style={styles.ledgerBadge}>
              <Clock size={10} color="#10B981" />
              <Text style={styles.ledgerBadgeText}>CHRONO LEDGER</Text>
            </View>
            <Text style={[styles.activitySectionTitle, { color: colors.text }]}>
              Recent Treasury Activity
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/savings-activity')}
            style={styles.seeAllBtn}
          >
            <Text style={styles.seeAllText}>Audit Trail</Text>
            <ChevronRight size={13} color="#10B981" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginVertical: 24 }} color="#10B981" />
        ) : transactions.length === 0 ? (
          <View
            style={[
              styles.emptyActivityBox,
              {
                backgroundColor: isDark ? '#090e0d' : colors.card,
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.border,
              },
            ]}
          >
            <ShieldCheck size={28} color="#64748b" style={{ marginBottom: 8 }} />
            <Text style={[styles.emptyActivityTitle, { color: colors.text }]}>
              Zero Ledger Movements
            </Text>
            <Text style={[styles.emptyActivityText, { color: colors.textSecondary }]}>
              Perform a top-up or transfer to initialize immutable transaction records.
            </Text>
          </View>
        ) : (
          <View style={styles.transactionsList}>
            {transactions.map((tx) => {
              const isPos = isPositiveTransaction(tx.type);
              const sign = isPos ? '+' : '-';
              const dateFormatted = new Date(tx.createdAt).toLocaleDateString(
                undefined,
                { month: 'short', day: 'numeric' }
              );

              return (
                <View
                  key={tx.id}
                  style={[
                    styles.txRow,
                    {
                      backgroundColor: isDark ? '#090e0d' : colors.card,
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : colors.border,
                    },
                  ]}
                >
                  <View style={styles.txLeft}>
                    <View
                      style={[
                        styles.txIconBubble,
                        {
                          backgroundColor: isPos
                            ? 'rgba(16, 185, 129, 0.12)'
                            : tx.type === 'transfer_sent'
                            ? 'rgba(239, 68, 68, 0.12)'
                            : 'rgba(245, 158, 11, 0.12)',
                          borderColor: isPos
                            ? 'rgba(16, 185, 129, 0.25)'
                            : tx.type === 'transfer_sent'
                            ? 'rgba(239, 68, 68, 0.25)'
                            : 'rgba(245, 158, 11, 0.25)',
                        },
                      ]}
                    >
                      {renderTransactionIcon(tx.type)}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.txTitle, { color: colors.text }]}
                        numberOfLines={1}
                      >
                        {getTransactionTitle(tx)}
                      </Text>
                      <Text style={[styles.txDate, { color: colors.textSecondary }]}>
                        {dateFormatted} {tx.note ? `• ${tx.note}` : ''}
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={[
                      styles.txAmount,
                      {
                        color: isPos ? '#10B981' : colors.text,
                        fontFamily: 'SpaceGrotesk_700Bold',
                      },
                    ]}
                  >
                    {sign}
                    {formatCurrency(tx.amount, currency)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Add Money Modal */}
      <AddMoneyModal
        visible={showAddMoney}
        businessId={business.id}
        userId={userId}
        currency={currency}
        vaults={vaults}
        initialVaultId={fundingTargetVault?.id}
        initialVaultName={fundingTargetVault?.name}
        onClose={() => {
          setShowAddMoney(false);
          setFundingTargetVault(null);
        }}
        onSuccess={onRefresh}
      />

      {/* Send Money Modal */}
      <SendMoneyModal
        visible={showSendMoney}
        businessId={business.id}
        senderId={userId}
        senderName={user?.displayName || user?.name || user?.email || 'Member'}
        availableBalance={account?.mainBalance || 0}
        members={business.members || []}
        currency={currency}
        onClose={() => setShowSendMoney(false)}
        onSuccess={onRefresh}
      />

      {/* Cash Out Modal */}
      <CashOutModal
        visible={showCashOut}
        businessId={business.id}
        userId={userId}
        availableBalance={account?.mainBalance || 0}
        currency={currency}
        onClose={() => setShowCashOut(false)}
        onSuccess={onRefresh}
      />

      {/* Request Money Modal */}
      <MoneyRequestModal
        visible={showRequestMoney}
        businessId={business.id}
        requesterId={userId}
        requesterName={user?.displayName || user?.name || user?.email || 'Member'}
        members={business.members || []}
        currency={currency}
        onClose={() => setShowRequestMoney(false)}
        onSuccess={onRefresh}
      />

      {/* Round-Up Settings Modal */}
      <RoundUpSettingsModal
        visible={showRoundUpModal}
        businessId={business.id}
        userId={userId}
        currency={currency}
        vaults={vaults}
        currentSettings={account?.roundUpSettings}
        onClose={() => setShowRoundUpModal(false)}
        onSuccess={(updated) => {
          if (account) {
            setAccount({
              ...account,
              roundUpSettings: updated,
            });
          }
          onRefresh();
        }}
      />

      {/* Scheduled Auto-Stash Modal */}
      <ScheduledStashModal
        visible={showScheduledStashModal}
        businessId={business.id}
        userId={userId}
        currency={currency}
        vaults={vaults}
        onClose={() => setShowScheduledStashModal(false)}
        onSuccess={onRefresh}
      />

      {/* Pending Transfer Prompt — real-time inbound confirmations */}
      {userId && business.id && (
        <PendingTransferPrompt
          businessId={business.id}
          recipientId={userId}
          currency={currency}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 2,
    paddingBottom: 110,
  },
  requestsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  requestsTopRim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
  },
  requestsBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 8,
  },
  requestsIconBox: {
    width: 38,
    height: 38,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  requestsBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  requestsBadgeText: {
    fontSize: 8.5,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#f59e0b',
    letterSpacing: 0.8,
  },
  requestsBannerTitle: {
    fontSize: 13.5,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: -0.2,
  },
  requestsBannerSubtitle: {
    fontSize: 10.5,
    marginTop: 2,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  activitySection: {
    paddingHorizontal: 16,
    marginVertical: 12,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  activityTitleGroup: {
    gap: 3,
  },
  ledgerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
  },
  ledgerBadgeText: {
    fontSize: 9.5,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 1.2,
    color: '#10B981',
  },
  activitySectionTitle: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: -0.2,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  seeAllText: {
    fontSize: 11,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#10B981',
  },
  emptyActivityBox: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  emptyActivityTitle: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_700Bold',
    marginBottom: 4,
  },
  emptyActivityText: {
    fontSize: 11.5,
    textAlign: 'center',
    lineHeight: 17,
    fontFamily: 'SpaceGrotesk_400Regular',
    paddingHorizontal: 12,
  },
  transactionsList: {
    gap: 9,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1,
    padding: 13,
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    flex: 1,
    paddingRight: 10,
  },
  txIconBubble: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txTitle: {
    fontSize: 13.5,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: -0.2,
  },
  txDate: {
    fontSize: 10.5,
    marginTop: 2,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  txAmount: {
    fontSize: 14.5,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: -0.2,
  },
});
