import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Switch,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import {
  Lock,
  Unlock,
  Plus,
  ArrowDownRight,
  ArrowUpLeft,
  X,
  Target,
  PiggyBank,
} from 'lucide-react-native';
import { useTheme } from '@/providers/theme-provider';
import { SavingsVault } from '@/types';
import {
  createSavingsVault,
  transferToVault,
  withdrawFromVault,
} from '@/services/savings-service';
import { formatCurrency, getCurrencySymbol } from '@/utils/currency-utils';

interface VaultsListProps {
  vaults: SavingsVault[];
  businessId: string;
  userId: string;
  spendableBalance: number;
  currency?: string;
  onRefresh: () => void;
}

export const VaultsList: React.FC<VaultsListProps> = ({
  vaults,
  businessId,
  userId,
  spendableBalance,
  currency = 'USD',
  onRefresh,
}) => {
  const { colors, isDark } = useTheme();

  // Create Vault Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newVaultName, setNewVaultName] = useState('');
  const [newVaultTarget, setNewVaultTarget] = useState('');
  const [isLocked, setIsLocked] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Vault Action (Deposit / Withdraw) Modal State
  const [activeVault, setActiveVault] = useState<SavingsVault | null>(null);
  const [actionType, setActionType] = useState<'deposit' | 'withdraw'>('deposit');
  const [actionAmountStr, setActionAmountStr] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);

  const currencySymbol = getCurrencySymbol(currency);
  const actionNumericAmount = parseFloat(actionAmountStr) || 0;

  const handleCreateVault = async () => {
    if (!newVaultName.trim()) {
      Alert.alert('Required', 'Please enter a vault or goal name.');
      return;
    }

    const targetAmount = parseFloat(newVaultTarget) || 0;
    if (targetAmount <= 0) {
      Alert.alert('Required', 'Please enter a target amount greater than 0.');
      return;
    }

    try {
      setIsCreating(true);
      const res = await createSavingsVault({
        businessId,
        userId,
        name: newVaultName.trim(),
        targetAmount,
        currency,
        isLocked,
      });

      if (res.success) {
        setShowCreateModal(false);
        setNewVaultName('');
        setNewVaultTarget('');
        onRefresh();
      } else {
        Alert.alert('Error', res.error || 'Failed to create vault.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'An error occurred.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleVaultAction = async () => {
    if (!activeVault) return;

    if (actionNumericAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter an amount greater than 0.');
      return;
    }

    if (actionType === 'deposit' && actionNumericAmount > spendableBalance) {
      Alert.alert(
        'Insufficient Balance',
        `Your spendable wallet balance is ${formatCurrency(spendableBalance, currency)}.`
      );
      return;
    }

    if (actionType === 'withdraw' && actionNumericAmount > activeVault.currentAmount) {
      Alert.alert(
        'Insufficient Vault Funds',
        `This vault only contains ${formatCurrency(activeVault.currentAmount, currency)}.`
      );
      return;
    }

    try {
      setIsActionLoading(true);
      if (actionType === 'deposit') {
        const res = await transferToVault({
          businessId,
          userId,
          vaultId: activeVault.id,
          vaultName: activeVault.name,
          amount: actionNumericAmount,
          currency,
        });
        if (res.success) {
          setActiveVault(null);
          setActionAmountStr('');
          onRefresh();
        } else {
          Alert.alert('Deposit Failed', res.error || 'Unable to move funds.');
        }
      } else {
        const res = await withdrawFromVault({
          businessId,
          userId,
          vaultId: activeVault.id,
          vaultName: activeVault.name,
          amount: actionNumericAmount,
          currency,
        });
        if (res.success) {
          setActiveVault(null);
          setActionAmountStr('');
          onRefresh();
        } else {
          Alert.alert('Withdrawal Failed', res.error || 'Unable to withdraw funds.');
        }
      }
    } catch (err: any) {
      Alert.alert('Action Error', err.message || 'An error occurred.');
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            SAVINGS VAULTS
          </Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            Locked & goal-oriented personal savings
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setShowCreateModal(true)}
          style={[styles.addVaultBtn, { backgroundColor: colors.primary }]}
        >
          <Plus size={14} color="#ffffff" />
          <Text style={styles.addVaultBtnText}>New Goal</Text>
        </TouchableOpacity>
      </View>

      {/* Vault Cards */}
      {vaults.length === 0 ? (
        <View
          style={[
            styles.emptyCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.emptyIconCircle,
              {
                backgroundColor: isDark
                  ? 'rgba(16, 185, 129, 0.12)'
                  : 'rgba(16, 185, 129, 0.08)',
              },
            ]}
          >
            <PiggyBank size={24} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No Savings Vaults Yet
          </Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
            Create your first locked vault to set aside money toward specific milestones.
          </Text>
        </View>
      ) : (
        <View style={styles.vaultsList}>
          {vaults.map((vault) => {
            const progress =
              vault.targetAmount > 0
                ? Math.min(
                    100,
                    Math.round((vault.currentAmount / vault.targetAmount) * 100)
                  )
                : 0;

            return (
              <View
                key={vault.id}
                style={[
                  styles.vaultCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.vaultTopRow}>
                  <View style={styles.vaultTitleGroup}>
                    <Text style={[styles.vaultName, { color: colors.text }]}>
                      {vault.name}
                    </Text>
                    <View
                      style={[
                        styles.lockBadge,
                        {
                          backgroundColor: vault.isLocked
                            ? isDark
                              ? 'rgba(16, 185, 129, 0.15)'
                              : '#ecfdf5'
                            : isDark
                            ? 'rgba(255, 255, 255, 0.06)'
                            : '#f4f4f5',
                        },
                      ]}
                    >
                      {vault.isLocked ? (
                        <Lock size={10} color={colors.primary} />
                      ) : (
                        <Unlock size={10} color={colors.textSecondary} />
                      )}
                      <Text
                        style={[
                          styles.lockBadgeText,
                          {
                            color: vault.isLocked
                              ? colors.primary
                              : colors.textSecondary,
                          },
                        ]}
                      >
                        {vault.isLocked ? 'Protected' : 'Flexible'}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.vaultPercent, { color: colors.primary }]}>
                    {progress}%
                  </Text>
                </View>

                {/* Progress Bar */}
                <View
                  style={[
                    styles.progressBarTrack,
                    { backgroundColor: isDark ? '#27272a' : '#e4e4e7' },
                  ]}
                >
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${progress}%`,
                        backgroundColor: colors.primary,
                      },
                    ]}
                  />
                </View>

                {/* Numbers Row */}
                <View style={styles.vaultNumbersRow}>
                  <Text style={[styles.vaultCurrentAmt, { color: colors.text }]}>
                    {formatCurrency(vault.currentAmount, currency)}
                  </Text>
                  <Text style={[styles.vaultTargetAmt, { color: colors.textSecondary }]}>
                    Goal: {formatCurrency(vault.targetAmount, currency)}
                  </Text>
                </View>

                {/* Vault Action Buttons */}
                <View style={styles.vaultCardActions}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      setActiveVault(vault);
                      setActionType('deposit');
                    }}
                    style={[
                      styles.vaultActionBtn,
                      {
                        backgroundColor: isDark
                          ? 'rgba(16, 185, 129, 0.12)'
                          : '#ecfdf5',
                        borderColor: isDark
                          ? 'rgba(16, 185, 129, 0.25)'
                          : 'rgba(16, 185, 129, 0.2)',
                      },
                    ]}
                  >
                    <ArrowDownRight size={13} color={colors.primary} />
                    <Text
                      style={[styles.vaultActionBtnText, { color: colors.primary }]}
                    >
                      Deposit
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      setActiveVault(vault);
                      setActionType('withdraw');
                    }}
                    style={[
                      styles.vaultActionBtn,
                      {
                        backgroundColor: isDark
                          ? 'rgba(255, 255, 255, 0.05)'
                          : '#f4f4f5',
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <ArrowUpLeft size={13} color={colors.textSecondary} />
                    <Text
                      style={[
                        styles.vaultActionBtnText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Withdraw
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Create Vault Modal */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Target size={18} color={colors.primary} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  New Savings Goal
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowCreateModal(false)}
                style={styles.closeBtn}
              >
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 20 }}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                VAULT NAME
              </Text>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    color: colors.text,
                    backgroundColor: isDark ? '#18181b' : '#f4f4f5',
                    borderColor: colors.border,
                  },
                ]}
                placeholder="e.g. Emergency Fund, Laptop, Travel"
                placeholderTextColor={colors.textSecondary}
                value={newVaultName}
                onChangeText={setNewVaultName}
              />

              <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 14 }]}>
                TARGET AMOUNT ({currency})
              </Text>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    color: colors.text,
                    backgroundColor: isDark ? '#18181b' : '#f4f4f5',
                    borderColor: colors.border,
                  },
                ]}
                placeholder="1000"
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
                value={newVaultTarget}
                onChangeText={setNewVaultTarget}
              />

              {/* Lock Switch */}
              <View
                style={[
                  styles.switchRow,
                  {
                    backgroundColor: isDark ? '#18181b' : '#f4f4f5',
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={[styles.switchTitle, { color: colors.text }]}>
                    Lock Discipline Mode
                  </Text>
                  <Text style={[styles.switchSub, { color: colors.textSecondary }]}>
                    Marks savings protected to reinforce habit building
                  </Text>
                </View>
                <Switch
                  value={isLocked}
                  onValueChange={setIsLocked}
                  trackColor={{ false: '#71717a', true: colors.primary }}
                />
              </View>

              <TouchableOpacity
                activeOpacity={0.9}
                disabled={isCreating || !newVaultName.trim()}
                onPress={handleCreateVault}
                style={[
                  styles.submitBtn,
                  {
                    backgroundColor:
                      isCreating || !newVaultName.trim()
                        ? '#94a3b8'
                        : colors.primary,
                  },
                ]}
              >
                {isCreating ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.submitBtnText}>Create Vault</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Deposit / Withdraw Action Modal */}
      <Modal
        visible={!!activeVault}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveVault(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {actionType === 'deposit' ? (
                  <ArrowDownRight size={18} color={colors.primary} />
                ) : (
                  <ArrowUpLeft size={18} color={colors.textSecondary} />
                )}
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {actionType === 'deposit' ? 'Deposit into' : 'Withdraw from'}{' '}
                  {activeVault?.name}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setActiveVault(null)}
                style={styles.closeBtn}
              >
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 20 }}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                {actionType === 'deposit'
                  ? `Available in Wallet: ${formatCurrency(spendableBalance, currency)}`
                  : `In Vault: ${formatCurrency(activeVault?.currentAmount || 0, currency)}`}
              </Text>

              <View
                style={[
                  styles.amountInputRow,
                  {
                    backgroundColor: isDark ? '#18181b' : '#f4f4f5',
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.currencyPrefix, { color: colors.primary }]}>
                  {currencySymbol}
                </Text>
                <TextInput
                  style={[styles.modalAmountInput, { color: colors.text }]}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="decimal-pad"
                  value={actionAmountStr}
                  onChangeText={setActionAmountStr}
                  autoFocus
                />
              </View>

              <TouchableOpacity
                activeOpacity={0.9}
                disabled={isActionLoading || actionNumericAmount <= 0}
                onPress={handleVaultAction}
                style={[
                  styles.submitBtn,
                  {
                    backgroundColor:
                      isActionLoading || actionNumericAmount <= 0
                        ? '#94a3b8'
                        : colors.primary,
                  },
                ]}
              >
                {isActionLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.submitBtnText}>
                    {actionType === 'deposit' ? 'Confirm Deposit' : 'Confirm Withdrawal'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginVertical: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  sectionSubtitle: {
    fontSize: 11,
    marginTop: 2,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  addVaultBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  addVaultBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  emptyCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk_700Bold',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    fontFamily: 'SpaceGrotesk_400Regular',
    paddingHorizontal: 16,
  },
  vaultsList: {
    gap: 12,
  },
  vaultCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  vaultTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  vaultTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  vaultName: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  lockBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  vaultPercent: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  progressBarTrack: {
    height: 7,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  vaultNumbersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  vaultCurrentAmt: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  vaultTargetAmt: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  vaultCardActions: {
    flexDirection: 'row',
    gap: 10,
  },
  vaultActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  vaultActionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  closeBtn: {
    padding: 6,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 6,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  formInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 14,
    marginBottom: 20,
  },
  switchTitle: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  switchSub: {
    fontSize: 11,
    marginTop: 2,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  currencyPrefix: {
    fontSize: 28,
    fontWeight: '700',
    marginRight: 6,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  modalAmountInput: {
    fontSize: 32,
    fontWeight: '800',
    minWidth: 80,
    textAlign: 'center',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  submitBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
});
