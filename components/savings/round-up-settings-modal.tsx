import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Switch,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  X,
  Sparkles,
  ShieldAlert,
  PiggyBank,
  Check,
  TrendingUp,
  Sliders,
  HelpCircle,
  Coins,
  Plus,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/providers/theme-provider';
import { SavingsVault, RoundUpSettings, RoundUpStep, RoundUpMultiplier } from '@/types';
import {
  updateRoundUpSettings,
  calculateRoundUp,
  createSavingsVault,
} from '@/services/savings-service';
import { formatCurrency, getCurrencySymbol } from '@/utils/currency-utils';

interface RoundUpSettingsModalProps {
  visible: boolean;
  businessId: string;
  userId: string;
  currency?: string;
  vaults: SavingsVault[];
  currentSettings?: RoundUpSettings | null;
  onClose: () => void;
  onSuccess: (updated: RoundUpSettings) => void;
}

const STEP_OPTIONS: { step: RoundUpStep; label: string; desc: string }[] = [
  { step: 1, label: '$1.00', desc: 'Nearest Dollar' },
  { step: 5, label: '$5.00', desc: 'Nearest $5' },
  { step: 10, label: '$10.00', desc: 'Nearest $10' },
];

const MULTIPLIER_OPTIONS: RoundUpMultiplier[] = [1, 2, 3, 5, 10];

