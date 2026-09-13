import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { X, Landmark, CreditCard, AlertCircle, CheckCircle2 } from 'lucide-react-native';
import { useTheme } from '@/providers/theme-provider';
import { cashOutFromWallet } from '@/services/savings-service';
import { formatCurrency, getCurrencySymbol } from '@/utils/currency-utils';

interface CashOutModalProps {
  visible: boolean;
  businessId: string;
  userId: string;
  availableBalance: number;
  currency?: string;
  onClose: () => void;
  onSuccess: () => void;
}

type CashOutMethod = 'bank' | 'card';

export const CashOutModal: React.FC<CashOutModalProps> = ({
  visible,
  businessId,
  userId,
  availableBalance,
  currency = 'USD',
  onClose,
  onSuccess,
}) => {
  const { colors, isDark } = useTheme();
  const [method, setMethod] = useState<CashOutMethod>('bank');
  const [amountStr, setAmountStr] = useState('');
  const [bankName, setBankName] = useState('Chase Bank');
  const [accountNumber, setAccountNumber] = useState('•••• 8912');
  const [routingNumber, setRoutingNumber] = useState('021000021');
  const [isLoading, setIsLoading] = useState(false);

  const currencySymbol = getCurrencySymbol(currency);
  const numericAmount = parseFloat(amountStr) || 0;
  const isExceedingBalance = numericAmount > availableBalance;

  const handleMaxAmount = () => {
    if (availableBalance > 0) {
      setAmountStr(availableBalance.toString());
    }
  };

  const handleCashOut = async () => {
    if (numericAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid cash-out amount.');
      return;
    }

    if (isExceedingBalance) {
      Alert.alert(
        'Insufficient Balance',
        `Available balance is ${formatCurrency(availableBalance, currency)}.`
      );
      return;
    }

    try {
      setIsLoading(true);
      const destinationTitle =
        method === 'bank'
          ? `${bankName} (${accountNumber})`
          : 'Instant Card Payout (Discover •••• 1117)';

      const res = await cashOutFromWallet({
        businessId,
        userId,
        amount: numericAmount,
        currency,
        destinationType: method,
        destinationDetails: method === 'bank' ? accountNumber : 'Discover •••• 1117',
        destinationTitle,
      });

      if (res.success) {
        onSuccess();
        onClose();
        setAmountStr('');
      } else {
        Alert.alert('Cash Out Failed', res.error || 'Unable to process cash-out.');
      }
    } catch (err: any) {
      console.error('[CashOutModal] Cash-out error:', err);
      Alert.alert('Cash Out Error', err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalBackdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <View
                style={[
                  styles.headerIconCircle,
                  {
                    backgroundColor: isDark
                      ? 'rgba(16, 185, 129, 0.15)'
                      : 'rgba(16, 185, 129, 0.1)',
                  },
                ]}
              >
                <Landmark size={18} color={colors.primary} />
              </View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                Cash Out
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onClose}
              style={[
                styles.closeButton,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.08)'
                    : 'rgba(0, 0, 0, 0.05)',
                },
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollBody}
          >
            {/* Balance Badge with Max Button */}
            <View
              style={[
                styles.balancePill,
                {
                  backgroundColor: isDark ? '#18181b' : '#f4f4f5',
                  borderColor: colors.border,
                },
              ]}
            >
              <View>
                <Text style={[styles.balancePillLabel, { color: colors.textSecondary }]}>
                  Available to Cash Out:
                </Text>
                <Text style={[styles.balancePillVal, { color: colors.primary }]}>
                  {formatCurrency(availableBalance, currency)}
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleMaxAmount}
                style={[styles.maxButton, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.maxButtonText}>USE MAX</Text>
              </TouchableOpacity>
            </View>

            {/* Destination Method Tabs */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              DESTINATION
            </Text>
            <View style={styles.methodsRow}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setMethod('bank')}
                style={[
                  styles.methodCard,
                  {
                    backgroundColor:
                      method === 'bank'
                        ? isDark
                          ? 'rgba(16, 185, 129, 0.12)'
                          : '#ecfdf5'
                        : isDark
                        ? '#18181b'
                        : '#f4f4f5',
                    borderColor: method === 'bank' ? colors.primary : colors.border,
                  },
                ]}
              >
                <Landmark
                  size={18}
                  color={method === 'bank' ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.methodName,
                    {
                      color: method === 'bank' ? colors.primary : colors.text,
                      fontFamily:
                        method === 'bank'
                          ? 'SpaceGrotesk_700Bold'
                          : 'SpaceGrotesk_500Medium',
                    },
                  ]}
                >
                  Bank Transfer
                </Text>
                <Text style={[styles.methodSpeed, { color: colors.textSecondary }]}>
                  1-2 business days • Free
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setMethod('card')}
                style={[
                  styles.methodCard,
                  {
                    backgroundColor:
                      method === 'card'
                        ? isDark
                          ? 'rgba(16, 185, 129, 0.12)'
                          : '#ecfdf5'
                        : isDark
                        ? '#18181b'
                        : '#f4f4f5',
                    borderColor: method === 'card' ? colors.primary : colors.border,
                  },
                ]}
              >
                <CreditCard
                  size={18}
                  color={method === 'card' ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.methodName,
                    {
                      color: method === 'card' ? colors.primary : colors.text,
                      fontFamily:
                        method === 'card'
                          ? 'SpaceGrotesk_700Bold'
                          : 'SpaceGrotesk_500Medium',
                    },
                  ]}
                >
                  Instant Card
                </Text>
                <Text style={[styles.methodSpeed, { color: colors.textSecondary }]}>
                  Instant delivery
                </Text>
              </TouchableOpacity>
            </View>

            {/* Bank details input fields */}
            {method === 'bank' ? (
              <View
                style={[
                  styles.detailsBox,
                  {
                    backgroundColor: isDark ? '#18181b' : '#fafafa',
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.inputMicroLabel, { color: colors.textSecondary }]}>
                  BANK NAME
                </Text>
                <TextInput
                  style={[styles.miniInput, { color: colors.text, borderColor: colors.border }]}
                  value={bankName}
                  onChangeText={setBankName}
                />

                <View style={styles.rowTwoCols}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputMicroLabel, { color: colors.textSecondary }]}>
                      ACCOUNT NUMBER
                    </Text>
                    <TextInput
                      style={[styles.miniInput, { color: colors.text, borderColor: colors.border }]}
                      value={accountNumber}
                      onChangeText={setAccountNumber}
                    />
                  </View>
                  <View style={{ width: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputMicroLabel, { color: colors.textSecondary }]}>
                      ROUTING NUMBER
                    </Text>
                    <TextInput
                      style={[styles.miniInput, { color: colors.text, borderColor: colors.border }]}
                      value={routingNumber}
                      onChangeText={setRoutingNumber}
                    />
                  </View>
                </View>
              </View>
            ) : (
              <View
                style={[
                  styles.detailsBox,
                  {
                    backgroundColor: isDark ? '#18181b' : '#fafafa',
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.instantCardBadge}>
                  <CheckCircle2 size={16} color={colors.primary} />
                  <Text style={[styles.instantCardTitle, { color: colors.text }]}>
                    Verified Discover Card on File (•••• 1117)
                  </Text>
                </View>
                <Text style={[styles.instantCardSub, { color: colors.textSecondary }]}>
                  Funds will be pushed directly to your linked Discover card account within seconds.
                </Text>
              </View>
            )}

            {/* Cash Out Amount */}
            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 14 }]}>
              CASH OUT AMOUNT
            </Text>
            <View
              style={[
                styles.amountBox,
                {
                  backgroundColor: isDark ? '#18181b' : '#f4f4f5',
                  borderColor: isExceedingBalance ? '#ef4444' : colors.border,
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
              />
            </View>

            {isExceedingBalance && (
              <View style={styles.errorBanner}>
                <AlertCircle size={14} color="#ef4444" />
                <Text style={styles.errorText}>
                  Amount exceeds your available cash-out balance
                </Text>
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              activeOpacity={0.9}
              disabled={isLoading || numericAmount <= 0 || isExceedingBalance}
              onPress={handleCashOut}
              style={[
                styles.submitButton,
                {
                  backgroundColor:
                    isLoading || numericAmount <= 0 || isExceedingBalance
                      ? '#94a3b8'
                      : colors.primary,
                  shadowColor: colors.primary,
                  shadowOpacity:
                    numericAmount > 0 && !isExceedingBalance ? 0.35 : 0,
                },
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.submitButtonText}>
                  Cash Out {formatCurrency(numericAmount, currency)}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    padding: 20,
  },
  balancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  balancePillLabel: {
    fontSize: 11,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  balancePillVal: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk_700Bold',
    marginTop: 2,
  },
  maxButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  maxButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  methodsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  methodCard: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 4,
  },
  methodName: {
    fontSize: 13,
    marginTop: 2,
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
  methodSpeed: {
    fontSize: 10,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  detailsBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  instantCardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  instantCardTitle: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
  instantCardSub: {
    fontSize: 11,
    fontFamily: 'SpaceGrotesk_400Regular',
    marginTop: 4,
    lineHeight: 16,
  },
  inputMicroLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 6,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  miniInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_500Medium',
    marginBottom: 10,
  },
  rowTwoCols: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  currencyPrefix: {
    fontSize: 34,
    fontWeight: '700',
    marginRight: 6,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  amountInput: {
    fontSize: 38,
    fontWeight: '800',
    fontFamily: 'SpaceGrotesk_700Bold',
    minWidth: 80,
    textAlign: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_500Medium',
  },
  submitButton: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 5,
    marginTop: 12,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
});
