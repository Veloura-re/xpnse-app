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
import { router } from 'expo-router';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  PiggyBank,
  Users,
  ChevronRight,
  Clock,
} from 'lucide-react-native';
import { useTheme } from '@/providers/theme-provider';
import { useAuth } from '@/providers/auth-provider';
import { Business, MemberAccount, SavingsVault, WalletTransaction } from '@/types';
import {
  getOrCreateMemberAccount,
  subscribeToMemberAccount,
  subscribeToVaults,
  subscribeToWalletTransactions,
} from '@/services/savings-service';
import { WalletCard } from './wallet-card';
import { AddMoneyModal } from './add-money-modal';
import { SendMoneyModal } from './send-money-modal';
import { CashOutModal } from './cash-out-modal';
import { VaultsList } from './vaults-list';
import { GroupPoolCard } from './group-pool-card';
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

  const userId = user?.id || '';
  const currency = business.currency || 'USD';

  // Initialize and subscribe
  useEffect(() => {
    if (!business.id || !userId) return;

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
      const acc = await getOrCreateMemberAccount(business.id, userId, currency);
      setAccount(acc);
    }
    setRefreshing(false);
  }, [business.id, userId, currency]);

  const renderTransactionIcon = (type: WalletTransaction['type']) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownLeft size={16} color="#10B981" />;
      case 'withdrawal':
        return <Landmark size={16} color="#f59e0b" />;
      case 'transfer_sent':
        return <ArrowUpRight size={16} color="#ef4444" />;
      case 'transfer_recv':
        return <ArrowDownLeft size={16} color="#10B981" />;
      case 'vault_deposit':
        return <PiggyBank size={16} color="#6366f1" />;
      case 'vault_withdraw':
        return <PiggyBank size={16} color="#10B981" />;
      case 'pool_contribution':
        return <Users size={16} color="#3b82f6" />;
      default:
        return <Clock size={16} color={colors.textSecondary} />;
    }
  };

  const getTransactionTitle = (tx: WalletTransaction) => {
    switch (tx.type) {
      case 'deposit':
        return 'Card Top-Up';
      case 'withdrawal':
        return 'Cash Out to Bank';
      case 'transfer_sent':
        return `Sent to ${tx.counterpartyName || 'Member'}`;
      case 'transfer_recv':
        return `Received from ${tx.counterpartyName || 'Member'}`;
      case 'vault_deposit':
        return `Added to ${tx.vaultName || 'Vault'}`;
      case 'vault_withdraw':
        return `Withdrawn from ${tx.vaultName || 'Vault'}`;
      case 'pool_contribution':
        return 'Group Pool Contribution';
      default:
        return 'Wallet Activity';
    }
  };

  const isPositiveTransaction = (type: WalletTransaction['type']) => {
    return type === 'deposit' || type === 'transfer_recv' || type === 'vault_withdraw';
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
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      {/* 1. Spendable Personal Wallet Card (Hero at Top) */}
      <WalletCard
        account={account}
        currency={currency}
        onAddMoney={() => setShowAddMoney(true)}
        onSendMoney={() => setShowSendMoney(true)}
        onCashOut={() => setShowCashOut(true)}
      />

      {/* 2. Goal-Oriented Savings Vaults (Allocated from Wallet) */}
      <VaultsList
        vaults={vaults}
        businessId={business.id}
        userId={userId}
        spendableBalance={account?.mainBalance || 0}
        currency={currency}
        onRefresh={onRefresh}
      />

      {/* 3. Community / Group Savings Pool Card */}
      <GroupPoolCard
        business={business}
        userId={userId}
        userName={user?.displayName || user?.name || user?.email || 'Member'}
        spendableBalance={account?.mainBalance || 0}
        currency={currency}
        onRefresh={onRefresh}
      />

      {/* Recent Ledger Activity Section */}
      <View style={styles.activitySection}>
        <View style={styles.activityHeader}>
          <Text style={[styles.activitySectionTitle, { color: colors.text }]}>
            RECENT ACTIVITY
          </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/savings-activity')}
            style={styles.seeAllBtn}
          >
            <Text style={[styles.seeAllText, { color: colors.primary }]}>
              See All
            </Text>
            <ChevronRight size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginVertical: 20 }} color={colors.primary} />
        ) : transactions.length === 0 ? (
          <View
            style={[
              styles.emptyActivityBox,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.emptyActivityText, { color: colors.textSecondary }]}>
              No recent transactions. Add money or send funds to start your ledger.
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
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.txLeft}>
                    <View
                      style={[
                        styles.txIconBubble,
                        {
                          backgroundColor: isDark
                            ? 'rgba(255, 255, 255, 0.06)'
                            : '#f4f4f5',
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
        onClose={() => setShowAddMoney(false)}
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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 2,
    paddingBottom: 100,
  },
  activitySection: {
    paddingHorizontal: 16,
    marginVertical: 14,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  activitySectionTitle: {
    fontSize: 12,
    letterSpacing: 1,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  emptyActivityBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
  },
  emptyActivityText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  transactionsList: {
    gap: 10,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 10,
  },
  txIconBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txTitle: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
  txDate: {
    fontSize: 11,
    marginTop: 2,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  txAmount: {
    fontSize: 15,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
});
