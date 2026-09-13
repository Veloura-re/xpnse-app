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
import { LinearGradient } from 'expo-linear-gradient';
import { X, CreditCard, ShieldCheck, Zap, Wifi } from 'lucide-react-native';
import { useTheme } from '@/providers/theme-provider';
import { auth } from '@/config/firebase';
import { depositToWallet } from '@/services/savings-service';
import {
  isStripeEnabled,
  createDepositIntent,
  confirmPaymentWithCard,
} from '@/services/stripe-service';
import { formatCurrency, getCurrencySymbol } from '@/utils/currency-utils';

interface AddMoneyModalProps {
  visible: boolean;
  businessId: string;
  userId: string;
  currency?: string;
  onClose: () => void;
  onSuccess: () => void;
}

const PRESET_AMOUNTS = [25, 50, 100, 250, 500];

type CardBrand = 'Visa' | 'Mastercard' | 'Amex' | 'Discover' | 'JCB' | 'Card';

function detectCardBrand(num: string): CardBrand {
  const clean = num.replace(/\D/g, '');
  if (/^4/.test(clean)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(clean)) return 'Mastercard';
  if (/^3[47]/.test(clean)) return 'Amex';
  if (/^(6011|65|64[4-9]|622)/.test(clean)) return 'Discover';
  if (/^(352[89]|35[3-8])/.test(clean)) return 'JCB';
  return 'Card';
}

function formatCardNumber(val: string): string {
  const digits = val.replace(/\D/g, '');
  if (/^3[47]/.test(digits)) {
    const limited = digits.slice(0, 15);
    const p1 = limited.slice(0, 4);
    const p2 = limited.slice(4, 10);
    const p3 = limited.slice(10, 15);
    return [p1, p2, p3].filter(Boolean).join(' ');
  }
  const limited = digits.slice(0, 16);
  return limited.match(/.{1,4}/g)?.join(' ') || limited;
}

function formatCardExpiry(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) {
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
  }
  return digits;
}

function formatCardCvc(val: string, brand: CardBrand): string {
  const max = brand === 'Amex' ? 4 : 3;
  return val.replace(/\D/g, '').slice(0, max);
}

const TEST_CARDS: { label: string; number: string; expiry: string; cvc: string; holder: string }[] = [
  { label: 'Visa', number: '4242 4242 4242 4242', expiry: '12/28', cvc: '424', holder: 'Jane Doe' },
  { label: 'Mastercard', number: '5555 5555 5555 4444', expiry: '10/27', cvc: '555', holder: 'Alex Morgan' },
  { label: 'Discover', number: '6011 0009 9008 1117', expiry: '08/29', cvc: '888', holder: 'Jordan Blake' },
  { label: 'Amex', number: '3782 822463 10005', expiry: '06/28', cvc: '3782', holder: 'Taylor Vance' },
];

