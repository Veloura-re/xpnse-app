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
  useWindowDimensions,
  Image,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  X,
  TrendingUp,
  TrendingDown,
  Calendar,
  CreditCard,
  Tag,
  AlignLeft,
  Send,
  Globe,
  ChevronDown,
  Paperclip,
  Camera,
  Trash2,
} from 'lucide-react-native';
import { getCurrencySymbol } from '@/utils/currency-utils';
import { Book, BookEntry } from '@/types';
import { useBusiness } from '@/providers/business-provider';
import { pickImage, takePhoto, uploadImage, deleteImage, generateImagePath } from '@/utils/imageUpload';
import { getFontFamily } from '@/config/font-config';
import { GlassBackdrop } from '@/components/ui/glass-backdrop';
import { useTheme } from '@/providers/theme-provider';
import { CurrencyPickerModal } from '@/components/currency/currency-picker-modal';
import { CurrencyService } from '@/services/currency-service';

const ENABLE_ATTACHMENTS = false;

interface EntryEditModalProps {
  visible: boolean;
  entry: BookEntry | null;
  book: Book;
  onClose: () => void;
  onSave: (entry: BookEntry) => void;
  initialType?: 'cash_in' | 'cash_out';
}

export function EntryEditModal({ visible, entry, book, onClose, onSave, initialType }: EntryEditModalProps) {
  const { currentBusiness } = useBusiness();
  const { colors, isDark, deviceFont } = useTheme();
  const baseCurrency = (book?.currency || book?.settings?.currency || currentBusiness?.currency || 'USD').toUpperCase();

  const [type, setType] = useState<'cash_in' | 'cash_out'>('cash_in');
  const [amount, setAmount] = useState('');
  const [displayAmount, setDisplayAmount] = useState('');
  const [date, setDate] = useState('');
  const [autoDate, setAutoDate] = useState(true);
  const [description, setDescription] = useState('');
  const [descriptionError, setDescriptionError] = useState(false);
  const [paymentMode, setPaymentMode] = useState('');
  const [customPaymentMode, setCustomPaymentMode] = useState('');
  const [category, setCategory] = useState('');

  // Multi-Currency states
  const [selectedCurrency, setSelectedCurrency] = useState(baseCurrency);
  const [exchangeRate, setExchangeRate] = useState(1.0);
  const [currencyPickerVisible, setCurrencyPickerVisible] = useState(false);

  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const formatWithCommas = (raw: string) => {
    const cleaned = raw.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.length > 1 ? parts[0] + '.' + parts[1] : parts[0];
  };

  const handleAmountChange = (text: string) => {
    const raw = text.replace(/,/g, '');
    setAmount(raw);
    setDisplayAmount(formatWithCommas(raw));
  };

  const getTodayLocal = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Determine rate: check if book has custom valuation in book.settings or fetch live
  useEffect(() => {
    const upperSelected = selectedCurrency.toUpperCase();
    const upperBase = baseCurrency.toUpperCase();

    if (upperSelected === upperBase) {
      setExchangeRate(1.0);
    } else {
      const bookValuation = book?.settings?.customCurrencyValuations?.[upperSelected] ?? book?.settings?.customCurrencyValuations?.[selectedCurrency];
      if (bookValuation && bookValuation > 0) {
        setExchangeRate(bookValuation);
      } else {
        CurrencyService.getExchangeRate(upperSelected, upperBase).then((rate) => {
          setExchangeRate(rate);
        });
      }
    }
  }, [selectedCurrency, baseCurrency, book?.settings?.customCurrencyValuations]);

  useEffect(() => {
    if (entry) {
      setType(entry.type);
      const curr = entry.originalCurrency || baseCurrency;
      setSelectedCurrency(curr);
      const origAmt = entry.originalAmount !== undefined ? entry.originalAmount.toString() : entry.amount.toString();
      setAmount(origAmt);
      setDisplayAmount(formatWithCommas(origAmt));
      setExchangeRate(entry.exchangeRate || 1.0);
      setDate(entry.date);
      setDescription(entry.description);
      setDescriptionError(false);
      setPaymentMode(entry.paymentMode || '');
      setCategory(entry.category || '');
      setAttachments(entry.attachments || (entry.attachmentUrl ? [entry.attachmentUrl] : []));
      setAutoDate(false);
    } else {
      setType(initialType || 'cash_in');
      setSelectedCurrency(baseCurrency);
      setAmount('');
      setDisplayAmount('');
      setDate(getTodayLocal());
      setDescription('');
      setDescriptionError(false);
      setPaymentMode('');
      setCustomPaymentMode('');
      setCategory('');
      setAttachments([]);
      setAutoDate(true);
    }
  }, [entry, visible, initialType, baseCurrency]);

  const rawNumericAmount = parseFloat(amount) || 0;
  const convertedBaseAmount = useMemo(() => {
    if (selectedCurrency.toUpperCase() === baseCurrency.toUpperCase()) {
      return rawNumericAmount;
    }
    return Math.round(rawNumericAmount * exchangeRate * 100) / 100;
  }, [rawNumericAmount, exchangeRate, selectedCurrency, baseCurrency]);

  const paymentOptions = ['Cash', 'Card', 'UPI', 'Bank Transfer', 'Cheque', 'Custom'];

  const handlePickImage = async () => {
    try {
      setUploading(true);
      const uri = await pickImage();
      if (!uri) return;
      const path = generateImagePath(currentBusiness?.id || 'temp', book.id, attachments.length);
      const downloadUrl = await uploadImage(uri, path);
      if (downloadUrl) {
        setAttachments(prev => [...prev, downloadUrl]);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to pick image');
    } finally {
      setUploading(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      setUploading(true);
      const uri = await takePhoto();
      if (!uri) return;
      const path = generateImagePath(currentBusiness?.id || 'temp', book.id, attachments.length);
      const downloadUrl = await uploadImage(uri, path);
      if (downloadUrl) {
        setAttachments(prev => [...prev, downloadUrl]);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to take photo');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!description.trim()) {
      setDescriptionError(true);
      return;
    }
    setDescriptionError(false);

    const resolvedPaymentMode = paymentMode === 'Custom' ? customPaymentMode.trim() : paymentMode.trim();
    const isCustomValuation = Boolean(book?.settings?.customCurrencyValuations?.[selectedCurrency]);

    const entryData: BookEntry = {
      id: entry?.id || Date.now().toString(),
      bookId: book.id,
      businessId: book.businessId,
      userId: entry?.userId || 'unknown',
      type,
      amount: convertedBaseAmount,
      originalCurrency: selectedCurrency,
      originalAmount: rawNumericAmount,
      exchangeRate,
      isCustomRate: isCustomValuation,
      date,
      description: description.trim(),
      paymentMode: resolvedPaymentMode,
      category: category.trim(),
      attachments,
      createdAt: entry?.createdAt || new Date().toISOString(),
    };

    try {
      setIsSubmitting(true);
      await onSave(entryData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEditing = !!entry;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalOverlay}>
          <GlassBackdrop isDark={isDark} onPress={onClose} />
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View
                style={[
                  styles.modalContent,
                  {
                    backgroundColor: isDark ? '#141416' : '#FFFFFF',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)',
                    width: width > 500 ? 440 : '90%',
                    maxHeight: '85%',
                  },
                ]}
              >
                <View
                  style={[
                    styles.topSheen,
                    {
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.65)',
                    },
                  ]}
                />
                {/* Header */}
                <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                  <View style={styles.headerLeft}>
                    <View
                      style={[
                        styles.headerIcon,
                        {
                          backgroundColor:
                            type === 'cash_in'
                              ? 'rgba(16, 185, 129, 0.12)'
                              : 'rgba(239, 68, 68, 0.12)',
                        },
                      ]}
                    >
                      {type === 'cash_in' ? (
                        <TrendingUp size={18} color="#10B981" />
                      ) : (
                        <TrendingDown size={18} color="#EF4444" />
                      )}
                    </View>
                    <View>
                      <Text
                        style={[
                          styles.modalTitle,
                          { color: colors.text, fontFamily: 'SpaceGrotesk_700Bold' },
                        ]}
                      >
                        {entry ? 'Edit Entry' : type === 'cash_in' ? 'Record Cash In' : 'Record Cash Out'}
                      </Text>
                      <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                        {book?.name}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.closeButton,
                      { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9' },
                    ]}
                    onPress={onClose}
                  >
                    <X size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Form Scroll */}
                <ScrollView
                  style={styles.form}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {/* In / Out Switcher */}
                  <View style={styles.tabContainer}>
                    <View
                      style={[
                        styles.tabWrapper,
                        {
                          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F1F5F9',
                        },
                      ]}
                    >
                      <TouchableOpacity
                        style={[
                          styles.tabBtn,
                          type === 'cash_in' && { backgroundColor: '#10B981' },
                        ]}
                        onPress={() => setType('cash_in')}
                      >
                        <TrendingUp
                          size={14}
                          color={type === 'cash_in' ? '#FFFFFF' : colors.textSecondary}
                          style={{ marginRight: 6 }}
                        />
                        <Text
                          style={[
                            styles.tabBtnText,
                            {
                              color: type === 'cash_in' ? '#FFFFFF' : colors.textSecondary,
                              fontFamily: getFontFamily(deviceFont, type === 'cash_in' ? 'bold' : 'medium'),
                            },
                          ]}
                        >
                          CASH IN
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.tabBtn,
                          type === 'cash_out' && { backgroundColor: '#EF4444' },
                        ]}
                        onPress={() => setType('cash_out')}
                      >
                        <TrendingDown
                          size={14}
                          color={type === 'cash_out' ? '#FFFFFF' : colors.textSecondary}
                          style={{ marginRight: 6 }}
                        />
                        <Text
                          style={[
                            styles.tabBtnText,
                            {
                              color: type === 'cash_out' ? '#FFFFFF' : colors.textSecondary,
                              fontFamily: getFontFamily(deviceFont, type === 'cash_out' ? 'bold' : 'medium'),
                            },
                          ]}
                        >
                          CASH OUT
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Clean Amount Box */}
                  <View
                    style={[
                      styles.amountCard,
                      {
                        backgroundColor: focusedInput === 'amount'
                          ? isDark ? 'rgba(16, 185, 129, 0.06)' : '#F0FDF4'
                          : isDark ? '#1E1E22' : '#F8FAFC',
                        borderColor: focusedInput === 'amount'
                          ? type === 'cash_in' ? '#10B981' : '#EF4444'
                          : isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0',
                      },
                    ]}
                  >
                    <View style={styles.amountInputRow}>
                      {/* Currency Selector Pill */}
                      <TouchableOpacity
                        style={[
                          styles.currencyPill,
                          {
                            backgroundColor: isDark ? '#2A2A30' : '#E2E8F0',
                            borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : '#CBD5E1',
                          },
                        ]}
                        onPress={() => setCurrencyPickerVisible(true)}
                      >
                        <Globe size={13} color={colors.textSecondary} style={{ marginRight: 4 }} />
                        <Text
                          style={[
                            styles.currencyPillText,
                            { color: colors.text, fontFamily: getFontFamily(deviceFont, 'bold') },
                          ]}
                        >
                          {selectedCurrency}
                        </Text>
                        <ChevronDown size={12} color={colors.textSecondary} style={{ marginLeft: 2 }} />
                      </TouchableOpacity>

                      <Text
                        style={[
                          styles.currencyPrefixText,
                          { color: type === 'cash_in' ? '#10B981' : '#EF4444' },
                        ]}
                      >
                        {getCurrencySymbol(selectedCurrency)}
                      </Text>

                      <TextInput
                        style={[
                          styles.amountInputField,
                          { color: type === 'cash_in' ? '#10B981' : '#EF4444' },
                        ]}
                        value={displayAmount}
                        onChangeText={handleAmountChange}
                        onFocus={() => setFocusedInput('amount')}
                        onBlur={() => setFocusedInput(null)}
                        placeholder="0.00"
                        placeholderTextColor={isDark ? 'rgba(255, 255, 255, 0.25)' : '#94A3B8'}
                        keyboardType="numeric"
                        autoFocus={!isEditing}
                      />
                    </View>

                    {/* Converted Equivalent (If foreign currency) */}
                    {selectedCurrency.toUpperCase() !== baseCurrency.toUpperCase() && (
                      <View style={styles.convertedRow}>
                        <Text style={[styles.convertedText, { color: colors.textSecondary }]}>
                          ≈ {convertedBaseAmount.toFixed(2)} {baseCurrency} (@ {exchangeRate.toFixed(3)})
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Description Input */}
                  <View style={styles.inputGroup}>
                    <View style={styles.labelRow}>
                      <Text style={[styles.inputLabel, { color: descriptionError ? '#EF4444' : colors.text }]}>
                        Description
                      </Text>
                      {descriptionError && (
                        <Text style={styles.errorTag}>Required ✕</Text>
                      )}
                    </View>
                    <View
                      style={[
                        styles.inputBox,
                        {
                          backgroundColor: focusedInput === 'description'
                            ? isDark ? 'rgba(16, 185, 129, 0.06)' : '#F0FDF4'
                            : colors.inputBackground,
                          borderColor: descriptionError
                            ? '#EF4444'
                            : focusedInput === 'description'
                            ? colors.primary
                            : colors.border,
                        },
                      ]}
                    >
                      <AlignLeft
                        size={18}
                        color={descriptionError ? '#EF4444' : focusedInput === 'description' ? colors.primary : colors.textSecondary}
                        style={{ marginRight: 8 }}
                      />
                      <TextInput
                        style={[styles.textInput, { color: colors.text }]}
                        value={description}
                        onChangeText={(t) => {
                          setDescription(t);
                          if (t.trim()) setDescriptionError(false);
                        }}
                        onFocus={() => setFocusedInput('description')}
                        onBlur={() => setFocusedInput(null)}
                        placeholder="What is this for?"
                        placeholderTextColor={colors.textSecondary}
                      />
                    </View>
                  </View>

                  {/* Date Input */}
                  <View style={styles.inputGroup}>
                    <View style={styles.labelRow}>
                      <Text style={[styles.inputLabel, { color: colors.text }]}>Date</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 11, color: colors.textSecondary }}>Today</Text>
                        <Switch
                          value={autoDate}
                          onValueChange={(v) => {
                            setAutoDate(v);
                            if (v) setDate(getTodayLocal());
                          }}
                          trackColor={{ false: colors.border, true: '#10B981' }}
                          thumbColor="#FFFFFF"
                          style={{ transform: [{ scaleX: 0.75 }, { scaleY: 0.75 }] }}
                        />
                      </View>
                    </View>
                    <View
                      style={[
                        styles.inputBox,
                        { backgroundColor: colors.inputBackground, borderColor: colors.border },
                        autoDate && { opacity: 0.7 },
                      ]}
                    >
                      <Calendar size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
                      <TextInput
                        style={[styles.textInput, { color: colors.text }]}
                        value={date}
                        onChangeText={setDate}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={colors.textSecondary}
                        editable={!autoDate}
                      />
                    </View>
                  </View>

                  {/* Category Input (If enabled) */}
                  {(book?.settings?.showCategory ?? true) && (
                    <View style={styles.inputGroup}>
                      <Text style={[styles.inputLabel, { color: colors.text }]}>Category</Text>
                      <View
                        style={[
                          styles.inputBox,
                          {
                            backgroundColor: focusedInput === 'category'
                              ? isDark ? 'rgba(16, 185, 129, 0.06)' : '#F0FDF4'
                              : colors.inputBackground,
                            borderColor: focusedInput === 'category' ? colors.primary : colors.border,
                          },
                        ]}
                      >
                        <Tag size={18} color={focusedInput === 'category' ? colors.primary : colors.textSecondary} style={{ marginRight: 8 }} />
                        <TextInput
                          style={[styles.textInput, { color: colors.text }]}
                          value={category}
                          onChangeText={setCategory}
                          onFocus={() => setFocusedInput('category')}
                          onBlur={() => setFocusedInput(null)}
                          placeholder="e.g. Supplies, Rent, Client"
                          placeholderTextColor={colors.textSecondary}
                        />
                      </View>
                    </View>
                  )}

                  {/* Payment Mode Chips (If enabled) */}
                  {(book?.settings?.showPaymentMode ?? true) && (
                    <View style={styles.inputGroup}>
                      <Text style={[styles.inputLabel, { color: colors.text }]}>Payment Method</Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ gap: 6, paddingVertical: 2 }}
                      >
                        {paymentOptions.map((opt) => {
                          const isSelected = paymentMode === opt;
                          return (
                            <TouchableOpacity
                              key={opt}
                              style={[
                                styles.paymentPill,
                                {
                                  backgroundColor: isSelected
                                    ? type === 'cash_in'
                                      ? 'rgba(16, 185, 129, 0.15)'
                                      : 'rgba(239, 68, 68, 0.15)'
                                    : isDark
                                    ? 'rgba(255, 255, 255, 0.05)'
                                    : '#F8FAFC',
                                  borderColor: isSelected
                                    ? type === 'cash_in'
                                      ? '#10B981'
                                      : '#EF4444'
                                    : colors.border,
                                },
                              ]}
                              onPress={() => setPaymentMode(opt)}
                            >
                              <Text
                                style={[
                                  styles.paymentPillText,
                                  {
                                    color: isSelected
                                      ? type === 'cash_in'
                                        ? '#10B981'
                                        : '#EF4444'
                                      : colors.textSecondary,
                                    fontWeight: isSelected ? '700' : '500',
                                  },
                                ]}
                              >
                                {opt}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                      {paymentMode === 'Custom' && (
                        <View
                          style={[
                            styles.inputBox,
                            {
                              backgroundColor: colors.inputBackground,
                              borderColor: colors.border,
                              marginTop: 8,
                            },
                          ]}
                        >
                          <CreditCard size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
                          <TextInput
                            style={[styles.textInput, { color: colors.text }]}
                            value={customPaymentMode}
                            onChangeText={setCustomPaymentMode}
                            placeholder="Enter custom method"
                            placeholderTextColor={colors.textSecondary}
                          />
                        </View>
                      )}
                    </View>
                  )}

                  <View style={{ height: 16 }} />
                </ScrollView>

                {/* Footer Action */}
                <View style={[styles.footer, { borderTopColor: colors.border }]}>
                  <TouchableOpacity
                    style={[styles.submitButton, { borderRadius: 14 }]}
                    onPress={handleSave}
                    disabled={isSubmitting}
                  >
                    <LinearGradient
                      colors={type === 'cash_in' ? ['#10B981', '#059669'] : ['#EF4444', '#DC2626']}
                      style={styles.gradientBtn}
                    >
                      {isSubmitting ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Send size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                          <Text
                            style={[
                              styles.submitText,
                              { fontFamily: getFontFamily(deviceFont, 'bold') },
                            ]}
                          >
                            {isEditing ? 'Update Transaction' : 'Save Transaction'}
                          </Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                {/* Currency Picker Modal */}
                <CurrencyPickerModal
                  visible={currencyPickerVisible}
                  onClose={() => setCurrencyPickerVisible(false)}
                  selectedCurrency={selectedCurrency}
                  onSelect={setSelectedCurrency}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  }

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  topSheen: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 1,
    borderRadius: 1,
    zIndex: 10,
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
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  modalTitle: {
    fontSize: 16,
  },
  modalSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  tabContainer: {
    marginBottom: 14,
  },
  tabWrapper: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 14,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
  },
  tabBtnText: {
    fontSize: 12,
    letterSpacing: 0.5,
  },
  amountCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 16,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 8,
  },
  currencyPillText: {
    fontSize: 12,
  },
  currencyPrefixText: {
    fontSize: 26,
    fontWeight: '700',
    marginRight: 4,
  },
  amountInputField: {
    fontSize: 32,
    fontWeight: '800',
    minWidth: 100,
    paddingVertical: 0,
  },
  convertedRow: {
    alignItems: 'center',
    marginTop: 6,
  },
  convertedText: {
    fontSize: 11,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 14,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  errorTag: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '700',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  paymentPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  paymentPillText: {
    fontSize: 12,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  submitButton: {
    overflow: 'hidden',
  },
  gradientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 14,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
});
