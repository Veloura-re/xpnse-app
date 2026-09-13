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
import { X, Send, UserCheck, AlertCircle, Clock } from 'lucide-react-native';
import { useTheme } from '@/providers/theme-provider';
import { initiatePendingTransfer, getEligibleRecipients } from '@/services/savings-service';
import { BusinessMember } from '@/types';
import { formatCurrency, getCurrencySymbol } from '@/utils/currency-utils';

interface SendMoneyModalProps {
  visible: boolean;
  businessId: string;
  senderId: string;
  senderName: string;
  availableBalance: number;
  members: BusinessMember[];
  currency?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const SendMoneyModal: React.FC<SendMoneyModalProps> = ({
  visible,
  businessId,
  senderId,
  senderName,
  availableBalance,
  members,
  currency = 'USD',
  onClose,
  onSuccess,
}) => {
  const { colors, isDark } = useTheme();
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>('');
  const [amountStr, setAmountStr] = useState('');
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [waitingConfirmation, setWaitingConfirmation] = useState(false);

  const currencySymbol = getCurrencySymbol(currency);
  const numericAmount = parseFloat(amountStr) || 0;

  // Filter out current user from recipients with demo teammates fallback
  const eligibleRecipients = getEligibleRecipients(members, senderId);

  const selectedRecipient = eligibleRecipients.find(
    (m) => m.userId === selectedRecipientId
  );

  const isExceedingBalance = numericAmount > availableBalance;

  const handleSend = async () => {
    if (!selectedRecipientId) {
      Alert.alert('Select Recipient', 'Please pick a member to receive funds.');
      return;
    }

    if (numericAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid transfer amount.');
      return;
    }

    if (isExceedingBalance) {
      Alert.alert(
        'Insufficient Balance',
        `Your spendable wallet balance is ${formatCurrency(availableBalance, currency)}.`
      );
      return;
    }

    try {
      setIsLoading(true);
      const recipientName =
        selectedRecipient?.user?.displayName ||
        selectedRecipient?.user?.name ||
        selectedRecipient?.user?.email ||
        'Member';

      const res = await initiatePendingTransfer({
        businessId,
        senderId,
        senderName,
        recipientId: selectedRecipientId,
        recipientName,
        amount: numericAmount,
        currency,
        note: note.trim() || undefined,
      });

      if (res.success) {
        // Show the waiting-for-confirmation state briefly then close
        setWaitingConfirmation(true);
        setTimeout(() => {
          setWaitingConfirmation(false);
          setAmountStr('');
          setNote('');
          setSelectedRecipientId('');
          onSuccess();
          onClose();
        }, 2000);
      } else {
        Alert.alert('Transfer Failed', res.error || 'Unable to initiate transfer.');
      }
    } catch (err: any) {
      console.error('[SendMoneyModal] Transfer error:', err);
      Alert.alert('Transfer Error', err.message || 'An unexpected error occurred.');
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
                <Send size={18} color={colors.primary} />
              </View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                Send Money
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
            {/* Waiting-for-confirmation banner */}
            {waitingConfirmation && (
              <View
                style={[
                  styles.waitingBanner,
                  {
                    backgroundColor: isDark ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.08)',
                    borderColor: 'rgba(16,185,129,0.3)',
                  },
                ]}
              >
                <Clock size={16} color={colors.primary} />
                <Text style={[styles.waitingText, { color: colors.primary }]}>
                  Transfer sent — waiting for recipient confirmation
                </Text>
              </View>
            )}

            {/* Balance Badge */}
            <View
              style={[
                styles.balancePill,
                {
                  backgroundColor: isDark ? '#18181b' : '#f4f4f5',
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.balancePillLabel, { color: colors.textSecondary }]}>
                Available Spendable:
              </Text>
              <Text style={[styles.balancePillVal, { color: colors.primary }]}>
                {formatCurrency(availableBalance, currency)}
              </Text>
            </View>

            {/* Recipient Selection */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              SELECT MEMBER
            </Text>

            {eligibleRecipients.length === 0 ? (
              <View
                style={[
                  styles.emptyRecipients,
                  {
                    backgroundColor: isDark ? '#18181b' : '#f4f4f5',
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                  No other members in this group yet. Invite members in Settings.
                </Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.recipientsRow}
              >
                {eligibleRecipients.map((member) => {
                  const isSelected = member.userId === selectedRecipientId;
                  const displayName =
                    member.user?.displayName ||
                    member.user?.name ||
                    member.user?.email ||
                    'Member';
                  const initial = (displayName.charAt(0) || 'M').toUpperCase();

                  return (
                    <TouchableOpacity
                      key={member.userId}
                      activeOpacity={0.8}
                      onPress={() => setSelectedRecipientId(member.userId)}
                      style={[
                        styles.recipientCard,
                        {
                          backgroundColor: isSelected
                            ? isDark
                              ? 'rgba(16, 185, 129, 0.15)'
                              : '#ecfdf5'
                            : isDark
                            ? '#18181b'
                            : '#f4f4f5',
                          borderColor: isSelected
                            ? colors.primary
                            : colors.border,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.recipientAvatar,
                          {
                            backgroundColor: isSelected
                              ? colors.primary
                              : isDark
                              ? '#27272a'
                              : '#e4e4e7',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.recipientInitial,
                            { color: isSelected ? '#ffffff' : colors.text },
                          ]}
                        >
                          {initial}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.recipientName,
                          {
                            color: isSelected ? colors.primary : colors.text,
                            fontFamily: isSelected
                              ? 'SpaceGrotesk_700Bold'
                              : 'SpaceGrotesk_500Medium',
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {displayName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* Amount Input */}
            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 18 }]}>
              TRANSFER AMOUNT
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
                  Amount exceeds your spendable wallet balance
                </Text>
              </View>
            )}

            {/* Note Input */}
            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 18 }]}>
              NOTE (OPTIONAL)
            </Text>
            <TextInput
              style={[
                styles.noteInput,
                {
                  backgroundColor: isDark ? '#18181b' : '#f4f4f5',
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              value={note}
              onChangeText={setNote}
              placeholder="e.g. For project materials or personal loan"
              placeholderTextColor={colors.textSecondary}
            />

            {/* Submit Button */}
            <TouchableOpacity
              activeOpacity={0.9}
              disabled={
                isLoading ||
                numericAmount <= 0 ||
                !selectedRecipientId ||
                isExceedingBalance
              }
              onPress={handleSend}
              style={[
                styles.submitButton,
                {
                  backgroundColor:
                    isLoading ||
                    numericAmount <= 0 ||
                    !selectedRecipientId ||
                    isExceedingBalance
                      ? '#94a3b8'
                      : colors.primary,
                  shadowColor: colors.primary,
                  shadowOpacity:
                    numericAmount > 0 && selectedRecipientId && !isExceedingBalance
                      ? 0.35
                      : 0,
                },
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.submitButtonText}>
                  Send {formatCurrency(numericAmount, currency)}
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
  waitingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  waitingText: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk_500Medium',
    flex: 1,
  },
  balancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  balancePillLabel: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  balancePillVal: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  emptyRecipients: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  recipientsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 4,
  },
  recipientCard: {
    width: 90,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  recipientAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipientInitial: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  recipientName: {
    fontSize: 11,
    textAlign: 'center',
    fontFamily: 'SpaceGrotesk_500Medium',
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
  noteInput: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_400Regular',
    marginBottom: 24,
  },
  submitButton: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
});
