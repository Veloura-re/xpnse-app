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
import { X, HandCoins, AlertCircle } from 'lucide-react-native';
import { useTheme } from '@/providers/theme-provider';
import { requestMoney, getEligibleRecipients } from '@/services/savings-service';
import { BusinessMember } from '@/types';
import { formatCurrency, getCurrencySymbol } from '@/utils/currency-utils';

interface MoneyRequestModalProps {
  visible: boolean;
  businessId: string;
  requesterId: string;
  requesterName: string;
  members: BusinessMember[];
  currency?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const MoneyRequestModal: React.FC<MoneyRequestModalProps> = ({
  visible,
  businessId,
  requesterId,
  requesterName,
  members,
  currency = 'USD',
  onClose,
  onSuccess,
}) => {
  const { colors, isDark } = useTheme();
  const [selectedPayerId, setSelectedPayerId] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const currencySymbol = getCurrencySymbol(currency);
  const numericAmount = parseFloat(amountStr) || 0;
  const eligibleMembers = getEligibleRecipients(members, requesterId);
  const selectedPayer = eligibleMembers.find((m) => m.userId === selectedPayerId);

  const reset = () => {
    setSelectedPayerId('');
    setAmountStr('');
    setNote('');
  };

  const handleRequest = async () => {
    if (!selectedPayerId) {
      Alert.alert('Select Member', 'Please select who you want to request money from.');
      return;
    }
    if (numericAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid request amount.');
      return;
    }

    try {
      setIsLoading(true);
      const payerName =
        selectedPayer?.user?.displayName ||
        selectedPayer?.user?.name ||
        selectedPayer?.user?.email ||
        'Member';

      const res = await requestMoney({
        businessId,
        requesterId,
        requesterName,
        payerId: selectedPayerId,
        payerName,
        amount: numericAmount,
        currency,
        note: note.trim() || undefined,
      });

      if (res.success) {
        reset();
        onSuccess();
        onClose();
      } else {
        Alert.alert('Request Failed', res.error || 'Could not send the money request.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View
                style={[
                  styles.headerIcon,
                  {
                    backgroundColor: isDark
                      ? 'rgba(139,92,246,0.15)'
                      : 'rgba(139,92,246,0.1)',
                  },
                ]}
              >
                <HandCoins size={18} color="#8b5cf6" />
              </View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Request Money</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onClose}
              style={[
                styles.closeBtn,
                {
                  backgroundColor: isDark
                    ? 'rgba(255,255,255,0.08)'
                    : 'rgba(0,0,0,0.05)',
                },
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
            {/* Member picker */}
            <Text style={[styles.label, { color: colors.text }]}>REQUEST FROM</Text>
            {eligibleMembers.length === 0 ? (
              <View
                style={[
                  styles.emptyBox,
                  { backgroundColor: isDark ? '#18181b' : '#f4f4f5', borderColor: colors.border },
                ]}
              >
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                  No other members in this group yet.
                </Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.membersRow}>
                {eligibleMembers.map((member) => {
                  const isSelected = member.userId === selectedPayerId;
                  const displayName =
                    member.user?.displayName || member.user?.name || member.user?.email || 'Member';
                  const initial = (displayName.charAt(0) || 'M').toUpperCase();

                  return (
                    <TouchableOpacity
                      key={member.userId}
                      activeOpacity={0.8}
                      onPress={() => setSelectedPayerId(member.userId)}
                      style={[
                        styles.memberCard,
                        {
                          backgroundColor: isSelected
                            ? isDark ? 'rgba(139,92,246,0.15)' : '#f5f3ff'
                            : isDark ? '#18181b' : '#f4f4f5',
                          borderColor: isSelected ? '#8b5cf6' : colors.border,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.memberAvatar,
                          {
                            backgroundColor: isSelected
                              ? '#8b5cf6'
                              : isDark ? '#27272a' : '#e4e4e7',
                          },
                        ]}
                      >
                        <Text style={[styles.memberInitial, { color: isSelected ? '#fff' : colors.text }]}>
                          {initial}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.memberName,
                          {
                            color: isSelected ? '#8b5cf6' : colors.text,
                            fontFamily: isSelected ? 'SpaceGrotesk_700Bold' : 'SpaceGrotesk_500Medium',
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

            {/* Amount */}
            <Text style={[styles.label, { color: colors.text, marginTop: 20 }]}>AMOUNT</Text>
            <View
              style={[
                styles.amountBox,
                {
                  backgroundColor: isDark ? '#18181b' : '#f4f4f5',
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.currencySymbol, { color: '#8b5cf6' }]}>{currencySymbol}</Text>
              <TextInput
                style={[styles.amountInput, { color: colors.text }]}
                value={amountStr}
                onChangeText={setAmountStr}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            {/* Note */}
            <Text style={[styles.label, { color: colors.text, marginTop: 18 }]}>NOTE (OPTIONAL)</Text>
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
              placeholder="What is this for?"
              placeholderTextColor={colors.textSecondary}
            />

            {/* Submit */}
            <TouchableOpacity
              activeOpacity={0.9}
              disabled={isLoading || numericAmount <= 0 || !selectedPayerId}
              onPress={handleRequest}
              style={[
                styles.submitBtn,
                {
                  backgroundColor:
                    isLoading || numericAmount <= 0 || !selectedPayerId ? '#94a3b8' : '#8b5cf6',
                  shadowColor: '#8b5cf6',
                  shadowOpacity: numericAmount > 0 && selectedPayerId ? 0.35 : 0,
                },
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.submitLabel}>
                  Request {numericAmount > 0 ? formatCurrency(numericAmount, currency) : 'Money'}
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
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
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
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: 20 },
  label: {
    fontSize: 11,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  emptyBox: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  membersRow: { flexDirection: 'row', gap: 10, paddingBottom: 4 },
  memberCard: {
    width: 90,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: 8,
  },
  memberAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberInitial: { fontSize: 16, fontFamily: 'SpaceGrotesk_700Bold' },
  memberName: { fontSize: 11, textAlign: 'center', fontFamily: 'SpaceGrotesk_500Medium' },
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
  currencySymbol: {
    fontSize: 34,
    fontFamily: 'SpaceGrotesk_700Bold',
    marginRight: 6,
  },
  amountInput: {
    fontSize: 38,
    fontFamily: 'SpaceGrotesk_700Bold',
    minWidth: 80,
    textAlign: 'center',
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
  submitBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 5,
  },
  submitLabel: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#ffffff',
  },
});