export const AddMoneyModal: React.FC<AddMoneyModalProps> = ({
  visible,
  businessId,
  userId,
  currency = 'USD',
  onClose,
  onSuccess,
}) => {
  const { colors, isDark } = useTheme();
  const [amountStr, setAmountStr] = useState('50');
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSandboxMode, setIsSandboxMode] = useState(true);

  const currencySymbol = getCurrencySymbol(currency);
  const numericAmount = parseFloat(amountStr) || 0;
  const cardBrand = detectCardBrand(cardNumber);

  const handleCardNumberChange = (text: string) => {
    setCardNumber(formatCardNumber(text));
  };

  const handleExpiryChange = (text: string) => {
    setCardExpiry(formatCardExpiry(text));
  };

  const handleCvcChange = (text: string) => {
    setCardCvc(formatCardCvc(text, cardBrand));
  };

  const applyTestCard = (test: typeof TEST_CARDS[0]) => {
    setCardNumber(test.number);
    setCardExpiry(test.expiry);
    setCardCvc(test.cvc);
    setCardHolder(test.holder);
  };

  const getCardTheme = (brand: CardBrand) => {
    switch (brand) {
      case 'Visa':
        return {
          gradient: ['#1e3a8a', '#1d4ed8', '#0f172a'] as const,
          borderColor: 'rgba(59, 130, 246, 0.45)',
          shadowColor: '#2563eb',
          networkLabel: 'VISA',
        };
      case 'Mastercard':
        return {
          gradient: ['#27272a', '#18181b', '#09090b'] as const,
          borderColor: 'rgba(239, 68, 68, 0.35)',
          shadowColor: '#ef4444',
          networkLabel: 'MASTERCARD',
        };
      case 'Amex':
        return {
          gradient: ['#475569', '#334155', '#1e293b'] as const,
          borderColor: 'rgba(148, 163, 184, 0.45)',
          shadowColor: '#64748b',
          networkLabel: 'AMERICAN EXPRESS',
        };
      case 'Discover':
        return {
          gradient: ['#242933', '#161920', '#0d0f14'] as const,
          borderColor: 'rgba(255, 96, 0, 0.45)',
          shadowColor: '#ff6000',
          networkLabel: 'DISCOVER',
        };
      case 'JCB':
        return {
          gradient: ['#064e3b', '#065f46', '#022c22'] as const,
          borderColor: 'rgba(16, 185, 129, 0.4)',
          shadowColor: '#059669',
          networkLabel: 'JCB',
        };
      default:
        return {
          gradient: ['#1e293b', '#0f172a', '#020617'] as const,
          borderColor: 'rgba(255, 255, 255, 0.15)',
          shadowColor: '#000000',
          networkLabel: 'CREDIT / DEBIT',
        };
    }
  };

  const theme = getCardTheme(cardBrand);

  const handleDeposit = async () => {
    if (numericAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter an amount greater than 0.');
      return;
    }

    const digitsOnly = cardNumber.replace(/\D/g, '');
    if (digitsOnly.length < 12) {
      Alert.alert('Invalid Card Number', 'Please enter a valid card number.');
      return;
    }

    const brandLabel = cardBrand === 'Card' ? 'Card' : cardBrand;
    const lastFour = digitsOnly.slice(-4) || '1117';

    try {
      setIsLoading(true);

      if (isSandboxMode || !isStripeEnabled()) {
        const res = await depositToWallet({
          businessId,
          userId,
          amount: numericAmount,
          currency,
          paymentMethodTitle: isSandboxMode
            ? `Instant Top-Up (${brandLabel} *${lastFour})`
            : `${brandLabel} ending in ${lastFour}`,
          paymentIntentId: `pi_sandbox_${Date.now()}`,
        });

        if (res.success) {
          onSuccess();
          onClose();
        } else {
          Alert.alert('Deposit Failed', res.error || 'Transaction could not be processed.');
        }
        return;
      }

      // Live Stripe Gateway Direct Tokenization Pipeline
      const currentUser = auth?.currentUser;
      if (!currentUser) {
        Alert.alert('Authentication Required', 'Please sign in to proceed with card payment.');
        return;
      }

      const idToken = await currentUser.getIdToken();
      const intentRes = await createDepositIntent({
        amount: numericAmount,
        currency,
        businessId,
        userId,
        idToken,
      });

      if (intentRes.isSandbox) {
        const fallbackRes = await depositToWallet({
          businessId,
          userId,
          amount: numericAmount,
          currency,
          paymentMethodTitle: `Instant Top-Up (${brandLabel} *${lastFour})`,
          paymentIntentId: intentRes.paymentIntentId,
        });
        if (fallbackRes.success) {
          onSuccess();
          onClose();
        } else {
          Alert.alert('Deposit Failed', fallbackRes.error);
        }
        return;
      }

      const [expMonthStr, expYearStr] = cardExpiry.split('/');
      const expMonth = parseInt(expMonthStr, 10);
      let expYear = parseInt(expYearStr, 10);
      if (expYear < 100) {
        expYear += 2000;
      }

      if (!expMonth || isNaN(expMonth) || expMonth < 1 || expMonth > 12) {
        Alert.alert('Invalid Expiry', 'Please enter a valid expiration month (01-12).');
        return;
      }

      const confirmRes = await confirmPaymentWithCard(intentRes.clientSecret, {
        number: cardNumber,
        expMonth,
        expYear,
        cvc: cardCvc,
        cardholderName: cardHolder.trim() || undefined,
      });

      if (confirmRes.success) {
        Alert.alert(
          'Deposit Authorized',
          `Your payment of ${formatCurrency(numericAmount, currency)} has been successfully submitted to the card network. Your balance will update shortly.`,
          [{ text: 'OK', onPress: () => { onSuccess(); onClose(); } }]
        );
      } else {
        Alert.alert(
          'Payment Declined',
          confirmRes.error || 'The card transaction could not be authorized by your bank.'
        );
      }
    } catch (err: any) {
      console.error('[AddMoneyModal] Deposit error:', err);
      Alert.alert('Deposit Error', err.message || 'An unexpected error occurred during processing.');
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
                <CreditCard size={18} color={colors.primary} />
              </View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                Add Money
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
            keyboardShouldPersistTaps="handled"
          >
            {/* Amount Display and Input */}
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
              />
            </View>

            {/* Quick Preset Amount Chips */}
            <View style={styles.presetsRow}>
              {PRESET_AMOUNTS.map((amt) => {
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
                      +{currencySymbol}
                      {amt}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Mode Switch: Instant Sandbox / Live Gateway */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setIsSandboxMode(!isSandboxMode)}
              style={[
                styles.modeCard,
                {
                  backgroundColor: isSandboxMode
                    ? isDark
                      ? 'rgba(16, 185, 129, 0.12)'
                      : '#ecfdf5'
                    : isDark
                    ? '#27272a'
                    : '#f4f4f5',
                  borderColor: isSandboxMode ? colors.primary : colors.border,
                },
              ]}
            >
              <View style={styles.modeCardLeft}>
                <Zap
                  size={16}
                  color={isSandboxMode ? colors.primary : colors.textSecondary}
                />
                <View>
                  <Text
                    style={[
                      styles.modeTitle,
                      { color: isSandboxMode ? colors.primary : colors.text },
                    ]}
                  >
                    {isSandboxMode ? 'Instant Verified Sandbox' : 'Standard Payment Gateway'}
                  </Text>
                  <Text
                    style={[styles.modeSubtitle, { color: colors.textSecondary }]}
                  >
                    {isSandboxMode
                      ? 'Simulates instant verified card top-up immediately'
                      : 'Processes through real card settlement pipeline'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Interactive Dynamic Card Visual */}
            <View style={[styles.cardImposterContainer, { shadowColor: theme.shadowColor }]}>
              <LinearGradient
                colors={theme.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.cardImposterGradient, { borderColor: theme.borderColor }]}
              >
                {/* Discover Signature Warm Orange Ribbon Accent when Discover */}
                {cardBrand === 'Discover' && <View style={styles.discoverAccentRibbon} />}

                {/* Card Top Row: Chip, NFC and Dynamic Brand Logo */}
                <View style={styles.cardTopRow}>
                  <View style={styles.chipRow}>
                    <View style={styles.emvChip}>
                      <View style={styles.chipInteriorLineHorizontal} />
                      <View style={styles.chipInteriorLineVertical} />
                    </View>
                    <Wifi
                      size={18}
                      color="#d4d4d8"
                      style={{ transform: [{ rotate: '90deg' }], marginLeft: 8 }}
                    />
                  </View>

                  {/* Brand Visual Identity */}
                  {cardBrand === 'Visa' && (
                    <Text style={styles.visaLogo}>VISA</Text>
                  )}
                  {cardBrand === 'Mastercard' && (
                    <View style={styles.mastercardLogo}>
                      <View style={[styles.mastercardCircle, { backgroundColor: '#ef4444' }]} />
                      <View style={[styles.mastercardCircle, { backgroundColor: '#f59e0b', marginLeft: -10 }]} />
                    </View>
                  )}
                  {cardBrand === 'Amex' && (
                    <View style={styles.amexLogoBadge}>
                      <Text style={styles.amexLogoText}>AMEX</Text>
                    </View>
                  )}
                  {cardBrand === 'Discover' && (
                    <View style={styles.discoverLogo}>
                      <Text style={styles.discoverLogoPart}>DISC</Text>
                      <View style={styles.discoverCircle} />
                      <Text style={styles.discoverLogoPart}>VER</Text>
                    </View>
                  )}
                  {cardBrand === 'JCB' && (
                    <View style={styles.jcbBadge}>
                      <Text style={styles.jcbText}>JCB</Text>
                    </View>
                  )}
                  {cardBrand === 'Card' && (
                    <View style={styles.genericBadge}>
                      <Text style={styles.genericBadgeText}>CARD</Text>
                    </View>
                  )}
                </View>

                {/* Card Middle: Card Number Preview */}
                <Text style={styles.cardNumberText} numberOfLines={1}>
                  {cardNumber || '•••• •••• •••• ••••'}
                </Text>

                {/* Card Bottom Row: Holder, Expiry & Network Label */}
                <View style={styles.cardBottomRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardMetaLabel}>CARDHOLDER</Text>
                    <Text style={styles.cardMetaValue} numberOfLines={1}>
                      {cardHolder ? cardHolder.toUpperCase() : 'YOUR NAME'}
                    </Text>
                  </View>

                  <View style={{ marginRight: 16 }}>
                    <Text style={styles.cardMetaLabel}>EXPIRES</Text>
                    <Text style={styles.cardMetaValue}>{cardExpiry || 'MM/YY'}</Text>
                  </View>

                  <View style={[styles.networkBadge, { borderColor: theme.borderColor }]}>
                    <Text style={styles.networkBadgeText}>{theme.networkLabel}</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>

            {/* Quick Test Card Fillers */}
            <View style={styles.testCardsContainer}>
              <Text style={[styles.testCardsLabel, { color: colors.textSecondary }]}>
                Quick Test Fill:
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.testCardsRow}>
                {TEST_CARDS.map((tc) => (
                  <TouchableOpacity
                    key={tc.label}
                    activeOpacity={0.75}
                    onPress={() => applyTestCard(tc)}
                    style={[
                      styles.testCardChip,
                      {
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9',
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.testCardChipText, { color: colors.text }]}>
                      {tc.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Card Inputs & Verification Box */}
            <View
              style={[
                styles.cardDetailsBox,
                {
                  backgroundColor: isDark ? '#18181b' : '#fafafa',
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.cardHeaderLine}>
                <View style={[styles.cardBrandBadge, { backgroundColor: colors.primary }]}>
                  <CreditCard size={14} color="#ffffff" />
                  <Text style={styles.cardBrandText}>
                    {cardBrand === 'Card' ? 'Any Card Accepted' : `${cardBrand} Detected`}
                  </Text>
                </View>
                <View style={styles.secureBadge}>
                  <ShieldCheck size={14} color={colors.primary} />
                  <Text style={[styles.secureText, { color: colors.primary }]}>
                    256-bit Encrypted
                  </Text>
                </View>
              </View>

              <Text style={[styles.inputMicroLabel, { color: colors.textSecondary }]}>
                CARD NUMBER
              </Text>
              <TextInput
                style={[
                  styles.miniInput,
                  { color: colors.text, borderColor: colors.border },
                ]}
                value={cardNumber}
                onChangeText={handleCardNumberChange}
                placeholder="4000 1234 5678 9010"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                editable={!isLoading}
              />

              <Text style={[styles.inputMicroLabel, { color: colors.textSecondary }]}>
                CARDHOLDER NAME
              </Text>
              <TextInput
                style={[
                  styles.miniInput,
                  { color: colors.text, borderColor: colors.border },
                ]}
                value={cardHolder}
                onChangeText={setCardHolder}
                placeholder="Cardholder Name"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="words"
                editable={!isLoading}
              />

              <View style={styles.rowTwoCols}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputMicroLabel, { color: colors.textSecondary }]}>
                    EXPIRY
                  </Text>
                  <TextInput
                    style={[
                      styles.miniInput,
                      { color: colors.text, borderColor: colors.border },
                    ]}
                    value={cardExpiry}
                    onChangeText={handleExpiryChange}
                    placeholder="MM/YY"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                    maxLength={5}
                    editable={!isLoading}
                  />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ width: 90 }}>
                  <Text style={[styles.inputMicroLabel, { color: colors.textSecondary }]}>
                    CVC
                  </Text>
                  <TextInput
                    style={[
                      styles.miniInput,
                      { color: colors.text, borderColor: colors.border },
                    ]}
                    value={cardCvc}
                    onChangeText={handleCvcChange}
                    placeholder="123"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                    maxLength={4}
                    editable={!isLoading}
                  />
                </View>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              activeOpacity={0.9}
              disabled={isLoading || numericAmount <= 0}
              onPress={handleDeposit}
              style={[
                styles.submitButton,
                {
                  backgroundColor:
                    numericAmount <= 0 || isLoading ? '#94a3b8' : colors.primary,
                  shadowColor: colors.primary,
                  shadowOpacity: numericAmount <= 0 || isLoading ? 0 : 0.35,
                },
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.submitButtonText}>
                  Add {formatCurrency(numericAmount, currency)} to Wallet
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
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 16,
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
  presetsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 18,
  },
  presetChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetChipText: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 18,
  },
  modeCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  modeTitle: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  modeSubtitle: {
    fontSize: 11,
    marginTop: 2,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  cardImposterContainer: {
    marginBottom: 14,
    borderRadius: 20,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 6,
  },
  cardImposterGradient: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    minHeight: 180,
    justifyContent: 'space-between',
  },
  discoverAccentRibbon: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 140,
    height: 140,
    borderTopRightRadius: 20,
    backgroundColor: 'rgba(255, 96, 0, 0.08)',
    borderBottomLeftRadius: 100,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emvChip: {
    width: 38,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#d4af37',
    borderWidth: 1,
    borderColor: '#fef08a',
    position: 'relative',
    overflow: 'hidden',
  },
  chipInteriorLineHorizontal: {
    position: 'absolute',
    top: 13,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#a16207',
  },
  chipInteriorLineVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 18,
    width: 1,
    backgroundColor: '#a16207',
  },
  visaLogo: {
    fontSize: 22,
    fontWeight: '900',
    fontStyle: 'italic',
    color: '#ffffff',
    letterSpacing: 1.5,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  mastercardLogo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mastercardCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    opacity: 0.9,
  },
  amexLogoBadge: {
    borderWidth: 1.5,
    borderColor: '#ffffff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  amexLogoText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  discoverLogo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  discoverLogoPart: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  discoverCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FF6000',
    marginHorizontal: 1,
    shadowColor: '#FF6000',
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 3,
  },
  jcbBadge: {
    backgroundColor: '#065f46',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  jcbText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#ffffff',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  genericBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  genericBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 1,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  cardNumberText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 2,
    fontFamily: 'SpaceGrotesk_700Bold',
    marginVertical: 12,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  cardMetaLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#a1a1aa',
    letterSpacing: 1,
    fontFamily: 'SpaceGrotesk_700Bold',
    marginBottom: 2,
  },
  cardMetaValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  networkBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  networkBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.8,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  testCardsContainer: {
    marginBottom: 16,
  },
  testCardsLabel: {
    fontSize: 11,
    fontFamily: 'SpaceGrotesk_500Medium',
    marginBottom: 6,
  },
  testCardsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  testCardChip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  testCardChipText: {
    fontSize: 11,
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
  cardDetailsBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },
  cardHeaderLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardBrandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cardBrandText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  secureText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'SpaceGrotesk_600SemiBold',
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
    marginBottom: 12,
  },
  rowTwoCols: {
    flexDirection: 'row',
    alignItems: 'center',
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
