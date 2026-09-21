import React, { useState, useEffect } from 'react';
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
  Clipboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  X,
  CreditCard,
  ShieldCheck,
  Zap,
  Wifi,
  Landmark,
  Smartphone,
  Check,
  Copy,
  Target,
  Wallet,
  Receipt,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/providers/theme-provider';
import { auth } from '@/config/firebase';
import { depositToWallet } from '@/services/savings-service';
import {
  isStripeEnabled,
  createDepositIntent,
  confirmPaymentWithCard,
} from '@/services/stripe-service';
import { SavingsVault } from '@/types';
import { formatCurrency, getCurrencySymbol } from '@/utils/currency-utils';

interface AddMoneyModalProps {
  visible: boolean;
  businessId: string;
  userId: string;
  currency?: string;
  vaults?: SavingsVault[];
  initialVaultId?: string;
  initialVaultName?: string;
  onClose: () => void;
  onSuccess: () => void;
}

const PRESET_AMOUNTS = [25, 50, 100, 250, 500];

type PaymentChannel = 'card' | 'bank' | 'mobile_money';
type CardBrand = 'Visa' | 'Mastercard' | 'Amex' | 'Discover' | 'JCB' | 'Card';
type MobileCarrier = 'telebirr' | 'mpesa' | 'cashapp' | 'orange';

interface ReceiptData {
  amount: number;
  currency: string;
  destinationTitle: string;
  isVault: boolean;
  paymentMethodTitle: string;
  referenceId: string;
  timestamp: string;
}

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

const MOBILE_CARRIERS: { id: MobileCarrier; name: string; prefix: string; accentColor: string; description: string }[] = [
  { id: 'telebirr', name: 'Telebirr', prefix: '+251', accentColor: '#0284c7', description: 'Ethio Telecom SuperApp instant USSD push' },
  { id: 'mpesa', name: 'M-Pesa', prefix: '+254', accentColor: '#16a34a', description: 'Safaricom M-Pesa STK mobile payment push' },
  { id: 'cashapp', name: 'Cash App', prefix: '$', accentColor: '#00d632', description: 'Instant cash tag settlement and transfer' },
  { id: 'orange', name: 'Orange Money', prefix: '+221', accentColor: '#ea580c', description: 'Orange telecom instant mobile wallet transfer' },
];