export const RoundUpSettingsModal: React.FC<RoundUpSettingsModalProps> = ({
  visible,
  businessId,
  userId,
  currency = 'USD',
  vaults,
  currentSettings,
  onClose,
  onSuccess,
}) => {
  const { colors, isDark } = useTheme();

  const [enabled, setEnabled] = useState(currentSettings?.enabled ?? false);
  const [selectedVaultId, setSelectedVaultId] = useState(
    currentSettings?.targetVaultId || (vaults[0]?.id ?? '')
  );
  const [step, setStep] = useState<RoundUpStep>(currentSettings?.step ?? 1);
  const [multiplier, setMultiplier] = useState<RoundUpMultiplier>(
    currentSettings?.multiplier ?? 1
  );
  const [safetyFloorStr, setSafetyFloorStr] = useState(
    currentSettings?.safetyFloor ? String(currentSettings.safetyFloor) : '20'
  );
  const [isSaving, setIsSaving] = useState(false);
  const [simulatedExpense, setSimulatedExpense] = useState('14.25');

  const currencySymbol = getCurrencySymbol(currency);

  useEffect(() => {
    if (visible) {
      setEnabled(currentSettings?.enabled ?? false);
      setSelectedVaultId(currentSettings?.targetVaultId || (vaults[0]?.id ?? ''));
      setStep(currentSettings?.step ?? 1);
      setMultiplier(currentSettings?.multiplier ?? 1);
      setSafetyFloorStr(
        currentSettings?.safetyFloor !== undefined
          ? String(currentSettings.safetyFloor)
          : '20'
      );
    }
  }, [visible, currentSettings, vaults]);

  const selectedVault = vaults.find((v) => v.id === selectedVaultId) || vaults[0];

  // Dynamic preview calculation
  const simExpenseNum = parseFloat(simulatedExpense) || 14.25;
  const previewSettings: RoundUpSettings = {
    enabled: true,
    targetVaultId: selectedVaultId,
    step,
    multiplier,
    safetyFloor: parseFloat(safetyFloorStr) || 0,
  };
  const previewRoundUp = calculateRoundUp(simExpenseNum, previewSettings);

  const handleQuickCreateVault = async () => {
    try {
      setIsSaving(true);
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
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (e) {}
    }

    const targetId = selectedVaultId || (vaults[0]?.id ?? '');
    if (enabled && !targetId) {
      Alert.alert(
        'Select Destination Vault',
        'Please initialize a destination vault for your spare change.'
      );
      return;
    }

    setIsSaving(true);
    const safetyFloor = Math.max(0, parseFloat(safetyFloorStr) || 0);

    const targetVault = vaults.find((v) => v.id === targetId) || vaults[0];

    const updated: RoundUpSettings = {
      enabled,
      targetVaultId: targetId,
      targetVaultName: targetVault?.name || 'Primary Vault',
      step,
      multiplier,
      safetyFloor,
      paused: false,
    };

    try {
      const result = await updateRoundUpSettings(businessId, userId, updated);
      if (result.success) {
        if (Platform.OS !== 'web') {
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (e) {}
        }
        onSuccess(updated);
        onClose();
      } else {
        Alert.alert('Save Failed', result.error || 'Unable to update settings.');
      }
    } catch (err: any) {
      console.error('Error updating round-up settings:', err);
      Alert.alert('Error', err?.message || 'Unable to save round-up settings.');
    } finally {
      setIsSaving(false);
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
                  styles.sparkleBox,
                  {
                    backgroundColor: isDark
                      ? 'rgba(16, 185, 129, 0.15)'
                      : 'rgba(16, 185, 129, 0.1)',
                  },
                ]}
              >
                <Sparkles size={18} color="#10b981" />
              </View>
              <View>
                <Text style={[styles.headerTitle, { color: textPrimary }]}>
                  Spare Change Round-Up
                </Text>
                <Text style={[styles.headerSubtitle, { color: textSecondary }]}>
                  Automatically save every time you spend
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

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* 1. Master Toggle */}
            <View
              style={[
                styles.toggleCard,
                {
                  backgroundColor: cardBg,
                  borderColor: enabled ? '#10b981' : itemBorder,
                },
              ]}
            >
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={[styles.toggleLabel, { color: textPrimary }]}>
                  Enable Automated Round-Ups
                </Text>
                <Text style={[styles.toggleDescription, { color: textSecondary }]}>
                  Rounds up logged expense entries and deposits the spare change
                  directly into your vault.
                </Text>
              </View>
              <Switch
                value={enabled}
                onValueChange={(val) => {
                  if (Platform.OS !== 'web') {
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    } catch (e) {}
                  }
                  setEnabled(val);
                }}
                trackColor={{
                  false: isDark ? '#1e293b' : '#cbd5e1',
                  true: '#10b981',
                }}
                thumbColor="#ffffff"
              />
            </View>

            {enabled && (
              <>
                {/* 2. Target Vault Selector */}
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
                          No savings vaults found.
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
                                  Current:{' '}
                                  {formatCurrency(vault.currentAmount, currency)} /{' '}
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

                {/* 3. Round-Up Step Options */}
                <View style={styles.sectionGroup}>
                  <Text style={[styles.sectionLabel, { color: textSecondary }]}>
                    ROUND-UP PRECISION STEP
                  </Text>
                  <View style={styles.optionsRow}>
                    {STEP_OPTIONS.map((opt) => {
                      const isSelected = step === opt.step;
                      return (
                        <TouchableOpacity
                          key={opt.step}
                          activeOpacity={0.8}
                          onPress={() => {
                            if (Platform.OS !== 'web') {
                              try {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              } catch (e) {}
                            }
                            setStep(opt.step);
                          }}
                          style={[
                            styles.stepOptionCard,
                            {
                              backgroundColor: isSelected
                                ? isDark
                                  ? 'rgba(16, 185, 129, 0.18)'
                                  : 'rgba(16, 185, 129, 0.1)'
                                : cardBg,
                              borderColor: isSelected ? '#10b981' : itemBorder,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.stepLabel,
                              { color: isSelected ? '#10b981' : textPrimary },
                            ]}
                          >
                            {opt.label}
                          </Text>
                          <Text
                            style={[
                              styles.stepDesc,
                              { color: isSelected ? '#34d399' : textSecondary },
                            ]}
                          >
                            {opt.desc}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* 4. Multiplier Accelerator */}
                <View style={styles.sectionGroup}>
                  <Text style={[styles.sectionLabel, { color: textSecondary }]}>
                    SAVINGS MULTIPLIER ACCELERATOR
                  </Text>
                  <View style={styles.multiplierRow}>
                    {MULTIPLIER_OPTIONS.map((m) => {
                      const isSelected = multiplier === m;
                      return (
                        <TouchableOpacity
                          key={m}
                          activeOpacity={0.8}
                          onPress={() => {
                            if (Platform.OS !== 'web') {
                              try {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              } catch (e) {}
                            }
                            setMultiplier(m);
                          }}
                          style={[
                            styles.multiplierChip,
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
                              styles.multiplierText,
                              { color: isSelected ? '#ffffff' : textPrimary },
                            ]}
                          >
                            {m}x
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* 5. Safety Floor Minimum Balance Guard */}
                <View style={styles.sectionGroup}>
                  <View style={styles.labelWithTip}>
                    <Text style={[styles.sectionLabel, { color: textSecondary }]}>
                      MINIMUM SAFETY BALANCE GUARD
                    </Text>
                    <ShieldAlert size={14} color="#10b981" />
                  </View>
                  <Text style={[styles.fieldTip, { color: textSecondary }]}>
                    If your spendable balance drops below this amount, round-ups are
                    automatically paused to protect your liquid cash.
                  </Text>
                  <View
                    style={[
                      styles.safetyInputBox,
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
                      style={[styles.safetyInput, { color: textPrimary }]}
                      keyboardType="numeric"
                      value={safetyFloorStr}
                      onChangeText={setSafetyFloorStr}
                      placeholder="20.00"
                      placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
                    />
                  </View>
                </View>

                {/* 6. Live Interactive Simulator Preview */}
                <View
                  style={[
                    styles.simulatorBox,
                    {
                      backgroundColor: isDark
                        ? 'rgba(16, 185, 129, 0.08)'
                        : 'rgba(16, 185, 129, 0.05)',
                      borderColor: 'rgba(16, 185, 129, 0.2)',
                    },
                  ]}
                >
                  <View style={styles.simHeader}>
                    <Coins size={16} color="#10b981" />
                    <Text style={[styles.simTitle, { color: textPrimary }]}>
                      Live Round-Up Preview
                    </Text>
                  </View>

                  <View style={styles.simBodyRow}>
                    <View>
                      <Text style={[styles.simSubtext, { color: textSecondary }]}>
                        Sample Expense
                      </Text>
                      <TextInput
                        style={[styles.simInput, { color: textPrimary }]}
                        value={simulatedExpense}
                        onChangeText={setSimulatedExpense}
                        keyboardType="numeric"
                        placeholder="14.25"
                      />
                    </View>

                    <View style={styles.simArrow}>
                      <Text style={{ color: '#10b981', fontSize: 18 }}>➔</Text>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.simSubtext, { color: textSecondary }]}>
                        Auto-Saved to Vault
                      </Text>
                      <Text style={styles.simOutputAmount}>
                        +{formatCurrency(previewRoundUp, currency)}
                      </Text>
                    </View>
                  </View>
                </View>
              </>
            )}
          </ScrollView>

          {/* Action Footer */}
          <View style={styles.footerRow}>
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={isSaving || (enabled && !selectedVaultId)}
              onPress={handleSave}
              style={styles.saveBtnWrapper}
            >
              <LinearGradient
                colors={['#10b981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveBtn}
              >
                {isSaving ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Preferences</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
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
    maxHeight: '88%',
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
  sparkleBox: {
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
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 18,
  },
  toggleCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  toggleLabel: {
    fontSize: 14.5,
    fontFamily: 'SpaceGrotesk_700Bold',
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 12.5,
    fontFamily: 'SpaceGrotesk_400Regular',
    lineHeight: 17,
  },
  sectionGroup: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 0.8,
  },
  labelWithTip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fieldTip: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_400Regular',
    lineHeight: 16,
    marginBottom: 2,
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
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  stepOptionCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  stepLabel: {
    fontSize: 15,
    fontFamily: 'SpaceGrotesk_700Bold',
    marginBottom: 2,
  },
  stepDesc: {
    fontSize: 10.5,
    fontFamily: 'SpaceGrotesk_500Medium',
    textAlign: 'center',
  },
  multiplierRow: {
    flexDirection: 'row',
    gap: 8,
  },
  multiplierChip: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  multiplierText: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  safetyInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    gap: 8,
  },
  currencyPrefix: {
    fontSize: 15,
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
  safetyInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'SpaceGrotesk_600SemiBold',
    height: '100%',
  },
  simulatorBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  simHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  simTitle: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  simBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 10,
    borderRadius: 10,
  },
  simSubtext: {
    fontSize: 11,
    fontFamily: 'SpaceGrotesk_400Regular',
    marginBottom: 2,
  },
  simInput: {
    fontSize: 15,
    fontFamily: 'SpaceGrotesk_700Bold',
    borderBottomWidth: 1,
    borderBottomColor: '#10b981',
    minWidth: 70,
  },
  simArrow: {
    paddingHorizontal: 8,
  },
  simOutputAmount: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#10b981',
  },
  footerRow: {
    paddingHorizontal: 22,
    paddingTop: 8,
  },
  saveBtnWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  saveBtn: {
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: 15,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#ffffff',
  },
});
