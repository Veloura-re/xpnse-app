import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  X,
  Calendar,
  Clock,
  PiggyBank,
  Plus,
  Trash2,
  Pause,
  Play,
  Check,
  TrendingUp,
  Coins,
  Repeat,
  Zap,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/providers/theme-provider';
import { SavingsVault, ScheduledStashRule, ScheduledStashFrequency } from '@/types';
import {
  createScheduledStashRule,
  deleteScheduledStashRule,
  togglePauseScheduledStashRule,
  subscribeToScheduledStashRules,
  executeScheduledStashRuleNow,
  createSavingsVault,
} from '@/services/savings-service';
import { formatCurrency, getCurrencySymbol } from '@/utils/currency-utils';

interface ScheduledStashModalProps {
  visible: boolean;
  businessId: string;
  userId: string;
  currency?: string;
  vaults: SavingsVault[];
  onClose: () => void;
  onSuccess: () => void;
}

const FREQUENCY_OPTIONS: {
  frequency: ScheduledStashFrequency;
  label: string;
  sublabel: string;
}[] = [
  { frequency: 'daily', label: 'Daily', sublabel: 'Every day at 08:00' },
  { frequency: 'weekly', label: 'Friday Stash', sublabel: 'Every Friday' },
  { frequency: 'biweekly', label: 'Bi-Weekly', sublabel: 'Every 2 weeks' },
  { frequency: 'payday', label: 'Payday Split', sublabel: '1st & 15th of month' },
  { frequency: 'monthly', label: 'Monthly', sublabel: '1st of every month' },
];

const PRESET_AMOUNTS = [10, 25, 50, 100, 200];