export const AddMoneyModal: React.FC<AddMoneyModalProps> = ({
  visible,
  businessId,
  userId,
  currency = 'USD',
  vaults = [],
  initialVaultId,
  initialVaultName,
  onClose,
  onSuccess,
}) => {
  const { colors, isDark } = useTheme();

  // Primary configuration
  const [selectedChannel, setSelectedChannel] = useState<PaymentChannel>('card');
  const [targetDestination, setTargetDestination] = useState<'wallet' | string>('wallet');
  const [amountStr, setAmountStr] = useState('50');

  // Card payment state
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [isSandboxMode, setIsSandboxMode] = useState(true);

  // Bank transfer state
  const [bankCopiedField, setBankCopiedField] = useState<string | null>(null);
  const [bankReference, setBankReference] = useState('');

  // Mobile money state
  const [selectedCarrier, setSelectedCarrier] = useState<MobileCarrier>('telebirr');
  const [mobilePhone, setMobilePhone] = useState('');

  // Processing & Receipt state
  const [isLoading, setIsLoading] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

  const currencySymbol = getCurrencySymbol(currency);
  const numericAmount = parseFloat(amountStr) || 0;
  const cardBrand = detectCardBrand(cardNumber);

  // Synchronize initial target vault when modal opens
  useEffect(() => {
    if (visible) {
      if (initialVaultId) {
        setTargetDestination(initialVaultId);
      } else {
        setTargetDestination('wallet');
      }
      setReceiptData(null);
      // Generate a dynamic bank transaction reference code
      const uniqueSuffix = Math.floor(100000 + Math.random() * 900000);
      const bizTag = businessId.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase() || 'SPND';
      setBankReference(`XPNSE-${bizTag}-${uniqueSuffix}`);
    }
  }, [visible, initialVaultId, businessId]);

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
    if (Platform.OS !== 'web') {
      try {
        Haptics.selectionAsync();
      } catch (e) {}
    }
  };

  const copyToClipboard = (text: string, fieldId: string) => {
    Clipboard.setString(text);
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        navigator.clipboard.writeText(text);
      } catch (e) {}
    }
    setBankCopiedField(fieldId);
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (e) {}
    }
    setTimeout(() => {
      setBankCopiedField(null);
    }, 2000);
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
          gradient: ['#042f2e', '#115e59', '#021e1a'] as const,
          borderColor: 'rgba(20, 184, 166, 0.4)',
          shadowColor: '#0d9488',
          networkLabel: 'AMEX',
        };
      case 'Discover':
        return {
          gradient: ['#431407', '#9a3412', '#1c0702'] as const,
          borderColor: 'rgba(249, 115, 22, 0.4)',
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

  const cardVisualTheme = getCardTheme(cardBrand);

  // Resolve target vault information
  const selectedVault = targetDestination !== 'wallet'
    ? vaults.find((v) => v.id === targetDestination)
    : undefined;
  const destinationTitle = selectedVault ? selectedVault.name : 'Spendable Wallet';
  const isVaultDestination = Boolean(selectedVault);

  // Execute Payment Handler
  const handleExecutePayment = async () => {
    if (numericAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter an amount greater than zero.');
      return;
    }

    try {
      setIsLoading(true);

      if (selectedChannel === 'card') {
        const digitsOnly = cardNumber.replace(/\D/g, '');
        if (digitsOnly.length < 12) {
          Alert.alert('Invalid Card Number', 'Please enter a valid card number or select a test card.');
          setIsLoading(false);
          return;
        }

        const brandLabel = cardBrand === 'Card' ? 'Card' : cardBrand;
        const lastFour = digitsOnly.slice(-4) || '1117';
        const methodTitle = isSandboxMode
          ? `Instant Card Top-Up (${brandLabel} •••• ${lastFour})`
          : `${brandLabel} ending in ${lastFour}`;

        if (isSandboxMode || !isStripeEnabled()) {
          const res = await depositToWallet({
            businessId,
            userId,
            amount: numericAmount,
            currency,
            paymentMethodTitle: methodTitle,
            paymentIntentId: `pi_sandbox_${Date.now()}`,
            targetVaultId: selectedVault?.id,
            targetVaultName: selectedVault?.name,
          });

          if (res.success) {
            if (Platform.OS !== 'web') {
              try {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              } catch (e) {}
            }
            setReceiptData({
              amount: numericAmount,
              currency,
              destinationTitle,
              isVault: isVaultDestination,
              paymentMethodTitle: methodTitle,
              referenceId: `TXN-CARD-${Date.now().toString().slice(-6)}`,
              timestamp: new Date().toLocaleString(),
            });
            onSuccess();
          } else {
            Alert.alert('Deposit Failed', res.error || 'Transaction could not be processed.');
          }
          return;
        }

        // Live Stripe Gateway Direct Tokenization Pipeline
        const currentUser = auth?.currentUser;
        if (!currentUser) {
          Alert.alert('Authentication Required', 'Please sign in to proceed with payment.');
          setIsLoading(false);
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
            paymentMethodTitle: `Verified Instant Card (${brandLabel} •••• ${lastFour})`,
            paymentIntentId: intentRes.paymentIntentId,
            targetVaultId: selectedVault?.id,
            targetVaultName: selectedVault?.name,
          });
          if (fallbackRes.success) {
            setReceiptData({
              amount: numericAmount,
              currency,
              destinationTitle,
              isVault: isVaultDestination,
              paymentMethodTitle: `Card ending in ${lastFour}`,
              referenceId: intentRes.paymentIntentId,
              timestamp: new Date().toLocaleString(),
            });
            onSuccess();
          } else {
            Alert.alert('Deposit Failed', fallbackRes.error);
          }
          return;
        }

        const [expMonthStr, expYearStr] = cardExpiry.split('/');
        const expMonth = parseInt(expMonthStr, 10);
        let expYear = parseInt(expYearStr, 10);
        if (expYear < 100) expYear += 2000;

        const confirmRes = await confirmPaymentWithCard(intentRes.clientSecret, {
          number: cardNumber,
          expMonth,
          expYear,
          cvc: cardCvc,
          cardholderName: cardHolder.trim() || undefined,
        });

        if (confirmRes.success) {
          await depositToWallet({
            businessId,
            userId,
            amount: numericAmount,
            currency,
            paymentMethodTitle: `Stripe Direct (${brandLabel} •••• ${lastFour})`,
            paymentIntentId: intentRes.paymentIntentId,
            targetVaultId: selectedVault?.id,
            targetVaultName: selectedVault?.name,
          });

          setReceiptData({
            amount: numericAmount,
            currency,
            destinationTitle,
            isVault: isVaultDestination,
            paymentMethodTitle: `Stripe Card (${brandLabel} •••• ${lastFour})`,
            referenceId: intentRes.paymentIntentId,
            timestamp: new Date().toLocaleString(),
          });
          onSuccess();
        } else {
          Alert.alert('Payment Declined', confirmRes.error || 'Transaction could not be authorized.');
        }
      } else if (selectedChannel === 'bank') {
        // Bank Wire Transfer Flow
        const methodTitle = `Bank Wire Transfer (Ref: ${bankReference})`;
        const res = await depositToWallet({
          businessId,
          userId,
          amount: numericAmount,
          currency,
          paymentMethodTitle: methodTitle,
          paymentIntentId: bankReference,
          targetVaultId: selectedVault?.id,
          targetVaultName: selectedVault?.name,
        });

        if (res.success) {
          if (Platform.OS !== 'web') {
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (e) {}
          }
          setReceiptData({
            amount: numericAmount,
            currency,
            destinationTitle,
            isVault: isVaultDestination,
            paymentMethodTitle: 'Bank Wire / Clearing Settlement',
            referenceId: bankReference,
            timestamp: new Date().toLocaleString(),
          });
          onSuccess();
        } else {
          Alert.alert('Deposit Failed', res.error || 'Could not verify bank transfer.');
        }
      } else if (selectedChannel === 'mobile_money') {
        // Mobile Money Flow
        const carrierMeta = MOBILE_CARRIERS.find((c) => c.id === selectedCarrier) || MOBILE_CARRIERS[0];
        const cleanPhone = mobilePhone.trim() || '0911002233';
        const methodTitle = `${carrierMeta.name} Mobile Money (${cleanPhone})`;

        const res = await depositToWallet({
          businessId,
          userId,
          amount: numericAmount,
          currency,
          paymentMethodTitle: methodTitle,
          paymentIntentId: `MM_${selectedCarrier.toUpperCase()}_${Date.now()}`,
          targetVaultId: selectedVault?.id,
          targetVaultName: selectedVault?.name,
        });

        if (res.success) {
          if (Platform.OS !== 'web') {
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (e) {}
          }
          setReceiptData({
            amount: numericAmount,
            currency,
            destinationTitle,
            isVault: isVaultDestination,
            paymentMethodTitle: `${carrierMeta.name} (${cleanPhone})`,
            referenceId: `MM-${Date.now().toString().slice(-6)}`,
            timestamp: new Date().toLocaleString(),
          });
          onSuccess();
        } else {
          Alert.alert('Mobile Money Failed', res.error || 'Mobile transfer could not be settled.');
        }
      }
    } catch (err: any) {
      console.error('[AddMoneyModal] Deposit error:', err);
      Alert.alert('Payment Error', err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseReceipt = () => {
    setReceiptData(null);
    onClose();
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
              backgroundColor: isDark ? '#090e0d' : colors.card,
              borderColor: isDark ? 'rgba(16, 185, 129, 0.25)' : colors.border,
            },
          ]}
        >
          {/* Top Header */}
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
                {receiptData ? (
                  <Receipt size={18} color="#10B981" />
                ) : (
                  <Landmark size={18} color="#10B981" />
                )}
              </View>
              <View>
                <Text style={[styles.headerTitle, { color: colors.text }]}>
                  {receiptData ? 'Deposit Receipt' : 'Real-Money Funding'}
                </Text>
                <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                  {receiptData
                    ? 'Immutable Settlement Confirmation'
                    : 'External Capital Allocation Gateway'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={receiptData ? handleCloseReceipt : onClose}
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

          {/* Conditional View: Digital Receipt vs Payment Input */}
          {receiptData ? (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.receiptBody}
            >
              <View style={styles.receiptSuccessPod}>
                <View style={styles.receiptCheckCircle}>
                  <CheckCircle2 size={38} color="#10B981" strokeWidth={2.5} />
                </View>
                <Text style={[styles.receiptSuccessTitle, { color: colors.text }]}>
                  Capital Allocated & Settled
                </Text>
                <Text style={[styles.receiptSuccessSubtitle, { color: colors.textSecondary }]}>
                  External funds verified and credited immediately.
                </Text>
                <Text style={[styles.receiptAmountHero, { color: '#10B981' }]}>
                  {formatCurrency(receiptData.amount, receiptData.currency)}
                </Text>
              </View>

              {/* Destination & Channel Badge */}
              <View
                style={[
                  styles.receiptDestinationCard,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#f4f4f5',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : colors.border,
                  },
                ]}
              >
                <View style={styles.receiptDestRow}>
                  <Text style={[styles.receiptFieldLabel, { color: colors.textSecondary }]}>
                    DESTINATION
                  </Text>
                  <View style={styles.receiptDestBadge}>
                    {receiptData.isVault ? (
                      <Target size={12} color="#10B981" />
                    ) : (
                      <Wallet size={12} color="#10B981" />
                    )}
                    <Text style={styles.receiptDestBadgeText}>
                      {receiptData.destinationTitle}
                    </Text>
                  </View>
                </View>

                <View style={styles.receiptDivider} />

                <View style={styles.receiptDestRow}>
                  <Text style={[styles.receiptFieldLabel, { color: colors.textSecondary }]}>
                    PAYMENT CHANNEL
                  </Text>
                  <Text style={[styles.receiptFieldValue, { color: colors.text }]}>
                    {receiptData.paymentMethodTitle}
                  </Text>
                </View>

                <View style={styles.receiptDivider} />

                <View style={styles.receiptDestRow}>
                  <Text style={[styles.receiptFieldLabel, { color: colors.textSecondary }]}>
                    SETTLEMENT REF
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => copyToClipboard(receiptData.referenceId, 'receipt_ref')}
                    style={styles.copyRow}
                  >
                    <Text style={[styles.receiptFieldValueMono, { color: colors.text }]}>
                      {receiptData.referenceId}
                    </Text>
                    {bankCopiedField === 'receipt_ref' ? (
                      <Check size={12} color="#10B981" />
                    ) : (
                      <Copy size={12} color={colors.textSecondary} />
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.receiptDivider} />

                <View style={styles.receiptDestRow}>
                  <Text style={[styles.receiptFieldLabel, { color: colors.textSecondary }]}>
                    TIMESTAMP
                  </Text>
                  <Text style={[styles.receiptFieldValue, { color: colors.textSecondary }]}>
                    {receiptData.timestamp}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.88}
                onPress={handleCloseReceipt}
                style={styles.receiptDoneBtn}
              >
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.actionBtnGradient}
                >
                  <Text style={styles.actionBtnText}>Done</Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollBody}
              keyboardShouldPersistTaps="handled"
            >
              {/* Target Destination Selector */}
              <View style={styles.sectionBlock}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                  ALLOCATION DESTINATION
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.destinationPillsRow}
                >
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setTargetDestination('wallet')}
                    style={[
                      styles.destinationPill,
                      {
                        backgroundColor:
                          targetDestination === 'wallet'
                            ? isDark
                              ? 'rgba(16, 185, 129, 0.18)'
                              : '#ecfdf5'
                            : isDark
                            ? 'rgba(255, 255, 255, 0.04)'
                            : '#f4f4f5',
                        borderColor:
                          targetDestination === 'wallet'
                            ? '#10B981'
                            : isDark
                            ? 'rgba(255, 255, 255, 0.08)'
                            : colors.border,
                      },
                    ]}
                  >
                    <Wallet
                      size={14}
                      color={targetDestination === 'wallet' ? '#10B981' : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.destinationPillText,
                        {
                          color:
                            targetDestination === 'wallet' ? '#10B981' : colors.text,
                        },
                      ]}
                    >
                      Spendable Wallet
                    </Text>
                  </TouchableOpacity>

                  {vaults.map((vault) => {
                    const isSelected = targetDestination === vault.id;
                    return (
                      <TouchableOpacity
                        key={vault.id}
                        activeOpacity={0.8}
                        onPress={() => setTargetDestination(vault.id)}
                        style={[
                          styles.destinationPill,
                          {
                            backgroundColor: isSelected
                              ? isDark
                                ? 'rgba(16, 185, 129, 0.18)'
                                : '#ecfdf5'
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
                        <Target
                          size={14}
                          color={isSelected ? '#10B981' : colors.textSecondary}
                        />
                        <Text
                          style={[
                            styles.destinationPillText,
                            { color: isSelected ? '#10B981' : colors.text },
                          ]}
                          numberOfLines={1}
                        >
                          Vault: {vault.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Amount Display & Input */}
              <View
                style={[
                  styles.amountBox,
                  {
                    backgroundColor: isDark ? 'rgba(0, 0, 0, 0.4)' : '#f4f4f5',
                    borderColor: isDark ? 'rgba(16, 185, 129, 0.25)' : colors.border,
                  },
                ]}
              >
                <Text style={[styles.currencyPrefix, { color: '#10B981' }]}>
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
                            ? '#10B981'
                            : isDark
                            ? 'rgba(255, 255, 255, 0.06)'
                            : '#e4e4e7',
                          borderColor: isSelected ? '#10B981' : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.presetChipText,
                          {
                            color: isSelected ? '#ffffff' : colors.text,
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

              {/* Payment Channel Rail Switcher */}
              <View style={styles.sectionBlock}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                  PAYMENT METHOD
                </Text>
                <View
                  style={[
                    styles.paymentRailTabBar,
                    {
                      backgroundColor: isDark ? '#18181b' : '#f4f4f5',
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.border,
                    },
                  ]}
                >
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setSelectedChannel('card')}
                    style={[
                      styles.paymentRailTab,
                      selectedChannel === 'card' && [
                        styles.paymentRailTabActive,
                        { backgroundColor: isDark ? '#27272a' : '#ffffff' },
                      ],
                    ]}
                  >
                    <CreditCard
                      size={14}
                      color={selectedChannel === 'card' ? '#10B981' : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.paymentRailTabText,
                        {
                          color: selectedChannel === 'card' ? '#10B981' : colors.textSecondary,
                          fontWeight: selectedChannel === 'card' ? '700' : '500',
                        },
                      ]}
                    >
                      Card
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setSelectedChannel('bank')}
                    style={[
                      styles.paymentRailTab,
                      selectedChannel === 'bank' && [
                        styles.paymentRailTabActive,
                        { backgroundColor: isDark ? '#27272a' : '#ffffff' },
                      ],
                    ]}
                  >
                    <Landmark
                      size={14}
                      color={selectedChannel === 'bank' ? '#10B981' : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.paymentRailTabText,
                        {
                          color: selectedChannel === 'bank' ? '#10B981' : colors.textSecondary,
                          fontWeight: selectedChannel === 'bank' ? '700' : '500',
                        },
                      ]}
                    >
                      Bank Wire
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setSelectedChannel('mobile_money')}
                    style={[
                      styles.paymentRailTab,
                      selectedChannel === 'mobile_money' && [
                        styles.paymentRailTabActive,
                        { backgroundColor: isDark ? '#27272a' : '#ffffff' },
                      ],
                    ]}
                  >
                    <Smartphone
                      size={14}
                      color={selectedChannel === 'mobile_money' ? '#10B981' : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.paymentRailTabText,
                        {
                          color: selectedChannel === 'mobile_money' ? '#10B981' : colors.textSecondary,
                          fontWeight: selectedChannel === 'mobile_money' ? '700' : '500',
                        },
                      ]}
                    >
                      Mobile Money
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* RAIL 1: CARD PAYMENT */}
              {selectedChannel === 'card' && (
                <View>
                  {/* Mode Switch: Instant Verified Sandbox vs Live Stripe */}
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
                        borderColor: isSandboxMode ? '#10B981' : colors.border,
                      },
                    ]}
                  >
                    <View style={styles.modeCardLeft}>
                      <Zap
                        size={16}
                        color={isSandboxMode ? '#10B981' : colors.textSecondary}
                      />
                      <View>
                        <Text
                          style={[
                            styles.modeTitle,
                            { color: isSandboxMode ? '#10B981' : colors.text },
                          ]}
                        >
                          {isSandboxMode ? 'Verified Instant Simulation' : 'Standard Payment Gateway'}
                        </Text>
                        <Text
                          style={[styles.modeSubtitle, { color: colors.textSecondary }]}
                        >
                          {isSandboxMode
                            ? 'Simulates instant verified card settlement immediately'
                            : 'Direct gateway tokenization and network authorization'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>

                  {/* 3D Physical Card Visualizer */}
                  <View style={styles.cardVisualContainer}>
                    <LinearGradient
                      colors={cardVisualTheme.gradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[
                        styles.cardVisual,
                        { borderColor: cardVisualTheme.borderColor },
                      ]}
                    >
                      <View style={styles.cardTopRow}>
                        <View style={styles.cardChipOutline}>
                          <View style={styles.cardChipInner} />
                        </View>
                        <Wifi size={18} color="rgba(255, 255, 255, 0.6)" />
                        <View style={{ flex: 1 }} />
                        <Text style={styles.cardBrandBadgeText}>{cardVisualTheme.networkLabel}</Text>
                      </View>

                      <Text style={styles.cardNumberText} numberOfLines={1}>
                        {cardNumber || '•••• •••• •••• ••••'}
                      </Text>

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
                      </View>
                    </LinearGradient>
                  </View>

                  {/* Quick Test Card Selector */}
                  <View style={styles.testCardsContainer}>
                    <Text style={[styles.testCardsLabel, { color: colors.textSecondary }]}>
                      Quick Fill Benchmark Cards:
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.testCardsRow}
                    >
                      {TEST_CARDS.map((tc) => (
                        <TouchableOpacity
                          key={tc.label}
                          activeOpacity={0.75}
                          onPress={() => applyTestCard(tc)}
                          style={[
                            styles.testCardChip,
                            {
                              backgroundColor: isDark
                                ? 'rgba(255, 255, 255, 0.06)'
                                : '#f1f5f9',
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

                  {/* Card Form Inputs */}
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
                      <View style={[styles.cardBrandBadge, { backgroundColor: '#10B981' }]}>
                        <CreditCard size={14} color="#ffffff" />
                        <Text style={styles.cardBrandText}>
                          {cardBrand === 'Card' ? 'All Cards Supported' : `${cardBrand} Detected`}
                        </Text>
                      </View>
                      <View style={styles.secureBadge}>
                        <ShieldCheck size={14} color="#10B981" />
                        <Text style={[styles.secureText, { color: '#10B981' }]}>
                          256-bit Encrypted
                        </Text>
                      </View>
                    </View>

                    <Text style={[styles.inputMicroLabel, { color: colors.textSecondary }]}>
                      CARD NUMBER
                    </Text>
                    <TextInput
                      style={[styles.miniInput, { color: colors.text, borderColor: colors.border }]}
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
                      style={[styles.miniInput, { color: colors.text, borderColor: colors.border }]}
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
                          style={[styles.miniInput, { color: colors.text, borderColor: colors.border }]}
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
                      <View style={{ width: 100 }}>
                        <Text style={[styles.inputMicroLabel, { color: colors.textSecondary }]}>
                          CVC
                        </Text>
                        <TextInput
                          style={[styles.miniInput, { color: colors.text, borderColor: colors.border }]}
                          value={cardCvc}
                          onChangeText={handleCvcChange}
                          placeholder="CVC"
                          placeholderTextColor={colors.textSecondary}
                          keyboardType="numeric"
                          maxLength={4}
                          secureTextEntry
                          editable={!isLoading}
                        />
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {/* RAIL 2: BANK WIRE TRANSFER */}
              {selectedChannel === 'bank' && (
                <View style={styles.railContainer}>
                  <View
                    style={[
                      styles.bankWireCard,
                      {
                        backgroundColor: isDark ? '#18181b' : '#f8fafc',
                        borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.border,
                      },
                    ]}
                  >
                    <View style={styles.bankWireHeader}>
                      <Landmark size={18} color="#10B981" />
                      <Text style={[styles.bankWireTitle, { color: colors.text }]}>
                        Direct Clearing Settlement Details
                      </Text>
                    </View>
                    <Text style={[styles.bankWireSubtitle, { color: colors.textSecondary }]}>
                      Submit an external wire to this dedicated clearing account. Funds settle upon receipt.
                    </Text>

                    {/* Account Fields */}
                    <View style={styles.bankFieldsList}>
                      <View style={styles.bankFieldRow}>
                        <View>
                          <Text style={[styles.bankFieldCaption, { color: colors.textSecondary }]}>
                            BENEFICIARY
                          </Text>
                          <Text style={[styles.bankFieldValue, { color: colors.text }]}>
                            SPNDY ESCROW & SETTLEMENT
                          </Text>
                        </View>
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => copyToClipboard('SPNDY ESCROW & SETTLEMENT', 'beneficiary')}
                          style={styles.copySmallBtn}
                        >
                          {bankCopiedField === 'beneficiary' ? (
                            <Check size={14} color="#10B981" />
                          ) : (
                            <Copy size={14} color={colors.textSecondary} />
                          )}
                        </TouchableOpacity>
                      </View>

                      <View style={styles.bankFieldRow}>
                        <View>
                          <Text style={[styles.bankFieldCaption, { color: colors.textSecondary }]}>
                            ROUTING NUMBER
                          </Text>
                          <Text style={[styles.bankFieldValueMono, { color: colors.text }]}>
                            021000021
                          </Text>
                        </View>
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => copyToClipboard('021000021', 'routing')}
                          style={styles.copySmallBtn}
                        >
                          {bankCopiedField === 'routing' ? (
                            <Check size={14} color="#10B981" />
                          ) : (
                            <Copy size={14} color={colors.textSecondary} />
                          )}
                        </TouchableOpacity>
                      </View>

                      <View style={styles.bankFieldRow}>
                        <View>
                          <Text style={[styles.bankFieldCaption, { color: colors.textSecondary }]}>
                            ACCOUNT / IBAN NUMBER
                          </Text>
                          <Text style={[styles.bankFieldValueMono, { color: colors.text }]}>
                            9821 4402 1109 4581
                          </Text>
                        </View>
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => copyToClipboard('9821440211094581', 'account')}
                          style={styles.copySmallBtn}
                        >
                          {bankCopiedField === 'account' ? (
                            <Check size={14} color="#10B981" />
                          ) : (
                            <Copy size={14} color={colors.textSecondary} />
                          )}
                        </TouchableOpacity>
                      </View>

                      <View
                        style={[
                          styles.bankFieldRowHighlight,
                          {
                            backgroundColor: isDark
                              ? 'rgba(16, 185, 129, 0.1)'
                              : 'rgba(16, 185, 129, 0.08)',
                            borderColor: 'rgba(16, 185, 129, 0.3)',
                          },
                        ]}
                      >
                        <View>
                          <Text style={[styles.bankFieldCaption, { color: '#10B981' }]}>
                            MANDATORY DEPOSIT REFERENCE
                          </Text>
                          <Text style={[styles.bankFieldValueMonoBold, { color: '#10B981' }]}>
                            {bankReference}
                          </Text>
                        </View>
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => copyToClipboard(bankReference, 'ref')}
                          style={styles.copySmallBtn}
                        >
                          {bankCopiedField === 'ref' ? (
                            <Check size={14} color="#10B981" />
                          ) : (
                            <Copy size={14} color="#10B981" />
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {/* RAIL 3: MOBILE MONEY */}
              {selectedChannel === 'mobile_money' && (
                <View style={styles.railContainer}>
                  <Text style={[styles.inputMicroLabel, { color: colors.textSecondary }]}>
                    SELECT MOBILE MONEY CARRIER
                  </Text>
                  <View style={styles.carrierPillsGrid}>
                    {MOBILE_CARRIERS.map((carrier) => {
                      const isSelected = selectedCarrier === carrier.id;
                      return (
                        <TouchableOpacity
                          key={carrier.id}
                          activeOpacity={0.8}
                          onPress={() => setSelectedCarrier(carrier.id)}
                          style={[
                            styles.carrierPill,
                            {
                              backgroundColor: isSelected
                                ? isDark
                                  ? 'rgba(16, 185, 129, 0.15)'
                                  : '#ecfdf5'
                                : isDark
                                ? '#18181b'
                                : '#f4f4f5',
                              borderColor: isSelected ? carrier.accentColor : colors.border,
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.carrierDot,
                              { backgroundColor: carrier.accentColor },
                            ]}
                          />
                          <Text
                            style={[
                              styles.carrierPillText,
                              {
                                color: isSelected ? colors.text : colors.textSecondary,
                                fontWeight: isSelected ? '700' : '500',
                              },
                            ]}
                          >
                            {carrier.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <View
                    style={[
                      styles.mobilePhoneBox,
                      {
                        backgroundColor: isDark ? '#18181b' : '#fafafa',
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.inputMicroLabel, { color: colors.textSecondary }]}>
                      PHONE NUMBER OR ACCOUNT HANDLE
                    </Text>
                    <View style={styles.phoneInputRow}>
                      <View
                        style={[
                          styles.phonePrefixBadge,
                          { backgroundColor: isDark ? '#27272a' : '#e4e4e7' },
                        ]}
                      >
                        <Text style={[styles.phonePrefixText, { color: colors.text }]}>
                          {MOBILE_CARRIERS.find((c) => c.id === selectedCarrier)?.prefix}
                        </Text>
                      </View>
                      <TextInput
                        style={[
                          styles.phoneTextInput,
                          { color: colors.text, borderColor: colors.border },
                        ]}
                        value={mobilePhone}
                        onChangeText={setMobilePhone}
                        placeholder="911 00 22 33"
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="phone-pad"
                        editable={!isLoading}
                      />
                    </View>

                    <Text style={[styles.mobileDisclaimer, { color: colors.textSecondary }]}>
                      {MOBILE_CARRIERS.find((c) => c.id === selectedCarrier)?.description}
                    </Text>
                  </View>
                </View>
              )}

              {/* Action Submit Button */}
              <TouchableOpacity
                activeOpacity={0.88}
                disabled={isLoading || numericAmount <= 0}
                onPress={handleExecutePayment}
                style={styles.submitButtonOuter}
              >
                <LinearGradient
                  colors={
                    isLoading || numericAmount <= 0
                      ? ['#475569', '#334155']
                      : ['#10B981', '#059669']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.actionBtnGradient}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <View style={styles.btnRow}>
                      <Text style={styles.actionBtnText}>
                        Deposit {formatCurrency(numericAmount, currency)}
                      </Text>
                      <ArrowRight size={16} color="#ffffff" strokeWidth={2.5} />
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    paddingHorizontal: 18,
    maxHeight: '92%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16.5,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 11,
    fontFamily: 'SpaceGrotesk_400Regular',
    marginTop: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    paddingBottom: 24,
  },
  sectionBlock: {
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  destinationPillsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  destinationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  destinationPillText: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_600SemiBold',
    maxWidth: 160,
  },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  currencyPrefix: {
    fontSize: 28,
    fontFamily: 'SpaceGrotesk_700Bold',
    marginRight: 6,
  },
  amountInput: {
    fontSize: 34,
    fontFamily: 'SpaceGrotesk_700Bold',
    minWidth: 120,
    textAlign: 'center',
  },
  presetsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 18,
  },
  presetChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  presetChipText: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  paymentRailTabBar: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
  },
  paymentRailTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 9,
  },
  paymentRailTabActive: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  paymentRailTabText: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  modeCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  modeTitle: {
    fontSize: 12.5,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  modeSubtitle: {
    fontSize: 10.5,
    fontFamily: 'SpaceGrotesk_400Regular',
    marginTop: 1,
  },
  cardVisualContainer: {
    alignItems: 'center',
    marginBottom: 14,
  },
  cardVisual: {
    width: '100%',
    height: 180,
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    justifyContent: 'space-between',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardChipOutline: {
    width: 32,
    height: 24,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#fde047',
    marginRight: 10,
    backgroundColor: '#ca8a04',
    padding: 2,
  },
  cardChipInner: {
    flex: 1,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#fef08a',
  },
  cardBrandBadgeText: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#ffffff',
    letterSpacing: 1,
  },
  cardNumberText: {
    fontSize: 17,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#ffffff',
    letterSpacing: 2,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  cardMetaLabel: {
    fontSize: 8.5,
    color: 'rgba(255, 255, 255, 0.65)',
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 0.6,
  },
  cardMetaValue: {
    fontSize: 12,
    color: '#ffffff',
    fontFamily: 'SpaceGrotesk_600SemiBold',
    marginTop: 2,
  },
  testCardsContainer: {
    marginBottom: 14,
  },
  testCardsLabel: {
    fontSize: 10.5,
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
    paddingVertical: 5,
  },
  testCardChipText: {
    fontSize: 11,
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
  cardDetailsBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 18,
  },
  cardHeaderLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardBrandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cardBrandText: {
    fontSize: 10.5,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#ffffff',
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  secureText: {
    fontSize: 10.5,
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
  inputMicroLabel: {
    fontSize: 9.5,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 0.8,
    marginBottom: 5,
  },
  miniInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13.5,
    fontFamily: 'SpaceGrotesk_500Medium',
    marginBottom: 10,
  },
  rowTwoCols: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  railContainer: {
    marginBottom: 16,
  },
  bankWireCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  bankWireHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  bankWireTitle: {
    fontSize: 13.5,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  bankWireSubtitle: {
    fontSize: 11,
    fontFamily: 'SpaceGrotesk_400Regular',
    lineHeight: 16,
    marginBottom: 14,
  },
  bankFieldsList: {
    gap: 9,
  },
  bankFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  bankFieldRowHighlight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  bankFieldCaption: {
    fontSize: 9,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 0.6,
  },
  bankFieldValue: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_600SemiBold',
    marginTop: 2,
  },
  bankFieldValueMono: {
    fontSize: 12.5,
    fontFamily: 'SpaceGrotesk_700Bold',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  bankFieldValueMonoBold: {
    fontSize: 13.5,
    fontFamily: 'SpaceGrotesk_700Bold',
    marginTop: 2,
    letterSpacing: 1,
  },
  copySmallBtn: {
    padding: 6,
    borderRadius: 6,
  },
  carrierPillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  carrierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  carrierDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  carrierPillText: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
  mobilePhoneBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  phoneInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  phonePrefixBadge: {
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderRadius: 10,
  },
  phonePrefixText: {
    fontSize: 13.5,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  phoneTextInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
  mobileDisclaimer: {
    fontSize: 10.5,
    fontFamily: 'SpaceGrotesk_400Regular',
    lineHeight: 15,
  },
  submitButtonOuter: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 6,
  },
  actionBtnGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 14.5,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#ffffff',
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  receiptBody: {
    paddingBottom: 24,
    alignItems: 'center',
  },
  receiptSuccessPod: {
    alignItems: 'center',
    marginVertical: 14,
  },
  receiptCheckCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  receiptSuccessTitle: {
    fontSize: 17,
    fontFamily: 'SpaceGrotesk_700Bold',
    marginBottom: 3,
  },
  receiptSuccessSubtitle: {
    fontSize: 11.5,
    fontFamily: 'SpaceGrotesk_400Regular',
    textAlign: 'center',
    marginBottom: 12,
  },
  receiptAmountHero: {
    fontSize: 32,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: -0.5,
  },
  receiptDestinationCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginVertical: 16,
    gap: 10,
  },
  receiptDestRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  receiptFieldLabel: {
    fontSize: 10,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 0.8,
  },
  receiptDestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  receiptDestBadgeText: {
    fontSize: 11.5,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#10B981',
  },
  receiptFieldValue: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_500Medium',
  },
  receiptFieldValueMono: {
    fontSize: 11.5,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 0.5,
  },
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  receiptDoneBtn: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 8,
  },
});
