import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  X,
  Globe,
  SlidersHorizontal,
  RefreshCw,
  Plus,
  Trash2,
  Check,
  Repeat,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Info,
  Layers,
  ChevronRight,
  CreditCard,
  Tag,
  Paperclip,
  ArrowRightLeft,
} from 'lucide-react-native';
import { Book, RecurringRule } from '@/types';
import { useBusiness } from '@/providers/business-provider';
import { useTheme } from '@/providers/theme-provider';
import { getFontFamily } from '@/config/font-config';
import { CurrencyService } from '@/services/currency-service';
import { getCurrencySymbol, formatCurrency } from '@/utils/currency-utils';
import { GlassBackdrop } from '@/components/ui/glass-backdrop';
import { CurrencyPickerModal } from '@/components/currency/currency-picker-modal';
import { CURRENCIES } from '@/constants/currencies';
import { isRuleDue } from '@/utils/recurring-engine';
import { RecurringRuleModal } from '@/components/recurring/recurring-rule-modal';
import * as Haptics from 'expo-haptics';

interface AdvancedBookModalProps {
  visible: boolean;
  book: Book;
  onClose: () => void;
}

export function AdvancedBookModal({ visible, book, onClose }: AdvancedBookModalProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { colors, isDark, deviceFont } = useTheme();
  const { currentBusiness, updateBook, recurringRules, postRecurringEntryNow } = useBusiness();

  const [selectedBookCurrency, setSelectedBookCurrency] = useState(
    (book?.currency || book?.settings?.currency || currentBusiness?.currency || 'USD').toUpperCase()
  );
  const [baseCurrencyPickerVisible, setBaseCurrencyPickerVisible] = useState(false);

  // Valuations state: Map of currencyCode -> numeric valuation in baseCurrency
  const [valuations, setValuations] = useState<Record<string, number>>({});
  const [rawValuations, setRawValuations] = useState<Record<string, string>>({});
  const [liveRates, setLiveRates] = useState<Record<string, number>>({});
  const [trackedCurrencies, setTrackedCurrencies] = useState<string[]>([]);
  const [currencyPickerVisible, setCurrencyPickerVisible] = useState(false);
  const [isRefreshingRates, setIsRefreshingRates] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Secondary Primary Currency states
  const [secondaryCurrency, setSecondaryCurrency] = useState<string | null>(null);
  const [secondaryPickerVisible, setSecondaryPickerVisible] = useState(false);
  const [secondaryValuation, setSecondaryValuation] = useState<number | undefined>(undefined);
  const [rawSecondaryValuation, setRawSecondaryValuation] = useState<string>('');
  const [secondaryQuotationDirection, setSecondaryQuotationDirection] = useState<'base_to_quote' | 'quote_to_base'>('base_to_quote');
  const [secondaryLiveRate, setSecondaryLiveRate] = useState<number | null>(null);

  // Settings toggles (default to enabled)
  const [showPaymentMode, setShowPaymentMode] = useState(true);
  const [showCategory, setShowCategory] = useState(true);
  const [showAttachments, setShowAttachments] = useState(true);

  // Recurring Modal
  const [recurringModalVisible, setRecurringModalVisible] = useState(false);

  // Initialize from book settings
  useEffect(() => {
    if (book) {
      const currentBookCurr = (book.currency || book.settings?.currency || currentBusiness?.currency || 'USD').toUpperCase();
      setSelectedBookCurrency(currentBookCurr);

      const secCurr = book.settings?.secondaryCurrency ? book.settings.secondaryCurrency.toUpperCase() : null;
      setSecondaryCurrency(secCurr);
      const secVal = book.settings?.secondaryCurrencyValuation;
      setSecondaryValuation(secVal);
      setRawSecondaryValuation(secVal !== undefined ? String(secVal) : '');
      const secDir = book.settings?.preferredQuotationDirection || 'base_to_quote';
      setSecondaryQuotationDirection(secDir);

      if (secCurr && secCurr !== currentBookCurr) {
        CurrencyService.getExchangeRate(currentBookCurr, secCurr).then((targetPerBase) => {
          setSecondaryLiveRate(targetPerBase);
          if (secVal === undefined) {
            const displayVal = secDir === 'base_to_quote' ? targetPerBase : CurrencyService.invertRate(targetPerBase);
            setSecondaryValuation(displayVal);
            setRawSecondaryValuation(String(displayVal));
          }
        });
      }

      setShowPaymentMode(book.settings?.showPaymentMode ?? true);
      setShowCategory(book.settings?.showCategory ?? true);
      setShowAttachments(book.settings?.showAttachments ?? true);

      const existingValuations = book.settings?.customCurrencyValuations || {};
      const existingTracked = book.settings?.trackedCurrencies || Object.keys(existingValuations);
      
      // Only include currencies that were explicitly tracked or saved by the user
      const initialTracked = existingTracked.filter(c => c && c.toUpperCase() !== currentBookCurr);

      const initialRaw: Record<string, string> = {};
      Object.entries(existingValuations).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          initialRaw[k] = String(v);
        }
      });

      setTrackedCurrencies(initialTracked);
      setValuations(existingValuations);
      setRawValuations(initialRaw);

      // Fetch live rates only for tracked currencies
      if (initialTracked.length > 0) {
        fetchLiveRates(initialTracked, currentBookCurr);
      }
    }
  }, [book, currentBusiness]);

  const fetchLiveRates = async (currenciesToFetch: string[], targetBase?: string) => {
    const anchor = (targetBase || selectedBookCurrency).toUpperCase();
    setIsRefreshingRates(true);
    try {
      const fetched: Record<string, number> = {};
      for (const curr of currenciesToFetch) {
        if (curr !== anchor) {
          const rate = await CurrencyService.getExchangeRate(curr, anchor);
          fetched[curr] = rate;
        }
      }
      setLiveRates(prev => ({ ...prev, ...fetched }));
    } catch (err) {
      console.warn('Failed to fetch live rates:', err);
    } finally {
      setIsRefreshingRates(false);
    }
  };

  const handleSelectBaseCurrency = (newCode: string) => {
    const upper = newCode.toUpperCase();
    setSelectedBookCurrency(upper);
    setBaseCurrencyPickerVisible(false);
    if (secondaryCurrency === upper) {
      setSecondaryCurrency(null);
      setSecondaryValuation(undefined);
      setRawSecondaryValuation('');
      setSecondaryLiveRate(null);
    }
    const updatedTracked = trackedCurrencies.filter(c => c !== upper);
    setTrackedCurrencies(updatedTracked);
    fetchLiveRates(updatedTracked, upper);
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (e) {}
    }
  };

  const handleSelectSecondaryCurrency = async (currencyCode: string) => {
    const upper = currencyCode.toUpperCase();
    if (upper === selectedBookCurrency) {
      Alert.alert('Invalid Selection', 'Secondary currency cannot be the same as the Primary currency.');
      return;
    }
    setSecondaryCurrency(upper);
    setSecondaryPickerVisible(false);

    try {
      const targetPerBase = await CurrencyService.getExchangeRate(selectedBookCurrency, upper);
      const naturalDir = CurrencyService.getNaturalQuotationDirection(selectedBookCurrency, upper, targetPerBase);
      setSecondaryQuotationDirection(naturalDir);
      const displayVal = naturalDir === 'base_to_quote' ? targetPerBase : CurrencyService.invertRate(targetPerBase);
      setSecondaryLiveRate(targetPerBase);
      setSecondaryValuation(displayVal);
      setRawSecondaryValuation(String(displayVal));
    } catch (e) {
      console.warn('Failed to fetch secondary live rate', e);
    }
  };

  const handleSecondaryRateChange = (text: string) => {
    const sanitized = text.replace(/[^0-9.]/g, '');
    const parts = sanitized.split('.');
    const formatted = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : sanitized;
    setRawSecondaryValuation(formatted);
    const parsed = parseFloat(formatted);
    if (!isNaN(parsed) && parsed > 0) {
      setSecondaryValuation(parsed);
    } else {
      setSecondaryValuation(undefined);
    }
  };

  const handleSwapSecondaryDirection = () => {
    const nextDir = secondaryQuotationDirection === 'base_to_quote' ? 'quote_to_base' : 'base_to_quote';
    setSecondaryQuotationDirection(nextDir);
    const parsed = parseFloat(rawSecondaryValuation);
    if (!isNaN(parsed) && parsed > 0) {
      const inverted = CurrencyService.invertRate(parsed);
      setRawSecondaryValuation(String(inverted));
      setSecondaryValuation(inverted);
    }
  };

  const handleResetSecondaryToLive = async () => {
    if (!secondaryCurrency) return;
    try {
      const targetPerBase = await CurrencyService.getExchangeRate(selectedBookCurrency, secondaryCurrency);
      setSecondaryLiveRate(targetPerBase);
      const displayVal = secondaryQuotationDirection === 'base_to_quote' ? targetPerBase : CurrencyService.invertRate(targetPerBase);
      setSecondaryValuation(displayVal);
      setRawSecondaryValuation(String(displayVal));
      if (Platform.OS !== 'web') {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (e) {}
      }
    } catch (e) {}
  };

  const handleRemoveSecondaryCurrency = () => {
    setSecondaryCurrency(null);
    setSecondaryValuation(undefined);
    setRawSecondaryValuation('');
    setSecondaryLiveRate(null);
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (e) {}
    }
  };

  const handleRateChange = (currencyCode: string, text: string) => {
    // Sanitize input: allow digits and at most one decimal point
    const sanitized = text.replace(/[^0-9.]/g, '');
    const parts = sanitized.split('.');
    const formatted = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : sanitized;

    setRawValuations(prev => ({ ...prev, [currencyCode]: formatted }));

    const parsed = parseFloat(formatted);
    if (!isNaN(parsed) && parsed > 0) {
      setValuations(prev => ({ ...prev, [currencyCode]: parsed }));
    } else if (formatted === '') {
      setValuations(prev => {
        const copy = { ...prev };
        delete copy[currencyCode];
        return copy;
      });
    }
  };

  const handleResetToLive = (currencyCode: string) => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (e) {}
    }
    const live = liveRates[currencyCode];
    if (live) {
      setValuations(prev => ({ ...prev, [currencyCode]: live }));
      setRawValuations(prev => ({ ...prev, [currencyCode]: String(live) }));
    }
  };

  const handleAddCurrency = async (currencyCode: string) => {
    setCurrencyPickerVisible(false);
    const upper = currencyCode.toUpperCase();
    if (upper === selectedBookCurrency) {
      Alert.alert('Base Currency', `${upper} is already the base ledger currency for this book.`);
      return;
    }

    if (!trackedCurrencies.includes(upper)) {
      const next = [...trackedCurrencies, upper];
      setTrackedCurrencies(next);
      const rate = await CurrencyService.getExchangeRate(upper, selectedBookCurrency);
      setLiveRates(prev => ({ ...prev, [upper]: rate }));
      setValuations(prev => ({ ...prev, [upper]: rate }));
      setRawValuations(prev => ({ ...prev, [upper]: String(rate) }));
      if (Platform.OS !== 'web') {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (e) {}
      }
    }
  };

  const handleRemoveCurrency = (currencyCode: string) => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (e) {}
    }
    setTrackedCurrencies(prev => prev.filter(c => c !== currencyCode));
    setValuations(prev => {
      const copy = { ...prev };
      delete copy[currencyCode];
      return copy;
    });
    setRawValuations(prev => {
      const copy = { ...prev };
      delete copy[currencyCode];
      return copy;
    });
  };

  const handleSaveAll = async () => {
    if (!book) return;
    setIsSaving(true);
    try {
      // Build final normalized valuations map
      const finalValuations: Record<string, number> = {};
      trackedCurrencies.forEach(curr => {
        const raw = rawValuations[curr];
        if (raw !== undefined && raw !== '') {
          const num = parseFloat(raw);
          if (!isNaN(num) && num > 0) {
            finalValuations[curr] = num;
            return;
          }
        }
        if (valuations[curr] !== undefined && valuations[curr] > 0) {
          finalValuations[curr] = valuations[curr];
        } else if (liveRates[curr] !== undefined && liveRates[curr] > 0) {
          finalValuations[curr] = liveRates[curr];
        }
      });

      await updateBook(book.id, {
        currency: selectedBookCurrency,
        settings: {
          showPaymentMode,
          showCategory,
          showAttachments,
          currency: selectedBookCurrency,
          enableMultiCurrency: trackedCurrencies.length > 0 || Boolean(secondaryCurrency),
          customCurrencyValuations: finalValuations,
          trackedCurrencies,
          secondaryCurrency: secondaryCurrency || undefined,
          secondaryCurrencyValuation: secondaryValuation !== undefined && secondaryValuation > 0 ? secondaryValuation : (secondaryLiveRate || undefined),
          preferredQuotationDirection: secondaryQuotationDirection,
        },
      });
      if (Platform.OS !== 'web') {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (e) {}
      }
      Alert.alert('Settings Saved', 'Advanced book valuations and settings updated successfully.');
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not save book settings.');
    } finally {
      setIsSaving(false);
    }
  };

  // Recurring rules for this book
  const bookRecurringRules = useMemo(() => {
    return recurringRules.filter(r => r.bookId === book?.id);
  }, [recurringRules, book?.id]);

  const handlePostRecurringNow = async (rule: RecurringRule) => {
    try {
      await postRecurringEntryNow(rule);
      if (Platform.OS !== 'web') {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (e) {}
      }
      Alert.alert('Transaction Posted', `"${rule.description}" posted to ${book.name}.`);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not post recurring entry.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalOverlay}>
          <GlassBackdrop isDark={isDark} onPress={onClose} />
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: isDark ? colors.surface : '#FFFFFF',
                borderColor: isDark ? colors.borderGlass : '#E2E8F0',
                width: width > 550 ? 500 : '94%',
                maxHeight: '88%',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: isDark ? 0.35 : 0.08,
                shadowRadius: 24,
                elevation: isDark ? 10 : 3,
              },
            ]}
          >
            {/* Top Sheen */}
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 24,
                right: 24,
                height: 1,
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.65)',
                zIndex: 10,
              }}
            />
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: isDark ? colors.border : '#E2E8F0' }]}>
              <View style={styles.headerLeft}>
                <View
                  style={[
                    styles.headerIconBox,
                    { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#DCFCE7' },
                  ]}
                >
                  <Globe size={20} color={colors.primary} />
                </View>
                <View>
                  <Text
                    style={[
                      styles.modalTitle,
                      { color: colors.text, fontFamily: 'SpaceGrotesk_700Bold' },
                    ]}
                  >
                    Advanced Book
                  </Text>
                  <Text
                    style={[
                      styles.modalSubtitle,
                      { color: colors.textSecondary, fontFamily: 'SpaceGrotesk_400Regular' },
                    ]}
                  >
                    {book?.name} • Multi-Currency Valuations
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.closeBtn,
                  { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9' },
                ]}
                onPress={onClose}
              >
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Body Scroll with smooth single-finger gesture handling */}
            <ScrollView
              style={styles.bodyScroll}
              contentContainerStyle={{ paddingBottom: 24 }}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={true}
              scrollEventThrottle={16}
            >
                  {/* Base Currency Banner */}
                  <TouchableOpacity
                    style={[
                      styles.baseBanner,
                      {
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#F8FAFC',
                        borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#E2E8F0',
                      },
                    ]}
                    onPress={() => setBaseCurrencyPickerVisible(true)}
                    activeOpacity={0.75}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View>
                        <Text style={[styles.baseBannerLabel, { color: colors.textSecondary }]}>
                          BASE LEDGER CURRENCY
                        </Text>
                        <Text
                          style={[
                            styles.baseBannerValue,
                            { color: colors.text, fontFamily: getFontFamily(deviceFont, 'bold') },
                          ]}
                        >
                          {selectedBookCurrency} ({getCurrencySymbol(selectedBookCurrency)})
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View
                          style={[
                            styles.basePill,
                            { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)' },
                          ]}
                        >
                          <Text style={[styles.basePillText, { color: colors.primary }]}>PRIMARY</Text>
                        </View>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: colors.primary,
                            backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#ECFDF5',
                          }}
                        >
                          <Text style={{ fontSize: 12, color: colors.primary, fontFamily: 'SpaceGrotesk_700Bold' }}>Change</Text>
                          <ChevronRight size={14} color={colors.primary} />
                        </View>
                      </View>
                    </View>
                    <Text style={[styles.baseBannerDesc, { color: colors.textSecondary }]}>
                      All ledger totals and analytics are anchored in {selectedBookCurrency}. Tap here to change primary currency, or value foreign currencies below.
                    </Text>
                  </TouchableOpacity>

                  {/* Section: Secondary Primary Currency (Dual-Currency Mode) */}
                  <View style={[styles.sectionHeaderRow, { marginTop: 10 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Layers size={15} color={colors.primary} />
                      <Text
                        style={[
                          styles.sectionTitle,
                          { color: colors.text, fontFamily: getFontFamily(deviceFont, 'bold') },
                        ]}
                      >
                        Secondary Primary Currency
                      </Text>
                    </View>
                    {secondaryCurrency && (
                      <TouchableOpacity
                        onPress={handleRemoveSecondaryCurrency}
                        style={{ paddingHorizontal: 6, paddingVertical: 2 }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={{ fontSize: 11, color: '#EF4444', fontFamily: 'SpaceGrotesk_700Bold' }}>
                          Remove
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {!secondaryCurrency ? (
                    <TouchableOpacity
                      style={[
                        styles.addCurrBtn,
                        {
                          borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#CBD5E1',
                          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#F8FAFC',
                          marginBottom: 16,
                          borderStyle: 'dashed',
                        },
                      ]}
                      onPress={() => setSecondaryPickerVisible(true)}
                    >
                      <Plus size={16} color={colors.primary} style={{ marginRight: 8 }} />
                      <Text
                        style={[
                          styles.addCurrBtnText,
                          { color: colors.primary, fontFamily: getFontFamily(deviceFont, 'bold') },
                        ]}
                      >
                        Enable Secondary Primary Currency (e.g. ETB, EUR, GBP)
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View
                      style={[
                        styles.currencyCard,
                        {
                          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
                          borderColor: colors.primary,
                          marginBottom: 16,
                        },
                      ]}
                    >
                      <View style={styles.currencyCardTop}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                          <View
                            style={[
                              styles.currSymbolBox,
                              { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#ECFDF5' },
                            ]}
                          >
                            <Text style={[styles.currSymbolText, { color: colors.primary }]}>
                              {getCurrencySymbol(secondaryCurrency)}
                            </Text>
                          </View>
                          <View style={{ marginLeft: 10 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text
                                style={[
                                  styles.currCodeText,
                                  { color: colors.text, fontFamily: getFontFamily(deviceFont, 'bold') },
                                ]}
                              >
                                {secondaryCurrency}
                              </Text>
                              <View
                                style={{
                                  backgroundColor: isDark ? 'rgba(16, 185, 129, 0.18)' : '#D1FAE5',
                                  paddingHorizontal: 6,
                                  paddingVertical: 1,
                                  borderRadius: 4,
                                }}
                              >
                                <Text style={{ fontSize: 9, color: colors.primary, fontFamily: 'SpaceGrotesk_700Bold' }}>
                                  DUAL PRIMARY
                                </Text>
                              </View>
                            </View>
                            <Text style={[styles.currNameText, { color: colors.textSecondary }]} numberOfLines={1}>
                              {CURRENCIES.find(c => c.code === secondaryCurrency)?.name || secondaryCurrency}
                            </Text>
                          </View>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <TouchableOpacity
                            onPress={() => setSecondaryPickerVisible(true)}
                            style={{
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              borderRadius: 6,
                              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9',
                            }}
                          >
                            <Text style={{ fontSize: 11, color: colors.text, fontFamily: 'SpaceGrotesk_700Bold' }}>
                              Change
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Directional Rate Input Row */}
                      <View style={styles.rateInputRow}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text style={[styles.inputFieldLabel, { color: colors.textSecondary }]}>
                              Book Valuation Peg
                            </Text>
                            <TouchableOpacity
                              onPress={handleSwapSecondaryDirection}
                              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                            >
                              <ArrowRightLeft size={11} color="#3B82F6" />
                              <Text style={{ fontSize: 10, color: '#3B82F6', fontFamily: 'SpaceGrotesk_700Bold' }}>
                                Invert Rate
                              </Text>
                            </TouchableOpacity>
                          </View>

                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={{ fontSize: 12, color: colors.textSecondary, fontFamily: 'SpaceGrotesk_700Bold' }}>
                              {secondaryQuotationDirection === 'base_to_quote'
                                ? `1 ${selectedBookCurrency} =`
                                : `1 ${secondaryCurrency} =`}
                            </Text>
                            <View
                              style={[
                                styles.rateInputWrapper,
                                {
                                  flex: 1,
                                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F8FAFC',
                                  borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#CBD5E1',
                                },
                              ]}
                            >
                              <TextInput
                                style={[styles.rateInput, { color: colors.text, fontFamily: 'SpaceGrotesk_700Bold' }]}
                                value={rawSecondaryValuation}
                                onChangeText={handleSecondaryRateChange}
                                keyboardType="numeric"
                                placeholder={secondaryLiveRate ? String(secondaryLiveRate) : '1.0'}
                                placeholderTextColor={colors.textSecondary}
                                selectTextOnFocus={true}
                              />
                              <Text style={[styles.baseSuffix, { color: colors.textSecondary, fontFamily: 'SpaceGrotesk_700Bold' }]}>
                                {secondaryQuotationDirection === 'base_to_quote' ? secondaryCurrency : selectedBookCurrency}
                              </Text>
                            </View>
                          </View>
                        </View>

                        <TouchableOpacity
                          style={[
                            styles.resetBtn,
                            {
                              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9',
                              borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
                              alignSelf: 'flex-end',
                            },
                          ]}
                          onPress={handleResetSecondaryToLive}
                        >
                          <Text style={[styles.resetBtnText, { color: colors.primary, fontFamily: 'SpaceGrotesk_700Bold' }]}>
                            Sync Live
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 6, lineHeight: 15 }}>
                        Both {selectedBookCurrency} and {secondaryCurrency} balances will be shown side-by-side in your book header and quick pills during transaction entry.
                      </Text>
                    </View>
                  )}

                  {/* Section: Valued Foreign Currencies */}
                  <View style={styles.sectionHeaderRow}>
                    <Text
                      style={[
                        styles.sectionTitle,
                        { color: colors.text, fontFamily: getFontFamily(deviceFont, 'bold') },
                      ]}
                    >
                      Valued Currencies & Exchange Rates
                    </Text>
                    <TouchableOpacity
                      style={styles.syncBtn}
                      onPress={() => fetchLiveRates(trackedCurrencies)}
                      disabled={isRefreshingRates}
                    >
                      <RefreshCw
                        size={13}
                        color={colors.primary}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={[styles.syncBtnText, { color: colors.primary }]}>
                        {isRefreshingRates ? 'Syncing...' : 'Sync Live'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Currency Valuation Rows */}
                  {trackedCurrencies.map((curr) => {
                    const currencyMeta = CURRENCIES.find(c => c.code === curr);
                    const live = liveRates[curr];
                    const currentValuation = valuations[curr] !== undefined ? valuations[curr] : live || 1.0;
                    const isCustom = valuations[curr] !== undefined && live !== undefined && valuations[curr] !== live;

                    return (
                      <View
                        key={curr}
                        style={[
                          styles.currencyCard,
                          {
                            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
                            borderColor: isCustom
                              ? colors.primary
                              : isDark
                              ? 'rgba(255, 255, 255, 0.08)'
                              : '#E2E8F0',
                          },
                        ]}
                      >
                        <View style={styles.currencyCardTop}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                            <View
                              style={[
                                styles.currSymbolBox,
                                { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9' },
                              ]}
                            >
                              <Text style={[styles.currSymbolText, { color: colors.text }]}>
                                {getCurrencySymbol(curr)}
                              </Text>
                            </View>
                            <View style={{ marginLeft: 10 }}>
                              <Text
                                style={[
                                  styles.currCodeText,
                                  { color: colors.text, fontFamily: getFontFamily(deviceFont, 'bold') },
                                ]}
                              >
                                {curr}
                              </Text>
                              <Text style={[styles.currNameText, { color: colors.textSecondary }]} numberOfLines={1}>
                                {currencyMeta?.name || curr}
                              </Text>
                            </View>
                          </View>

                          <TouchableOpacity
                            onPress={() => handleRemoveCurrency(curr)}
                            style={styles.deleteCurrBtn}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Trash2 size={16} color="#EF4444" />
                          </TouchableOpacity>
                        </View>

                        {/* Rate Editing Row */}
                        <View style={styles.rateInputRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.inputFieldLabel, { color: colors.textSecondary }]}>
                              Valuation (1 {curr} = ? {selectedBookCurrency})
                            </Text>
                            <View
                              style={[
                                styles.rateInputWrapper,
                                {
                                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F8FAFC',
                                  borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#CBD5E1',
                                },
                              ]}
                            >
                              <TextInput
                                style={[styles.rateInput, { color: colors.text, fontFamily: 'SpaceGrotesk_700Bold' }]}
                                value={
                                  rawValuations[curr] !== undefined
                                    ? rawValuations[curr]
                                    : (valuations[curr] !== undefined ? String(valuations[curr]) : '')
                                }
                                onChangeText={(text) => handleRateChange(curr, text)}
                                keyboardType="decimal-pad"
                                placeholder={live ? String(live) : '1.0'}
                                placeholderTextColor={colors.textSecondary}
                                selectTextOnFocus={true}
                                autoCorrect={false}
                                autoCapitalize="none"
                              />
                              <Text style={[styles.baseSuffix, { color: colors.textSecondary, fontFamily: 'SpaceGrotesk_700Bold' }]}>
                                {selectedBookCurrency}
                              </Text>
                            </View>
                          </View>

                          {live !== undefined && (
                            <TouchableOpacity
                              style={[
                                styles.resetBtn,
                                {
                                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9',
                                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
                                },
                              ]}
                              onPress={() => handleResetToLive(curr)}
                            >
                              <Text style={[styles.resetBtnText, { color: colors.primary, fontFamily: 'SpaceGrotesk_700Bold' }]}>
                                Set Live ({live.toFixed(3)})
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    );
                  })}

                  {trackedCurrencies.length === 0 && (
                    <View style={[styles.emptyCurrenciesBox, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : '#F8FAFC', borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#E2E8F0' }]}>
                      <Globe size={22} color={colors.textSecondary} style={{ marginBottom: 6 }} />
                      <Text style={[styles.emptyCurrenciesTitle, { color: colors.text, fontFamily: getFontFamily(deviceFont, 'bold') }]}>
                        No Foreign Currencies Added
                      </Text>
                      <Text style={[styles.emptyCurrenciesText, { color: colors.textSecondary }]}>
                        Tap below to add currencies and configure custom exchange rate valuations for this book.
                      </Text>
                    </View>
                  )}

                  {/* Add Currency Button */}
                  <TouchableOpacity
                    style={[
                      styles.addCurrBtn,
                      {
                        backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.08)',
                        borderColor: isDark ? 'rgba(16, 185, 129, 0.25)' : 'rgba(16, 185, 129, 0.2)',
                      },
                    ]}
                    onPress={() => setCurrencyPickerVisible(true)}
                  >
                    <Plus size={16} color={colors.primary} style={{ marginRight: 6 }} />
                    <Text
                      style={[
                        styles.addCurrBtnText,
                        { color: colors.primary, fontFamily: getFontFamily(deviceFont, 'bold') },
                      ]}
                    >
                      Add Foreign Currency
                    </Text>
                  </TouchableOpacity>

                  {/* Section: Recurring Schedules for This Book */}
                  <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
                    <Text
                      style={[
                        styles.sectionTitle,
                        { color: colors.text, fontFamily: getFontFamily(deviceFont, 'bold') },
                      ]}
                    >
                      Recurring Schedules for {book?.name}
                    </Text>
                    <TouchableOpacity
                      style={styles.syncBtn}
                      onPress={() => setRecurringModalVisible(true)}
                    >
                      <Plus size={13} color={colors.primary} style={{ marginRight: 4 }} />
                      <Text style={[styles.syncBtnText, { color: colors.primary }]}>Add</Text>
                    </TouchableOpacity>
                  </View>

                  {bookRecurringRules.length === 0 ? (
                    <View
                      style={[
                        styles.emptyRecurringBox,
                        { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : '#F8FAFC' },
                      ]}
                    >
                      <Repeat size={20} color={colors.textSecondary} style={{ marginBottom: 6 }} />
                      <Text style={[styles.emptyRecurringText, { color: colors.textSecondary }]}>
                        No recurring transactions attached to this book.
                      </Text>
                    </View>
                  ) : (
                    bookRecurringRules.map((rule) => {
                      const due = isRuleDue(rule.nextDueDate);
                      return (
                        <View
                          key={rule.id}
                          style={[
                            styles.recurringRow,
                            {
                              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
                              borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
                            },
                          ]}
                        >
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text
                                style={[
                                  styles.recurringTitle,
                                  { color: colors.text, fontFamily: getFontFamily(deviceFont, 'bold') },
                                ]}
                              >
                                {rule.description}
                              </Text>
                              <View
                                style={[
                                  styles.frequencyBadge,
                                  { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9' },
                                ]}
                              >
                                <Text style={[styles.frequencyBadgeText, { color: colors.textSecondary }]}>
                                  {rule.frequency}
                                </Text>
                              </View>
                            </View>
                            <Text style={[styles.recurringSub, { color: colors.textSecondary }]}>
                              Due: {rule.nextDueDate} • {formatCurrency(rule.amount, rule.originalCurrency || selectedBookCurrency)}
                            </Text>
                          </View>

                          <TouchableOpacity
                            style={[styles.postNowBtn, { backgroundColor: colors.primary }]}
                            onPress={() => handlePostRecurringNow(rule)}
                          >
                            <Text style={styles.postNowBtnText}>Post Now</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })
                  )}

                  <TouchableOpacity
                    style={[
                      styles.addCurrBtn,
                      {
                        borderColor: colors.primary,
                        backgroundColor: isDark ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.05)',
                        marginTop: 12,
                      },
                    ]}
                    onPress={() => setRecurringModalVisible(true)}
                  >
                    <Plus size={16} color={colors.primary} style={{ marginRight: 8 }} />
                    <Text
                      style={[
                        styles.addCurrBtnText,
                        { color: colors.primary, fontFamily: getFontFamily(deviceFont, 'bold') },
                      ]}
                    >
                      Create Recurring Rule
                    </Text>
                  </TouchableOpacity>

                  {/* Section: Book Display Settings */}
                  <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
                    <Text
                      style={[
                        styles.sectionTitle,
                        { color: colors.text, fontFamily: getFontFamily(deviceFont, 'bold') },
                      ]}
                    >
                      Book Input Fields
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.settingsCard,
                      {
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
                        borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
                      },
                    ]}
                  >
                    {/* Show Payment Mode */}
                    <TouchableOpacity
                      style={styles.settingRow}
                      onPress={() => setShowPaymentMode(!showPaymentMode)}
                      activeOpacity={0.7}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <View
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <CreditCard size={16} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.settingLabel, { color: colors.text, fontFamily: 'SpaceGrotesk_600SemiBold' }]}>
                            Show Payment Mode
                          </Text>
                          <Text style={{ fontSize: 11, color: colors.textSecondary, fontFamily: 'SpaceGrotesk_400Regular', marginTop: 1 }}>
                            Track Cash, Card, Bank, or UPI methods
                          </Text>
                        </View>
                      </View>
                      <Switch
                        value={showPaymentMode}
                        onValueChange={setShowPaymentMode}
                        trackColor={{ false: isDark ? '#334155' : '#CBD5E1', true: colors.primary }}
                        thumbColor="#FFFFFF"
                      />
                    </TouchableOpacity>

                    {/* Show Category */}
                    <TouchableOpacity
                      style={[
                        styles.settingRow,
                        { borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F1F5F9' },
                      ]}
                      onPress={() => setShowCategory(!showCategory)}
                      activeOpacity={0.7}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <View
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Tag size={16} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.settingLabel, { color: colors.text, fontFamily: 'SpaceGrotesk_600SemiBold' }]}>
                            Show Category
                          </Text>
                          <Text style={{ fontSize: 11, color: colors.textSecondary, fontFamily: 'SpaceGrotesk_400Regular', marginTop: 1 }}>
                            Group transactions by category tags
                          </Text>
                        </View>
                      </View>
                      <Switch
                        value={showCategory}
                        onValueChange={setShowCategory}
                        trackColor={{ false: isDark ? '#334155' : '#CBD5E1', true: colors.primary }}
                        thumbColor="#FFFFFF"
                      />
                    </TouchableOpacity>

                    {/* Show Attachments */}
                    <TouchableOpacity
                      style={[
                        styles.settingRow,
                        { borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F1F5F9' },
                      ]}
                      onPress={() => setShowAttachments(!showAttachments)}
                      activeOpacity={0.7}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <View
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Paperclip size={16} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.settingLabel, { color: colors.text, fontFamily: 'SpaceGrotesk_600SemiBold' }]}>
                            Show Attachments
                          </Text>
                          <Text style={{ fontSize: 11, color: colors.textSecondary, fontFamily: 'SpaceGrotesk_400Regular', marginTop: 1 }}>
                            Upload receipts and invoice snapshots
                          </Text>
                        </View>
                      </View>
                      <Switch
                        value={showAttachments}
                        onValueChange={setShowAttachments}
                        trackColor={{ false: isDark ? '#334155' : '#CBD5E1', true: colors.primary }}
                        thumbColor="#FFFFFF"
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={{ height: 20 }} />
                </ScrollView>

                {/* Bottom Action Buttons */}
                <View style={[styles.footer, { borderTopColor: colors.border }]}>
                  <TouchableOpacity
                    style={[
                      styles.cancelBtn,
                      {
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9',
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={onClose}
                    disabled={isSaving}
                  >
                    <Text
                      style={[
                        styles.cancelBtnText,
                        { color: colors.textSecondary, fontFamily: 'SpaceGrotesk_600SemiBold' },
                      ]}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.saveBtn,
                      { backgroundColor: colors.primary },
                    ]}
                    onPress={handleSaveAll}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Check size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text
                          style={[
                            styles.saveBtnText,
                            { fontFamily: 'SpaceGrotesk_700Bold' },
                          ]}
                        >
                          Save Changes
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
        </KeyboardAvoidingView>

      {/* Base Ledger Currency Picker Modal */}
      <CurrencyPickerModal
        visible={baseCurrencyPickerVisible}
        onClose={() => setBaseCurrencyPickerVisible(false)}
        onSelect={handleSelectBaseCurrency}
        selectedCurrency={selectedBookCurrency}
        title="Select Base Ledger Currency"
      />

      {/* Secondary Primary Currency Picker Modal */}
      <CurrencyPickerModal
        visible={secondaryPickerVisible}
        onClose={() => setSecondaryPickerVisible(false)}
        onSelect={handleSelectSecondaryCurrency}
        selectedCurrency={secondaryCurrency || selectedBookCurrency}
        title="Select Secondary Primary Currency"
      />

      {/* World Currency Picker Modal */}
      <CurrencyPickerModal
        visible={currencyPickerVisible}
        onClose={() => setCurrencyPickerVisible(false)}
        onSelect={handleAddCurrency}
        selectedCurrency={selectedBookCurrency}
        title="Add Foreign Currency to Book"
      />

      {/* Recurring Rule Modal */}
      <RecurringRuleModal
        visible={recurringModalVisible}
        onClose={() => setRecurringModalVisible(false)}
        initialBookId={book?.id}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  headerIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodyScroll: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  baseBanner: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  baseBannerLabel: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 0.5,
  },
  baseBannerValue: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk_700Bold',
    marginTop: 2,
  },
  basePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  basePillText: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  baseBannerDesc: {
    fontSize: 12,
    marginTop: 8,
    lineHeight: 16,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  syncBtnText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  currencyCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  currencyCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  currSymbolBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currSymbolText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  currCodeText: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  currNameText: {
    fontSize: 11,
    fontFamily: 'SpaceGrotesk_400Regular',
    maxWidth: 180,
  },
  deleteCurrBtn: {
    padding: 6,
  },
  rateInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  inputFieldLabel: {
    fontSize: 11,
    fontFamily: 'SpaceGrotesk_500Medium',
    marginBottom: 4,
  },
  rateInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
  },
  rateInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk_700Bold',
    paddingVertical: 0,
  },
  baseSuffix: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'SpaceGrotesk_600SemiBold',
    marginLeft: 4,
  },
  resetBtn: {
    height: 38,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetBtnText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  addCurrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 4,
  },
  addCurrBtnText: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
  emptyCurrenciesBox: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyCurrenciesTitle: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk_700Bold',
    marginBottom: 4,
  },
  emptyCurrenciesText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  emptyRecurringBox: {
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyRecurringText: {
    fontSize: 12,
    textAlign: 'center',
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  recurringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  recurringTitle: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
  frequencyBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  frequencyBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk_700Bold',
    textTransform: 'uppercase',
  },
  recurringSub: {
    fontSize: 11,
    marginTop: 3,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  postNowBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  postNowBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  settingsCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  settingLabel: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'SpaceGrotesk_500Medium',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
});
