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
import { depositToWallet } from '@/services/savings-service';
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
  const [cardNumber, setCardNumber] = useState('6011 •••• •••• 1117');
  const [cardHolder, setCardHolder] = useState('Primary Cardholder');
  const [cardExpiry, setCardExpiry] = useState('08/29');
  const [cardCvc, setCardCvc] = useState('888');
  const [isLoading, setIsLoading] = useState(false);
  const [isSandboxMode, setIsSandboxMode] = useState(true);

  const currencySymbol = getCurrencySymbol(currency);
  const numericAmount = parseFloat(amountStr) || 0;

  // Auto-detect card network from digits, defaulting to Discover
  const getCardBrand = (num: string): string => {
    const clean = num.replace(/\D/g, '');
    if (clean.startsWith('4')) return 'Visa';
    if (clean.startsWith('5')) return 'Mastercard';
    if (clean.startsWith('3')) return 'American Express';
    return 'Discover';
  };

  const cardBrand = getCardBrand(cardNumber);

  const handleDeposit = async () => {
    if (numericAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter an amount greater than 0.');
      return;
    }

    try {
      setIsLoading(true);
      const lastFour = cardNumber.replace(/\D/g, '').slice(-4) || '1117';
      const res = await depositToWallet({
        businessId,
        userId,
        amount: numericAmount,
        currency,
        paymentMethodTitle: isSandboxMode
          ? 'Instant Sandbox Top-Up'
          : `${cardBrand} ending in ${lastFour}`,
        paymentIntentId: isSandboxMode
          ? `pi_sandbox_${Date.now()}`
          : `pi_live_${Date.now()}`,
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        Alert.alert('Deposit Failed', res.error || 'Transaction could not be processed.');
      }
    } catch (err: any) {
      console.error('[AddMoneyModal] Deposit error:', err);
      Alert.alert('Deposit Error', err.message || 'An unexpected error occurred.');
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
                autoFocus
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

            {/* Mode Switch: Instant Sandbox / Live Card */}
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
                    Instant Sandbox Mode
                  </Text>
                  <Text
                    style={[styles.modeSubtitle, { color: colors.textSecondary }]}
                  >
                    {isSandboxMode
                      ? 'Simulates instant verified Discover card top-up immediately'
                      : 'Mock standard gateway'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Visual Discover Card Imposter */}
            <View style={styles.cardImposterContainer}>
              <LinearGradient
                colors={['#242933', '#161920', '#0d0f14']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardImposterGradient}
              >
                {/* Discover Signature Warm Orange Ribbon Accent */}
                <View style={styles.discoverAccentRibbon} />

                {/* Card Top Row: Chip, NFC and Discover Wordmark */}
                <View style={styles.cardTopRow}>
                  <View style={styles.chipRow}>
                    {/* Metallic EMV Chip Graphic */}
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

                  {/* Discover Logo */}
                  <View style={styles.discoverLogo}>
                    <Text style={styles.discoverLogoPart}>DISC</Text>
                    <View style={styles.discoverCircle} />
                    <Text style={styles.discoverLogoPart}>VER</Text>
                  </View>
                </View>

                {/* Card Middle: Embossed-Style Card Number */}
                <Text style={styles.cardNumberText} numberOfLines={1}>
                  {cardNumber}
                </Text>

                {/* Card Bottom Row: Holder, Expiry & Network Label */}
                <View style={styles.cardBottomRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardMetaLabel}>CARDHOLDER</Text>
                    <Text style={styles.cardMetaValue} numberOfLines={1}>
                      {cardHolder.toUpperCase()}
                    </Text>
                  </View>

                  <View style={{ marginRight: 20 }}>
                    <Text style={styles.cardMetaLabel}>EXPIRES</Text>
                    <Text style={styles.cardMetaValue}>{cardExpiry}</Text>
                  </View>

                  <View style={styles.networkBadge}>
                    <Text style={styles.networkBadgeText}>{cardBrand.toUpperCase()}</Text>
                  </View>
                </View>
              </LinearGradient>
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
                <View style={styles.cardBrandBadge}>
                  <CreditCard size={14} color="#ffffff" />
                  <Text style={styles.cardBrandText}>{cardBrand} Network</Text>
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
                onChangeText={setCardNumber}
                editable={!isSandboxMode}
              />

              <View style={styles.rowTwoCols}>
                <View style={{ flex: 1 }}>
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
                    editable={!isSandboxMode}
                  />
                </View>
              </View>

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
                    onChangeText={setCardExpiry}
                    editable={!isSandboxMode}
                  />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ width: 80 }}>
                  <Text style={[styles.inputMicroLabel, { color: colors.textSecondary }]}>
                    CVC
                  </Text>
                  <TextInput
                    style={[
                      styles.miniInput,
                      { color: colors.text, borderColor: colors.border },
                    ]}
                    value={cardCvc}
                    onChangeText={setCardCvc}
                    keyboardType="number-pad"
                    editable={!isSandboxMode}
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
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#FF6000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 6,
  },
  cardImposterGradient: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 96, 0, 0.45)',
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
  cardNumberText: {
    fontSize: 21,
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
    backgroundColor: 'rgba(255, 96, 0, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 96, 0, 0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  networkBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FF6000',
    letterSpacing: 0.8,
    fontFamily: 'SpaceGrotesk_700Bold',
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
    backgroundColor: '#FF6000',
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