export const ScheduledStashModal: React.FC<ScheduledStashModalProps> = ({
  visible,
  businessId,
  userId,
  currency = 'USD',
  vaults,
  onClose,
  onSuccess,
}) => {
  const { colors, isDark } = useTheme();

  const [activeTab, setActiveTab] = useState<'create' | 'rules'>('create');
  const [selectedVaultId, setSelectedVaultId] = useState(vaults[0]?.id ?? '');
  const [amountStr, setAmountStr] = useState('25');
  const [frequency, setFrequency] = useState<ScheduledStashFrequency>('weekly');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rules, setRules] = useState<ScheduledStashRule[]>([]);

  const currencySymbol = getCurrencySymbol(currency);
  const numericAmount = parseFloat(amountStr) || 0;

  const selectedVault = vaults.find((v) => v.id === selectedVaultId) || vaults[0];

  useEffect(() => {
    if (!businessId || !userId || !visible) return;

    const unsub = subscribeToScheduledStashRules(businessId, userId, (stashList) => {
      setRules(stashList);
      if (stashList.length > 0 && activeTab === 'create' && !amountStr) {
        setActiveTab('rules');
      }
    });

    return () => unsub();
  }, [businessId, userId, visible]);

  const handleCreate = async () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (e) {}
    }

    if (numericAmount <= 0) {
      return;
    }
    if (!selectedVaultId) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createScheduledStashRule({
        businessId,
        userId,
        targetVaultId: selectedVaultId,
        targetVaultName: selectedVault?.name || 'Savings Vault',
        amount: numericAmount,
        frequency,
      });

      if (result.success) {
        if (Platform.OS !== 'web') {
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (e) {}
        }
        setAmountStr('25');
        setActiveTab('rules');
        onSuccess();
      }
    } catch (err) {
      console.error('Failed to create scheduled stash:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (e) {}
    }

    await deleteScheduledStashRule(businessId, ruleId);
  };

  const handleTogglePause = async (rule: ScheduledStashRule) => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (e) {}
    }

    await togglePauseScheduledStashRule(businessId, rule.id);
  };

  const handleExecuteNow = async (rule: ScheduledStashRule) => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (e) {}
    }
    const res = await executeScheduledStashRuleNow(businessId, userId, rule.id);
    if (res.success) {
      if (Platform.OS !== 'web') {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (e) {}
      }
      Alert.alert(
        'Stash Executed',
        `Successfully transferred ${formatCurrency(rule.amount, currency)} to "${rule.targetVaultName || 'Vault'}".`
      );
      onSuccess();
    } else {
      Alert.alert('Execution Notice', res.error || 'Could not execute scheduled stash.');
    }
  };

  const handleQuickCreateVault = async () => {
    try {
      setIsSubmitting(true);
      const res = await createSavingsVault({
        businessId,
        userId,
        name: 'Emergency Reserve Vault',
        targetAmount: 1000,
        currency,
        isLocked: true,
      });
      if (res.success && res.vault) {
        setSelectedVaultId(res.vault.id);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not provision vault.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const textPrimary = isDark ? '#ffffff' : '#0f172a';
  const textSecondary = isDark ? '#94a3b8' : '#64748b';
  const cardBg = isDark ? '#0c1613' : '#f8fafc';
  const cardBorder = isDark ? 'rgba(16, 185, 129, 0.25)' : 'rgba(16, 185, 129, 0.2)';
  const itemBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.modalContainer,
            {
              backgroundColor: isDark ? '#07120e' : '#ffffff',
              borderColor: cardBorder,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleGroup}>
              <View
                style={[
                  styles.iconBox,
                  {
                    backgroundColor: isDark
                      ? 'rgba(16, 185, 129, 0.15)'
                      : 'rgba(16, 185, 129, 0.1)',
                  },
                ]}
              >
                <Repeat size={18} color="#10b981" />
              </View>
              <View>
                <Text style={[styles.headerTitle, { color: textPrimary }]}>
                  Scheduled Auto-Stash
                </Text>
                <Text style={[styles.headerSubtitle, { color: textSecondary }]}>
                  Automate recurring deposits into your goals
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.closeBtn,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.06)'
                    : '#f1f5f9',
                },
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={18} color={textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Segment Tabs */}
          <View style={styles.tabsRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setActiveTab('create')}
              style={[
                styles.tabBtn,
                activeTab === 'create' && styles.activeTabBtn,
                {
                  backgroundColor:
                    activeTab === 'create'
                      ? '#10b981'
                      : isDark
                      ? 'rgba(255, 255, 255, 0.04)'
                      : '#f1f5f9',
                },
              ]}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  { color: activeTab === 'create' ? '#ffffff' : textSecondary },
                ]}
              >
                Create New Stash
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setActiveTab('rules')}
              style={[
                styles.tabBtn,
                activeTab === 'rules' && styles.activeTabBtn,
                {
                  backgroundColor:
                    activeTab === 'rules'
                      ? '#10b981'
                      : isDark
                      ? 'rgba(255, 255, 255, 0.04)'
                      : '#f1f5f9',
                },
              ]}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  { color: activeTab === 'rules' ? '#ffffff' : textSecondary },
                ]}
              >
                Active Stashes ({rules.length})
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {activeTab === 'create' ? (
              <>
                {/* 1. Destination Vault */}
                <View style={styles.sectionGroup}>
                  <Text style={[styles.sectionLabel, { color: textSecondary }]}>
                    DESTINATION VAULT
                  </Text>
                  {vaults.length === 0 ? (
                    <View
                      style={[
                        styles.emptyVaultNotice,
                        {
                          backgroundColor: isDark
                            ? 'rgba(16, 185, 129, 0.08)'
                            : '#ecfdf5',
                          borderColor: isDark
                            ? 'rgba(16, 185, 129, 0.25)'
                            : '#a7f3d0',
                        },
                      ]}
                    >
                      <PiggyBank size={18} color="#10B981" />
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={[styles.emptyVaultText, { color: textPrimary }]}>
                          No target vaults available.
                        </Text>
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={handleQuickCreateVault}
                          style={styles.quickCreateVaultBtn}
                        >
                          <Plus size={12} color="#ffffff" />
                          <Text style={styles.quickCreateVaultBtnText}>
                            Quick Initialize Emergency Vault
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.vaultList}>
                      {vaults.map((vault) => {
                        const isSelected = vault.id === selectedVaultId;
                        return (
                          <TouchableOpacity
                            key={vault.id}
                            activeOpacity={0.75}
                            onPress={() => {
                              if (Platform.OS !== 'web') {
                                try {
                                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                } catch (e) {}
                              }
                              setSelectedVaultId(vault.id);
                            }}
                            style={[
                              styles.vaultItem,
                              {
                                backgroundColor: isSelected
                                  ? isDark
                                    ? 'rgba(16, 185, 129, 0.15)'
                                    : 'rgba(16, 185, 129, 0.08)'
                                  : cardBg,
                                borderColor: isSelected ? '#10b981' : itemBorder,
                              },
                            ]}
                          >
                            <View style={styles.vaultItemLeft}>
                              <PiggyBank
                                size={18}
                                color={isSelected ? '#10b981' : textSecondary}
                              />
                              <View>
                                <Text
                                  style={[
                                    styles.vaultItemName,
                                    {
                                      color: isSelected ? '#10b981' : textPrimary,
                                    },
                                  ]}
                                >
                                  {vault.name}
                                </Text>
                                <Text
                                  style={[
                                    styles.vaultItemBalance,
                                    { color: textSecondary },
                                  ]}
                                >
                                  {formatCurrency(vault.currentAmount, currency)} of{' '}
                                  {formatCurrency(vault.targetAmount, currency)}
                                </Text>
                              </View>
                            </View>

                            {isSelected && (
                              <View style={styles.checkCircle}>
                                <Check size={12} color="#ffffff" />
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>

                {/* 2. Amount Input & Quick Chips */}
                <View style={styles.sectionGroup}>
                  <Text style={[styles.sectionLabel, { color: textSecondary }]}>
                    RECURRING STASH AMOUNT
                  </Text>
                  <View
                    style={[
                      styles.amountInputContainer,
                      {
                        backgroundColor: cardBg,
                        borderColor: itemBorder,
                      },
                    ]}
                  >
                    <Text style={[styles.currencyPrefix, { color: textSecondary }]}>
                      {currencySymbol}
                    </Text>
                    <TextInput
                      style={[styles.amountInput, { color: textPrimary }]}
                      keyboardType="numeric"
                      value={amountStr}
                      onChangeText={setAmountStr}
                      placeholder="50.00"
                      placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
                    />
                  </View>

                  <View style={styles.chipsRow}>
                    {PRESET_AMOUNTS.map((amt) => {
                      const isSelected = numericAmount === amt;
                      return (
                        <TouchableOpacity
                          key={amt}
                          activeOpacity={0.8}
                          onPress={() => {
                            if (Platform.OS !== 'web') {
                              try {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              } catch (e) {}
                            }
                            setAmountStr(String(amt));
                          }}
                          style={[
                            styles.chip,
                            {
                              backgroundColor: isSelected
                                ? '#10b981'
                                : isDark
                                ? '#13221d'
                                : '#f1f5f9',
                              borderColor: isSelected ? '#10b981' : itemBorder,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              { color: isSelected ? '#ffffff' : textPrimary },
                            ]}
                          >
                            +{currencySymbol}
                            {amt}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* 3. Frequency Rhythm Selector */}
                <View style={styles.sectionGroup}>
                  <Text style={[styles.sectionLabel, { color: textSecondary }]}>
                    STASH FREQUENCY RHYTHM
                  </Text>
                  <View style={styles.frequencyList}>
                    {FREQUENCY_OPTIONS.map((opt) => {
                      const isSelected = frequency === opt.frequency;
                      return (
                        <TouchableOpacity
                          key={opt.frequency}
                          activeOpacity={0.8}
                          onPress={() => {
                            if (Platform.OS !== 'web') {
                              try {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              } catch (e) {}
                            }
                            setFrequency(opt.frequency);
                          }}
                          style={[
                            styles.freqCard,
                            {
                              backgroundColor: isSelected
                                ? isDark
                                  ? 'rgba(16, 185, 129, 0.18)'
                                  : 'rgba(16, 185, 129, 0.08)'
                                : cardBg,
                              borderColor: isSelected ? '#10b981' : itemBorder,
                            },
                          ]}
                        >
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[
                                styles.freqLabel,
                                {
                                  color: isSelected ? '#10b981' : textPrimary,
                                },
                              ]}
                            >
                              {opt.label}
                            </Text>
                            <Text
                              style={[
                                styles.freqSublabel,
                                { color: textSecondary },
                              ]}
                            >
                              {opt.sublabel}
                            </Text>
                          </View>
                          {isSelected && (
                            <View style={styles.checkCircle}>
                              <Check size={12} color="#ffffff" />
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Forecast Banner */}
                <View
                  style={[
                    styles.forecastBanner,
                    {
                      backgroundColor: isDark
                        ? 'rgba(16, 185, 129, 0.08)'
                        : 'rgba(16, 185, 129, 0.05)',
                      borderColor: 'rgba(16, 185, 129, 0.2)',
                    },
                  ]}
                >
                  <Coins size={18} color="#10b981" />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.forecastTitle, { color: textPrimary }]}>
                      Growth Forecast
                    </Text>
                    <Text style={[styles.forecastBody, { color: textSecondary }]}>
                      Stashing {formatCurrency(numericAmount, currency)}{' '}
                      {frequency === 'daily'
                        ? 'daily'
                        : frequency === 'weekly'
                        ? 'weekly'
                        : frequency === 'biweekly'
                        ? 'every 2 weeks'
                        : frequency === 'payday'
                        ? 'twice a month'
                        : 'monthly'}{' '}
                      will deposit approximately{' '}
                      <Text style={{ color: '#10b981', fontWeight: '700', fontFamily: 'SpaceGrotesk_700Bold' }}>
                        {formatCurrency(
                          frequency === 'daily'
                            ? numericAmount * 30
                            : frequency === 'weekly'
                            ? numericAmount * 4
                            : frequency === 'biweekly'
                            ? numericAmount * 2
                            : frequency === 'payday'
                            ? numericAmount * 2
                            : numericAmount,
                          currency
                        )}
                      </Text>{' '}
                      per month into {selectedVault?.name || 'your vault'}.
                    </Text>
                  </View>
                </View>
              </>
            ) : (
              /* Active Rules List */
              <View style={styles.rulesContainer}>
                {rules.length === 0 ? (
                  <View style={styles.emptyRulesBox}>
                    <Repeat size={32} color={textSecondary} />
                    <Text style={[styles.emptyRulesTitle, { color: textPrimary }]}>
                      No Active Scheduled Stashes
                    </Text>
                    <Text style={[styles.emptyRulesSubtitle, { color: textSecondary }]}>
                      Create your first automated recurring stash to build steady savings.
                    </Text>
                  </View>
                ) : (
                  rules.map((rule) => {
                    const isPaused = rule.status === 'paused';
                    return (
                      <View
                        key={rule.id}
                        style={[
                          styles.ruleCard,
                          {
                            backgroundColor: cardBg,
                            borderColor: isPaused ? itemBorder : cardBorder,
                          },
                        ]}
                      >
                        <View style={styles.ruleCardTop}>
                          <View style={styles.ruleInfoLeft}>
                            <Text style={[styles.ruleAmount, { color: textPrimary }]}>
                              {formatCurrency(rule.amount, currency)}{' '}
                              <Text
                                style={{
                                  fontSize: 12,
                                  color: '#10b981',
                                  textTransform: 'capitalize',
                                }}
                              >
                                • {rule.frequency}
                              </Text>
                            </Text>
                            <Text
                              style={[styles.ruleTarget, { color: textSecondary }]}
                            >
                              Destination: {rule.targetVaultName || 'Vault'}
                            </Text>
                            <Text style={[styles.ruleNextDate, { color: textSecondary }]}>
                              Next Execution: {rule.nextDueDate}
                            </Text>
                          </View>

                          <View style={styles.ruleActions}>
                            <TouchableOpacity
                              activeOpacity={0.7}
                              onPress={() => handleExecuteNow(rule)}
                              style={[
                                styles.actionBtn,
                                {
                                  backgroundColor: isDark
                                    ? 'rgba(16, 185, 129, 0.15)'
                                    : 'rgba(16, 185, 129, 0.1)',
                                  borderColor: 'rgba(16, 185, 129, 0.3)',
                                },
                              ]}
                            >
                              <Zap size={14} color="#10b981" />
                            </TouchableOpacity>

                            <TouchableOpacity
                              activeOpacity={0.7}
                              onPress={() => handleTogglePause(rule)}
                              style={[
                                styles.actionBtn,
                                {
                                  backgroundColor: isDark
                                    ? 'rgba(255, 255, 255, 0.08)'
                                    : '#f1f5f9',
                                },
                              ]}
                            >
                              {isPaused ? (
                                <Play size={15} color="#10b981" />
                              ) : (
                                <Pause size={15} color="#f59e0b" />
                              )}
                            </TouchableOpacity>

                            <TouchableOpacity
                              activeOpacity={0.7}
                              onPress={() => handleDeleteRule(rule.id)}
                              style={[
                                styles.actionBtn,
                                {
                                  backgroundColor: isDark
                                    ? 'rgba(239, 68, 68, 0.12)'
                                    : '#fee2e2',
                                },
                              ]}
                            >
                              <Trash2 size={15} color="#ef4444" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            )}
          </ScrollView>

          {/* Create Button Footer */}
          {activeTab === 'create' && (
            <View style={styles.footerRow}>
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={isSubmitting || numericAmount <= 0 || !selectedVaultId}
                onPress={handleCreate}
                style={styles.createBtnWrapper}
              >
                <LinearGradient
                  colors={['#10b981', '#059669']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.createBtn}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={styles.createBtnText}>
                      Activate Scheduled Stash
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12.5,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 6,
    gap: 10,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  activeTabBtn: {
    shadowColor: '#10b981',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 20,
    gap: 18,
  },
  sectionGroup: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 0.8,
  },
  emptyVaultNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  emptyVaultText: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk_500Medium',
  },
  quickCreateVaultBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10b981',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  quickCreateVaultBtnText: {
    fontSize: 11,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#ffffff',
  },
  vaultList: {
    gap: 8,
  },
  vaultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  vaultItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  vaultItemName: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  vaultItemBalance: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    gap: 8,
  },
  currencyPrefix: {
    fontSize: 20,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  amountInput: {
    flex: 1,
    fontSize: 20,
    fontFamily: 'SpaceGrotesk_700Bold',
    height: '100%',
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12.5,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  frequencyList: {
    gap: 8,
  },
  freqCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  freqLabel: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_700Bold',
    marginBottom: 2,
  },
  freqSublabel: {
    fontSize: 11.5,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  forecastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  forecastTitle: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk_700Bold',
    marginBottom: 2,
  },
  forecastBody: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_400Regular',
    lineHeight: 17,
  },
  rulesContainer: {
    gap: 10,
  },
  emptyRulesBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 10,
  },
  emptyRulesTitle: {
    fontSize: 15,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  emptyRulesSubtitle: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk_400Regular',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  ruleCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
  },
  ruleCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ruleInfoLeft: {
    flex: 1,
    gap: 2,
  },
  ruleAmount: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  ruleTarget: {
    fontSize: 12.5,
    fontFamily: 'SpaceGrotesk_500Medium',
  },
  ruleNextDate: {
    fontSize: 11.5,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  ruleActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerRow: {
    paddingHorizontal: 22,
    paddingTop: 8,
  },
  createBtnWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  createBtn: {
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBtnText: {
    fontSize: 15,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#ffffff',
  },
});
