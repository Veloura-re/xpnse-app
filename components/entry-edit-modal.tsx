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
  RefreshCw,
  ChevronDown,
  Paperclip,
  Camera,
  Trash2,
  Plus,
  ArrowRightLeft,
  Image as ImageIcon,
} from 'lucide-react-native';
import { getCurrencySymbol, formatCurrency } from '@/utils/currency-utils';
import { Book, BookEntry } from '@/types';
import { useBusiness } from '@/providers/business-provider';
import {
  pickImage,
  takePhoto,
  uploadImage,
  deleteImage,
  generateImagePath,
  checkMediaLibraryPermission,
  checkCameraPermission,
  requestMediaLibraryDirect,
  requestCameraDirect,
} from '@/utils/imageUpload';
import { getFontFamily } from '@/config/font-config';
import { GlassBackdrop } from '@/components/ui/glass-backdrop';
import { useTheme } from '@/providers/theme-provider';
import { CurrencyPickerModal } from '@/components/currency/currency-picker-modal';
import { CurrencyService } from '@/services/currency-service';
import { AttachmentSourceModal } from '@/components/attachment-source-modal';
import { PermissionModal } from '@/components/ui/permission-modal';
import { ConfirmActionModal } from '@/components/ui/confirm-action-modal';

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
  const secondaryCurrency = (book?.settings?.secondaryCurrency || '').toUpperCase();
  const [selectedCurrency, setSelectedCurrency] = useState(baseCurrency);
  const [quotationDirection, setQuotationDirection] = useState<'base_to_quote' | 'quote_to_base'>('base_to_quote');
  const [exchangeRate, setExchangeRate] = useState(1.0);
  const [customRateText, setCustomRateText] = useState('1.0');
  const [isUserCustomRate, setIsUserCustomRate] = useState(false);
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

  const handleCustomRateChange = (text: string) => {
    const sanitized = text.replace(/[^0-9.]/g, '');
    const parts = sanitized.split('.');
    const formatted = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : sanitized;
    setCustomRateText(formatted);
    const parsed = parseFloat(formatted);
    if (!isNaN(parsed) && parsed > 0) {
      const eff = CurrencyService.calculateEffectiveMultiplier(quotationDirection, parsed);
      setExchangeRate(eff);
      setIsUserCustomRate(true);
    }
  };

  const handleSwapDirection = () => {
    const nextDir = quotationDirection === 'base_to_quote' ? 'quote_to_base' : 'base_to_quote';
    setQuotationDirection(nextDir);
    const currentParsed = parseFloat(customRateText);
    if (!isNaN(currentParsed) && currentParsed > 0) {
      const inverted = CurrencyService.invertRate(currentParsed);
      setCustomRateText(String(inverted));
      const eff = CurrencyService.calculateEffectiveMultiplier(nextDir, inverted);
      setExchangeRate(eff);
      setIsUserCustomRate(true);
    }
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
    if (entry) return; // Preserve existing entry valuation if editing
    const upperSelected = selectedCurrency.toUpperCase();
    const upperBase = baseCurrency.toUpperCase();

    if (upperSelected === upperBase) {
      setExchangeRate(1.0);
      setCustomRateText('1.0');
      setIsUserCustomRate(false);
      setQuotationDirection('quote_to_base');
    } else {
      const isSecondary = Boolean(secondaryCurrency && upperSelected === secondaryCurrency);
      const secondaryValuation = isSecondary ? book?.settings?.secondaryCurrencyValuation : undefined;
      const secondaryDir = isSecondary ? book?.settings?.preferredQuotationDirection : undefined;

      const bookValuation = secondaryValuation ?? (book?.settings?.customCurrencyValuations?.[upperSelected] ?? book?.settings?.customCurrencyValuations?.[selectedCurrency]);

      if (bookValuation && bookValuation > 0) {
        const dir = secondaryDir || CurrencyService.getNaturalQuotationDirection(upperBase, upperSelected, bookValuation);
        setQuotationDirection(dir);
        setCustomRateText(String(bookValuation));
        setExchangeRate(CurrencyService.calculateEffectiveMultiplier(dir, bookValuation));
        setIsUserCustomRate(true);
      } else {
        CurrencyService.getExchangeRate(upperBase, upperSelected).then((targetPerBase) => {
          const dir = CurrencyService.getNaturalQuotationDirection(upperBase, upperSelected, targetPerBase);
          setQuotationDirection(dir);
          const displayVal = dir === 'base_to_quote' ? targetPerBase : CurrencyService.invertRate(targetPerBase);
          setCustomRateText(String(displayVal));
          setExchangeRate(CurrencyService.calculateEffectiveMultiplier(dir, displayVal));
        });
      }
    }
  }, [selectedCurrency, baseCurrency, secondaryCurrency, book?.settings?.secondaryCurrencyValuation, book?.settings?.preferredQuotationDirection, book?.settings?.customCurrencyValuations, entry]);

  useEffect(() => {
    if (entry) {
      setType(entry.type);
      const curr = entry.originalCurrency || baseCurrency;
      setSelectedCurrency(curr);
      const origAmt = entry.originalAmount !== undefined ? entry.originalAmount.toString() : entry.amount.toString();
      setAmount(origAmt);
      setDisplayAmount(formatWithCommas(origAmt));

      const entryRate = entry.exchangeRate || 1.0;
      const savedDirection = entry.rateQuotationDirection || CurrencyService.getNaturalQuotationDirection(baseCurrency, curr, entryRate > 0 ? 1 / entryRate : 1.0);
      setQuotationDirection(savedDirection);

      if (entry.displayRate && entry.displayRate > 0) {
        setCustomRateText(String(entry.displayRate));
        setExchangeRate(entry.exchangeRate || CurrencyService.calculateEffectiveMultiplier(savedDirection, entry.displayRate));
      } else {
        if (savedDirection === 'base_to_quote' && entryRate > 0) {
          const inv = CurrencyService.invertRate(entryRate);
          setCustomRateText(String(inv));
          setExchangeRate(entryRate);
        } else {
          setCustomRateText(String(entryRate));
          setExchangeRate(entryRate);
        }
      }

      setIsUserCustomRate(Boolean(entry.isCustomRate));
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
      setExchangeRate(1.0);
      setCustomRateText('1.0');
      setQuotationDirection('quote_to_base');
      setIsUserCustomRate(false);
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
  const parsedRate = parseFloat(customRateText) || 1.0;
  const convertedBaseAmount = useMemo(() => {
    if (selectedCurrency.toUpperCase() === baseCurrency.toUpperCase()) {
      return rawNumericAmount;
    }
    return CurrencyService.convertBidirectional(
      rawNumericAmount,
      selectedCurrency,
      baseCurrency,
      parsedRate,
      quotationDirection
    );
  }, [rawNumericAmount, parsedRate, quotationDirection, selectedCurrency, baseCurrency]);

  const paymentOptions = ['Cash', 'Spndy Wallet', 'Card', 'UPI', 'Bank Transfer', 'Cheque', 'Custom'];

  // Attachment & Permission Modals
  const [sourceModalVisible, setSourceModalVisible] = useState(false);
  const [permissionModalVisible, setPermissionModalVisible] = useState(false);
  const [permissionType, setPermissionType] = useState<'storage' | 'camera'>('storage');
  const [permissionDeniedBySystem, setPermissionDeniedBySystem] = useState(false);
  const [removeAttachmentIdx, setRemoveAttachmentIdx] = useState<number | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const executeTakePhoto = async () => {
    try {
      setUploading(true);
      const uri = await takePhoto(true);
      if (!uri) return;
      const path = generateImagePath(currentBusiness?.id || 'temp', book.id, attachments.length);
      const downloadUrl = await uploadImage(uri, path);
      if (downloadUrl) {
        setAttachments(prev => [...prev, downloadUrl]);
      }
    } catch (error: any) {
      console.error('Error taking photo:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleTakePhoto = async () => {
    const perm = await checkCameraPermission();
    if (perm.granted) {
      executeTakePhoto();
    } else {
      setPermissionType('camera');
      setPermissionDeniedBySystem(!perm.canAskAgain && perm.status === 'denied');
      setPermissionModalVisible(true);
    }
  };

  const executePickImage = async () => {
    try {
      setUploading(true);
      const uri = await pickImage(true);
      if (!uri) return;
      const path = generateImagePath(currentBusiness?.id || 'temp', book.id, attachments.length);
      const downloadUrl = await uploadImage(uri, path);
      if (downloadUrl) {
        setAttachments(prev => [...prev, downloadUrl]);
      }
    } catch (error: any) {
      console.error('Error picking image:', error);
    } finally {
      setUploading(false);
    }
  };

  const handlePickImage = async () => {
    const perm = await checkMediaLibraryPermission();
    if (perm.granted) {
      executePickImage();
    } else {
      setPermissionType('storage');
      setPermissionDeniedBySystem(!perm.canAskAgain && perm.status === 'denied');
      setPermissionModalVisible(true);
    }
  };

  const handleAllowPermission = async () => {
    if (permissionType === 'camera') {
      const res = await requestCameraDirect();
      if (res.granted) {
        setPermissionModalVisible(false);
        setTimeout(executeTakePhoto, 150);
      } else {
        setPermissionDeniedBySystem(!res.canAskAgain);
      }
    } else {
      const res = await requestMediaLibraryDirect();
      if (res.granted) {
        setPermissionModalVisible(false);
        setTimeout(executePickImage, 150);
      } else {
        setPermissionDeniedBySystem(!res.canAskAgain);
      }
    }
  };

  const handleRemoveAttachment = (indexToRemove: number) => {
    setRemoveAttachmentIdx(indexToRemove);
  };

  const confirmRemoveAttachment = () => {
    if (removeAttachmentIdx !== null) {
      setAttachments(prev => prev.filter((_, idx) => idx !== removeAttachmentIdx));
      setRemoveAttachmentIdx(null);
    }
  };

  const handleAddAttachmentChoice = () => {
    setSourceModalVisible(true);
  };

  const handleSave = async () => {
    if (!description.trim()) {
      setDescriptionError(true);
      return;
    }
    setDescriptionError(false);

    const isShowPaymentMode = book?.settings?.showPaymentMode ?? true;
    const isShowCategory = book?.settings?.showCategory ?? true;
    const isShowAttachments = book?.settings?.showAttachments ?? true;

    const resolvedPaymentMode = isShowPaymentMode
      ? (paymentMode === 'Custom' ? customPaymentMode.trim() : paymentMode.trim())
      : '';
    const resolvedCategory = isShowCategory ? category.trim() : '';
    const resolvedAttachments = isShowAttachments ? attachments : [];

    const isCustomValuation = Boolean(
      (secondaryCurrency && selectedCurrency.toUpperCase() === secondaryCurrency) ||
      book?.settings?.customCurrencyValuations?.[selectedCurrency]
    );

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
      isCustomRate: isCustomValuation || isUserCustomRate,
      displayRate: parsedRate,
      rateQuotationDirection: quotationDirection,
      date,
      description: description.trim(),
      paymentMode: resolvedPaymentMode,
      category: resolvedCategory,
      attachments: resolvedAttachments,
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
                    {/* Quick Currency Selection Pills */}
                    <View style={styles.quickCurrencyPillsRow}>
                      <TouchableOpacity
                        style={[
                          styles.quickCurrencyPill,
                          selectedCurrency.toUpperCase() === baseCurrency.toUpperCase() && styles.quickCurrencyPillActive,
                          {
                            backgroundColor: selectedCurrency.toUpperCase() === baseCurrency.toUpperCase()
                              ? (isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF')
                              : (isDark ? 'rgba(255, 255, 255, 0.05)' : '#F1F5F9'),
                            borderColor: selectedCurrency.toUpperCase() === baseCurrency.toUpperCase()
                              ? colors.primary
                              : (isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0'),
                          }
                        ]}
                        onPress={() => setSelectedCurrency(baseCurrency)}
                      >
                        <Text style={[
                          styles.quickCurrencyPillText,
                          {
                            color: selectedCurrency.toUpperCase() === baseCurrency.toUpperCase() ? colors.primary : colors.text,
                            fontFamily: getFontFamily(deviceFont, 'bold')
                          }
                        ]}>
                          {baseCurrency} (Primary)
                        </Text>
                      </TouchableOpacity>

                      {secondaryCurrency && secondaryCurrency.toUpperCase() !== baseCurrency.toUpperCase() && (
                        <TouchableOpacity
                          style={[
                            styles.quickCurrencyPill,
                            selectedCurrency.toUpperCase() === secondaryCurrency.toUpperCase() && styles.quickCurrencyPillActive,
                            {
                              backgroundColor: selectedCurrency.toUpperCase() === secondaryCurrency.toUpperCase()
                                ? (isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF')
                                : (isDark ? 'rgba(255, 255, 255, 0.05)' : '#F1F5F9'),
                              borderColor: selectedCurrency.toUpperCase() === secondaryCurrency.toUpperCase()
                                ? colors.primary
                                : (isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0'),
                            }
                          ]}
                          onPress={() => setSelectedCurrency(secondaryCurrency)}
                        >
                          <Text style={[
                            styles.quickCurrencyPillText,
                            {
                              color: selectedCurrency.toUpperCase() === secondaryCurrency.toUpperCase() ? colors.primary : colors.text,
                              fontFamily: getFontFamily(deviceFont, 'bold')
                            }
                          ]}>
                            {secondaryCurrency} (Secondary)
                          </Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        style={[
                          styles.quickCurrencyPill,
                          selectedCurrency.toUpperCase() !== baseCurrency.toUpperCase() &&
                          (!secondaryCurrency || selectedCurrency.toUpperCase() !== secondaryCurrency.toUpperCase()) &&
                          styles.quickCurrencyPillActive,
                          {
                            backgroundColor: selectedCurrency.toUpperCase() !== baseCurrency.toUpperCase() &&
                              (!secondaryCurrency || selectedCurrency.toUpperCase() !== secondaryCurrency.toUpperCase())
                              ? (isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF')
                              : (isDark ? 'rgba(255, 255, 255, 0.05)' : '#F1F5F9'),
                            borderColor: selectedCurrency.toUpperCase() !== baseCurrency.toUpperCase() &&
                              (!secondaryCurrency || selectedCurrency.toUpperCase() !== secondaryCurrency.toUpperCase())
                              ? colors.primary
                              : (isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0'),

                          }
                        ]}
                        onPress={() => setCurrencyPickerVisible(true)}
                      >
                        <Globe size={11} color={colors.textSecondary} style={{ marginRight: 4 }} />
                        <Text style={[
                          styles.quickCurrencyPillText,
                          {
                            color: selectedCurrency.toUpperCase() !== baseCurrency.toUpperCase() &&
                              (!secondaryCurrency || selectedCurrency.toUpperCase() !== secondaryCurrency.toUpperCase())
                              ? colors.primary
                              : colors.textSecondary,
                            fontFamily: getFontFamily(deviceFont, 'medium')
                          }
                        ]}>
                          {selectedCurrency.toUpperCase() !== baseCurrency.toUpperCase() &&
                           (!secondaryCurrency || selectedCurrency.toUpperCase() !== secondaryCurrency.toUpperCase())
                            ? selectedCurrency
                            : 'Other...'}
                        </Text>
                      </TouchableOpacity>
                    </View>

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

                    {/* Interactive Bidirectional FX Rate Multiplier Card (If foreign currency) */}
                    {selectedCurrency.toUpperCase() !== baseCurrency.toUpperCase() && (
                      <View style={[
                        styles.fxRateCard,
                        {
                          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#F8FAFC',
                          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
                        }
                      ]}>
                        <View style={styles.fxRateHeader}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Globe size={13} color={colors.primary} />
                            <Text style={[styles.fxRateTitle, { color: colors.text, fontFamily: getFontFamily(deviceFont, 'bold') }]}>
                              Exchange Rate
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end' }}>
                            <TouchableOpacity
                              onPress={handleSwapDirection}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 6 }}
                            >
                              <ArrowRightLeft size={11} color="#3B82F6" />
                              <Text style={{ fontSize: 11, color: '#3B82F6', fontFamily: 'SpaceGrotesk_700Bold' }}>
                                Invert Rate
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              onPress={async () => {
                                try {
                                  const upperSelected = selectedCurrency.toUpperCase();
                                  const upperBase = baseCurrency.toUpperCase();
                                  const targetPerBase = await CurrencyService.getExchangeRate(upperBase, upperSelected);
                                  const liveVal = quotationDirection === 'base_to_quote'
                                    ? targetPerBase
                                    : CurrencyService.invertRate(targetPerBase);
                                  setCustomRateText(liveVal.toString());
                                  const eff = CurrencyService.calculateEffectiveMultiplier(quotationDirection, liveVal);
                                  setExchangeRate(eff);
                                  setIsUserCustomRate(false);
                                } catch (e) {}
                              }}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 6 }}
                            >
                              <RefreshCw size={11} color={colors.primary} />
                              <Text style={{ fontSize: 11, color: colors.primary, fontFamily: 'SpaceGrotesk_700Bold' }}>
                                Live Rate
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>

                        <View style={styles.fxRateInputRow}>
                          <Text style={[styles.fxRateLabel, { color: colors.textSecondary }]}>
                            {quotationDirection === 'base_to_quote'
                              ? `1 ${baseCurrency} =`
                              : `1 ${selectedCurrency} =`}
                          </Text>
                          <View style={[
                            styles.fxRateInputWrapper,
                            {
                              backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                              borderColor: focusedInput === 'rate' ? colors.primary : (isDark ? 'rgba(255, 255, 255, 0.1)' : '#CBD5E1'),
                            }
                          ]}>
                            <TextInput
                              style={[styles.fxRateInputField, { color: colors.text, fontFamily: 'SpaceGrotesk_700Bold' }]}
                              value={customRateText}
                              onChangeText={handleCustomRateChange}
                              onFocus={() => setFocusedInput('rate')}
                              onBlur={() => setFocusedInput(null)}
                              keyboardType="numeric"
                              placeholder="1.0"
                              placeholderTextColor={colors.textSecondary}
                              selectTextOnFocus={true}
                            />
                            <Text style={[styles.fxRateSuffix, { color: colors.textSecondary, fontFamily: 'SpaceGrotesk_700Bold' }]}>
                              {quotationDirection === 'base_to_quote' ? selectedCurrency : baseCurrency}
                            </Text>
                          </View>
                        </View>

                        {/* Calculated Converted Amount Preview */}
                        <View style={[styles.fxCalculationRow, { borderTopColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#E2E8F0' }]}>
                          <Text style={[styles.fxCalcText, { color: colors.textSecondary }]}>
                            Converted Total:
                          </Text>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={[styles.fxCalcHighlight, { color: type === 'cash_in' ? '#10B981' : '#EF4444', fontFamily: 'SpaceGrotesk_700Bold' }]}>
                              {formatCurrency(convertedBaseAmount, baseCurrency)}
                            </Text>
                            {rawNumericAmount > 0 && (
                              <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2, fontFamily: 'SpaceGrotesk_600SemiBold' }}>
                                ({formatCurrency(rawNumericAmount, selectedCurrency)})
                              </Text>
                            )}
                          </View>
                        </View>
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
                        <Text style={styles.errorTag}>Required</Text>
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

                  {/* Attachments Section (If enabled) */}
                  {(book?.settings?.showAttachments ?? true) && (
                    <View style={styles.inputGroup}>
                      <View style={styles.labelRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Paperclip size={13} color={colors.text} />
                          <Text style={[styles.inputLabel, { color: colors.text, marginBottom: 0 }]}>
                            Attachments {attachments.length > 0 ? `(${attachments.length})` : ''}
                          </Text>
                        </View>
                        {uploading && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <ActivityIndicator size="small" color={colors.text} />
                            <Text style={{ fontSize: 11, color: colors.textSecondary }}>Uploading...</Text>
                          </View>
                        )}
                      </View>

                      {attachments.length === 0 ? (
                        /* Empty State: Interactive glassmorphic drop-zone card with dashed border */
                        <TouchableOpacity
                          style={[
                            styles.emptyAttachmentCard,
                            {
                              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(248, 250, 252, 0.7)',
                              borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(0, 0, 0, 0.12)',
                            }
                          ]}
                          onPress={handleAddAttachmentChoice}
                          activeOpacity={0.75}
                          disabled={uploading}
                        >
                          <View style={[styles.emptyAttachIconOrb, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.08)' }]}>
                            <Paperclip size={18} color="#10b981" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.emptyAttachTitle, { color: colors.text }]}>
                              Tap to add receipt or invoice
                            </Text>
                            <Text style={[styles.emptyAttachSub, { color: colors.textSecondary }]}>
                              Camera photo, image library, or scanned vouchers
                            </Text>
                          </View>
                          <View style={[styles.emptyAttachPlusBadge, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0' }]}>
                            <Plus size={14} color={colors.text} />
                          </View>
                        </TouchableOpacity>
                      ) : (
                        /* Horizontal Reel: Compact + Add tile followed by attached thumbnails */
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={{ gap: 10, paddingVertical: 4 }}
                        >
                          {/* Compact "+ Add" Tile */}
                          <TouchableOpacity
                            style={[
                              styles.addThumbTile,
                              {
                                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F8FAFC',
                                borderColor: isDark ? 'rgba(255, 255, 255, 0.16)' : '#CBD5E1',
                              }
                            ]}
                            onPress={handleAddAttachmentChoice}
                            disabled={uploading}
                            activeOpacity={0.7}
                          >
                            <View style={[styles.addThumbIconWrap, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)' }]}>
                              <Plus size={16} color="#10B981" strokeWidth={2.2} />
                            </View>
                            <Text style={[styles.addThumbText, { color: colors.text }]}>Add</Text>
                          </TouchableOpacity>

                          {/* Attached Photo Thumbnails */}
                          {attachments.map((url, idx) => (
                            <TouchableOpacity
                              key={idx}
                              style={[
                                styles.modalThumbWrap,
                                {
                                  borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
                                }
                              ]}
                              activeOpacity={0.85}
                              onPress={() => setPreviewImageUrl(url)}
                            >
                              <Image source={{ uri: url }} style={styles.modalThumbImg} resizeMode="cover" />
                              <TouchableOpacity
                                style={styles.modalThumbDelete}
                                onPress={(e) => {
                                  e.stopPropagation();
                                  handleRemoveAttachment(idx);
                                }}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              >
                                <X size={11} color="#FFFFFF" />
                              </TouchableOpacity>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
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

                {/* Attachment Source Picker Modal */}
                <AttachmentSourceModal
                  visible={sourceModalVisible}
                  onClose={() => setSourceModalVisible(false)}
                  onSelectCamera={handleTakePhoto}
                  onSelectGallery={handlePickImage}
                />

                {/* Privacy-Preserving Permission Modal */}
                <PermissionModal
                  visible={permissionModalVisible}
                  type={permissionType}
                  isDeniedBySystem={permissionDeniedBySystem}
                  onClose={() => setPermissionModalVisible(false)}
                  onAllow={handleAllowPermission}
                />

                {/* Attachment Removal Confirmation Modal */}
                <ConfirmActionModal
                  visible={removeAttachmentIdx !== null}
                  title="Remove Attachment"
                  description="Are you sure you want to remove this receipt photo from this transaction?"
                  confirmLabel="Remove"
                  cancelLabel="Keep Attachment"
                  destructive={true}
                  onConfirm={confirmRemoveAttachment}
                  onCancel={() => setRemoveAttachmentIdx(null)}
                />

                {/* Full-screen Image Preview Modal */}
                <Modal
                  visible={!!previewImageUrl}
                  transparent
                  animationType="fade"
                  onRequestClose={() => setPreviewImageUrl(null)}
                  statusBarTranslucent
                >
                  <View style={styles.imagePreviewOverlay}>
                    <TouchableOpacity
                      style={styles.imagePreviewCloseBtn}
                      onPress={() => setPreviewImageUrl(null)}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                      <X size={22} color="#ffffff" />
                    </TouchableOpacity>

                    {previewImageUrl && (
                      <Image
                        source={{ uri: previewImageUrl }}
                        style={styles.imagePreviewFull}
                        resizeMode="contain"
                      />
                    )}
                  </View>
                </Modal>
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
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  modalSubtitle: {
    fontSize: 11,
    marginTop: 1,
    fontFamily: 'SpaceGrotesk_400Regular',
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
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  quickCurrencyPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  quickCurrencyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  quickCurrencyPillActive: {
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  quickCurrencyPillText: {
    fontSize: 11,
    fontFamily: 'SpaceGrotesk_700Bold',
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
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  currencyPrefixText: {
    fontSize: 26,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk_700Bold',
    marginRight: 4,
  },
  amountInputField: {
    fontSize: 32,
    fontWeight: '800',
    fontFamily: 'SpaceGrotesk_700Bold',
    minWidth: 100,
    paddingVertical: 0,
  },
  fxRateCard: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  fxRateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  fxRateTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  liveRateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  liveRateButtonText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  fxRateInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  fxRateLabel: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
  fxRateInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    minHeight: 38,
  },
  fxRateInputField: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk_700Bold',
    paddingVertical: 0,
  },
  fxRateSuffix: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'SpaceGrotesk_600SemiBold',
    marginLeft: 4,
  },
  fxCalculationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 8,
    marginTop: 2,
  },
  fxCalcText: {
    fontSize: 11,
    fontWeight: '500',
    fontFamily: 'SpaceGrotesk_500Medium',
  },
  fxCalcHighlight: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk_700Bold',
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
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
  errorTag: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
    fontFamily: 'SpaceGrotesk_500Medium',
  },
  paymentPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  paymentPillText: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_600SemiBold',
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
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  emptyAttachmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    gap: 12,
  },
  emptyAttachIconOrb: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyAttachTitle: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk_600SemiBold',
    marginBottom: 2,
  },
  emptyAttachSub: {
    fontSize: 11,
    fontFamily: 'SpaceGrotesk_400Regular',
    lineHeight: 15,
  },
  emptyAttachPlusBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addThumbTile: {
    width: 60,
    height: 60,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  addThumbIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addThumbText: {
    fontSize: 10,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  modalThumbWrap: {
    position: 'relative',
    width: 60,
    height: 60,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalThumbImg: {
    width: 60,
    height: 60,
  },
  modalThumbDelete: {
    position: 'absolute',
    top: 3,
    right: 3,
    backgroundColor: 'rgba(239, 68, 68, 0.85)',
    borderRadius: 9,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  imagePreviewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreviewCloseBtn: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 20,
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
  },
  imagePreviewFull: {
    width: '100%',
    height: '80%',
  },
});
