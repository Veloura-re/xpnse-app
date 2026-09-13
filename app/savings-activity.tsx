import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  PiggyBank,
  Users,
  Clock,
  X,
  Receipt,
  CheckCircle2,
  Copy,
} from 'lucide-react-native';
import { useTheme } from '@/providers/theme-provider';
import { useBusiness } from '@/providers/business-provider';
import { useAuth } from '@/providers/auth-provider';
import { WalletTransaction } from '@/types';
import { subscribeToWalletTransactions } from '@/services/savings-service';
import { formatCurrency } from '@/utils/currency-utils';

type FilterCategory = 'all' | 'deposits' | 'transfers' | 'vaults' | 'cashouts';

export default function SavingsActivityScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { currentBusiness } = useBusiness();
  const { user } = useAuth();

  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');
  const [selectedTx, setSelectedTx] = useState<WalletTransaction | null>(null);

  const businessId = currentBusiness?.id || '';
  const userId = user?.id || '';
  const currency = currentBusiness?.currency || 'USD';

  useEffect(() => {
    if (!businessId || !userId) return;

    const unsub = subscribeToWalletTransactions(
      businessId,
      userId,
      (list) => {
        setTransactions(list);
        setLoading(false);
      },
      100
    );

    return () => unsub();
  }, [businessId, userId]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Category filter
      if (activeFilter === 'deposits' && tx.type !== 'deposit') return false;
      if (
        activeFilter === 'transfers' &&
        tx.type !== 'transfer_sent' &&
        tx.type !== 'transfer_recv'
      )
        return false;
      if (
        activeFilter === 'vaults' &&
        tx.type !== 'vault_deposit' &&
        tx.type !== 'vault_withdraw'
      )
        return false;
      if (activeFilter === 'cashouts' && tx.type !== 'withdrawal') return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const noteMatch = tx.note?.toLowerCase().includes(query);
        const nameMatch = tx.counterpartyName?.toLowerCase().includes(query);
        const vaultMatch = tx.vaultName?.toLowerCase().includes(query);
        if (!noteMatch && !nameMatch && !vaultMatch) return false;
      }

      return true;
    });
  }, [transactions, activeFilter, searchQuery]);

  const renderTxIcon = (type: WalletTransaction['type']) => {
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

  const getTxTitle = (tx: WalletTransaction) => {
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
        return `Allocated to ${tx.vaultName || 'Vault'}`;
      case 'vault_withdraw':
        return `Released from ${tx.vaultName || 'Vault'}`;
      case 'pool_contribution':
        return 'Pool Contribution';
      default:
        return 'Wallet Activity';
    }
  };

  const isPositiveTx = (type: WalletTransaction['type']) => {
    return type === 'deposit' || type === 'transfer_recv' || type === 'vault_withdraw';
  };

  const filters: { label: string; key: FilterCategory }[] = [
    { label: 'All', key: 'all' },
    { label: 'Deposits', key: 'deposits' },
    { label: 'Transfers', key: 'transfers' },
    { label: 'Vaults', key: 'vaults' },
    { label: 'Cash Outs', key: 'cashouts' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 12,
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.back()}
            style={[
              styles.backButton,
              {
                backgroundColor: isDark
                  ? 'rgba(255, 255, 255, 0.08)'
                  : 'rgba(0, 0, 0, 0.05)',
              },
            ]}
          >
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Savings Activity
          </Text>

          <View style={{ width: 36 }} />
        </View>

        {/* Search Box */}
        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: isDark ? '#18181b' : '#f4f4f5',
              borderColor: colors.border,
            },
          ]}
        >
          <Search size={16} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search notes, members, vaults..."
            placeholderTextColor={colors.textSecondary}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          {filters.map((f) => {
            const isSelected = activeFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                activeOpacity={0.8}
                onPress={() => setActiveFilter(f.key)}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: isSelected
                      ? colors.primary
                      : isDark
                      ? '#18181b'
                      : '#f4f4f5',
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    {
                      color: isSelected ? '#ffffff' : colors.text,
                      fontFamily: isSelected
                        ? 'SpaceGrotesk_700Bold'
                        : 'SpaceGrotesk_500Medium',
                    },
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Transactions List */}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : filteredTransactions.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
            No Transactions Found
          </Text>
          <Text style={[styles.emptyStateSub, { color: colors.textSecondary }]}>
            Try changing your filter or search query.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredTransactions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isPos = isPositiveTx(item.type);
            const sign = isPos ? '+' : '-';
            const dateStr = new Date(item.createdAt).toLocaleString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setSelectedTx(item)}
                style={[
                  styles.txItem,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.txItemLeft}>
                  <View
                    style={[
                      styles.txIconWrap,
                      {
                        backgroundColor: isDark
                          ? 'rgba(255, 255, 255, 0.06)'
                          : '#f4f4f5',
                      },
                    ]}
                  >
                    {renderTxIcon(item.type)}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.txItemTitle, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {getTxTitle(item)}
                    </Text>
                    <Text
                      style={[styles.txItemSub, { color: colors.textSecondary }]}
                    >
                      {dateStr}
                    </Text>
                  </View>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text
                    style={[
                      styles.txItemAmount,
                      {
                        color: isPos ? '#10B981' : colors.text,
                        fontFamily: 'SpaceGrotesk_700Bold',
                      },
                    ]}
                  >
                    {sign}
                    {formatCurrency(item.amount, currency)}
                  </Text>
                  <Text
                    style={[
                      styles.statusPill,
                      {
                        color:
                          item.status === 'completed'
                            ? '#10B981'
                            : item.status === 'pending'
                            ? '#f59e0b'
                            : '#ef4444',
                      },
                    ]}
                  >
                    {item.status.toUpperCase()}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Transaction Receipt Modal */}
      <Modal
        visible={!!selectedTx}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedTx(null)}
      >
        <View style={styles.receiptModalBackdrop}>
          <View
            style={[
              styles.receiptCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.receiptHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Receipt size={18} color={colors.primary} />
                <Text style={[styles.receiptTitle, { color: colors.text }]}>
                  Transaction Receipt
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedTx(null)}
                style={styles.closeBtn}
              >
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedTx && (
              <View style={{ padding: 22 }}>
                {/* Status Badge */}
                <View style={styles.receiptStatusRow}>
                  <CheckCircle2 size={16} color="#10B981" />
                  <Text style={[styles.receiptStatusText, { color: '#10B981' }]}>
                    Transaction Verified
                  </Text>
                </View>

                {/* Amount */}
                <Text style={[styles.receiptAmount, { color: colors.text }]}>
                  {formatCurrency(selectedTx.amount, currency)}
                </Text>
                <Text style={[styles.receiptActionName, { color: colors.textSecondary }]}>
                  {getTxTitle(selectedTx)}
                </Text>

                {/* Details Table */}
                <View
                  style={[
                    styles.receiptDetailsTable,
                    {
                      backgroundColor: isDark ? '#18181b' : '#f4f4f5',
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.tableRow}>
                    <Text style={[styles.tableLabel, { color: colors.textSecondary }]}>
                      Status:
                    </Text>
                    <Text style={[styles.tableVal, { color: '#10B981' }]}>
                      {selectedTx.status.toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.tableDivider} />

                  <View style={styles.tableRow}>
                    <Text style={[styles.tableLabel, { color: colors.textSecondary }]}>
                      Timestamp:
                    </Text>
                    <Text style={[styles.tableVal, { color: colors.text }]}>
                      {new Date(selectedTx.createdAt).toLocaleString()}
                    </Text>
                  </View>

                  <View style={styles.tableDivider} />

                  <View style={styles.tableRow}>
                    <Text style={[styles.tableLabel, { color: colors.textSecondary }]}>
                      Reference ID:
                    </Text>
                    <Text
                      style={[styles.tableVal, { color: colors.text, fontSize: 11 }]}
                      numberOfLines={1}
                    >
                      {selectedTx.id}
                    </Text>
                  </View>

                  {selectedTx.counterpartyName && (
                    <>
                      <View style={styles.tableDivider} />
                      <View style={styles.tableRow}>
                        <Text style={[styles.tableLabel, { color: colors.textSecondary }]}>
                          Recipient / Sender:
                        </Text>
                        <Text style={[styles.tableVal, { color: colors.text }]}>
                          {selectedTx.counterpartyName}
                        </Text>
                      </View>
                    </>
                  )}

                  {selectedTx.vaultName && (
                    <>
                      <View style={styles.tableDivider} />
                      <View style={styles.tableRow}>
                        <Text style={[styles.tableLabel, { color: colors.textSecondary }]}>
                          Target Vault:
                        </Text>
                        <Text style={[styles.tableVal, { color: colors.text }]}>
                          {selectedTx.vaultName}
                        </Text>
                      </View>
                    </>
                  )}

                  {selectedTx.note && (
                    <>
                      <View style={styles.tableDivider} />
                      <View style={styles.tableRow}>
                        <Text style={[styles.tableLabel, { color: colors.textSecondary }]}>
                          Note:
                        </Text>
                        <Text style={[styles.tableVal, { color: colors.text }]}>
                          {selectedTx.note}
                        </Text>
                      </View>
                    </>
                  )}
                </View>

                {/* Done Button */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setSelectedTx(null)}
                  style={[styles.receiptDoneBtn, { backgroundColor: colors.primary }]}
                >
                  <Text style={styles.receiptDoneText}>Done</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  emptyState: {
    marginTop: 60,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk_700Bold',
    marginBottom: 6,
  },
  emptyStateSub: {
    fontSize: 13,
    textAlign: 'center',
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  txItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 10,
  },
  txIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txItemTitle: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
  txItemSub: {
    fontSize: 11,
    marginTop: 2,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  txItemAmount: {
    fontSize: 15,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  statusPill: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  receiptModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  receiptCard: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  receiptTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  closeBtn: {
    padding: 6,
  },
  receiptStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 10,
  },
  receiptStatusText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  receiptAmount: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  receiptActionName: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  receiptDetailsTable: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  tableLabel: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  tableVal: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
  tableDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 4,
  },
  receiptDoneBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptDoneText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
});
