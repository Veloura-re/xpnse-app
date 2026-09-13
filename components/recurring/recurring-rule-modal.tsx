import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Switch,
  Platform,
  TouchableWithoutFeedback,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import {
  X,
  TrendingUp,
  TrendingDown,
  Calendar,
  CreditCard,
  Tag,
  AlignLeft,
  Clock,
  Repeat,
  Check,
  Globe,
  Trash2,
  Sparkles,
} from 'lucide-react-native';
import { useTheme } from '@/providers/theme-provider';
import { getFontFamily } from '@/config/font-config';
import { useBusiness } from '@/providers/business-provider';
import { Book, RecurrenceFrequency, RecurringRule } from '@/types';
import { CurrencyPickerModal } from '../currency/currency-picker-modal';
import { CurrencyService } from '@/services/currency-service';
import { getTodayString, calculateNextDueDate } from '@/utils/recurring-engine';
import { GlassBackdrop } from '@/components/ui/glass-backdrop';
import * as Haptics from 'expo-haptics';

interface RecurringRuleModalProps {
  visible: boolean;
  onClose: () => void;
  rule?: RecurringRule | null;
  initialBookId?: string;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const FREQUENCIES: { id: RecurrenceFrequency; label: string }[] = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'biweekly', label: 'Bi-weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'quarterly', label: 'Quarterly' },
  { id: 'yearly', label: 'Yearly' },
];

