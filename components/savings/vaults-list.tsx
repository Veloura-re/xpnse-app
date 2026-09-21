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
import { LinearGradient } from 'expo-linear-gradient';
import {
  Lock,
  Unlock,
  Plus,
  ArrowDownRight,
  ArrowUpLeft,
  X,
  Target,
  PiggyBank,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  Zap,
  Repeat,
  Coins,
  Trash2,
  Calendar,
  Clock,
  Check,
  CreditCard,
  ChevronRight,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/providers/theme-provider';
import { SavingsVault } from '@/types';
import {
  createSavingsVault,
  transferToVault,
  withdrawFromVault,
  toggleVaultLock,
  deleteSavingsVault,
} from '@/services/savings-service';
import { formatCurrency, getCurrencySymbol } from '@/utils/currency-utils';

interface VaultsListProps {
  vaults: SavingsVault[];
  businessId: string;
  userId: string;
  spendableBalance: number;
  currency?: string;
  onRefresh: () => void;
  onOpenScheduledStash?: () => void;
  onFundVault?: (vault: SavingsVault) => void;
}

const QUICK_AMOUNTS = [25, 50, 100];

const LOCK_DURATION_PRESETS = [
  { id: 'flexible', label: 'Flexible', days: 0 },
  { id: '30d', label: '30 Days', days: 30 },
  { id: '90d', label: '90 Days', days: 90 },
  { id: '180d', label: '6 Months', days: 180 },
  { id: '365d', label: '1 Year', days: 365 },
] as const;

type LockDurationId = typeof LOCK_DURATION_PRESETS[number]['id'];

export const VaultsList: React.FC<VaultsListProps> = ({
  vaults,
  businessId,
  userId,
  spendableBalance,
  currency = 'USD',
  onRefresh,
  onOpenScheduledStash,
  onFundVault,
}) => {
  const { colors, isDark } = useTheme();

  // Create Vault Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newVaultName, setNewVaultName] = useState('');
  const [newVaultTarget, setNewVaultTarget] = useState('');
  const [isLocked, setIsLocked] = useState(true);
  const [lockDurationId, setLockDurationId] = useState<LockDurationId>('flexible');
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

    const preset = LOCK_DURATION_PRESETS.find((p) => p.id === lockDurationId);
    let lockUntilDate: string | undefined = undefined;
    if (isLocked && preset && preset.days > 0) {
      const d = new Date();
      d.setDate(d.getDate() + preset.days);
      lockUntilDate = d.toISOString();
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
        lockUntilDate,
      });

      if (res.success) {
        setShowCreateModal(false);
        setNewVaultName('');
        setNewVaultTarget('');
        setLockDurationId('flexible');
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

  const handleToggleLock = async (vault: SavingsVault) => {
    const isDateLocked =
      vault.isLocked &&
      !!vault.lockUntilDate &&
      new Date(vault.lockUntilDate).getTime() > Date.now();

    if (isDateLocked) {
      const formatted = new Date(vault.lockUntilDate!).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      Alert.alert(
        'Time-Lock in Effect',
        `This vault is scheduled to remain locked until ${formatted} to safeguard your goals. Do you wish to override and unlock it now?`,
        [
          { text: 'Keep Locked', style: 'cancel' },
          {
            text: 'Override & Unlock',
            style: 'destructive',
            onPress: async () => {
              if (Platform.OS !== 'web') {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                } catch (e) {}
              }
              const res = await toggleVaultLock(businessId, userId, vault.id);
              if (res.success) {
                onRefresh();
              } else {
                Alert.alert('Lock Update Failed', res.error || 'Could not update lock status.');
              }
            },
          },
        ]
      );
      return;
    }

    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (e) {}
    }
    const res = await toggleVaultLock(businessId, userId, vault.id);
    if (res.success) {
      onRefresh();
    } else {
      Alert.alert('Lock Update Failed', res.error || 'Could not update lock status.');
    }
  };

  const handleDeleteVault = (vault: SavingsVault) => {
    Alert.alert(
      'Delete Savings Vault',
      `Are you sure you want to delete "${vault.name}"? ${
        vault.currentAmount > 0
          ? `All ${formatCurrency(vault.currentAmount, currency)} in this vault will be returned to your spendable wallet immediately.`
          : ''
      }`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Vault',
          style: 'destructive',
          onPress: async () => {
            const res = await deleteSavingsVault(
              businessId,
              userId,
              vault.id
            );
            if (res.success) {
              onRefresh();
            } else {
              Alert.alert('Delete Failed', res.error || 'Could not delete vault.');
            }
          },
        },
      ]
    );
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

    if (actionType === 'withdraw' && activeVault.isLocked) {
      const isDateLocked =
        !!activeVault.lockUntilDate &&
        new Date(activeVault.lockUntilDate).getTime() > Date.now();

      const lockNotice = isDateLocked
        ? `"${activeVault.name}" is time-locked until ${new Date(
            activeVault.lockUntilDate!
          ).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}. Overriding the lock early will withdraw ${formatCurrency(
            actionNumericAmount,
            currency
          )}. Proceed?`
        : `"${activeVault.name}" is locked. Would you like to unlock it and withdraw ${formatCurrency(
            actionNumericAmount,
            currency
          )}?`;

      Alert.alert(
        isDateLocked ? 'Time-Lock Override' : 'Protected Discipline Mode',
        lockNotice,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: isDateLocked ? 'Override & Withdraw' : 'Unlock & Withdraw',
            style: isDateLocked ? 'destructive' : 'default',
            onPress: async () => {
              try {
                setIsActionLoading(true);
                await toggleVaultLock(businessId, userId, activeVault.id);
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
              } catch (err: any) {
                Alert.alert('Action Error', err.message || 'An error occurred.');
              } finally {
                setIsActionLoading(false);
              }
            },
          },
        ]
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

  const setPresetPercentage = (pct: number) => {
    if (!activeVault) return;
    const base = actionType === 'deposit' ? spendableBalance : activeVault.currentAmount;
    const calc = Math.floor(base * (pct / 100));
    setActionAmountStr(calc > 0 ? calc.toString() : '');
  };

  const openQuickDeposit = (vault: SavingsVault, amount: number) => {
    setActiveVault(vault);
    setActionType('deposit');
    setActionAmountStr(amount.toString());
  };

  return (
    <View style={styles.container}>
      {/* Telemetry Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerTitleGroup}>
          <View style={styles.sectionBadge}>
            <Target size={11} color="#10B981" />
            <Text style={styles.sectionBadgeText}>GOAL MATRIX</Text>
          </View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Target Milestone Vaults
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {onOpenScheduledStash && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={onOpenScheduledStash}
              style={[
                styles.autoStashBtn,
                {
                  backgroundColor: isDark
                    ? 'rgba(16, 185, 129, 0.12)'
                    : 'rgba(16, 185, 129, 0.08)',
                  borderColor: isDark
                    ? 'rgba(16, 185, 129, 0.25)'
                    : 'rgba(16, 185, 129, 0.2)',
                },
              ]}
            >
              <Repeat size={12} color="#10b981" />
              <Text
                style={[
                  styles.autoStashBtnText,
                  { color: isDark ? '#34d399' : '#059669' },
                ]}
              >
                Auto-Stash
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setShowCreateModal(true)}
            style={styles.addVaultBtnOuter}
          >
            <LinearGradient
              colors={['#10B981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.addVaultBtn}
            >
              <Plus size={13} color="#ffffff" strokeWidth={2.5} />
              <Text style={styles.addVaultBtnText}>New Goal</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* Vault Cards Stack */}
      {vaults.length === 0 ? (
        <View
          style={[
            styles.emptyChamber,
            {
              backgroundColor: isDark ? '#0a0f0e' : colors.card,
              borderColor: isDark ? 'rgba(16, 185, 129, 0.2)' : colors.border,
            },
          ]}
        >
          <View style={styles.emptyGlowAura}>
            <View style={styles.emptyIconPod}>
              <PiggyBank size={26} color="#10B981" />
            </View>
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Zero Active Milestone Pods
          </Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
            Initialize a protected vault to quarantine funds away from daily operational spending toward dedicated targets.
          </Text>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setShowCreateModal(true)}
            style={styles.emptyActionBtn}
          >
            <Sparkles size={13} color="#10B981" />
            <Text style={styles.emptyActionBtnText}>Initialize First Vault</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.vaultsGrid}>
          {vaults.map((vault) => {
            const progress =
              vault.targetAmount > 0
                ? Math.min(
                    100,
                    Math.round((vault.currentAmount / vault.targetAmount) * 100)
                  )
                : 0;
            const remaining = Math.max(0, vault.targetAmount - vault.currentAmount);
            const isCompleted = vault.currentAmount >= vault.targetAmount && vault.targetAmount > 0;
            const isDateLocked =
              vault.isLocked &&
              !!vault.lockUntilDate &&
              new Date(vault.lockUntilDate).getTime() > Date.now();
            const isDateMatured =
              vault.isLocked &&
              !!vault.lockUntilDate &&
              new Date(vault.lockUntilDate).getTime() <= Date.now();

            return (
              <View
                key={vault.id}
                style={[
                  styles.vaultPod,
                  {
                    backgroundColor: isDark ? '#090e0d' : colors.card,
                    borderColor: isCompleted
                      ? 'rgba(16, 185, 129, 0.5)'
                      : isDark
                      ? 'rgba(16, 185, 129, 0.18)'
                      : colors.border,
                  },
                ]}
              >
                {/* Hairline subtle top highlight */}
                <LinearGradient
                  colors={
                    isCompleted
                      ? ['rgba(16, 185, 129, 0.4)', 'rgba(52, 211, 153, 0.1)', 'transparent']
                      : ['rgba(16, 185, 129, 0.25)', 'transparent']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.podTopRim}
                />

                {/* Top Section */}
                <View style={styles.podHeader}>
                  <View style={styles.podTitleBox}>
                    <View
                      style={[
                        styles.podGlyph,
                        {
                          backgroundColor: isDark
                            ? 'rgba(16, 185, 129, 0.12)'
                            : 'rgba(16, 185, 129, 0.08)',
                          borderColor: 'rgba(16, 185, 129, 0.25)',
                        },
                      ]}
                    >
                      <Target size={16} color="#10B981" />
                    </View>
                    <View style={styles.podMeta}>
                      <Text style={[styles.podName, { color: colors.text }]} numberOfLines={1}>
                        {vault.name}
                      </Text>
                      <View style={styles.podBadgeRow}>
                        <TouchableOpacity
                          activeOpacity={0.75}
                          onPress={() => handleToggleLock(vault)}
                          style={[
                            styles.lockStatusChip,
                            {
                              backgroundColor: vault.isLocked
                                ? isDark
                                  ? 'rgba(16, 185, 129, 0.12)'
                                  : '#ecfdf5'
                                : isDark
                                ? 'rgba(255, 255, 255, 0.05)'
                                : '#f4f4f5',
                              borderColor: vault.isLocked
                                ? 'rgba(16, 185, 129, 0.3)'
                                : 'rgba(255, 255, 255, 0.1)',
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.lockDot,
                              { backgroundColor: vault.isLocked ? '#10B981' : '#94a3b8' },
                            ]}
                          />
                          {vault.isLocked ? (
                            <Lock size={9} color="#10B981" />
                          ) : (
                            <Unlock size={9} color="#94a3b8" />
                          )}
                          <Text
                            style={[
                              styles.lockText,
                              { color: vault.isLocked ? '#10B981' : '#94a3b8' },
                            ]}
                          >
                            {vault.isLocked ? 'PROTECTED LOCK' : 'FLEXIBLE'}
                          </Text>
                        </TouchableOpacity>

                        {isDateLocked && (
                          <View style={styles.timeLockChip}>
                            <Clock size={9} color="#38bdf8" />
                            <Text style={styles.timeLockText}>
                              Until {new Date(vault.lockUntilDate!).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </Text>
                          </View>
                        )}

                        {isDateMatured && (
                          <View style={styles.maturedLockChip}>
                            <Check size={9} color="#10B981" />
                            <Text style={styles.maturedLockText}>Lock Matured</Text>
                          </View>
                        )}

                        {isCompleted && (
                          <View style={styles.completedTag}>
                            <ShieldCheck size={9} color="#10B981" />
                            <Text style={styles.completedTagText}>MET</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>

                  <View style={styles.percentPill}>
                    <TrendingUp size={11} color="#10B981" />
                    <Text style={styles.percentPillText}>{progress}%</Text>
                  </View>
                </View>

                {/* Progress Metric Architecture */}
                <View style={styles.progressModule}>
                  <View style={styles.trackBackground}>
                    <LinearGradient
                      colors={['#059669', '#10B981', '#34D399']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[
                        styles.trackFill,
                        {
                          width: `${Math.max(progress > 0 ? 5 : 0, progress)}%`,
                        },
                      ]}
                    />
                    {/* Tick Milestones */}
                    <View style={[styles.tickMark, { left: '25%' }]} />
                    <View style={[styles.tickMark, { left: '50%' }]} />
                    <View style={[styles.tickMark, { left: '75%' }]} />
                  </View>
                </View>

                {/* Milestone Dynamics & Velocity Indicator */}
                <View style={styles.milestoneStrip}>
                  <View
                    style={[
                      styles.milestoneBadge,
                      {
                        backgroundColor: isCompleted
                          ? 'rgba(16, 185, 129, 0.12)'
                          : progress >= 50
                          ? 'rgba(56, 189, 248, 0.12)'
                          : 'rgba(245, 158, 11, 0.12)',
                        borderColor: isCompleted
                          ? 'rgba(16, 185, 129, 0.25)'
                          : progress >= 50
                          ? 'rgba(56, 189, 248, 0.25)'
                          : 'rgba(245, 158, 11, 0.25)',
                      },
                    ]}
                  >
                    <Sparkles
                      size={9}
                      color={
                        isCompleted
                          ? '#10B981'
                          : progress >= 50
                          ? '#38bdf8'
                          : '#f59e0b'
                      }
                    />
                    <Text
                      style={[
                        styles.milestoneBadgeText,
                        {
                          color: isCompleted
                            ? '#10B981'
                            : progress >= 50
                            ? '#38bdf8'
                            : '#f59e0b',
                        },
                      ]}
                    >
                      {isCompleted
                        ? '100% Target Reached'
                        : progress >= 75
                        ? 'Phase 3: Home Stretch'
                        : progress >= 50
                        ? 'Phase 2: Halfway Mark'
                        : progress >= 25
                        ? 'Phase 1: Quarter Mark'
                        : 'Initiation Stage'}
                    </Text>
                  </View>
                  {!isCompleted && (
                    <Text style={[styles.milestonePaceText, { color: colors.textSecondary }]}>
                      {progress >= 50 ? 'Velocity: High' : 'Velocity: Building'}
                    </Text>
                  )}
                </View>

                {/* Figures Telemetry */}
                <View style={styles.metricsRow}>
                  <View>
                    <Text style={styles.metricCaption}>ACCUMULATED</Text>
                    <Text style={[styles.metricValue, { color: colors.text }]}>
                      {formatCurrency(vault.currentAmount, currency)}
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.metricCaption}>
                      {isCompleted ? 'TARGET ACHIEVED' : 'REMAINING DEFICIT'}
                    </Text>
                    <Text
                      style={[
                        styles.metricSubValue,
                        { color: isCompleted ? '#10B981' : colors.textSecondary },
                      ]}
                    >
                      {isCompleted
                        ? formatCurrency(vault.targetAmount, currency)
                        : `${formatCurrency(remaining, currency)} left`}
                    </Text>
                  </View>
                </View>

                {/* Quick Allocation Micro-Chips (Direct 1-tap top up) */}
                {!isCompleted && spendableBalance >= 25 && (
                  <View style={styles.quickChipsBar}>
                    <Text style={styles.quickChipsLabel}>QUICK TOP-UP:</Text>
                    <View style={styles.quickChipsList}>
                      {QUICK_AMOUNTS.map((amt) => {
                        if (spendableBalance < amt) return null;
                        return (
                          <TouchableOpacity
                            key={amt}
                            activeOpacity={0.75}
                            onPress={() => openQuickDeposit(vault, amt)}
                            style={[
                              styles.quickChip,
                              {
                                backgroundColor: isDark
                                  ? 'rgba(16, 185, 129, 0.09)'
                                  : 'rgba(16, 185, 129, 0.08)',
                                borderColor: 'rgba(16, 185, 129, 0.22)',
                              },
                            ]}
                          >
                            <Zap size={9} color="#10B981" />
                            <Text style={styles.quickChipText}>
                              +{currencySymbol}{amt}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* Action Dock */}
                <View style={styles.actionsDock}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      setActiveVault(vault);
                      setActionType('deposit');
                      setActionAmountStr('');
                    }}
                    style={[
                      styles.podBtnPrimary,
                      {
                        backgroundColor: isDark
                          ? 'rgba(16, 185, 129, 0.16)'
                          : '#ecfdf5',
                        borderColor: 'rgba(16, 185, 129, 0.35)',
                      },
                    ]}
                  >
                    <ArrowDownRight size={13} color="#10B981" strokeWidth={2.5} />
                    <Text style={styles.podBtnPrimaryText}>Add Funds</Text>
                  </TouchableOpacity>

                  {onFundVault && (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => onFundVault(vault)}
                      style={[
                        styles.podBtnFundReal,
                        {
                          backgroundColor: isDark
                            ? 'rgba(56, 189, 248, 0.14)'
                            : '#f0f9ff',
                          borderColor: 'rgba(56, 189, 248, 0.35)',
                        },
                      ]}
                    >
                      <CreditCard size={12} color="#38bdf8" strokeWidth={2} />
                      <Text style={styles.podBtnFundRealText}>Direct Fund</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      setActiveVault(vault);
                      setActionType('withdraw');
                      setActionAmountStr('');
                    }}
                    style={[
                      styles.podBtnSecondary,
                      {
                        backgroundColor: isDark
                          ? 'rgba(255, 255, 255, 0.04)'
                          : '#f4f4f5',
                        borderColor: isDark
                          ? 'rgba(255, 255, 255, 0.08)'
                          : colors.border,
                      },
                    ]}
                  >
                    <ArrowUpLeft size={13} color={colors.textSecondary} strokeWidth={2} />
                    <Text
                      style={[styles.podBtnSecondaryText, { color: colors.textSecondary }]}
                    >
                      Draw
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleDeleteVault(vault)}
                    style={[
                      styles.podBtnDelete,
                      {
                        backgroundColor: isDark
                          ? 'rgba(239, 68, 68, 0.08)'
                          : '#fef2f2',
                        borderColor: isDark
                          ? 'rgba(239, 68, 68, 0.2)'
                          : '#fecaca',
                      },
                    ]}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Trash2 size={13} color="#ef4444" />
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
              {
                backgroundColor: isDark ? '#090e0d' : colors.card,
                borderColor: isDark ? 'rgba(16, 185, 129, 0.25)' : colors.border,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
                <View style={styles.modalIconPod}>
                  <Target size={17} color="#10B981" />
                </View>
                <View>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>
                    New Savings Goal
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                    Segregate liquidity toward target objectives
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setShowCreateModal(false)}
                style={styles.closeBtn}
              >
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputCategoryCaption}>VAULT IDENTIFIER</Text>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    color: colors.text,
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#f4f4f5',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.border,
                  },
                ]}
                placeholder="e.g. Emergency Reserve, Workstation, Escrow"
                placeholderTextColor={colors.textSecondary}
                value={newVaultName}
                onChangeText={setNewVaultName}
              />

              <Text style={[styles.inputCategoryCaption, { marginTop: 14 }]}>
                TARGET RESERVE GOAL ({currency})
              </Text>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    color: colors.text,
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#f4f4f5',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.border,
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
                  styles.switchPlate,
                  {
                    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.06)' : '#f4f4f5',
                    borderColor: isDark ? 'rgba(16, 185, 129, 0.2)' : colors.border,
                  },
                ]}
              >
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Lock size={12} color="#10B981" />
                    <Text style={[styles.switchTitle, { color: colors.text }]}>
                      Protected Discipline Mode
                    </Text>
                  </View>
                  <Text style={[styles.switchSub, { color: colors.textSecondary }]}>
                    Enforces conscious decision barriers to deter impulsive withdrawals
                  </Text>
                </View>
                <Switch
                  value={isLocked}
                  onValueChange={setIsLocked}
                  trackColor={{ false: '#52525b', true: '#10B981' }}
                  thumbColor="#ffffff"
                />
              </View>

              {isLocked && (
                <View style={styles.durationPlate}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Calendar size={12} color="#10B981" />
                    <Text style={styles.durationCaption}>TIME-LOCK COMMITMENT DURATION</Text>
                  </View>
                  <View style={styles.durationChipsRow}>
                    {LOCK_DURATION_PRESETS.map((preset) => {
                      const isSelected = lockDurationId === preset.id;
                      return (
                        <TouchableOpacity
                          key={preset.id}
                          activeOpacity={0.8}
                          onPress={() => setLockDurationId(preset.id)}
                          style={[
                            styles.durationChip,
                            {
                              backgroundColor: isSelected
                                ? isDark
                                  ? 'rgba(16, 185, 129, 0.22)'
                                  : '#d1fae5'
                                : isDark
                                ? 'rgba(255, 255, 255, 0.04)'
                                : '#f4f4f5',
                              borderColor: isSelected
                                ? '#10B981'
                                : isDark
                                ? 'rgba(255, 255, 255, 0.08)'
                                : colors.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.durationChipText,
                              {
                                color: isSelected
                                  ? isDark
                                    ? '#34d399'
                                    : '#059669'
                                  : colors.textSecondary,
                              },
                            ]}
                          >
                            {preset.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              <TouchableOpacity
                activeOpacity={0.88}
                disabled={isCreating || !newVaultName.trim()}
                onPress={handleCreateVault}
                style={styles.submitBtnOuter}
              >
                <LinearGradient
                  colors={
                    isCreating || !newVaultName.trim()
                      ? ['#475569', '#334155']
                      : ['#10B981', '#059669']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitBtnGradient}
                >
                  {isCreating ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={styles.submitBtnText}>Initialize Chamber</Text>
                  )}
                </LinearGradient>
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
              {
                backgroundColor: isDark ? '#090e0d' : colors.card,
                borderColor: isDark ? 'rgba(16, 185, 129, 0.25)' : colors.border,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
                <View
                  style={[
                    styles.modalIconPod,
                    {
                      backgroundColor:
                        actionType === 'deposit'
                          ? 'rgba(16, 185, 129, 0.15)'
                          : 'rgba(245, 158, 11, 0.15)',
                    },
                  ]}
                >
                  {actionType === 'deposit' ? (
                    <ArrowDownRight size={17} color="#10B981" />
                  ) : (
                    <ArrowUpLeft size={17} color="#f59e0b" />
                  )}
                </View>
                <View>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>
                    {actionType === 'deposit' ? 'Allocate to Vault' : 'Withdraw from Vault'}
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                    {activeVault?.name}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setActiveVault(null)}
                style={styles.closeBtn}
              >
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {/* Liquidity telemetry indicator */}
              <View
                style={[
                  styles.liquidityCallout,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#f4f4f5',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : colors.border,
                  },
                ]}
              >
                <Text style={[styles.liquidityCalloutLabel, { color: colors.textSecondary }]}>
                  {actionType === 'deposit' ? 'AVAILABLE WALLET RESERVE' : 'IN VAULT CHAMBER'}
                </Text>
                <Text style={[styles.liquidityCalloutVal, { color: colors.text }]}>
                  {formatCurrency(
                    actionType === 'deposit' ? spendableBalance : activeVault?.currentAmount || 0,
                    currency
                  )}
                </Text>
              </View>

              {/* Direct Real-Money Funding Shortcut */}
              {actionType === 'deposit' && onFundVault && activeVault && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    const vaultToFund = activeVault;
                    setActiveVault(null);
                    onFundVault(vaultToFund);
                  }}
                  style={[
                    styles.directFundPrompt,
                    {
                      backgroundColor: isDark
                        ? 'rgba(56, 189, 248, 0.1)'
                        : '#f0f9ff',
                      borderColor: isDark
                        ? 'rgba(56, 189, 248, 0.25)'
                        : 'rgba(56, 189, 248, 0.35)',
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.directFundIconPod,
                      {
                        backgroundColor: isDark
                          ? 'rgba(56, 189, 248, 0.18)'
                          : 'rgba(56, 189, 248, 0.12)',
                      },
                    ]}
                  >
                    <CreditCard size={15} color="#38bdf8" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.directFundPromptTitle, { color: colors.text }]}>
                      Deposit with Real Money
                    </Text>
                    <Text style={[styles.directFundPromptSubtitle, { color: colors.textSecondary }]}>
                      Fund directly via Card, Bank Transfer, or Mobile Money
                    </Text>
                  </View>
                  <ChevronRight size={15} color="#38bdf8" />
                </TouchableOpacity>
              )}

              {/* Amount Input */}
              <View
                style={[
                  styles.actionAmountFrame,
                  {
                    backgroundColor: isDark ? 'rgba(0, 0, 0, 0.4)' : '#f4f4f5',
                    borderColor: isDark ? 'rgba(16, 185, 129, 0.25)' : colors.border,
                  },
                ]}
              >
                <Text style={styles.actionCurrencyGlyph}>{currencySymbol}</Text>
                <TextInput
                  style={[styles.actionAmountTextInput, { color: colors.text }]}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="decimal-pad"
                  value={actionAmountStr}
                  onChangeText={setActionAmountStr}
                  autoFocus
                />
              </View>

              {/* Quick Stepper Chips (25%, 50%, 75%, MAX) */}
              <View style={styles.percentageChipsRow}>
                {[25, 50, 75, 100].map((pct) => (
                  <TouchableOpacity
                    key={pct}
                    activeOpacity={0.75}
                    onPress={() => setPresetPercentage(pct)}
                    style={[
                      styles.percentageChip,
                      {
                        backgroundColor: isDark
                          ? 'rgba(255, 255, 255, 0.05)'
                          : '#e4e4e7',
                        borderColor: isDark
                          ? 'rgba(255, 255, 255, 0.08)'
                          : colors.border,
                      },
                    ]}
                  >
                    <Text style={styles.percentageChipText}>
                      {pct === 100 ? 'MAX' : `${pct}%`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                activeOpacity={0.88}
                disabled={isActionLoading || actionNumericAmount <= 0}
                onPress={handleVaultAction}
                style={styles.submitBtnOuter}
              >
                <LinearGradient
                  colors={
                    isActionLoading || actionNumericAmount <= 0
                      ? ['#475569', '#334155']
                      : actionType === 'deposit'
                      ? ['#10B981', '#059669']
                      : ['#d97706', '#b45309']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitBtnGradient}
                >
                  {isActionLoading ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={styles.submitBtnText}>
                      {actionType === 'deposit' ? 'Confirm Allocation' : 'Release to Wallet'}
                    </Text>
                  )}
                </LinearGradient>
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
  headerTitleGroup: {
    gap: 3,
  },
  sectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
  },
  sectionBadgeText: {
    fontSize: 10,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 1.2,
    color: '#10B981',
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: -0.2,
  },
  autoStashBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6.5,
    borderRadius: 10,
    borderWidth: 1,
  },
  autoStashBtnText: {
    fontSize: 11,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 0.2,
  },
  addVaultBtnOuter: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  addVaultBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  addVaultBtnText: {
    fontSize: 11.5,
    color: '#ffffff',
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 0.2,
  },
  emptyChamber: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyGlowAura: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  emptyIconPod: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: 'SpaceGrotesk_700Bold',
    marginBottom: 5,
    letterSpacing: -0.2,
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    fontFamily: 'SpaceGrotesk_400Regular',
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  emptyActionBtnText: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#10B981',
  },
  vaultsGrid: {
    gap: 12,
  },
  vaultPod: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  podTopRim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  podHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  podTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 8,
  },
  podGlyph: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  podMeta: {
    flex: 1,
  },
  podName: {
    fontSize: 14.5,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  podBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lockStatusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 0.8,
  },
  lockDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  lockText: {
    fontSize: 9,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 0.6,
  },
  completedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 0.8,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  completedTagText: {
    fontSize: 8.5,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#10B981',
    letterSpacing: 0.6,
  },
  percentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 0.8,
    borderColor: 'rgba(16, 185, 129, 0.22)',
  },
  percentPillText: {
    fontSize: 11.5,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#10B981',
  },
  progressModule: {
    marginBottom: 12,
  },
  trackBackground: {
    height: 7,
    borderRadius: 3.5,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
  },
  trackFill: {
    height: '100%',
    borderRadius: 3.5,
  },
  tickMark: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1.5,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  metricCaption: {
    fontSize: 9.5,
    letterSpacing: 0.8,
    color: '#64748b',
    fontFamily: 'SpaceGrotesk_700Bold',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 15.5,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: -0.3,
  },
  metricSubValue: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
  quickChipsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  quickChipsLabel: {
    fontSize: 9,
    letterSpacing: 0.6,
    color: '#64748b',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  quickChipsList: {
    flexDirection: 'row',
    gap: 6,
    flex: 1,
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 7,
    borderWidth: 0.8,
  },
  quickChipText: {
    fontSize: 10.5,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#10B981',
  },
  actionsDock: {
    flexDirection: 'row',
    gap: 8,
  },
  podBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 11,
    borderWidth: 1,
  },
  podBtnPrimaryText: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#10B981',
  },
  podBtnFundReal: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 11,
    borderWidth: 1,
  },
  podBtnFundRealText: {
    fontSize: 11.5,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#38bdf8',
  },
  directFundPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  directFundIconPod: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  directFundPromptTitle: {
    fontSize: 12.5,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  directFundPromptSubtitle: {
    fontSize: 10.5,
    fontFamily: 'SpaceGrotesk_400Regular',
    marginTop: 1,
  },
  podBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 11,
    borderWidth: 1,
  },
  podBtnSecondaryText: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
  podBtnDelete: {
    width: 36,
    height: 36,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalIconPod: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.8,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  modalTitle: {
    fontSize: 15.5,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: -0.2,
  },
  modalSubtitle: {
    fontSize: 11,
    fontFamily: 'SpaceGrotesk_400Regular',
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
  },
  modalBody: {
    padding: 20,
  },
  inputCategoryCaption: {
    fontSize: 10,
    letterSpacing: 0.9,
    color: '#64748b',
    fontFamily: 'SpaceGrotesk_700Bold',
    marginBottom: 6,
  },
  formInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_500Medium',
  },
  switchPlate: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 13,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 14,
    marginBottom: 20,
  },
  switchTitle: {
    fontSize: 12.5,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  switchSub: {
    fontSize: 10.5,
    marginTop: 3,
    lineHeight: 14,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  liquidityCallout: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  liquidityCalloutLabel: {
    fontSize: 10,
    letterSpacing: 0.8,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  liquidityCalloutVal: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  actionAmountFrame: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    borderWidth: 1.2,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  actionCurrencyGlyph: {
    fontSize: 26,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#10B981',
    marginRight: 6,
  },
  actionAmountTextInput: {
    fontSize: 32,
    minWidth: 80,
    textAlign: 'center',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  percentageChipsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 20,
  },
  percentageChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentageChipText: {
    fontSize: 11,
    color: '#94a3b8',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  submitBtnOuter: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  submitBtnGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontSize: 14,
    color: '#ffffff',
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 0.3,
  },
  milestoneStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 4,
  },
  milestoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  milestoneBadgeText: {
    fontSize: 9.5,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 0.2,
  },
  milestonePaceText: {
    fontSize: 10,
    fontFamily: 'SpaceGrotesk_500Medium',
  },
  durationPlate: {
    marginBottom: 20,
  },
  durationCaption: {
    fontSize: 10,
    letterSpacing: 0.8,
    color: '#64748b',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  durationChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  durationChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9,
    borderWidth: 1,
  },
  durationChipText: {
    fontSize: 11,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  timeLockChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.28)',
  },
  timeLockText: {
    fontSize: 9.5,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#38bdf8',
  },
  maturedLockChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.28)',
  },
  maturedLockText: {
    fontSize: 9.5,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#10B981',
  },
});
