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
import { X, TrendingUp, TrendingDown, User, Building2, ChevronDown, Calendar, CreditCard, Tag, AlignLeft, Plus, Send } from 'lucide-react-native';
import { getCurrencySymbol } from '@/utils/currency-utils';
import { Book, BookEntry } from '@/types';
import { useBusiness } from '@/providers/business-provider';
import { pickImage, takePhoto, uploadImage, deleteImage, generateImagePath } from '@/utils/imageUpload';
import { getFontFamily } from '@/config/font-config';
import { useTheme } from '@/providers/theme-provider';

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
  const { parties, currentBusiness } = useBusiness();
  const { colors, theme, isDark } = useTheme();
  const [type, setType] = useState<'cash_in' | 'cash_out'>('cash_in');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [autoDate, setAutoDate] = useState(true);
  const [description, setDescription] = useState('');
  const [paymentMode, setPaymentMode] = useState('');
  const [customPaymentMode, setCustomPaymentMode] = useState('');
  const [category, setCategory] = useState('');
  const [partyId, setPartyId] = useState<string | undefined>(undefined);
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isTablet = width > 600;

  const getTodayLocal = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  useEffect(() => {
    if (entry) {
      setType(entry.type);
      setAmount(entry.amount.toString());
      setDate(entry.date);
      setDescription(entry.description);
      setPaymentMode(entry.paymentMode || '');
      setCategory(entry.category || '');
      setPartyId(entry.partyId);
      setAttachments(entry.attachments || (entry.attachmentUrl ? [entry.attachmentUrl] : []));
      setAutoDate(false);
    } else {
      setType(initialType || 'cash_in');
      setAmount('');
      setDescription('');
      setPaymentMode('');
      setCategory('');
      setPartyId(undefined);
      setAttachments([]);
      setAutoDate(true);
      setDate(getTodayLocal());
    }
  }, [entry, visible, initialType]);

  const filteredParties = useMemo(() => {
    const targetType = type === 'cash_in' ? 'customer' : 'vendor';
    return parties.filter(p => p.type === targetType);
  }, [parties, type]);

  const selectedParty = useMemo(() => {
    return parties.find(p => p.id === partyId);
  }, [parties, partyId]);

  const paymentOptions = useMemo(() => [
    'Cash', 'Bank Transfer', 'Card', 'UPI', 'Cheque', 'Other', 'Custom'
  ], []);

  const handleAddAttachment = () => {
    Alert.alert('Add Attachment', 'Choose an option', [
      { text: 'Camera', onPress: async () => { const uri = await takePhoto(); if (uri) handleUpload(uri); } },
      { text: 'Photo Library', onPress: async () => { const uri = await pickImage(); if (uri) handleUpload(uri); } },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleUpload = async (uri: string) => {
    setUploading(true);
    try {
      const entryId = entry?.id || Date.now().toString();
      const path = generateImagePath(book.businessId, entryId, attachments.length);
      const downloadUrl = await uploadImage(uri, path);
      if (downloadUrl) setAttachments(prev => [...prev, downloadUrl]);
    } catch (error) {
      Alert.alert('Error', 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAttachment = async (url: string) => {
    Alert.alert('Remove Attachment', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => { setAttachments(prev => prev.filter(a => a !== url)); deleteImage(url).catch(console.error); } },
    ]);
  };

  const handleSave = async () => {
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter description');
      return;
    }

    const resolvedPaymentMode = paymentMode === 'Custom' ? customPaymentMode.trim() : paymentMode.trim();
    const entryData: BookEntry = {
      id: entry?.id || Date.now().toString(),
      bookId: book.id,
      businessId: book.businessId,
      userId: entry?.userId || 'unknown',
      type,
      amount: parseFloat(amount || '0') || 0,
      date,
      description: description.trim(),
      paymentMode: resolvedPaymentMode,
      category: category.trim(),
      partyId,
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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={[
                styles.modalContent,
                {
                  backgroundColor: colors.surface,
                  borderRadius: 24,
                  borderColor: colors.border,
                  borderWidth: 1,
                  maxHeight: '80%',
                  width: width > 500 ? 450 : '90%',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 20 },
                  shadowOpacity: 0.3,
                  shadowRadius: 30,
                  elevation: 20,
                }
              ]}>
                <View style={[styles.modalHeader, { borderBottomColor: colors.border, paddingVertical: 12, paddingHorizontal: 16 }]}>
                  <View style={styles.headerLeft}>
                    <View style={[styles.headerIcon, { backgroundColor: type === 'cash_in' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', width: 32, height: 32, borderRadius: 10 }]}>
                      {type === 'cash_in' ? (
                        <TrendingUp size={18} color="#10b981" />
                      ) : (
                        <TrendingDown size={18} color="#ef4444" />
                      )}
                    </View>
                    <View>
                      <Text style={[styles.modalTitle, { fontSize: 16, fontFamily: getFontFamily(currentBusiness?.selectedFont), color: colors.text }]}>{isEditing ? 'Edit Transaction' : 'New Transaction'}</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={[styles.closeButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', width: 28, height: 28, borderRadius: 8 }]} onPress={onClose}>
                    <X size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.form} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  <View style={{ marginBottom: 16, paddingHorizontal: 4 }}>
                    <View style={[styles.pillSelector, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', padding: 4, borderRadius: 12, flexDirection: 'row', flex: 1 }]}>
                      <TouchableOpacity
                        style={[styles.pillOption, type === 'cash_in' && { backgroundColor: '#10b981', borderRadius: 8 }, { flex: 1, paddingVertical: 8, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }]}
                        onPress={() => { setType('cash_in'); setPartyId(undefined); }}
                      >
                        <TrendingUp size={14} color={type === 'cash_in' ? '#fff' : colors.textSecondary} />
                        <Text style={{ fontSize: 13, fontWeight: '700', color: type === 'cash_in' ? '#fff' : colors.textSecondary }}>MONEY IN</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.pillOption, type === 'cash_out' && { backgroundColor: '#ef4444', borderRadius: 8 }, { flex: 1, paddingVertical: 8, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }]}
                        onPress={() => { setType('cash_out'); setPartyId(undefined); }}
                      >
                        <TrendingDown size={14} color={type === 'cash_out' ? '#fff' : colors.textSecondary} />
                        <Text style={{ fontSize: 13, fontWeight: '700', color: type === 'cash_out' ? '#fff' : colors.textSecondary }}>MONEY OUT</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Amount Section */}
                  <View style={[styles.amountContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(241, 245, 249, 0.3)', marginBottom: 20, paddingVertical: 12, borderRadius: 16, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={[styles.currencyPrefix, { color: type === 'cash_in' ? '#10b981' : '#ef4444', fontSize: 24, fontWeight: '600' }]}>
                        {getCurrencySymbol(currentBusiness?.currency)}
                      </Text>
                      <TextInput
                        style={[styles.amountInput, { color: type === 'cash_in' ? '#10b981' : '#ef4444', fontSize: 32, fontWeight: '800', minWidth: 100 }]}
                        value={amount}
                        onChangeText={setAmount}
                        placeholder="0.00"
                        placeholderTextColor={isDark ? 'rgba(255,255,255,0.1)' : "#e2e8f0"}
                        keyboardType="numeric"
                        autoFocus={!isEditing}
                      />
                    </View>
                  </View>

                  {/* Description */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Description</Text>
                    <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                      <AlignLeft size={20} color={colors.textSecondary} style={styles.inputIcon} />
                      <TextInput
                        style={[styles.textInput, { color: colors.text }]}
                        value={description}
                        onChangeText={setDescription}
                        placeholder="What is this for?"
                        placeholderTextColor={colors.textSecondary}
                      />
                    </View>
                  </View>

                  {/* Party Selector */}
                  <View style={[styles.inputGroup, { zIndex: 1000 }]}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>{type === 'cash_in' ? 'Customer' : 'Vendor'}</Text>
                    <TouchableOpacity style={[styles.dropdownButton, { backgroundColor: colors.inputBackground, borderColor: colors.border }]} onPress={() => setShowPartyDropdown(!showPartyDropdown)}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        {selectedParty ? (
                          <>
                            <View style={[styles.partyIcon, { backgroundColor: selectedParty.type === 'customer' ? (isDark ? 'rgba(16, 185, 129, 0.2)' : '#f0fdf4') : (isDark ? 'rgba(5, 150, 105, 0.2)' : '#f0fdf4') }]}>
                              {selectedParty.type === 'customer' ? <User size={18} color={colors.primary} /> : <Building2 size={18} color="#059669" />}
                            </View>
                            <Text style={[styles.dropdownButtonText, { color: colors.text }]}>{selectedParty.name}</Text>
                          </>
                        ) : (
                          <>
                            <User size={20} color={colors.textSecondary} />
                            <Text style={[styles.dropdownButtonPlaceholder, { color: colors.textSecondary }]}>Select {type === 'cash_in' ? 'Customer' : 'Vendor'}</Text>
                          </>
                        )}
                      </View>
                      <ChevronDown size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                    {showPartyDropdown && (
                      <View style={[styles.dropdownList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        {filteredParties.length === 0 ? (
                          <View style={styles.dropdownEmpty}><Text style={[styles.dropdownEmptyText, { color: colors.textSecondary }]}>No {type === 'cash_in' ? 'customers' : 'vendors'} found</Text></View>
                        ) : (
                          filteredParties.map(party => (
                            <TouchableOpacity
                              key={party.id}
                              style={[styles.dropdownItem, partyId === party.id && [styles.dropdownItemSelected, { backgroundColor: colors.card }]]}
                              onPress={() => { setPartyId(party.id); setShowPartyDropdown(false); }}
                            >
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                <View style={[styles.partyIconSmall, { backgroundColor: party.type === 'customer' ? (isDark ? 'rgba(16, 185, 129, 0.2)' : '#f0fdf4') : (isDark ? 'rgba(5, 150, 105, 0.2)' : '#f0fdf4') }]}>
                                  {party.type === 'customer' ? <User size={14} color={colors.primary} /> : <Building2 size={14} color="#059669" />}
                                </View>
                                <Text style={[styles.dropdownItemText, { color: colors.text }, partyId === party.id && styles.dropdownItemTextSelected]}>{party.name}</Text>
                              </View>
                              {partyId === party.id && <View style={[styles.checkDot, { backgroundColor: colors.primary }]} />}
                            </TouchableOpacity>
                          ))
                        )}
                        {partyId && (
                          <TouchableOpacity style={[styles.dropdownItem, { borderTopWidth: 1, borderTopColor: colors.border }]} onPress={() => { setPartyId(undefined); setShowPartyDropdown(false); }}>
                            <Text style={{ color: '#ef4444', fontSize: 14, fontWeight: '500' }}>Clear Selection</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>

                  {/* Date */}
                  <View style={styles.inputGroup}>
                    <View style={styles.inputLabelRow}>
                      <Text style={[styles.inputLabel, { color: colors.text }]}>Date</Text>
                      <View style={styles.autoDateToggle}>
                        <Text style={[styles.autoDateText, { color: colors.textSecondary }]}>Today</Text>
                        <Switch
                          value={autoDate}
                          onValueChange={(v) => { setAutoDate(v); if (v) setDate(getTodayLocal()); }}
                          trackColor={{ false: colors.border, true: '#34d399' }}
                          thumbColor={autoDate ? colors.primary : colors.card}
                          ios_backgroundColor={colors.border}
                          style={{ transform: [{ scaleX: 0.75 }, { scaleY: 0.75 }] }}
                        />
                      </View>
                    </View>
                    <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }, autoDate && styles.inputDisabled]}>
                      <Calendar size={20} color={colors.textSecondary} style={styles.inputIcon} />
                      <TextInput
                        style={[styles.textInput, { color: colors.text }, autoDate && { color: colors.textSecondary }]}
                        value={date}
                        onChangeText={setDate}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={colors.textSecondary}
                        editable={!autoDate}
                      />
                    </View>
                  </View>

                  {/* Category */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Category</Text>
                    <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                      <Tag size={20} color={colors.textSecondary} style={styles.inputIcon} />
                      <TextInput
                        style={[styles.textInput, { color: colors.text }]}
                        value={category}
                        onChangeText={setCategory}
                        placeholder="e.g. Rent, Food, Salary"
                        placeholderTextColor={colors.textSecondary}
                      />
                    </View>
                  </View>

                  {/* Payment Mode */}
                  <View style={[styles.inputGroup, { marginBottom: 8 }]}>
                    <Text style={[styles.inputLabel, { color: colors.text, fontSize: 11 }]}>Payment Method</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.paymentScroll, { gap: 6 }]}>
                      {paymentOptions.map(option => (
                        <TouchableOpacity
                          key={option}
                          style={[
                            styles.paymentChip,
                            { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc', borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14 },
                            paymentMode === option && { backgroundColor: type === 'cash_in' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', borderColor: type === 'cash_in' ? '#10b981' : '#ef4444' }
                          ]}
                          onPress={() => setPaymentMode(option)}
                        >
                          <Text style={[styles.paymentChipText, { fontSize: 11, color: colors.textSecondary }, paymentMode === option && { color: type === 'cash_in' ? '#10b981' : '#ef4444', fontWeight: '700' }]}>{option}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    {paymentMode === 'Custom' && (
                      <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border, marginTop: 8, height: 40 }]}>
                        <CreditCard size={16} color={colors.textSecondary} style={styles.inputIcon} />
                        <TextInput
                          style={[styles.textInput, { color: colors.text, fontSize: 13 }]}
                          value={customPaymentMode}
                          onChangeText={setCustomPaymentMode}
                          placeholder="Enter custom method"
                          placeholderTextColor={colors.textSecondary}
                        />
                      </View>
                    )}
                  </View>

                  <View style={{ height: 20 }} />
                </ScrollView>

                {/* Footer */}
                <View style={[styles.footer, { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 16 }]}>
                  <TouchableOpacity
                    style={[styles.saveButtonWrapper, { borderRadius: 14 }]}
                    onPress={handleSave}
                    disabled={isSubmitting}
                    activeOpacity={0.9}
                  >
                    <LinearGradient
                      colors={type === 'cash_in' ? ['#10b981', '#059669'] : ['#ef4444', '#dc2626']}
                      style={[styles.saveButton, { paddingVertical: 14, borderRadius: 14 }, isSubmitting && styles.buttonDisabled]}
                    >
                      {isSubmitting ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <>
                          <Send size={18} color="#fff" />
                          <Text style={[styles.saveButtonText, { fontSize: 15 }]}>{isEditing ? 'Update Transaction' : 'Record Transaction'}</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    width: '90%',
    maxWidth: 400,
    alignSelf: 'center',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 1,
  },
  modalTitle: {
    fontFamily: 'AbrilFatface_400Regular',
    fontSize: 18,
    color: '#0f172a',
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  pillSelector: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 14,
  },
  pillOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
    marginLeft: 4,
  },
  inputLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  autoDateToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  autoDateText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    paddingVertical: 10,
    backgroundColor: 'rgba(241, 245, 249, 0.5)',
    borderRadius: 14,
  },
  currencyPrefix: {
    fontSize: 26,
    fontWeight: '700',
    marginRight: 4,
  },
  amountInput: {
    fontSize: 38,
    fontWeight: '800',
    minWidth: 90,
    textAlign: 'center',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  inputDisabled: {
    opacity: 0.6,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#0f172a',
    height: '100%',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dropdownButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0f172a',
  },
  dropdownButtonPlaceholder: {
    fontSize: 14,
    color: '#94a3b8',
  },
  partyIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    marginTop: 6,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
    maxHeight: 220,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  dropdownItemSelected: {
    backgroundColor: '#f8fafc',
  },
  dropdownItemText: {
    fontSize: 15,
    color: '#0f172a',
  },
  dropdownItemTextSelected: {
    color: '#10b981',
    fontWeight: '600',
  },
  partyIconSmall: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10b981',
  },
  dropdownEmpty: {
    padding: 20,
    alignItems: 'center',
  },
  dropdownEmptyText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  paymentScroll: {
    gap: 8,
    paddingRight: 16,
  },
  paymentChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  paymentChipActive: {
    backgroundColor: '#f0fdf4',
    borderColor: '#10b981',
    borderWidth: 2,
  },
  paymentChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
  },
  paymentChipTextActive: {
    color: '#10b981',
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 4,
  },
  saveButtonWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