export function RecurringRuleModal({
  visible,
  onClose,
  rule,
  initialBookId,
}: RecurringRuleModalProps) {
  const { colors, isDark, deviceFont } = useTheme();
  const { books, currentBusiness, createRecurringRule, updateRecurringRule, deleteRecurringRule } = useBusiness();

  const [selectedBookId, setSelectedBookId] = useState<string>(initialBookId || (books[0]?.id || ''));
  const selectedBook = useMemo(() => books.find(b => b.id === selectedBookId), [books, selectedBookId]);
  const baseCurrency = (selectedBook?.currency || selectedBook?.settings?.currency || currentBusiness?.currency || 'USD').toUpperCase();

  const [type, setType] = useState<'cash_in' | 'cash_out'>('cash_out');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(baseCurrency);
  const [exchangeRate, setExchangeRate] = useState(1.0);
  const [customRateText, setCustomRateText] = useState('1.0');

  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [paymentMode, setPaymentMode] = useState('');
  const [partyId, setPartyId] = useState('');

  const [frequency, setFrequency] = useState<RecurrenceFrequency>('monthly');
  const [interval, setInterval] = useState('1');
  const [startDate, setStartDate] = useState(getTodayString());
  const [autoPost, setAutoPost] = useState(true);

  // Active focus tracking for input glow
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Currency Picker state
  const [currencyPickerVisible, setCurrencyPickerVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      if (rule) {
        setType(rule.type);
        setSelectedBookId(rule.bookId);
        setCurrency(rule.originalCurrency || baseCurrency);
        setAmount(String(rule.originalAmount || rule.amount));
        setExchangeRate(rule.exchangeRate || 1.0);
        setCustomRateText(String(rule.exchangeRate || 1.0));
        setDescription(rule.description);
        setCategory(rule.category || '');
        setPaymentMode(rule.paymentMode || '');
        setPartyId(rule.partyId || '');
        setFrequency(rule.frequency);
        setInterval(String(rule.interval || 1));
        setStartDate(rule.startDate);
        setAutoPost(rule.autoPost);
      } else {
        setType('cash_out');
        setSelectedBookId(initialBookId || (books[0]?.id || ''));
        setCurrency(baseCurrency);
        setAmount('');
        setExchangeRate(1.0);
        setCustomRateText('1.0');
        setDescription('');
        setCategory('');
        setPaymentMode('');
        setPartyId('');
        setFrequency('monthly');
        setInterval('1');
        setStartDate(getTodayString());
        setAutoPost(true);
      }
      setFocusedField(null);
    }
  }, [rule, visible, initialBookId, baseCurrency, books]);

  // Fetch FX rate when currency changes
  useEffect(() => {
    const upperCurr = currency.toUpperCase();
    const upperBase = baseCurrency.toUpperCase();
    if (upperCurr === upperBase) {
      setExchangeRate(1.0);
      setCustomRateText('1.0');
    } else {
      const bookVal = selectedBook?.settings?.customCurrencyValuations?.[upperCurr] ?? selectedBook?.settings?.customCurrencyValuations?.[currency];
      if (bookVal && bookVal > 0) {
        setExchangeRate(bookVal);
        setCustomRateText(bookVal.toString());
      } else {
        CurrencyService.getExchangeRate(upperCurr, upperBase).then((rate) => {
          setExchangeRate(rate);
          setCustomRateText(rate.toFixed(4));
        });
      }
    }
  }, [currency, baseCurrency, selectedBook]);

  const rawNumericAmount = parseFloat(amount) || 0;
  const convertedAmount = CurrencyService.convert(rawNumericAmount, currency, baseCurrency, exchangeRate);

  const handleSave = async () => {
    if (!description.trim()) {
      Alert.alert('Required Field', 'Please enter a description for this recurring schedule.');
      return;
    }
    if (rawNumericAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount greater than 0.');
      return;
    }
    if (!selectedBookId) {
      Alert.alert('Select Book', 'Please select a book for this recurring schedule.');
      return;
    }

    setIsSaving(true);
    try {
      const parsedInterval = parseInt(interval, 10) || 1;
      const nextDue = calculateNextDueDate(startDate, frequency, parsedInterval);

      if (rule) {
        await updateRecurringRule(rule.id, {
          bookId: selectedBookId,
          type,
          amount: convertedAmount,
          originalCurrency: currency,
          originalAmount: rawNumericAmount,
          exchangeRate,
          description: description.trim(),
          category: category.trim() || undefined,
          paymentMode: paymentMode.trim() || undefined,
          partyId: partyId || undefined,
          frequency,
          interval: parsedInterval,
          autoPost,
        });
      } else {
        await createRecurringRule({
          bookId: selectedBookId,
          type,
          amount: convertedAmount,
          originalCurrency: currency,
          originalAmount: rawNumericAmount,
          exchangeRate,
          description: description.trim(),
          category: category.trim() || undefined,
          paymentMode: paymentMode.trim() || undefined,
          partyId: partyId || undefined,
          frequency,
          interval: parsedInterval,
          startDate,
          nextDueDate: nextDue,
          autoPost,
        });
      }

      if (Platform.OS !== 'web') {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (e) {}
      }
      onClose();
    } catch (error: any) {
      Alert.alert('Error Saving Schedule', error?.message || 'Could not save recurring schedule.');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = () => {
    if (!rule) return;
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (e) {}
    }
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!rule) return;
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (e) {}
    }
    try {
      setIsDeleting(true);
      await deleteRecurringRule(rule.id);
      if (Platform.OS !== 'web') {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (e) {}
      }
      setShowDeleteModal(false);
      onClose();
    } catch (error: any) {
      Alert.alert('Delete Failed', error?.message || 'Could not delete recurring schedule.');
    } finally {
      setIsDeleting(false);
    }
  };

  const modalBg = isDark ? '#161618' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)';
  const inputBg = isDark ? '#202024' : '#F5F3EF';

  return (
    <Modal visible={visible} transparent animationType={Platform.OS === 'web' ? 'none' : 'slide'} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <GlassBackdrop isDark={isDark} onPress={onClose} />
        <TouchableWithoutFeedback>
          <View
            style={[
              styles.modalContainer,
              {
                backgroundColor: modalBg,
                borderColor: cardBorder,
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
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.9)',
                zIndex: 10,
              }}
            />

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View
                  style={[
                    styles.headerIconBox,
                    {
                      backgroundColor:
                        type === 'cash_out'
                          ? isDark
                            ? 'rgba(239, 68, 68, 0.18)'
                            : 'rgba(239, 68, 68, 0.12)'
                          : isDark
                          ? 'rgba(16, 185, 129, 0.18)'
                          : 'rgba(16, 185, 129, 0.12)',
                    },
                  ]}
                >
                  <Repeat
                    size={20}
                    color={type === 'cash_out' ? '#EF4444' : colors.primary}
                  />
                </View>
                <View>
                  <Text
                    style={[
                      styles.headerTitle,
                      { color: colors.text, fontFamily: 'SpaceGrotesk_700Bold' },
                    ]}
                  >
                    {rule ? 'Edit Recurring Schedule' : 'New Recurring Schedule'}
                  </Text>
                  <Text
                    style={[
                      styles.headerSubtitle,
                      { color: colors.textSecondary, fontFamily: getFontFamily(deviceFont, 'regular') },
                    ]}
                  >
                    Automate bills, subscriptions, rent, or income
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={[
                  styles.closeBtn,
                  { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' },
                ]}
                activeOpacity={0.7}
              >
                <X size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.scrollArea}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Type Selector (Cash In vs Cash Out) */}
              <View
                style={[
                  styles.typeSelectorRow,
                  {
                    backgroundColor: isDark ? '#1F1F23' : '#EFECE6',
                    borderColor: cardBorder,
                  },
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.typeTab,
                    type === 'cash_out' && {
                      backgroundColor: '#EF4444',
                      shadowColor: '#EF4444',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.3,
                      shadowRadius: 6,
                      elevation: 3,
                    },
                  ]}
                  onPress={() => setType('cash_out')}
                  activeOpacity={0.8}
                >
                  <TrendingDown
                    size={16}
                    color={type === 'cash_out' ? '#FFFFFF' : colors.textSecondary}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.typeTabText,
                      {
                        color: type === 'cash_out' ? '#FFFFFF' : colors.textSecondary,
                        fontFamily: 'SpaceGrotesk_700Bold',
                      },
                    ]}
                  >
                    Expense Outflow
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeTab,
                    type === 'cash_in' && {
                      backgroundColor: colors.primary,
                      shadowColor: colors.primary,
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.3,
                      shadowRadius: 6,
                      elevation: 3,
                    },
                  ]}
                  onPress={() => setType('cash_in')}
                  activeOpacity={0.8}
                >
                  <TrendingUp
                    size={16}
                    color={type === 'cash_in' ? '#FFFFFF' : colors.textSecondary}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.typeTabText,
                      {
                        color: type === 'cash_in' ? '#FFFFFF' : colors.textSecondary,
                        fontFamily: 'SpaceGrotesk_700Bold',
                      },
                    ]}
                  >
                    Income Inflow
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Redesigned Highlighted Amount Hero Card */}
              <View
                style={[
                  styles.heroAmountCard,
                  {
                    backgroundColor: focusedField === 'amount'
                      ? isDark
                        ? 'rgba(16, 185, 129, 0.08)'
                        : '#f0fdf4'
                      : inputBg,
                    borderColor: focusedField === 'amount' ? colors.primary : cardBorder,
                  },
                ]}
              >
                <Text style={[styles.heroAmountLabel, { color: colors.textSecondary, fontFamily: 'SpaceGrotesk_700Bold' }]}>
                  RECURRING AMOUNT
                </Text>
                <View style={styles.heroAmountInputRow}>
                  <TouchableOpacity
                    style={[
                      styles.currencyPickerBadge,
                      {
                        backgroundColor: isDark ? '#2A2A30' : '#FFFFFF',
                        borderColor: cardBorder,
                      },
                    ]}
                    onPress={() => setCurrencyPickerVisible(true)}
                    activeOpacity={0.75}
                  >
                    <Globe size={14} color={colors.primary} style={{ marginRight: 5 }} />
                    <Text style={[styles.currencyPickerBadgeText, { color: colors.text, fontFamily: 'SpaceGrotesk_700Bold' }]}>
                      {currency}
                    </Text>
                  </TouchableOpacity>

                  <TextInput
                    value={amount}
                    onChangeText={setAmount}
                    onFocus={() => setFocusedField('amount')}
                    onBlur={() => setFocusedField(null)}
                    keyboardType="numeric"
                    placeholder="0.00"
                    placeholderTextColor={colors.textSecondary}
                    style={[
                      styles.heroAmountInput,
                      {
                        color: type === 'cash_in' ? '#10B981' : colors.text,
                        fontFamily: 'SpaceGrotesk_700Bold',
                      },
                    ]}
                  />
                </View>

                {currency.toUpperCase() !== baseCurrency.toUpperCase() && (
                  <View style={[styles.fxRateNotice, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#ecfdf5', borderColor: colors.primary }]}>
                    <Text style={[styles.fxRateText, { color: colors.primary, fontFamily: 'SpaceGrotesk_700Bold' }]}>
                      ≈ {convertedAmount.toFixed(2)} {baseCurrency} (Rate: 1 {currency} = {exchangeRate.toFixed(4)} {baseCurrency})
                    </Text>
                  </View>
                )}
              </View>

              {/* Recurrence Cadence */}
              <View style={styles.section}>
                <Text
                  style={[
                    styles.sectionLabel,
                    { color: colors.textSecondary, fontFamily: 'SpaceGrotesk_700Bold' },
                  ]}
                >
                  FREQUENCY
                </Text>
                <View style={styles.frequencyGrid}>
                  {FREQUENCIES.map((freq) => {
                    const isSelected = frequency === freq.id;
                    return (
                      <TouchableOpacity
                        key={freq.id}
                        style={[
                          styles.frequencyPill,
                          {
                            backgroundColor: isSelected
                              ? colors.primary
                              : inputBg,
                            borderColor: isSelected
                              ? colors.primary
                              : cardBorder,
                          },
                        ]}
                        onPress={() => setFrequency(freq.id)}
                        activeOpacity={0.75}
                      >
                        <Text
                          style={[
                            styles.frequencyText,
                            {
                              color: isSelected ? '#FFFFFF' : colors.text,
                              fontFamily: isSelected ? 'SpaceGrotesk_700Bold' : 'SpaceGrotesk_400Regular',
                            },
                          ]}
                        >
                          {freq.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Book Selection */}
              {books.length > 1 && (
                <View style={styles.section}>
                  <Text
                    style={[
                      styles.sectionLabel,
                      { color: colors.textSecondary, fontFamily: 'SpaceGrotesk_700Bold' },
                    ]}
                  >
                    TARGET BOOK
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.booksScroll}>
                    {books.map((b) => {
                      const isSelected = selectedBookId === b.id;
                      return (
                        <TouchableOpacity
                          key={b.id}
                          style={[
                            styles.bookPill,
                            {
                              backgroundColor: isSelected
                                ? colors.primary
                                : inputBg,
                              borderColor: isSelected
                                ? colors.primary
                                : cardBorder,
                            },
                          ]}
                          onPress={() => setSelectedBookId(b.id)}
                          activeOpacity={0.75}
                        >
                          <Text
                            style={[
                              styles.bookPillText,
                              {
                                color: isSelected ? '#FFFFFF' : colors.text,
                                fontFamily: isSelected ? 'SpaceGrotesk_700Bold' : 'SpaceGrotesk_400Regular',
                              },
                            ]}
                          >
                            {b.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* Redesigned Description & Category Details with Focus Glowing Borders */}
              <View style={styles.section}>
                <Text
                  style={[
                    styles.sectionLabel,
                    { color: colors.textSecondary, fontFamily: 'SpaceGrotesk_700Bold' },
                  ]}
                >
                  SCHEDULE DETAILS
                </Text>
                
                {/* Description Input */}
                <View
                  style={[
                    styles.inputFieldWrapper,
                    {
                      backgroundColor: focusedField === 'description'
                        ? isDark ? 'rgba(16, 185, 129, 0.08)' : '#f0fdf4'
                        : inputBg,
                      borderColor: focusedField === 'description' ? colors.primary : cardBorder,
                    },
                  ]}
                >
                  <AlignLeft size={16} color={focusedField === 'description' ? colors.primary : colors.textSecondary} style={{ marginRight: 10 }} />
                  <TextInput
                    value={description}
                    onChangeText={setDescription}
                    onFocus={() => setFocusedField('description')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Schedule name (e.g. Office Rent, Spotify, Payroll)"
                    placeholderTextColor={colors.textSecondary}
                    style={[
                      styles.inputFieldText,
                      {
                        color: colors.text,
                        fontFamily: 'SpaceGrotesk_400Regular',
                      },
                    ]}
                  />
                </View>

                {/* Category and Payment Mode */}
                <View style={styles.twoColRow}>
                  <View
                    style={[
                      styles.inputFieldWrapper,
                      {
                        flex: 1,
                        backgroundColor: focusedField === 'category'
                          ? isDark ? 'rgba(16, 185, 129, 0.08)' : '#f0fdf4'
                          : inputBg,
                        borderColor: focusedField === 'category' ? colors.primary : cardBorder,
                      },
                    ]}
                  >
                    <Tag size={15} color={focusedField === 'category' ? colors.primary : colors.textSecondary} style={{ marginRight: 8 }} />
                    <TextInput
                      value={category}
                      onChangeText={setCategory}
                      onFocus={() => setFocusedField('category')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="Category"
                      placeholderTextColor={colors.textSecondary}
                      style={[
                        styles.inputFieldText,
                        {
                          color: colors.text,
                          fontFamily: 'SpaceGrotesk_400Regular',
                        },
                      ]}
                    />
                  </View>

                  <View
                    style={[
                      styles.inputFieldWrapper,
                      {
                        flex: 1,
                        backgroundColor: focusedField === 'paymentMode'
                          ? isDark ? 'rgba(16, 185, 129, 0.08)' : '#f0fdf4'
                          : inputBg,
                        borderColor: focusedField === 'paymentMode' ? colors.primary : cardBorder,
                      },
                    ]}
                  >
                    <CreditCard size={15} color={focusedField === 'paymentMode' ? colors.primary : colors.textSecondary} style={{ marginRight: 8 }} />
                    <TextInput
                      value={paymentMode}
                      onChangeText={setPaymentMode}
                      onFocus={() => setFocusedField('paymentMode')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="Payment Mode"
                      placeholderTextColor={colors.textSecondary}
                      style={[
                        styles.inputFieldText,
                        {
                          color: colors.text,
                          fontFamily: 'SpaceGrotesk_400Regular',
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>

              {/* Auto-Post Switch */}
              <View
                style={[
                  styles.switchCard,
                  {
                    backgroundColor: inputBg,
                    borderColor: cardBorder,
                  },
                ]}
              >
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text
                    style={[
                      styles.switchTitle,
                      { color: colors.text, fontFamily: 'SpaceGrotesk_700Bold' },
                    ]}
                  >
                    Automatic Posting
                  </Text>
                  <Text
                    style={[
                      styles.switchSubtitle,
                      { color: colors.textSecondary, fontFamily: 'SpaceGrotesk_400Regular' },
                    ]}
                  >
                    {autoPost
                      ? 'Automatically records the transaction to the book on due dates'
                      : 'Alerts you on due dates with a 1-tap confirmation button'}
                  </Text>
                </View>
                <Switch
                  value={autoPost}
                  onValueChange={setAutoPost}
                  trackColor={{ false: '#3e3e3e', true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* Save and Delete Actions */}
              <View style={styles.actionButtonsRow}>
                {rule && (
                  <TouchableOpacity
                    style={[
                      styles.deleteBtn,
                      {
                        backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2',
                        borderColor: '#EF4444',
                      },
                    ]}
                    onPress={handleDelete}
                    activeOpacity={0.7}
                  >
                    <Trash2 size={18} color="#EF4444" />
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[
                    styles.saveBtn,
                    {
                      backgroundColor: colors.primary,
                      flex: 1,
                      opacity: isSaving ? 0.7 : 1,
                    },
                  ]}
                  onPress={handleSave}
                  disabled={isSaving}
                  activeOpacity={0.85}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Check size={18} color="#FFFFFF" style={{ marginRight: 6 }} strokeWidth={2.5} />
                      <Text
                        style={[
                          styles.saveBtnText,
                          { fontFamily: 'SpaceGrotesk_700Bold' },
                        ]}
                      >
                        {rule ? 'Update Schedule' : 'Create Recurring Schedule'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>

            {/* Currency Picker Modal */}
            <CurrencyPickerModal
              visible={currencyPickerVisible}
              onClose={() => setCurrencyPickerVisible(false)}
              selectedCurrency={currency}
              onSelect={setCurrency}
            />

            {/* Dedicated In-Modal Delete Confirmation Dialog */}
            {rule && (
              <Modal
                visible={showDeleteModal}
                transparent
                animationType={Platform.OS === 'web' ? 'none' : 'fade'}
                onRequestClose={() => setShowDeleteModal(false)}
              >
                <View style={styles.confirmBackdrop}>
                  <GlassBackdrop isDark={isDark} onPress={() => setShowDeleteModal(false)} />
                  <TouchableWithoutFeedback>
                    <View
                      style={[
                        styles.deleteCard,
                        {
                          backgroundColor: modalBg,
                          borderColor: cardBorder,
                        },
                      ]}
                    >
                      <View style={styles.deleteIconCircle}>
                        <Trash2 size={24} color="#EF4444" />
                      </View>
                      <Text style={[styles.deleteCardTitle, { color: colors.text }]}>
                        Delete Schedule?
                      </Text>
                      <Text style={[styles.deleteCardDesc, { color: colors.textSecondary }]}>
                        "{rule.description}" will be permanently removed. Past recorded transactions will not be affected.
                      </Text>

                      <View style={styles.deleteCardBtnRow}>
                        <TouchableOpacity
                          style={[styles.deleteCancelBtn, { backgroundColor: inputBg, borderColor: cardBorder }]}
                          onPress={() => setShowDeleteModal(false)}
                          disabled={isDeleting}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.deleteCancelText, { color: colors.text }]}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.deleteConfirmBtn, { opacity: isDeleting ? 0.7 : 1 }]}
                          onPress={confirmDelete}
                          disabled={isDeleting}
                          activeOpacity={0.85}
                        >
                          {isDeleting ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <Text style={styles.deleteConfirmText}>Delete</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableWithoutFeedback>
                </View>
              </Modal>
            )}
          </View>
        </TouchableWithoutFeedback>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  confirmBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  deleteCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  deleteIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  deleteCardTitle: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  deleteCardDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  deleteCardBtnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  deleteCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteCancelText: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontWeight: '700',
  },
  deleteConfirmBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteConfirmText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontWeight: '700',
  },
  modalContainer: {
    maxHeight: SCREEN_HEIGHT * 0.9,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {
    maxHeight: SCREEN_HEIGHT * 0.75,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 16,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
  },
  typeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 12,
  },
  typeTabText: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  heroAmountCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
  },
  heroAmountLabel: {
    fontSize: 10,
    letterSpacing: 0.8,
    fontFamily: 'SpaceGrotesk_700Bold',
    marginBottom: 8,
  },
  heroAmountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  currencyPickerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  currencyPickerBadgeText: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  heroAmountInput: {
    flex: 1,
    fontSize: 26,
    padding: 0,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  fxRateNotice: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
  },
  fxRateText: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_500Medium',
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 10,
    letterSpacing: 0.8,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  frequencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  frequencyPill: {
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  frequencyText: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
  booksScroll: {
    flexDirection: 'row',
  },
  bookPill: {
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 8,
  },
  bookPillText: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
  inputFieldWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    height: 48,
  },
  inputFieldText: {
    flex: 1,
    fontSize: 13,
    padding: 0,
    fontFamily: 'SpaceGrotesk_500Medium',
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 10,
  },
  switchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  switchTitle: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
  switchSubtitle: {
    fontSize: 12,
    marginTop: 2,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  deleteBtn: {
    width: 50,
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    height: 50,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
});
