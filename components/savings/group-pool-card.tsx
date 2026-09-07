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
import { Users, Coins, Plus, X, HeartHandshake } from 'lucide-react-native';
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
  const memberCount = business.members?.length || 1;
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

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.topRow}>
          <View style={styles.titleGroup}>
            <View
              style={[
                styles.iconBubble,
                {
                  backgroundColor: isDark
                    ? 'rgba(16, 185, 129, 0.15)'
                    : 'rgba(16, 185, 129, 0.1)',
                },
              ]}
            >
              <Users size={16} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                Group Savings Pool
              </Text>
              <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
                Collective reserve • {memberCount} member{memberCount !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setShowModal(true)}
            style={[styles.contributeBtn, { backgroundColor: colors.primary }]}
          >
            <Plus size={13} color="#ffffff" />
            <Text style={styles.contributeBtnText}>Contribute</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.balanceWrap}>
          <Text style={[styles.balanceCaption, { color: colors.textSecondary }]}>
            Shared Community Pool Balance
          </Text>
          <Text style={[styles.balanceAmount, { color: colors.primary }]}>
            {formatCurrency(poolBalance, currency)}
          </Text>
        </View>
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
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <HeartHandshake size={18} color={colors.primary} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Contribute to Group Pool
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                style={styles.closeBtn}
              >
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 20 }}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Available Spendable: {formatCurrency(spendableBalance, currency)}
              </Text>

              {/* Amount Input */}
              <View
                style={[
                  styles.amountBox,
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
                            ? colors.primary
                            : isDark
                            ? 'rgba(255, 255, 255, 0.06)'
                            : '#e4e4e7',
                          borderColor: isSelected ? colors.primary : colors.border,
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
                              : 'SpaceGrotesk_500Medium',
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
              <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 8 }]}>
                NOTE (OPTIONAL)
              </Text>
              <TextInput
                style={[
                  styles.noteInput,
                  {
                    color: colors.text,
                    backgroundColor: isDark ? '#18181b' : '#f4f4f5',
                    borderColor: colors.border,
                  },
                ]}
                placeholder="e.g. Monthly group reserve share"
                placeholderTextColor={colors.textSecondary}
                value={note}
                onChangeText={setNote}
              />

              <TouchableOpacity
                activeOpacity={0.9}
                disabled={isLoading || numericAmount <= 0}
                onPress={handleContribute}
                style={[
                  styles.submitBtn,
                  {
                    backgroundColor:
                      isLoading || numericAmount <= 0
                        ? '#94a3b8'
                        : colors.primary,
                  },
                ]}
              >
                {isLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.submitBtnText}>
                    Contribute {formatCurrency(numericAmount, currency)}
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
    marginVertical: 6,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  cardSub: {
    fontSize: 11,
    fontFamily: 'SpaceGrotesk_400Regular',
    marginTop: 2,
  },
  contributeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  contributeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  balanceWrap: {
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  balanceCaption: {
    fontSize: 11,
    fontFamily: 'SpaceGrotesk_400Regular',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: '800',
    fontFamily: 'SpaceGrotesk_700Bold',
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
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  currencyPrefix: {
    fontSize: 28,
    fontWeight: '700',
    marginRight: 6,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  amountInput: {
    fontSize: 32,
    fontWeight: '800',
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
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetChipText: {
    fontSize: 13,
  },
  noteInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_400Regular',
    marginBottom: 20,
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
