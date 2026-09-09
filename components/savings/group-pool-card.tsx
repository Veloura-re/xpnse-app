import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Users,
  Plus,
  X,
  HeartHandshake,
  ShieldCheck,
  Zap,
} from 'lucide-react-native';
import { useTheme } from '@/providers/theme-provider';
import { Business } from '@/types';
import { contributeToGroupPool } from '@/services/savings-service';
import { formatCurrency, getCurrencySymbol } from '@/utils/currency-utils';

interface GroupPoolCardProps {
  business: Business;
  userId: string;
  userName: string;
  spendableBalance: number;
  currency?: string;
  onRefresh: () => void;
}

const POOL_PRESETS = [10, 25, 50, 100];

export const GroupPoolCard: React.FC<GroupPoolCardProps> = ({
  business,
  userId,
  userName,
  spendableBalance,
  currency = 'USD',
  onRefresh,
}) => {
  const { colors, isDark } = useTheme();
  const [showModal, setShowModal] = useState(false);
  const [amountStr, setAmountStr] = useState('25');
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const poolBalance = business.groupPoolBalance || 0;
  const members = business.members || [];
  const memberCount = members.length > 0 ? members.length : 1;
  const currencySymbol = getCurrencySymbol(currency);
  const numericAmount = parseFloat(amountStr) || 0;

  const handleContribute = async () => {
    if (numericAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a contribution greater than 0.');
      return;
    }

    if (numericAmount > spendableBalance) {
      Alert.alert(
        'Insufficient Balance',
        `Your spendable wallet balance is ${formatCurrency(spendableBalance, currency)}.`
      );
      return;
    }

    try {
      setIsLoading(true);
      const res = await contributeToGroupPool({
        businessId: business.id,
        userId,
        userName,
        amount: numericAmount,
        currency,
        note: note.trim() || undefined,
      });

      if (res.success) {
        setShowModal(false);
        setAmountStr('25');
        setNote('');
        onRefresh();
      } else {
        Alert.alert('Contribution Failed', res.error || 'Could not process contribution.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'An error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const openPresetPledge = (amt: number) => {
    setAmountStr(amt.toString());
    setShowModal(true);
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.syndicateCard,
          {
            backgroundColor: isDark ? '#090e0d' : colors.card,
            borderColor: isDark ? 'rgba(16, 185, 129, 0.22)' : colors.border,
          },
        ]}
      >
        {/* Top Rim Gradient */}
        <LinearGradient
          colors={['rgba(16, 185, 129, 0.35)', 'rgba(52, 211, 153, 0.1)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.topRim}
        />

        {/* Header Telemetry */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={styles.syndicateBadge}>
              <Users size={10} color="#10B981" />
              <Text style={styles.syndicateBadgeText}>COLLECTIVE TREASURY</Text>
            </View>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Syndicate Reserve Pool
            </Text>
          </View>

          <View style={styles.consensusTag}>
            <View style={styles.consensusDot} />
            <Text style={styles.consensusText}>ACTIVE CONSENSUS</Text>
          </View>
        </View>

        {/* Central Reserve Vault Chamber Display */}
        <View
          style={[
            styles.vaultChamberDisplay,
            {
              backgroundColor: isDark ? 'rgba(16, 185, 129, 0.05)' : '#ecfdf5',
              borderColor: isDark ? 'rgba(16, 185, 129, 0.18)' : 'rgba(16, 185, 129, 0.2)',
            },
          ]}
        >
          <View style={styles.chamberHeaderRow}>
            <Text style={styles.chamberCaption}>SHARED POOL BALANCE</Text>
            {/* Member avatar cluster */}
            <View style={styles.avatarCluster}>
              {members.slice(0, 3).map((m, idx) => (
                <View
                  key={m.userId || idx}
                  style={[
                    styles.avatarBubble,
                    {
                      marginLeft: idx > 0 ? -8 : 0,
                      zIndex: 10 - idx,
                      backgroundColor: idx === 0 ? '#10B981' : idx === 1 ? '#059669' : '#047857',
                    },
                  ]}
                >
                  <Text style={styles.avatarInitial}>
                    {(m.role || 'M').charAt(0).toUpperCase()}
                  </Text>
                </View>
              ))}
              <Text style={[styles.memberCountLabel, { color: colors.textSecondary }]}>
                {memberCount} participant{memberCount !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>

          <View style={styles.balanceReadoutGroup}>
            <Text style={styles.currencySymbolBadge}>{currencySymbol}</Text>
            <Text style={[styles.chamberAmount, { color: colors.text }]}>
              {poolBalance.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
            <Text style={[styles.currencyCodeTag, { color: colors.textSecondary }]}>
              {currency}
            </Text>
          </View>

          {/* Quick 1-tap micro pledge pills */}
          <View style={styles.microPledgeRow}>
            <Text style={styles.microPledgeLabel}>PLEDGE:</Text>
            <View style={styles.presetButtons}>
              {POOL_PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset}
                  activeOpacity={0.75}
                  onPress={() => openPresetPledge(preset)}
                  style={[
                    styles.presetPill,
                    {
                      backgroundColor: isDark
                        ? 'rgba(16, 185, 129, 0.08)'
                        : 'rgba(16, 185, 129, 0.1)',
                      borderColor: 'rgba(16, 185, 129, 0.25)',
                    },
                  ]}
                >
                  <Zap size={9} color="#10B981" />
                  <Text style={styles.presetPillText}>
                    +{currencySymbol}{preset}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Primary Action Button */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => setShowModal(true)}
          style={styles.pledgeBtnOuter}
        >
          <LinearGradient
            colors={['#10B981', '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.pledgeBtn}
          >
            <Plus size={14} color="#ffffff" strokeWidth={2.5} />
            <Text style={styles.pledgeBtnText}>Contribute to Shared Pool</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Contribution Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
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
                  <HeartHandshake size={17} color="#10B981" />
                </View>
                <View>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>
                    Syndicate Pool Contribution
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                    Co-fund shared reserve buffer
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                style={styles.closeBtn}
              >
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
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
                  AVAILABLE SPENDABLE WALLET
                </Text>
                <Text style={[styles.liquidityCalloutVal, { color: colors.text }]}>
                  {formatCurrency(spendableBalance, currency)}
                </Text>
              </View>

              {/* Amount Box */}
              <View
                style={[
                  styles.amountBox,
                  {
                    backgroundColor: isDark ? 'rgba(0, 0, 0, 0.4)' : '#f4f4f5',
                    borderColor: isDark ? 'rgba(16, 185, 129, 0.25)' : colors.border,
                  },
                ]}
              >
                <Text style={styles.currencyPrefix}>{currencySymbol}</Text>
                <TextInput
                  style={[styles.amountInput, { color: colors.text }]}
                  value={amountStr}
                  onChangeText={setAmountStr}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  autoFocus
                />
              </View>

              {/* Preset Chips */}
              <View style={styles.presetsRow}>
                {POOL_PRESETS.map((amt) => {
                  const isSelected = numericAmount === amt;
                  return (
                    <TouchableOpacity
                      key={amt}
                      activeOpacity={0.8}
                      onPress={() => setAmountStr(amt.toString())}
                      style={[
                        styles.presetChip,
                        {
                          backgroundColor: isSelected
                            ? '#10B981'
                            : isDark
                            ? 'rgba(255, 255, 255, 0.05)'
                            : '#e4e4e7',
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
                          styles.presetChipText,
                          {
                            color: isSelected ? '#ffffff' : colors.text,
                            fontFamily: isSelected
                              ? 'SpaceGrotesk_700Bold'
                              : 'SpaceGrotesk_600SemiBold',
                          },
                        ]}
                      >
                        +{currencySymbol}{amt}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Note */}
              <Text style={styles.inputCategoryCaption}>CONTRIBUTION MEMO (OPTIONAL)</Text>
              <TextInput
                style={[
                  styles.noteInput,
                  {
                    color: colors.text,
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#f4f4f5',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.border,
                  },
                ]}
                placeholder="e.g. Monthly team reserve contribution"
                placeholderTextColor={colors.textSecondary}
                value={note}
                onChangeText={setNote}
              />

              <TouchableOpacity
                activeOpacity={0.88}
                disabled={isLoading || numericAmount <= 0}
                onPress={handleContribute}
                style={styles.submitBtnOuter}
              >
                <LinearGradient
                  colors={
                    isLoading || numericAmount <= 0
                      ? ['#475569', '#334155']
                      : ['#10B981', '#059669']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitBtnGradient}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={styles.submitBtnText}>
                      Transfer {formatCurrency(numericAmount, currency)} to Syndicate
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
    marginVertical: 8,
  },
  syndicateCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  topRim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerLeft: {
    gap: 2,
  },
  syndicateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
  },
  syndicateBadgeText: {
    fontSize: 9.5,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 1.2,
    color: '#10B981',
  },
  cardTitle: {
    fontSize: 14.5,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: -0.2,
  },
  consensusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 7,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 0.8,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  consensusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10B981',
  },
  consensusText: {
    fontSize: 9,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#10B981',
    letterSpacing: 0.6,
  },
  vaultChamberDisplay: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  chamberHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  chamberCaption: {
    fontSize: 9.5,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 1,
    color: '#64748b',
  },
  avatarCluster: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarBubble: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#090e0d',
  },
  avatarInitial: {
    fontSize: 9,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#ffffff',
  },
  memberCountLabel: {
    fontSize: 10,
    fontFamily: 'SpaceGrotesk_500Medium',
    marginLeft: 6,
  },
  balanceReadoutGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 12,
  },
  currencySymbolBadge: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#10B981',
  },
  chamberAmount: {
    fontSize: 26,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: -0.6,
  },
  currencyCodeTag: {
    fontSize: 11,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 0.6,
    marginLeft: 2,
  },
  microPledgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  microPledgeLabel: {
    fontSize: 9,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#64748b',
    letterSpacing: 0.8,
  },
  presetButtons: {
    flexDirection: 'row',
    gap: 6,
    flex: 1,
  },
  presetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 7,
    borderWidth: 0.8,
  },
  presetPillText: {
    fontSize: 10.5,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#10B981',
  },
  pledgeBtnOuter: {
    borderRadius: 13,
    overflow: 'hidden',
  },
  pledgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
  },
  pledgeBtnText: {
    fontSize: 12.5,
    color: '#ffffff',
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 0.2,
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
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    borderWidth: 1.2,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  currencyPrefix: {
    fontSize: 26,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#10B981',
    marginRight: 6,
  },
  amountInput: {
    fontSize: 32,
    minWidth: 80,
    textAlign: 'center',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  presetsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 16,
  },
  presetChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetChipText: {
    fontSize: 12,
  },
  inputCategoryCaption: {
    fontSize: 10,
    letterSpacing: 0.9,
    color: '#64748b',
    fontFamily: 'SpaceGrotesk_700Bold',
    marginBottom: 6,
  },
  noteInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_400Regular',
    marginBottom: 20,
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
});
