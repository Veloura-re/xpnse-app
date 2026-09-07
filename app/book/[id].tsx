import React, { useMemo, useState, useEffect, useLayoutEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Modal,
  TouchableWithoutFeedback,
  TouchableOpacity,
  Alert,
  Dimensions,
  StatusBar,
  TextInput,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import Animated, { FadeInUp, ZoomIn, ZoomOut } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassBackdrop } from '@/components/ui/glass-backdrop';
import * as Haptics from 'expo-haptics';

import { useLocalSearchParams, router, useNavigation } from 'expo-router';
import {
  Paperclip,
  Image as ImageIcon,
  Camera,
  X as XClose,
  Plus,
  Minus,
  Edit3,
  Trash2,
  TrendingUp,
  TrendingDown,
  Copy,
  CopyPlus,
  FileDown,
  Download,
  MoreVertical,
  SlidersHorizontal,
  ArrowLeft,
  X,
  Calendar,
  Search,
  Check,
  ChevronDown,
  CheckSquare,
  Square,
  ArrowRightLeft,
  ArrowRight,
  Repeat,
  Globe,
  Sun,
  Moon,
  Bell,
  FileText,
} from 'lucide-react-native';
import { formatCurrency } from '@/utils/currency-utils';
import { useBusiness } from '@/providers/business-provider';
import { BookEntry } from '@/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EntryEditModal } from '@/components/entry-edit-modal';
import { BookEditModal } from '@/components/book-edit-modal';
import { AdvancedBookModal } from '@/components/book/advanced-book-modal';
import { CurrencyPickerModal } from '@/components/currency/currency-picker-modal';
import { CurrencyService } from '@/services/currency-service';
import { exportToExcel, exportToPDF, exportToCSV } from '@/utils/exportUtils';
import * as Crypto from 'expo-crypto';
import { BackgroundDecor } from '@/components/ui/background-decor';
import { pickImage, takePhoto, uploadImage, generateImagePath } from '@/utils/imageUpload';
import { Image } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
const uuidv4 = () => Crypto.randomUUID();
import { getFontFamily } from '@/config/font-config';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

import { usePaginatedEntries } from '@/hooks/use-paginated-entries';



import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const { 
    books, addEntry, updateEntry, deleteEntry, transferEntry, 
    sendBulkNotification, getUserRole, parties, currentBusiness, 
    updateBook, deleteBook 
  } = useBusiness();
  const { deviceFont, colors, theme, isDark, setTheme } = useTheme();
  const { user } = useAuth();
  const userRole = getUserRole();
  const insets = useSafeAreaInsets();
  const book = useMemo(() => books.find((b) => b.id === id), [books, id]);
  const bookCurrency = book?.currency || book?.settings?.currency || currentBusiness?.currency || 'USD';

  // Use paginated entries
  const {
    entries: paginatedEntries,
    loading: entriesLoading,
    hasMore,
    loadMore,
    refresh
  } = usePaginatedEntries(currentBusiness?.id || null, id, {
    pageSize: 100
  });

  // Auto-refresh entries when book currency or exchange valuations change
  useEffect(() => {
    refresh();
  }, [book?.currency, book?.settings?.currency, JSON.stringify(book?.settings?.customCurrencyValuations)]);

  // Modal and UI States
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<BookEntry | null>(null);
  const [copyModalVisible, setCopyModalVisible] = useState(false);
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [targetBookId, setTargetBookId] = useState<string | null>(null);
  const [menuEntry, setMenuEntry] = useState<BookEntry | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState(false);

  // Export Modal State
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportFileName, setExportFileName] = useState('');
  const [selectedExportFormat, setSelectedExportFormat] = useState<'csv' | 'xlsx' | 'pdf' | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [editBookModalVisible, setEditBookModalVisible] = useState(false);
  const [advancedBookModalVisible, setAdvancedBookModalVisible] = useState(false);

  // Bulk Selection States
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [bulkTransferModalVisible, setBulkTransferModalVisible] = useState(false);
  const [bulkCopyModalVisible, setBulkCopyModalVisible] = useState(false);
  const [bulkDeleteConfirmation, setBulkDeleteConfirmation] = useState(false);
  const [isBulkOperating, setIsBulkOperating] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);

  // Attachment state
  const [attachmentEntry, setAttachmentEntry] = useState<BookEntry | null>(null);
  const [attachmentModalVisible, setAttachmentModalVisible] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // Quick Net Balance Currency Conversion State
  const [netConvertCurrency, setNetConvertCurrency] = useState<string | null>(null);
  const [netCurrencyPickerVisible, setNetCurrencyPickerVisible] = useState(false);
  const [netConvertRate, setNetConvertRate] = useState<number>(1);
  const [isCalculatingRate, setIsCalculatingRate] = useState(false);

  // Calculate live/custom FX rate for Net Balance preview
  useEffect(() => {
    if (!netConvertCurrency || netConvertCurrency.toUpperCase() === bookCurrency.toUpperCase()) {
      setNetConvertRate(1);
      return;
    }

    let isMounted = true;
    const fetchConversionRate = async () => {
      setIsCalculatingRate(true);
      try {
        const fromCurr = bookCurrency.toUpperCase();
        const toCurr = netConvertCurrency.toUpperCase();

        const customVals = book?.settings?.customCurrencyValuations || {};

        if (customVals[toCurr] && Number(customVals[toCurr]) > 0) {
          if (isMounted) {
            setNetConvertRate(1 / Number(customVals[toCurr]));
            setIsCalculatingRate(false);
          }
          return;
        }

        if (toCurr === 'USD' && customVals[fromCurr] && Number(customVals[fromCurr]) > 0) {
          if (isMounted) {
            setNetConvertRate(Number(customVals[fromCurr]));
            setIsCalculatingRate(false);
          }
          return;
        }

        const rate = await CurrencyService.getExchangeRate(fromCurr, toCurr);
        if (isMounted) {
          setNetConvertRate(rate);
          setIsCalculatingRate(false);
        }
      } catch (err) {
        console.warn('Error calculating net conversion rate:', err);
        if (isMounted) {
          setNetConvertRate(1);
          setIsCalculatingRate(false);
        }
      }
    };

    fetchConversionRate();
    return () => {
      isMounted = false;
    };
  }, [netConvertCurrency, bookCurrency, JSON.stringify(book?.settings?.customCurrencyValuations)]);

  // Filters
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'year' | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'cash_in' | 'cash_out'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [newEntryInitialType, setNewEntryInitialType] = useState<'cash_in' | 'cash_out'>('cash_in');

  // Use paginatedEntries instead of filtering global entries
  const bookEntries = paginatedEntries;

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const otherBooks = useMemo(() => {
    if (!book) return [] as typeof books;
    return books.filter(b => b.id !== book.id && b.businessId === book.businessId);
  }, [books, book]);

  // Memoized party map for O(1) lookups
  const partyMap = useMemo(() => {
    const map = new Map<string, string>();
    parties.forEach(p => map.set(p.id, p.name));
    return map;
  }, [parties]);

  // Memoized user map for O(1) lookups
  const userMap = useMemo(() => {
    const map = new Map<string, string>();
    if (currentBusiness?.members) {
      currentBusiness.members.forEach(m => {
        if (m.user) {
          const name = m.user.displayName || m.user.name || m.user.email?.split('@')[0] || 'Unknown';
          map.set(m.userId, name);
        }
      });
    }
    return map;
  }, [currentBusiness]);

  // Memoized event handlers
  const handleAddEntryWithType = useCallback((type: 'cash_in' | 'cash_out') => {
    setSelectedEntry(null);
    setNewEntryInitialType(type);
    setEditModalVisible(true);
  }, []);

  const handleEditEntry = useCallback((entry: BookEntry) => {
    setSelectedEntry(entry);
    setEditModalVisible(true);
  }, []);

  const handleCopyEntry = useCallback((entry: BookEntry) => {
    setSelectedEntry(entry);
    setTargetBookId(otherBooks[0]?.id || null);
    setCopyModalVisible(true);
  }, [otherBooks]);

  const handleTransferEntry = useCallback((entry: BookEntry) => {
    setSelectedEntry(entry);
    setTargetBookId(otherBooks[0]?.id || null);
    setTransferModalVisible(true);
  }, [otherBooks]);

  const handleOpenAttachments = useCallback((entry: BookEntry) => {
    setAttachmentEntry(entry);
    setAttachmentModalVisible(true);
  }, []);

  const handleUploadAttachment = useCallback(async (source: 'gallery' | 'camera') => {
    if (!attachmentEntry || !currentBusiness) return;
    try {
      setIsUploadingAttachment(true);
      const uri = source === 'gallery' ? await pickImage() : await takePhoto();
      if (!uri) return;

      const existingAttachments = attachmentEntry.attachments || [];
      const folder = generateImagePath(currentBusiness.id, attachmentEntry.id, existingAttachments.length);
      const url = await uploadImage(uri, folder);
      if (!url) return;

      const updatedAttachments = [...existingAttachments, url];
      await updateEntry(attachmentEntry.id, { attachments: updatedAttachments });
      setAttachmentEntry(prev => prev ? { ...prev, attachments: updatedAttachments } : prev);
      refresh();
    } catch (err) {
      console.error('Attachment upload error:', err);
    } finally {
      setIsUploadingAttachment(false);
    }
  }, [attachmentEntry, currentBusiness, updateEntry, refresh]);

  const handleDeleteAttachment = useCallback(async (url: string) => {
    if (!attachmentEntry) return;
    Alert.alert('Remove Attachment', 'Remove this image from the entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          const updated = (attachmentEntry.attachments || []).filter(u => u !== url);
          await updateEntry(attachmentEntry.id, { attachments: updated });
          setAttachmentEntry(prev => prev ? { ...prev, attachments: updated } : prev);
          refresh();
        }
      }
    ]);
  }, [attachmentEntry, updateEntry, refresh]);


  const confirmTransfer = useCallback(async () => {
    if (!selectedEntry || !targetBookId) return;
    try {
      setIsTransferring(true);
      await transferEntry(selectedEntry, targetBookId);
      setTransferModalVisible(false);
      setSelectedEntry(null);
      refresh();
    } catch (error) {
      console.error("Failed to transfer entry:", error);
      Alert.alert('Error', 'Failed to transfer entry');
    } finally {
      setIsTransferring(false);
    }
  }, [selectedEntry, targetBookId, transferEntry, refresh]);

  const handleSaveEntry = useCallback(async (entryData: BookEntry) => {
    if (!book) return;

    // Calculate predicted balance
    let predictedBalance = book.netBalance;
    const newAmount = entryData.amount;

    if (selectedEntry?.id) {
      // Revert old entry effect
      const oldAmount = selectedEntry.amount;
      if (selectedEntry.type === 'cash_in') {
        predictedBalance -= oldAmount;
      } else {
        predictedBalance += oldAmount;
      }
    }

    // Apply new entry effect
    if (entryData.type === 'cash_in') {
      predictedBalance += newAmount;
    } else {
      predictedBalance -= newAmount;
    }

    const context = {
      bookName: book.name,
      currentBalance: predictedBalance
    };

    if (selectedEntry?.id) {
      await updateEntry(selectedEntry.id, entryData, context);
    } else {
      await addEntry(entryData, context);
    }

    setEditModalVisible(false);
    setSelectedEntry(null);
    refresh(); // Refresh the list to show changes

    // Show success alert with new balance
    // setTimeout(() => {
    //   Alert.alert(
    //     'Success',
    //     `Entry saved successfully.\n\nNew Balance: ${formatCurrency(predictedBalance)}`,
    //     [{ text: 'OK' }]
    //   );
    // }, 300);
  }, [selectedEntry, updateEntry, addEntry, refresh, book]);

  const handleDeleteEntry = useCallback(async (entryId: string) => {
    try {
      setIsDeleting(true);
      // Add artificial delay for better UX
      await new Promise(resolve => setTimeout(resolve, 100));
      await deleteEntry(entryId, { bookName: book?.name });
      setDeleteConfirmation(false);
      refresh(); // Refresh the list to show changes
    } catch (error) {
      console.error("Failed to delete entry:", error);
      Alert.alert("Error", "Failed to delete entry. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }, [deleteEntry, refresh, book]);

  const handleUpdateBook = useCallback(async (bookId: string | null, data: any) => {
    if (!bookId) return;
    try {
      await updateBook(bookId, data);
      setEditBookModalVisible(false);
      refresh();
    } catch (error) {
      console.error("Failed to update book:", error);
      Alert.alert("Error", "Failed to update book. Please try again.");
    }
  }, [updateBook, refresh]);

  const handleDeleteBook = useCallback(async (bookId: string) => {
    try {
      await deleteBook(bookId);
      setEditBookModalVisible(false);
      router.back(); // Go back to business home
    } catch (error) {
      console.error("Failed to delete book:", error);
      Alert.alert("Error", "Failed to delete book. Please try again.");
    }
  }, [deleteBook]);

  // Bulk Selection Handlers
  const toggleSelection = useCallback((entryId: string) => {
    setSelectedEntries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(entryId)) {
        newSet.delete(entryId);
        if (newSet.size === 0) {
          setSelectionMode(false);
        }
      } else {
        newSet.add(entryId);
      }
      return newSet;
    });
  }, []);

  const deselectAll = useCallback(() => {
    setSelectedEntries(new Set());
  }, []);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedEntries(new Set());
  }, []);

  const isWithinTimeRange = useCallback((dateString: string, range: 'today' | 'week' | 'month' | 'year' | 'all') => {
    if (range === 'all') return true;
    const entryDate = new Date(dateString);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    switch (range) {
      case 'today':
        return entryDate >= startOfToday;
      case 'week': {
        const weekAgo = new Date(startOfToday);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return entryDate >= weekAgo;
      }
      case 'month': {
        const monthAgo = new Date(startOfToday);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return entryDate >= monthAgo;
      }
      case 'year': {
        const yearAgo = new Date(startOfToday);
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        return entryDate >= yearAgo;
      }
      default:
        return true;
    }
  }, []);

  // Use book stats directly
  const totalCashIn = book?.totalCashIn || 0;
  const totalCashOut = book?.totalCashOut || 0;
  const netBalance = book?.netBalance || 0;



  // ... (filter logic remains same) ...

  // Calculate running balance for ALL loaded entries first
  // This ensures the balance is correct even when filtering
  const bookEntriesWithBalance = useMemo(() => {
    if (!book) return bookEntries;

    let currentBalance = book.netBalance;

    return bookEntries.map((entry: BookEntry) => {
      const entryWithBalance = { ...entry, displayBalance: currentBalance };

      // Calculate balance for the NEXT entry (going backwards in time)
      const amount = Number(entry.amount) || 0;
      if (entry.type === 'cash_in') {
        currentBalance -= amount;
      } else {
        currentBalance += amount;
      }

      return entryWithBalance;
    });
  }, [bookEntries, book]);

  const filteredEntries = useMemo(() => {
    let result = [...bookEntriesWithBalance];

    if (timeRange !== 'all') {
      result = result.filter(e => isWithinTimeRange(e.date, timeRange));
    }

    if (typeFilter !== 'all') {
      result = result.filter(e => e.type === typeFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(e =>
        e.description.toLowerCase().includes(query) ||
        e.amount.toString().includes(query) ||
        (e.partyId && partyMap.get(e.partyId)?.toLowerCase().includes(query))
      );
    }

    return result;
  }, [bookEntriesWithBalance, timeRange, typeFilter, searchQuery, partyMap, isWithinTimeRange]);

  // Bulk handlers that depend on filteredEntries (must be after filteredEntries definition)
  const selectAll = useCallback(() => {
    const allIds = new Set(filteredEntries.map(e => e.id));
    setSelectedEntries(allIds);
  }, [filteredEntries]);

  const handleBulkTransfer = useCallback(async () => {
    if (!targetBookId || selectedEntries.size === 0) return;

    try {
      setIsBulkOperating(true);
      const entriesToTransfer = filteredEntries.filter(e => selectedEntries.has(e.id));
      const targetBook = books.find(b => b.id === targetBookId);

      // Transfer entries to target book in parallel (silent)
      await Promise.all(entriesToTransfer.map(entry => transferEntry(entry, targetBookId, { silent: true })));

      // Send summary notification
      await sendBulkNotification({
        title: 'Transactions Moved',
        message: `${user?.displayName || user?.name || 'A user'} moved ${entriesToTransfer.length} items from "${book?.name}" to "${targetBook?.name}"`,
        type: 'info',
        metadata: {
          count: entriesToTransfer.length,
          sourceBookId: book?.id,
          targetBookId: targetBookId
        }
      });

      setBulkTransferModalVisible(false);
      exitSelectionMode();
      refresh();


    } catch (error) {
      console.error("Failed to transfer entries:", error);
      Alert.alert("Error", "Failed to transfer entries. Please try again.");
    } finally {
      setIsBulkOperating(false);
    }
  }, [targetBookId, selectedEntries, filteredEntries, transferEntry, refresh, exitSelectionMode, books, book, user, sendBulkNotification]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedEntries.size === 0) return;

    try {
      setIsBulkOperating(true);

      // Delete all selected entries (silent)
      const deletePromises = Array.from(selectedEntries).map(entryId => deleteEntry(entryId, { silent: true }));
      await Promise.all(deletePromises);

      // Send summary notification
      await sendBulkNotification({
        title: 'Transactions Deleted',
        message: `${user?.displayName || user?.name || 'A user'} deleted ${selectedEntries.size} items from "${book?.name}"`,
        type: 'warning',
        metadata: {
          count: selectedEntries.size,
          bookId: book?.id
        }
      });

      setBulkDeleteConfirmation(false);
      exitSelectionMode();
      refresh();


    } catch (error) {
      console.error("Failed to delete entries:", error);
      Alert.alert("Error", "Failed to delete entries. Please try again.");
    } finally {
      setIsBulkOperating(false);
    }
  }, [selectedEntries, deleteEntry, refresh, exitSelectionMode, book, user, sendBulkNotification]);

  const handleBulkCopy = useCallback(async () => {
    if (!targetBookId || selectedEntries.size === 0) return;

    try {
      setIsBulkOperating(true);
      const entriesToCopy = filteredEntries.filter(e => selectedEntries.has(e.id));
      const targetBook = books.find(b => b.id === targetBookId);

      // Copy entries to target book (without deleting from source) in parallel (silent)
      await Promise.all(entriesToCopy.map(entry => {
        const newEntry = {
          ...entry,
          id: uuidv4(),
          bookId: targetBookId,
          createdAt: new Date().toISOString(),
        };
        return addEntry(newEntry, { bookName: targetBook?.name, silent: true });
      }));

      // Send summary notification
      await sendBulkNotification({
        title: 'Transactions Copied',
        message: `${user?.displayName || user?.name || 'A user'} copied ${entriesToCopy.length} items to "${targetBook?.name}"`,
        type: 'success',
        metadata: {
          count: entriesToCopy.length,
          targetBookId: targetBookId
        }
      });

      setBulkCopyModalVisible(false);
      exitSelectionMode();
      refresh();


    } catch (error) {
      console.error("Failed to copy entries:", error);
      Alert.alert("Error", "Failed to copy entries. Please try again.");
    } finally {
      setIsBulkOperating(false);
    }
  }, [targetBookId, selectedEntries, filteredEntries, addEntry, refresh, exitSelectionMode, books, user, sendBulkNotification]);

  const handleBulkDuplicate = useCallback(async () => {
    if (!book || selectedEntries.size === 0) return;

    try {
      setIsBulkOperating(true);
      if (Platform.OS !== 'web') {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch (e) {}
      }
      const entriesToDuplicate = filteredEntries.filter(e => selectedEntries.has(e.id));

      await Promise.all(entriesToDuplicate.map(entry => {
        const newEntry = {
          ...entry,
          id: uuidv4(),
          bookId: book.id,
          description: entry.description ? `${entry.description} (Copy)` : 'Copy',
          createdAt: new Date().toISOString(),
        };
        return addEntry(newEntry, { bookName: book.name, silent: true });
      }));

      await sendBulkNotification({
        title: 'Transactions Duplicated',
        message: `${user?.displayName || user?.name || 'A user'} duplicated ${entriesToDuplicate.length} items in "${book.name}"`,
        type: 'success',
        metadata: {
          count: entriesToDuplicate.length,
          bookId: book.id
        }
      });

      exitSelectionMode();
      refresh();
    } catch (error) {
      console.error("Failed to duplicate entries:", error);
      Alert.alert("Error", "Failed to duplicate entries. Please try again.");
    } finally {
      setIsBulkOperating(false);
    }
  }, [book, selectedEntries, filteredEntries, addEntry, refresh, exitSelectionMode, user, sendBulkNotification]);

  const handleExport = useCallback((format: 'csv' | 'xlsx' | 'pdf') => {
    if (!book) return;

    // Only set filename if modal is not already visible (prevents overwriting user input)
    if (!exportModalVisible) {
      const dateStr = new Date().toISOString().split('T')[0];
      const cleanBusinessName = currentBusiness?.name ? currentBusiness.name.replace(/[^a-zA-Z0-9]/g, '_') : 'Business';
      const cleanBookName = book.name.replace(/[^a-zA-Z0-9]/g, '_');
      const type = format === 'pdf' ? 'report' : 'entries';
      setExportFileName(`${cleanBusinessName}_${cleanBookName}_${type}_${dateStr}`);
    }

    setExportMenuOpen(false);
    setSelectedExportFormat(format);
    setExportModalVisible(true);
  }, [book, exportModalVisible]);

  const confirmExport = async () => {
    if (!selectedExportFormat || !book) return;

    setExportModalVisible(false);

    try {
      const options = { fileName: exportFileName };

      if (selectedExportFormat === 'csv') {
        await exportToCSV(book, filteredEntries, options);
      } else if (selectedExportFormat === 'xlsx') {
        await exportToExcel(book, filteredEntries, options);
      } else {
        let rangeLabel = timeRange === 'all' ? 'All Time' : timeRange.charAt(0).toUpperCase() + timeRange.slice(1);
        if (typeFilter !== 'all') rangeLabel += ` (${typeFilter === 'cash_in' ? 'Cash In' : 'Cash Out'})`;
        await exportToPDF(book, filteredEntries, { ...options, rangeLabel });
      }
    } catch (error) {
      console.error('Export failed:', error);
      Alert.alert('Error', 'Failed to export book');
    }

    setSelectedExportFormat(null);
    setExportFileName('');
  };

  // Memoized FlatList callback
  const keyExtractor = useCallback((item: BookEntry) => item.id, []);

  const handleEndReached = useCallback(() => {
    if (hasMore && !entriesLoading) {
      loadMore();
    }
  }, [hasMore, entriesLoading, loadMore]);

  if (!book) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Book not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <BackgroundDecor />
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        {!selectionMode ? (
          <>
            <TouchableOpacity
              style={styles.headerBackButton}
              onPress={() => router.back()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <ArrowLeft size={24} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={[styles.appName, { color: colors.primary, fontFamily: 'SpaceGrotesk_700Bold' }]}>spndy</Text>
              <Text style={[styles.headerTitle, { fontFamily: 'SpaceGrotesk_700Bold', color: colors.text }]} numberOfLines={1}>{book?.name}</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={[styles.headerActionButton, { backgroundColor: colors.surfaceGlass, borderColor: colors.borderGlass, borderWidth: 1 }]}
                onPress={() => router.push('/notes')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <FileText size={18} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.headerActionButton, { backgroundColor: colors.surfaceGlass, borderColor: colors.borderGlass, borderWidth: 1 }]}
                onPress={() => setExportMenuOpen(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MoreVertical size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={styles.headerBackButton}
              onPress={exitSelectionMode}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={24} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={[styles.headerTitle, { fontFamily: getFontFamily(deviceFont), color: colors.text }]}>
                {selectedEntries.size} selected
              </Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerActionButton}
                onPress={selectedEntries.size === filteredEntries.length ? deselectAll : selectAll}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>
                  {selectedEntries.size === filteredEntries.length ? 'Deselect All' : 'Select All'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      <View style={{ flex: 1 }}>
        {/* Main Balance Card */}
        <View style={styles.balanceSection}>
          <View style={[styles.balanceCard, { backgroundColor: colors.cardGlass, borderColor: colors.borderGlass }]}>
            <View style={{ flexDirection: 'row', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>Net Balance</Text>
              
              <TouchableOpacity
                style={[
                  styles.currencyConvertButton,
                  {
                    backgroundColor: netConvertCurrency && netConvertCurrency.toUpperCase() !== bookCurrency.toUpperCase()
                      ? (isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5')
                      : (isDark ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9'),
                    borderColor: netConvertCurrency && netConvertCurrency.toUpperCase() !== bookCurrency.toUpperCase()
                      ? colors.primary
                      : (isDark ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0'),
                  }
                ]}
                onPress={() => setNetCurrencyPickerVisible(true)}
                activeOpacity={0.7}
              >
                <Globe size={11} color={netConvertCurrency && netConvertCurrency.toUpperCase() !== bookCurrency.toUpperCase() ? colors.primary : colors.textSecondary} />
                <Text style={[
                  styles.currencyConvertText,
                  {
                    color: netConvertCurrency && netConvertCurrency.toUpperCase() !== bookCurrency.toUpperCase() ? colors.primary : colors.textSecondary,
                    fontFamily: 'SpaceGrotesk_700Bold'
                  }
                ]}>
                  {netConvertCurrency && netConvertCurrency.toUpperCase() !== bookCurrency.toUpperCase() ? `${netConvertCurrency}` : 'Convert'}
                </Text>
                {netConvertCurrency && netConvertCurrency.toUpperCase() !== bookCurrency.toUpperCase() ? (
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      setNetConvertCurrency(null);
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <X size={11} color={colors.primary} />
                  </TouchableOpacity>
                ) : (
                  <ChevronDown size={11} color={colors.textSecondary} />
                )}
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              <Text style={[styles.balanceValue, { fontFamily: 'SpaceGrotesk_700Bold', fontWeight: '700', marginBottom: 0, color: netBalance >= 0 ? '#10b981' : '#ef4444' }]}>
                {formatCurrency(netBalance, bookCurrency)}
              </Text>
              {netConvertCurrency && netConvertCurrency.toUpperCase() !== bookCurrency.toUpperCase() && (
                <View style={[
                  styles.convertedNetPill,
                  {
                    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.08)',
                    borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.25)',
                  }
                ]}>
                  <Text style={[
                    styles.convertedNetText,
                    {
                      color: netBalance >= 0 ? '#10b981' : '#ef4444',
                      fontFamily: 'SpaceGrotesk_700Bold'
                    }
                  ]}>
                    ≈ {isCalculatingRate ? '...' : formatCurrency(netBalance * netConvertRate, netConvertCurrency)}
                  </Text>
                </View>
              )}
            </View>

            <View style={[styles.balanceStats, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc' }]}>
              <View style={styles.balanceStatItem}>
                <View style={[styles.miniIcon, { backgroundColor: theme === 'dark' ? 'rgba(16, 185, 129, 0.2)' : '#dcfce7' }]}>
                  <TrendingUp size={12} color="#10b981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.miniLabel, { color: colors.textSecondary }]}>Cash In</Text>
                  <Text style={[styles.miniValue, { color: '#10b981', fontFamily: 'SpaceGrotesk_700Bold' }]}>{formatCurrency(totalCashIn, bookCurrency)}</Text>
                  {netConvertCurrency && netConvertCurrency.toUpperCase() !== bookCurrency.toUpperCase() && (
                    <Text style={{ fontSize: 11, color: '#10b981', opacity: 0.85, fontFamily: 'SpaceGrotesk_700Bold', marginTop: 1 }}>
                      ≈ {isCalculatingRate ? '...' : formatCurrency(totalCashIn * netConvertRate, netConvertCurrency)}
                    </Text>
                  )}
                </View>
              </View>
              <View style={[styles.balanceStatDivider, { alignSelf: 'stretch', marginHorizontal: 6, opacity: isDark ? 0.2 : 0.6 }]} />
              <View style={styles.balanceStatItem}>
                <View style={[styles.miniIcon, { backgroundColor: theme === 'dark' ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2' }]}>
                  <TrendingDown size={12} color="#ef4444" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.miniLabel, { color: colors.textSecondary }]}>Cash Out</Text>
                  <Text style={[styles.miniValue, { color: '#ef4444', fontFamily: 'SpaceGrotesk_700Bold' }]}>{formatCurrency(totalCashOut, bookCurrency)}</Text>
                  {netConvertCurrency && netConvertCurrency.toUpperCase() !== bookCurrency.toUpperCase() && (
                    <Text style={{ fontSize: 11, color: '#ef4444', opacity: 0.85, fontFamily: 'SpaceGrotesk_700Bold', marginTop: 1 }}>
                      ≈ {isCalculatingRate ? '...' : formatCurrency(totalCashOut * netConvertRate, netConvertCurrency)}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={[styles.searchWrapper, { backgroundColor: colors.surfaceGlass, borderColor: colors.borderGlass }]}>
            <Search size={16} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search entries..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Optimized Entry List */}
        <FlatList
          data={filteredEntries}
          keyExtractor={keyExtractor}
          renderItem={({ item }: { item: BookEntry & { displayBalance?: number } }) => {
            const entryDate = new Date(item.date);
            const today = new Date();
            const isToday = entryDate.toDateString() === today.toDateString();
            const partyName = item.partyId ? partyMap.get(item.partyId) : null;

            // User attribution
            const isCurrentUser = user?.id === item.userId;
            const creatorName = isCurrentUser ? 'You' : (userMap.get(item.userId) || 'Unknown');
            const isSelected = selectedEntries.has(item.id);

            return (
              <View style={{ marginBottom: 0 }}>
              <TouchableOpacity
                style={[
                  styles.entryItem,
                  {
                    backgroundColor: isSelected
                      ? isDark
                        ? 'rgba(16, 185, 129, 0.12)'
                        : '#f0fdf4'
                      : (isDark ? colors.surface : '#FFFFFF'),
                    borderColor: isSelected 
                      ? colors.primary 
                      : (isDark ? colors.borderGlass : '#E2E8F0'),
                    borderWidth: isSelected ? 1.5 : 1,
                  },
                ]}
                onPress={() => {
                  if (selectionMode) {
                    if (Platform.OS !== 'web') {
                      try {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      } catch (e) {}
                    }
                    toggleSelection(item.id);
                  } else {
                    handleEditEntry(item);
                  }
                }}
                onLongPress={() => {
                  if (Platform.OS !== 'web') {
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    } catch (e) {}
                  }
                  if (!selectionMode) {
                    setSelectionMode(true);
                    setSelectedEntries(new Set([item.id]));
                  } else {
                    toggleSelection(item.id);
                  }
                }}
                delayLongPress={500}
                activeOpacity={0.7}
              >
                {selectionMode && (
                  <Animated.View
                    entering={ZoomIn.duration(160)}
                    exiting={ZoomOut.duration(140)}
                    style={{ marginRight: 10, justifyContent: 'center', alignItems: 'center' }}
                  >
                    <View
                      style={[
                        styles.selectionCheckCircle,
                        {
                          backgroundColor: isSelected ? colors.primary : 'transparent',
                          borderColor: isSelected ? colors.primary : colors.textSecondary,
                        },
                      ]}
                    >
                      {isSelected && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                    </View>
                  </Animated.View>
                )}
                <View style={[
                  styles.entryIcon,
                  { backgroundColor: item.type === 'cash_in' ? (isDark ? 'rgba(16, 185, 129, 0.18)' : '#dcfce7') : (isDark ? 'rgba(239, 68, 68, 0.18)' : '#fee2e2') }
                ]}>
                  {item.type === 'cash_in' ? (
                    <TrendingUp size={18} color="#10b981" />
                  ) : (
                    <TrendingDown size={18} color="#ef4444" />
                  )}
                </View>

                <View style={styles.entryContent}>
                  {/* Top Row: Description & Amount */}
                  <View style={styles.entryHeader}>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', marginRight: 10 }}>
                      <Text style={[styles.entryDescription, { color: colors.text }]} numberOfLines={1}>
                        {item.description || (item.type === 'cash_in' ? 'Cash In' : 'Cash Out')}
                      </Text>
                      {item.recurringRuleId && (
                        <View
                          style={[
                            styles.recurringBadge,
                            {
                              backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5',
                              borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)',
                            }
                          ]}
                        >
                          <Repeat size={10} color="#10b981" />
                          <Text style={styles.recurringBadgeText}>RECURRING</Text>
                        </View>
                      )}
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[
                        styles.entryAmount,
                        { color: item.type === 'cash_in' ? '#10b981' : '#ef4444', fontFamily: 'SpaceGrotesk_700Bold' }
                      ]}>
                        {item.type === 'cash_out' ? '-' : '+'}{formatCurrency(item.amount, bookCurrency)}
                      </Text>
                      {item.originalCurrency && item.originalCurrency.toUpperCase() !== bookCurrency.toUpperCase() && (() => {
                        const origAmt = item.originalAmount !== undefined ? item.originalAmount : item.amount;
                        const rate = item.exchangeRate !== undefined && item.exchangeRate > 0
                          ? item.exchangeRate
                          : (origAmt > 0 ? item.amount / origAmt : 1);
                        const formattedRate = Number(rate.toFixed(4));
                        return (
                          <Text style={{ fontSize: 11, color: colors.textSecondary, fontFamily: 'SpaceGrotesk_500Medium', marginTop: 1 }}>
                            ({formatCurrency(origAmt, item.originalCurrency)} × {formattedRate})
                          </Text>
                        );
                      })()}
                    </View>
                  </View>

                  {/* Bottom Row: Metadata & Single Running Balance Pill */}
                  <View style={styles.entryFooter}>
                    <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginRight: 8 }}>
                      <Text style={[styles.entryDate, { color: colors.textSecondary }]}>
                        {isToday ? 'Today' : entryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </Text>
                      {book?.settings?.showPaymentMode && item.paymentMode && (
                        <Text style={[styles.entryMetaText, { color: colors.textSecondary }]}>
                          {' '}• {item.paymentMode}
                        </Text>
                      )}
                      {book?.settings?.showCategory && item.category && (
                        <Text style={[styles.entryMetaText, { color: colors.textSecondary }]}>
                          {' '}• {item.category}
                        </Text>
                      )}
                      {partyName && (
                        <Text style={[styles.entryMetaText, { color: colors.textSecondary }]}>
                          {' '}• {partyName}
                        </Text>
                      )}
                      <Text style={[styles.entryMetaText, { color: colors.textSecondary }]}>
                        {' '}• {creatorName}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {item.displayBalance !== undefined && (
                        <View
                          style={[
                            styles.entryBalancePill,
                            {
                              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9',
                              borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                            }
                          ]}
                        >
                          <Text style={[styles.entryBalanceText, { color: colors.textSecondary }]}>
                            Bal {formatCurrency(item.displayBalance, bookCurrency)}
                          </Text>
                        </View>
                      )}

                      {/* Attachment pill — inside card */}
                      <TouchableOpacity
                        style={[
                          styles.attachmentPill,
                          {
                            backgroundColor: (item.attachments && item.attachments.length > 0)
                              ? (isDark ? 'rgba(16, 185, 129, 0.12)' : '#ecfdf5')
                              : (isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc'),
                            borderColor: (item.attachments && item.attachments.length > 0)
                              ? (isDark ? 'rgba(16, 185, 129, 0.3)' : '#a7f3d0')
                              : (isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'),
                          }
                        ]}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleOpenAttachments(item);
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        activeOpacity={0.7}
                      >
                        <Paperclip
                          size={11}
                          color={(item.attachments && item.attachments.length > 0) ? colors.primary : colors.textSecondary}
                        />
                        {(item.attachments && item.attachments.length > 0) && (
                          <Text style={[styles.attachmentPillText, { color: colors.primary }]}>
                            {item.attachments.length}
                          </Text>
                        )}
                      </TouchableOpacity>

                      {(userRole === 'owner' || userRole === 'partner') && (
                        <TouchableOpacity
                          style={styles.entryAction}
                          onPress={(e) => {
                            e.stopPropagation();
                            setMenuEntry(item);
                          }}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <MoreVertical size={15} color={colors.textSecondary} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              </TouchableOpacity>

            </View>
            );
          }}

          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={Platform.OS === 'android'}
          maxToRenderPerBatch={8}
          updateCellsBatchingPeriod={40}
          initialNumToRender={10}
          windowSize={5}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            entriesLoading ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ padding: 20 }} />
            ) : <View style={{ height: 80 }} /> // Spacer for FABs
          }
          refreshing={entriesLoading && bookEntries.length === 0}
          onRefresh={refresh}
          ListEmptyComponent={
            !entriesLoading ? (
              <View style={styles.emptyState}>
                <View style={[styles.emptyIconContainer, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9' }]}>
                  <FileDown size={32} color={colors.textSecondary} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No entries found</Text>
                <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
                  {searchQuery ? 'Try adjusting your search or filters' : 'Add your first entry to start tracking'}
                </Text>
              </View>
            ) : null
          }
        />
      </View>

      {/* FABs */}
      {(userRole === 'owner' || userRole === 'partner') && !selectionMode && (
        <View
          style={[styles.fabContainer, { bottom: insets.bottom + 120 }]}
        >
          {/* Add Expense Button */}
          <TouchableOpacity
            style={styles.fabWrapper}
            onPress={() => handleAddEntryWithType('cash_out')}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#ef4444', '#dc2626']}
              style={styles.fabCircle}
            >
              <Minus size={24} color="#fff" strokeWidth={3} />
            </LinearGradient>
          </TouchableOpacity>

          {/* Add Income Button */}
          <TouchableOpacity
            style={styles.fabWrapper}
            onPress={() => handleAddEntryWithType('cash_in')}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#10b981', '#059669']}
              style={styles.fabCircle}
            >
              <Plus size={24} color="#fff" strokeWidth={3} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* Redesigned Floating Bulk Action Dock */}
      {selectionMode && selectedEntries.size > 0 && (
        <Animated.View
          entering={FadeInUp.springify().damping(18)}
          style={[
            styles.bulkDockContainer,
            {
              bottom: Math.max(insets.bottom + 16, 20),
            }
          ]}
        >
          <View
            style={[
              styles.bulkDockCard,
              {
                backgroundColor: isDark ? 'rgba(20, 20, 22, 0.95)' : 'rgba(255, 255, 255, 0.96)',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
              }
            ]}
          >
            {/* Top Sheen Line */}
            <LinearGradient
              colors={isDark ? ['rgba(255,255,255,0.15)', 'transparent'] : ['rgba(255,255,255,0.8)', 'transparent']}
              style={styles.dockSheen}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />

            {/* Header Row / Selection Counter */}
            <View style={styles.dockHeaderRow}>
              <View
                style={[
                  styles.dockBadge,
                  {
                    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5',
                    borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)',
                  }
                ]}
              >
                <Text style={[styles.dockBadgeText, { color: colors.primary, fontFamily: 'SpaceGrotesk_700Bold' }]}>
                  {selectedEntries.size} {selectedEntries.size === 1 ? 'Selected' : 'Selected'}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.dockCloseBtn,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9',
                  }
                ]}
                onPress={exitSelectionMode}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
              >
                <X size={13} color={colors.textSecondary} />
                <Text style={[styles.dockCloseBtnText, { color: colors.textSecondary }]}>Deselect</Text>
              </TouchableOpacity>
            </View>

            {/* 4 Action Buttons in Responsive Grid Row */}
            <View style={styles.dockButtonsRow}>
              {/* 1. Duplicate Button */}
              <TouchableOpacity
                style={[
                  styles.dockActionButton,
                  {
                    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#ecfdf5',
                    borderColor: isDark ? 'rgba(16, 185, 129, 0.28)' : 'rgba(16, 185, 129, 0.22)',
                  }
                ]}
                onPress={handleBulkDuplicate}
                disabled={isBulkOperating}
                activeOpacity={0.75}
              >
                <View
                  style={[
                    styles.dockIconCircle,
                    { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.15)' }
                  ]}
                >
                  <CopyPlus size={18} color="#10b981" />
                </View>
                <Text
                  style={[
                    styles.dockActionLabel,
                    { color: isDark ? '#34d399' : '#059669', fontFamily: 'SpaceGrotesk_700Bold' }
                  ]}
                >
                  Duplicate
                </Text>
              </TouchableOpacity>

              {/* 2. Copy to Book Button */}
              <TouchableOpacity
                style={[
                  styles.dockActionButton,
                  {
                    backgroundColor: isDark ? 'rgba(14, 165, 233, 0.12)' : '#f0f9ff',
                    borderColor: isDark ? 'rgba(14, 165, 233, 0.28)' : 'rgba(14, 165, 233, 0.22)',
                  }
                ]}
                onPress={() => {
                  setTargetBookId(otherBooks[0]?.id || null);
                  setBulkCopyModalVisible(true);
                }}
                disabled={isBulkOperating}
                activeOpacity={0.75}
              >
                <View
                  style={[
                    styles.dockIconCircle,
                    { backgroundColor: isDark ? 'rgba(14, 165, 233, 0.2)' : 'rgba(14, 165, 233, 0.15)' }
                  ]}
                >
                  <Copy size={18} color="#0ea5e9" />
                </View>
                <Text
                  style={[
                    styles.dockActionLabel,
                    { color: isDark ? '#38bdf8' : '#0284c7', fontFamily: 'SpaceGrotesk_700Bold' }
                  ]}
                >
                  Copy
                </Text>
              </TouchableOpacity>

              {/* 3. Move / Transfer to Book Button */}
              <TouchableOpacity
                style={[
                  styles.dockActionButton,
                  {
                    backgroundColor: isDark ? 'rgba(139, 92, 246, 0.12)' : '#f5f3ff',
                    borderColor: isDark ? 'rgba(139, 92, 246, 0.28)' : 'rgba(139, 92, 246, 0.22)',
                  }
                ]}
                onPress={() => {
                  setTargetBookId(otherBooks[0]?.id || null);
                  setBulkTransferModalVisible(true);
                }}
                disabled={isBulkOperating}
                activeOpacity={0.75}
              >
                <View
                  style={[
                    styles.dockIconCircle,
                    { backgroundColor: isDark ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.15)' }
                  ]}
                >
                  <ArrowRightLeft size={18} color="#8b5cf6" />
                </View>
                <Text
                  style={[
                    styles.dockActionLabel,
                    { color: isDark ? '#a78bfa' : '#7c3aed', fontFamily: 'SpaceGrotesk_700Bold' }
                  ]}
                >
                  Move
                </Text>
              </TouchableOpacity>

              {/* 4. Delete Button */}
              <TouchableOpacity
                style={[
                  styles.dockActionButton,
                  {
                    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#fef2f2',
                    borderColor: isDark ? 'rgba(239, 68, 68, 0.28)' : 'rgba(239, 68, 68, 0.22)',
                  }
                ]}
                onPress={() => setBulkDeleteConfirmation(true)}
                disabled={isBulkOperating}
                activeOpacity={0.75}
              >
                <View
                  style={[
                    styles.dockIconCircle,
                    { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.15)' }
                  ]}
                >
                  <Trash2 size={18} color="#ef4444" />
                </View>
                <Text
                  style={[
                    styles.dockActionLabel,
                    { color: isDark ? '#f87171' : '#dc2626', fontFamily: 'SpaceGrotesk_700Bold' }
                  ]}
                >
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      )}

      {/* Modals */}
      <EntryEditModal
        visible={editModalVisible}
        entry={selectedEntry}
        book={book}
        initialType={newEntryInitialType}
        onClose={() => {
          setEditModalVisible(false);
          setSelectedEntry(null);
        }}
        onSave={handleSaveEntry}
      />

      <BookEditModal
        visible={editBookModalVisible}
        book={book}
        onClose={() => setEditBookModalVisible(false)}
        onSave={handleUpdateBook}
        onDelete={handleDeleteBook}
      />

      <AdvancedBookModal
        visible={advancedBookModalVisible}
        book={book}
        onClose={() => setAdvancedBookModalVisible(false)}
      />

      <CurrencyPickerModal
        visible={netCurrencyPickerVisible}
        onClose={() => setNetCurrencyPickerVisible(false)}
        selectedCurrency={netConvertCurrency || bookCurrency}
        onSelect={(code) => {
          setNetConvertCurrency(code);
        }}
        title="Convert Net Balance"
        subtitle="Select a currency to preview the converted net total"
      />

      {/* ── Attachment Viewer / Uploader Modal ─────────────────────── */}
      <Modal
        visible={attachmentModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAttachmentModalVisible(false)}
        statusBarTranslucent
      >
        <TouchableWithoutFeedback onPress={() => setAttachmentModalVisible(false)}>
          <View style={styles.attachModalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.attachModalSheet, { backgroundColor: isDark ? '#1a1a2e' : '#ffffff' }]}>
                {/* Handle */}
                <View style={[styles.attachSheetHandle, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : '#d1d5db' }]} />

                {/* Header */}
                <View style={styles.attachSheetHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.attachSheetTitle, { color: colors.text }]}>
                      Attachments {attachmentEntry?.attachments?.length ? `(${attachmentEntry.attachments.length})` : ''}
                    </Text>
                    <Text style={[styles.attachSheetSub, { color: colors.textSecondary }]} numberOfLines={1}>
                      {attachmentEntry?.description || 'Transaction Entry'}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setAttachmentModalVisible(false)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                    <XClose size={22} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Telegram-style media grid: Camera & Gallery tiles beside photo thumbnails */}
                <ScrollView contentContainerStyle={styles.attachGrid} showsVerticalScrollIndicator={false}>
                  {(userRole === 'owner' || userRole === 'partner') && (
                    <>
                      {/* Camera Tile (beside photos) */}
                      <TouchableOpacity
                        style={[
                          styles.attachMediaTile,
                          {
                            backgroundColor: isDark ? 'rgba(99,102,241,0.15)' : '#eef2ff',
                            borderColor: isDark ? 'rgba(99,102,241,0.3)' : '#c7d2fe',
                          }
                        ]}
                        onPress={() => handleUploadAttachment('camera')}
                        disabled={isUploadingAttachment}
                        activeOpacity={0.7}
                      >
                        <Camera size={18} color="#6366f1" />
                        <Text style={[styles.attachMediaTileText, { color: '#6366f1' }]}>Camera</Text>
                      </TouchableOpacity>

                      {/* Gallery Tile */}
                      <TouchableOpacity
                        style={[
                          styles.attachMediaTile,
                          {
                            backgroundColor: isDark ? 'rgba(16,185,129,0.15)' : '#ecfdf5',
                            borderColor: isDark ? 'rgba(16,185,129,0.3)' : '#a7f3d0',
                          }
                        ]}
                        onPress={() => handleUploadAttachment('gallery')}
                        disabled={isUploadingAttachment}
                        activeOpacity={0.7}
                      >
                        <ImageIcon size={18} color="#10b981" />
                        <Text style={[styles.attachMediaTileText, { color: '#10b981' }]}>Gallery</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {/* Photo Thumbnails */}
                  {(attachmentEntry?.attachments || []).map((url, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.attachThumbWrap}
                      activeOpacity={0.85}
                      onPress={() => setPreviewImageUrl(url)}
                    >
                      <Image source={{ uri: url }} style={styles.attachThumbLarge} resizeMode="cover" />
                      {(userRole === 'owner' || userRole === 'partner') && (
                        <TouchableOpacity
                          style={styles.attachThumbDelete}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleDeleteAttachment(url);
                          }}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <XClose size={11} color="#ffffff" />
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {isUploadingAttachment && (
                  <View style={{ paddingVertical: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={[styles.attachmentPillText, { color: colors.textSecondary, fontSize: 12 }]}>Uploading...</Text>
                  </View>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── Full-screen Image Preview Modal ──────────────────────────── */}
      <Modal
        visible={!!previewImageUrl}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImageUrl(null)}
        statusBarTranslucent
      >
        <View style={styles.imagePreviewOverlay}>
          {/* Close button – top-left */}
          <TouchableOpacity
            style={styles.imagePreviewCloseBtn}
            onPress={() => setPreviewImageUrl(null)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <XClose size={24} color="#ffffff" />
          </TouchableOpacity>

          {/* Download / Share button – top-right */}
          <TouchableOpacity
            style={styles.imagePreviewDownloadBtn}
            onPress={async () => {
              if (!previewImageUrl) return;
              try {
                const isAvailable = await Sharing.isAvailableAsync();
                // Derive a local filename from the URL
                const ext = previewImageUrl.split('?')[0].split('.').pop() || 'jpg';
                const filename = `attachment_${Date.now()}.${ext}`;
                const localUri = `${FileSystem.cacheDirectory}${filename}`;

                // Download the remote file to the local cache
                const { uri } = await FileSystem.downloadAsync(previewImageUrl, localUri);

                if (isAvailable) {
                  await Sharing.shareAsync(uri, { dialogTitle: 'Save or share attachment' });
                } else {
                  Alert.alert('Saved', `File saved to app cache:\n${uri}`);
                }
              } catch (err: any) {
                console.error('Download error', err);
                Alert.alert('Error', 'Could not download the attachment.');
              }
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Download size={24} color="#ffffff" />
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

      <Modal
        visible={exportModalVisible}

        transparent
        animationType="fade"
        onRequestClose={() => setExportModalVisible(false)}
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <GlassBackdrop isDark={isDark} onPress={() => { Keyboard.dismiss(); setExportModalVisible(false); }} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ width: '100%', alignItems: 'center', justifyContent: 'center' }}
            pointerEvents="box-none"
          >
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={[styles.createPopup, { width: Math.min(SCREEN_WIDTH - 32, 400), backgroundColor: colors.surfaceGlass, borderColor: colors.borderGlass, borderWidth: 1 }]}>
              {/* Top Sheen */}
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 20,
                  right: 20,
                  height: 1,
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.65)',
                  zIndex: 10,
                }}
              />
              <View style={[styles.popupHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.popupTitle, { fontFamily: getFontFamily(deviceFont), color: colors.text }]}>Name Your File</Text>
                <TouchableOpacity onPress={() => setExportModalVisible(false)}>
                  <X size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.popupContent}>
                <View style={styles.inputContainer}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>Filename</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                    value={exportFileName}
                    onChangeText={setExportFileName}
                    placeholder="Enter filename"
                    placeholderTextColor={colors.textSecondary}
                    autoFocus={true}
                  />
                  <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                    Extension (.{selectedExportFormat}) will be added automatically
                  </Text>
                </View>

                <View style={styles.popupFooter}>
                  <TouchableOpacity
                    style={[styles.cancelButton, { backgroundColor: colors.card }]}
                    onPress={() => setExportModalVisible(false)}
                  >
                    <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: colors.primary }]}
                    onPress={confirmExport}
                  >
                    <Text style={styles.saveButtonText}>Export</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </View>
    </Modal>

      {/* Filter Menu Modal */}
      <Modal
        visible={filterMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterMenuOpen(false)}
      >
          <View style={styles.bottomSheetOverlay}>
            <GlassBackdrop isDark={isDark} onPress={() => setFilterMenuOpen(false)} />
            <TouchableWithoutFeedback>
              <View style={[styles.bottomSheet, { backgroundColor: colors.surfaceGlass, borderColor: colors.borderGlass }]}>
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
                <View style={[styles.bottomSheetHeader, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.bottomSheetTitle, { color: colors.text }]}>Filter Entries</Text>
                  <TouchableOpacity onPress={() => setFilterMenuOpen(false)}>
                    <X size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.filterSectionTitle, { color: colors.text }]}>Time Range</Text>
                <View style={styles.filterChipContainer}>
                  {['today', 'week', 'month', 'year', 'all'].map((range) => (
                    <TouchableOpacity
                      key={range}
                      style={[styles.filterChip, { backgroundColor: colors.card, borderColor: colors.border }, timeRange === range && [styles.filterChipActive, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5', borderColor: '#10b981' }]]}
                      onPress={() => setTimeRange(range as any)}
                    >
                      <Text style={[styles.filterChipText, { color: colors.textSecondary }, timeRange === range && [styles.filterChipTextActive, { color: '#10b981' }]]}>
                        {range === 'all' ? 'All' : range.charAt(0).toUpperCase() + range.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.filterSectionTitle, { color: colors.text }]}>Entry Type</Text>
                <View style={styles.filterChipContainer}>
                  {['all', 'cash_in', 'cash_out'].map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[styles.filterChip, { backgroundColor: colors.card, borderColor: colors.border }, typeFilter === type && [styles.filterChipActive, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5', borderColor: '#10b981' }]]}
                      onPress={() => setTypeFilter(type as any)}
                    >
                      <Text style={[styles.filterChipText, { color: colors.textSecondary }, typeFilter === type && [styles.filterChipTextActive, { color: '#10b981' }]]}>
                        {type === 'all' ? 'All' : type === 'cash_in' ? 'Cash In' : 'Cash Out'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={[styles.applyButton, { backgroundColor: colors.primary }]}
                  onPress={() => setFilterMenuOpen(false)}
                >
                  <Text style={styles.applyButtonText}>Apply Filters</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
      </Modal>

      {/* Export Menu Modal */}
      <Modal
        visible={exportMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setExportMenuOpen(false)}
      >
          <View style={styles.bottomSheetOverlay}>
            <GlassBackdrop isDark={isDark} onPress={() => setExportMenuOpen(false)} />
            <TouchableWithoutFeedback>
              <View style={[styles.bottomSheet, { backgroundColor: colors.surfaceGlass, borderColor: colors.borderGlass, paddingBottom: 40 }]}>
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
                <View style={[styles.bottomSheetHeader, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.bottomSheetTitle, { color: colors.text }]}>Book Options</Text>
                  <TouchableOpacity onPress={() => setExportMenuOpen(false)}>
                    <X size={22} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {(userRole === 'owner' || userRole === 'partner') && (
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      setExportMenuOpen(false);
                      setEditBookModalVisible(true);
                    }}
                  >
                    <View style={[styles.menuIcon, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : '#dbeafe' }]}>
                      <Edit3 size={18} color="#3b82f6" />
                    </View>
                    <Text style={[styles.menuText, { color: colors.text }]}>Edit Book Details</Text>
                    <ChevronDown size={18} color={colors.textSecondary} style={{ transform: [{ rotate: '-90deg' }] }} />
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setExportMenuOpen(false);
                    setAdvancedBookModalVisible(true);
                  }}
                >
                  <View style={[styles.menuIcon, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#dcfce7' }]}>
                    <Globe size={18} color={colors.primary} />
                  </View>
                  <Text style={[styles.menuText, { color: colors.text }]}>Advanced Book (Valuations & FX)</Text>
                  <ChevronDown size={18} color={colors.textSecondary} style={{ transform: [{ rotate: '-90deg' }] }} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setExportMenuOpen(false);
                    setFilterMenuOpen(true);
                  }}
                >
                  <View style={[styles.menuIcon, { backgroundColor: isDark ? 'rgba(168, 85, 247, 0.2)' : '#f3e8ff' }]}>
                    <SlidersHorizontal size={18} color="#a855f7" />
                  </View>
                  <Text style={[styles.menuText, { color: colors.text }]}>Filters & Sorting</Text>
                  <ChevronDown size={18} color={colors.textSecondary} style={{ transform: [{ rotate: '-90deg' }] }} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem} onPress={() => handleExport('pdf')}>
                  <View style={[styles.menuIcon, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2' }]}>
                    <FileDown size={18} color="#ef4444" />
                  </View>
                  <Text style={[styles.menuText, { color: colors.text }]}>Export as PDF</Text>
                  <ChevronDown size={18} color={colors.textSecondary} style={{ transform: [{ rotate: '-90deg' }] }} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem} onPress={() => handleExport('csv')}>
                  <View style={[styles.menuIcon, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#dcfce7' }]}>
                    <FileDown size={18} color="#10b981" />
                  </View>
                  <Text style={[styles.menuText, { color: colors.text }]}>Export as CSV</Text>
                  <ChevronDown size={18} color={colors.textSecondary} style={{ transform: [{ rotate: '-90deg' }] }} />
                </TouchableOpacity>

                <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={() => handleExport('xlsx')}>
                  <View style={[styles.menuIcon, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#f0fdf4' }]}>
                    <FileDown size={18} color={colors.primary} />
                  </View>
                  <Text style={[styles.menuText, { color: colors.text }]}>Export as Excel</Text>
                  <ChevronDown size={18} color={colors.textSecondary} style={{ transform: [{ rotate: '-90deg' }] }} />
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
      </Modal>

      {/* Entry Actions Modal */}
      <Modal
        visible={!!menuEntry}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuEntry(null)}
      >
          <View style={styles.bottomSheetOverlay}>
            <GlassBackdrop isDark={isDark} onPress={() => {
              setMenuEntry(null);
              setDeleteConfirmation(false);
            }} />
            <TouchableWithoutFeedback>
              <View style={[styles.bottomSheet, { backgroundColor: colors.surfaceGlass, borderColor: colors.borderGlass }]}>
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
                {!deleteConfirmation ? (
                  <>
                    <View style={[styles.bottomSheetHeader, { borderBottomColor: colors.border }]}>
                      <Text style={[styles.bottomSheetTitle, { color: colors.text }]}>Entry Actions</Text>
                      <TouchableOpacity onPress={() => setMenuEntry(null)}>
                        <X size={24} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => {
                        if (menuEntry) {
                          handleEditEntry(menuEntry);
                          setMenuEntry(null);
                        }
                      }}
                    >
                      <View style={[styles.menuIcon, { backgroundColor: isDark ? 'rgba(71, 85, 105, 0.2)' : '#f1f5f9' }]}>
                        <Edit3 size={20} color={isDark ? colors.textSecondary : '#475569'} />
                      </View>
                      <Text style={[styles.menuText, { color: colors.text }]}>Edit Entry</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => {
                        if (menuEntry) {
                          handleCopyEntry(menuEntry);
                          setMenuEntry(null);
                        }
                      }}
                    >
                      <View style={[styles.menuIcon, { backgroundColor: isDark ? 'rgba(37, 99, 235, 0.2)' : '#eff6ff' }]}>
                        <Copy size={20} color={colors.primary} />
                      </View>
                      <Text style={[styles.menuText, { color: colors.text }]}>Copy to another book</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => {
                        if (menuEntry) {
                          handleTransferEntry(menuEntry);
                          setMenuEntry(null);
                        }
                      }}
                    >
                      <View style={[styles.menuIcon, { backgroundColor: isDark ? 'rgba(14, 165, 233, 0.2)' : '#f0f9ff' }]}>
                        <ArrowRight size={20} color="#0ea5e9" />
                      </View>
                      <Text style={[styles.menuText, { color: colors.text }]}>Transfer to another book</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.menuItem, { borderBottomWidth: 0 }]}
                      onPress={() => setDeleteConfirmation(true)}
                    >
                      <View style={[styles.menuIcon, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2' }]}>
                        <Trash2 size={20} color="#ef4444" />
                      </View>
                      <Text style={[styles.menuText, { color: '#ef4444' }]}>Delete Entry</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <View style={{ alignItems: 'center', paddingHorizontal: 20, paddingBottom: 24 }}>
                    <View style={[styles.menuIcon, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2', width: 72, height: 72, borderRadius: 36, marginBottom: 20, alignItems: 'center', justifyContent: 'center' }]}>
                      <Trash2 size={32} color="#EF4444" />
                    </View>
                    <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 8, textAlign: 'center' }}>Delete Entry?</Text>
                    <Text style={{ fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginBottom: 28, lineHeight: 24 }}>
                      Are you sure you want to delete this entry? This action cannot be undone.
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                      <TouchableOpacity
                        style={[styles.dialogButton, { backgroundColor: isDark ? '#1C1C1E' : '#F1F5F9', flex: 1, paddingVertical: 16, borderRadius: 16, alignItems: 'center' }, isDeleting && { opacity: 0.5 }]}
                        onPress={() => setDeleteConfirmation(false)}
                        disabled={isDeleting}
                      >
                        <Text style={[styles.dialogButtonText, { color: colors.text, fontSize: 16, fontWeight: '600' }]}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{ flex: 1 }}
                        onPress={async () => {
                          if (menuEntry) {
                            await handleDeleteEntry(menuEntry.id);
                            setMenuEntry(null);
                          }
                        }}
                        disabled={isDeleting}
                      >
                        <LinearGradient
                          colors={['#EF4444', '#DC2626']}
                          style={[
                            styles.dialogButton,
                            {
                              borderRadius: 16,
                              paddingVertical: 16,
                              flex: 1,
                              alignItems: 'center',
                              justifyContent: 'center'
                            },
                            isDeleting && { opacity: 0.7 }
                          ]}
                        >
                          {isDeleting ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Text style={[styles.dialogButtonText, { color: '#fff', fontSize: 16, fontWeight: '700' }]}>Delete</Text>
                          )}
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
      </Modal>

      {/* Copy Modal */}
      {/* Copy Modal */}
      <Modal
        visible={copyModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCopyModalVisible(false)}
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <GlassBackdrop isDark={isDark} onPress={() => setCopyModalVisible(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'padding'} keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 20} style={{ width: '100%', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <View
              style={[
                styles.dialogContent,
                {
                  backgroundColor: colors.surfaceGlass,
                  borderColor: colors.borderGlass,
                  borderWidth: 1,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 20 },
                  shadowOpacity: 0.3,
                  shadowRadius: 40,
                  elevation: 20,
                  width: '100%',
                  maxWidth: 380,
                  padding: 0,
                  overflow: 'hidden'
                }
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
              <View style={{ padding: 24, paddingBottom: 16, alignItems: 'center', width: '100%' }}>
                <View style={[styles.menuIcon, { backgroundColor: isDark ? 'rgba(33, 201, 141, 0.15)' : '#f0fdf4', width: 64, height: 64, borderRadius: 32, marginBottom: 20, alignItems: 'center', justifyContent: 'center' }]}>
                  <Copy size={32} color={isDark ? '#21C98D' : colors.primary} />
                </View>

                <Text style={[styles.headerTitle, { fontSize: 24, color: colors.text, textAlign: 'center', marginBottom: 8 }]}>Copy Entry</Text>
                <Text style={{ fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginBottom: 12 }}>
                  Select destination book
                </Text>
              </View>

              <ScrollView style={[styles.bookList, { paddingHorizontal: 20, maxHeight: 250 }]} showsVerticalScrollIndicator={false}>
                {otherBooks.length === 0 ? (
                  <Text style={[styles.dialogEmpty, { color: colors.textSecondary }]}>No other books available</Text>
                ) : (
                  otherBooks.map((b) => (
                    <View key={b.id}>
                      <TouchableOpacity
                        style={[
                          styles.bookOption,
                          { backgroundColor: isDark ? '#1C1C1E' : '#F8FAFC', borderColor: isDark ? '#333' : '#E2E8F0', borderWidth: 1 },
                          targetBookId === b.id && { borderColor: isDark ? '#21C98D' : colors.primary, backgroundColor: isDark ? 'rgba(33, 201, 141, 0.1)' : '#f0fdf4' }
                        ]}
                        onPress={() => setTargetBookId(b.id)}
                      >
                        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: targetBookId === b.id ? (isDark ? '#21C98D' : colors.primary) : (isDark ? '#333' : '#e2e8f0'), alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                          <Text style={{ fontSize: 16, fontWeight: '700', color: targetBookId === b.id ? '#fff' : colors.text }}>{b.name.charAt(0).toUpperCase()}</Text>
                        </View>
                        <Text style={[styles.bookOptionText, { color: colors.text, flex: 1, fontSize: 16, fontWeight: '600' }, targetBookId === b.id && { color: isDark ? '#21C98D' : '#059669' }]}>{b.name}</Text>
                        {targetBookId === b.id && <Check size={20} color={isDark ? '#21C98D' : '#059669'} />}
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </ScrollView>

              <View style={[styles.dialogActions, { padding: 20, gap: 12 }]}>
                <TouchableOpacity
                  style={[styles.dialogButton, { backgroundColor: isDark ? '#1C1C1E' : '#F1F5F9', flex: 1, paddingVertical: 16, borderRadius: 16, alignItems: 'center' }]}
                  onPress={() => setCopyModalVisible(false)}
                >
                  <Text style={[styles.dialogButtonText, { color: colors.text, fontSize: 16, fontWeight: '600' }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1 }}
                  disabled={!targetBookId}
                  onPress={async () => {
                    if (!selectedEntry || !targetBookId) return;
                    const copied = {
                      ...selectedEntry,
                      id: uuidv4(),
                      bookId: targetBookId,
                      createdAt: new Date().toISOString(),
                    };
                    await addEntry(copied);
                    setCopyModalVisible(false);
                    setSelectedEntry(null);
                    setTargetBookId(null);
                    Alert.alert('Success', 'Entry copied successfully');
                  }}
                >
                  <LinearGradient
                    colors={targetBookId ? (isDark ? ['#21C98D', '#10B981'] : ['#10b981', '#059669']) : ['#94a3b8', '#64748b']}
                    style={[
                      styles.dialogButton,
                      {
                        borderRadius: 16,
                        paddingVertical: 16,
                        flex: 1,
                        alignItems: 'center',
                        justifyContent: 'center'
                      }
                    ]}
                  >
                    <Text style={[styles.dialogButtonText, { color: '#fff', fontSize: 16, fontWeight: '700' }]}>Copy</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView >
        </View >
      </Modal >

      {/* Transfer Modal */}
      {/* Transfer Modal */}
      <Modal
        visible={transferModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTransferModalVisible(false)}
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <GlassBackdrop isDark={isDark} onPress={() => setTransferModalVisible(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'padding'} keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 20} style={{ width: '100%', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <View
              style={[
                styles.dialogContent,
                {
                  backgroundColor: colors.surfaceGlass,
                  borderColor: colors.borderGlass,
                  borderWidth: 1,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 20 },
                  shadowOpacity: 0.3,
                  shadowRadius: 40,
                  elevation: 20,
                  width: '100%',
                  maxWidth: 380,
                  padding: 0,
                  overflow: 'hidden',
                  maxHeight: '90%'
                }
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
              <View style={{ padding: 24, paddingBottom: 16, alignItems: 'center', width: '100%' }}>
                <View style={[styles.menuIcon, { backgroundColor: isDark ? 'rgba(14, 165, 233, 0.15)' : '#F0F9FF', width: 64, height: 64, borderRadius: 32, marginBottom: 20, alignItems: 'center', justifyContent: 'center' }]}>
                  <ArrowRight size={32} color="#0EA5E9" />
                </View>

                <Text style={[styles.headerTitle, { fontSize: 24, color: colors.text, textAlign: 'center', marginBottom: 8 }]}>Transfer Entry</Text>
                <Text style={{ fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginBottom: 12 }}>
                  Select destination book
                </Text>
              </View>

              <ScrollView style={[styles.bookList, { paddingHorizontal: 20, maxHeight: 300, flexShrink: 1 }]} showsVerticalScrollIndicator={true}>
                {otherBooks.length === 0 ? (
                  <Text style={[styles.dialogEmpty, { color: colors.textSecondary }]}>No other books available</Text>
                ) : (
                  otherBooks.map((b) => (
                    <View key={b.id}>
                      <TouchableOpacity
                        key={b.id}
                        style={[
                          styles.bookOption,
                          { backgroundColor: isDark ? '#1C1C1E' : '#F8FAFC', borderColor: isDark ? '#333' : '#E2E8F0', borderWidth: 1 },
                          targetBookId === b.id && { borderColor: '#0EA5E9', backgroundColor: isDark ? 'rgba(14, 165, 233, 0.1)' : '#f0f9ff' }
                        ]}
                        onPress={() => setTargetBookId(b.id)}
                        disabled={isTransferring}
                      >
                        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: targetBookId === b.id ? '#0EA5E9' : (isDark ? '#333' : '#e2e8f0'), alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                          <Text style={{ fontSize: 16, fontWeight: '700', color: targetBookId === b.id ? '#fff' : colors.text }}>{b.name.charAt(0).toUpperCase()}</Text>
                        </View>
                        <Text style={[styles.bookOptionText, { color: colors.text, flex: 1, fontSize: 16, fontWeight: '600' }, targetBookId === b.id && { color: isDark ? '#0EA5E9' : '#0284c7' }]}>{b.name}</Text>
                        {targetBookId === b.id && <Check size={20} color="#0EA5E9" />}
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </ScrollView>

              <View style={[styles.dialogActions, { padding: 20, gap: 12 }]}>
                <TouchableOpacity
                  style={[styles.dialogButton, { backgroundColor: isDark ? '#1C1C1E' : '#F1F5F9', flex: 1, paddingVertical: 16, borderRadius: 16, alignItems: 'center' }]}
                  onPress={() => setTransferModalVisible(false)}
                  disabled={isTransferring}
                >
                  <Text style={[styles.dialogButtonText, { color: colors.text, fontSize: 16, fontWeight: '600' }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1 }}
                  disabled={!targetBookId || isTransferring}
                  onPress={confirmTransfer}
                >
                  <LinearGradient
                    colors={targetBookId ? ['#0EA5E9', '#0284c7'] : ['#94a3b8', '#64748b']}
                    style={[
                      styles.dialogButton,
                      {
                        borderRadius: 16,
                        paddingVertical: 16,
                        flex: 1,
                        alignItems: 'center',
                        justifyContent: 'center'
                      }
                    ]}
                  >
                    {isTransferring ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={[styles.dialogButtonText, { color: '#fff', fontSize: 16, fontWeight: '700' }]}>Transfer</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView >
        </View >
      </Modal >

      {/* Bulk Transfer Modal */}
      {/* Bulk Transfer Modal */}
      <Modal
        visible={bulkTransferModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBulkTransferModalVisible(false)}
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <GlassBackdrop isDark={isDark} onPress={() => setBulkTransferModalVisible(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'padding'} keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 20} style={{ width: '100%', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <View
              style={[
                styles.dialogContent,
                {
                  backgroundColor: colors.surfaceGlass,
                  borderColor: colors.borderGlass,
                  borderWidth: 1,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 20 },
                  shadowOpacity: 0.3,
                  shadowRadius: 40,
                  elevation: 20,
                  width: '100%',
                  maxWidth: 380,
                  padding: 0,
                  overflow: 'hidden',
                  maxHeight: '90%'
                }
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
              <View style={{ padding: 24, paddingBottom: 16, alignItems: 'center', width: '100%' }}>
                <View style={[styles.menuIcon, { backgroundColor: isDark ? 'rgba(14, 165, 233, 0.15)' : '#F0F9FF', width: 64, height: 64, borderRadius: 32, marginBottom: 20, alignItems: 'center', justifyContent: 'center' }]}>
                  <ArrowRight size={32} color="#0EA5E9" />
                </View>

                <Text style={[styles.headerTitle, { fontSize: 24, color: colors.text, textAlign: 'center', marginBottom: 8 }]}>Bulk Transfer</Text>
                <Text style={{ fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginBottom: 12 }}>
                  Transfer {selectedEntries.size} entries to...
                </Text>
              </View>

              <ScrollView style={[styles.bookList, { paddingHorizontal: 20, maxHeight: 300, flexShrink: 1 }]} showsVerticalScrollIndicator={true}>
                {otherBooks.length === 0 ? (
                  <Text style={[styles.dialogEmpty, { color: colors.textSecondary }]}>No other books available</Text>
                ) : (
                  otherBooks.map((b) => (
                    <View key={b.id}>
                      <TouchableOpacity
                        style={[
                          styles.bookOption,
                          { backgroundColor: isDark ? '#1C1C1E' : '#F8FAFC', borderColor: isDark ? '#333' : '#E2E8F0', borderWidth: 1 },
                          targetBookId === b.id && { borderColor: '#0EA5E9', backgroundColor: isDark ? 'rgba(14, 165, 233, 0.1)' : '#f0f9ff' }
                        ]}
                        onPress={() => setTargetBookId(b.id)}
                        disabled={isBulkOperating}
                      >
                        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: targetBookId === b.id ? '#0EA5E9' : (isDark ? '#333' : '#e2e8f0'), alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                          <Text style={{ fontSize: 16, fontWeight: '700', color: targetBookId === b.id ? '#fff' : colors.text }}>{b.name.charAt(0).toUpperCase()}</Text>
                        </View>
                        <Text style={[styles.bookOptionText, { color: colors.text, flex: 1, fontSize: 16, fontWeight: '600' }, targetBookId === b.id && { color: isDark ? '#0EA5E9' : '#0284c7' }]}>{b.name}</Text>
                        {targetBookId === b.id && <Check size={20} color="#0EA5E9" />}
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </ScrollView>

              <View style={[styles.dialogActions, { padding: 20, gap: 12 }]}>
                <TouchableOpacity
                  style={[styles.dialogButton, { backgroundColor: isDark ? '#1C1C1E' : '#F1F5F9', flex: 1, paddingVertical: 16, borderRadius: 16, alignItems: 'center' }]}
                  onPress={() => setBulkTransferModalVisible(false)}
                  disabled={isBulkOperating}
                >
                  <Text style={[styles.dialogButtonText, { color: colors.text, fontSize: 16, fontWeight: '600' }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1 }}
                  disabled={!targetBookId || isBulkOperating}
                  onPress={handleBulkTransfer}
                >
                  <LinearGradient
                    colors={targetBookId ? ['#0EA5E9', '#0284c7'] : ['#94a3b8', '#64748b']}
                    style={[
                      styles.dialogButton,
                      {
                        borderRadius: 16,
                        paddingVertical: 16,
                        flex: 1,
                        alignItems: 'center',
                        justifyContent: 'center'
                      }
                    ]}
                  >
                    {isBulkOperating ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={[styles.dialogButtonText, { color: '#fff', fontSize: 16, fontWeight: '700' }]}>Transfer</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView >
        </View >
      </Modal >

      {/* Bulk Copy Modal */}
      <Modal
        visible={bulkCopyModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBulkCopyModalVisible(false)}
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <GlassBackdrop isDark={isDark} onPress={() => setBulkCopyModalVisible(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'padding'} keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 20} style={{ width: '100%', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <View
              style={[
                styles.dialogContent,
                {
                  backgroundColor: colors.surfaceGlass,
                  borderColor: colors.borderGlass,
                  borderWidth: 1,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 20 },
                  shadowOpacity: 0.3,
                  shadowRadius: 40,
                  elevation: 20,
                  width: '100%',
                  maxWidth: 380,
                  padding: 0,
                  overflow: 'hidden',
                  maxHeight: '90%'
                }
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
              <View style={{ padding: 24, paddingBottom: 16, alignItems: 'center', width: '100%' }}>
                <View style={[styles.menuIcon, { backgroundColor: isDark ? 'rgba(33, 201, 141, 0.15)' : '#f0fdf4', width: 64, height: 64, borderRadius: 32, marginBottom: 20, alignItems: 'center', justifyContent: 'center' }]}>
                  <Copy size={32} color={isDark ? '#21C98D' : colors.primary} />
                </View>

                <Text style={[styles.headerTitle, { fontSize: 24, color: colors.text, textAlign: 'center', marginBottom: 8 }]}>Bulk Copy</Text>
                <Text style={{ fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginBottom: 12 }}>
                  Copy {selectedEntries.size} entries to...
                </Text>
              </View>

              <ScrollView style={[styles.bookList, { paddingHorizontal: 20, maxHeight: 300, flexShrink: 1 }]} showsVerticalScrollIndicator={true}>
                {otherBooks.length === 0 ? (
                  <Text style={[styles.dialogEmpty, { color: colors.textSecondary }]}>No other books available</Text>
                ) : (
                  otherBooks.map((b) => (
                    <View key={b.id}>
                      <TouchableOpacity
                        style={[
                          styles.bookOption,
                          { backgroundColor: isDark ? '#1C1C1E' : '#F8FAFC', borderColor: isDark ? '#333' : '#E2E8F0', borderWidth: 1 },
                          targetBookId === b.id && { borderColor: isDark ? '#21C98D' : colors.primary, backgroundColor: isDark ? 'rgba(33, 201, 141, 0.1)' : '#f0fdf4' }
                        ]}
                        onPress={() => setTargetBookId(b.id)}
                        disabled={isBulkOperating}
                      >
                        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: targetBookId === b.id ? (isDark ? '#21C98D' : colors.primary) : (isDark ? '#333' : '#e2e8f0'), alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                          <Text style={{ fontSize: 16, fontWeight: '700', color: targetBookId === b.id ? '#fff' : colors.text }}>{b.name.charAt(0).toUpperCase()}</Text>
                        </View>
                        <Text style={[styles.bookOptionText, { color: colors.text, flex: 1, fontSize: 16, fontWeight: '600' }, targetBookId === b.id && { color: isDark ? '#21C98D' : '#059669' }]}>{b.name}</Text>
                        {targetBookId === b.id && <Check size={20} color={isDark ? '#21C98D' : '#059669'} />}
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </ScrollView>

              <View style={[styles.dialogActions, { padding: 20, gap: 12 }]}>
                <TouchableOpacity
                  style={[styles.dialogButton, { backgroundColor: isDark ? '#1C1C1E' : '#F1F5F9', flex: 1, paddingVertical: 16, borderRadius: 16, alignItems: 'center' }]}
                  onPress={() => setBulkCopyModalVisible(false)}
                  disabled={isBulkOperating}
                >
                  <Text style={[styles.dialogButtonText, { color: colors.text, fontSize: 16, fontWeight: '600' }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1 }}
                  disabled={!targetBookId || isBulkOperating}
                  onPress={handleBulkCopy}
                >
                  <LinearGradient
                    colors={targetBookId ? (isDark ? ['#21C98D', '#10B981'] : ['#10b981', '#059669']) : ['#94a3b8', '#64748b']}
                    style={[
                      styles.dialogButton,
                      {
                        borderRadius: 16,
                        paddingVertical: 16,
                        flex: 1,
                        alignItems: 'center',
                        justifyContent: 'center'
                      }
                    ]}
                  >
                    {isBulkOperating ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={[styles.dialogButtonText, { color: '#fff', fontSize: 16, fontWeight: '700' }]}>Copy</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView >
        </View >
      </Modal >

      {/* Bulk Delete Confirmation Modal */}
      <Modal
        visible={bulkDeleteConfirmation}
        transparent
        animationType="fade"
        onRequestClose={() => !isBulkOperating && setBulkDeleteConfirmation(false)}
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <GlassBackdrop isDark={isDark} onPress={() => !isBulkOperating && setBulkDeleteConfirmation(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'padding'} keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 20} style={{ width: '100%', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <View
              style={[
                styles.dialogContent,
                {
                  backgroundColor: colors.surfaceGlass,
                  borderColor: colors.borderGlass,
                  borderWidth: 1,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 20 },
                  shadowOpacity: 0.3,
                  shadowRadius: 40,
                  elevation: 20,
                  width: '100%',
                  maxWidth: 380,
                  padding: 0,
                  overflow: 'hidden'
                }
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
              <View style={{ padding: 24, alignItems: 'center' }}>
                <View style={[
                  styles.menuIcon,
                  {
                    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2',
                    width: 72,
                    height: 72,
                    borderRadius: 36,
                    marginBottom: 20,
                    alignItems: 'center',
                    justifyContent: 'center'
                  }
                ]}>
                  <Trash2 size={32} color="#EF4444" />
                </View>
                <Text style={[styles.headerTitle, { fontSize: 22, color: colors.text, marginBottom: 8, textAlign: 'center' }]}>Delete Entries?</Text>
                <Text style={{ fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginBottom: 28, paddingHorizontal: 10, lineHeight: 24 }}>
                  Are you sure you want to delete {selectedEntries.size} {selectedEntries.size === 1 ? 'entry' : 'entries'}? This cannot be undone.
                </Text>

                <View style={[styles.dialogActions, { gap: 12 }]}>
                  <TouchableOpacity
                    style={[
                      styles.dialogButton,
                      {
                        backgroundColor: isDark ? '#1C1C1E' : '#F1F5F9',
                        flex: 1,
                        paddingVertical: 16,
                        borderRadius: 16,
                        alignItems: 'center'
                      }
                    ]}
                    onPress={() => setBulkDeleteConfirmation(false)}
                    disabled={isBulkOperating}
                  >
                    <Text style={[styles.dialogButtonText, { color: colors.text, fontSize: 16, fontWeight: '600' }]}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{ flex: 1 }}
                    onPress={handleBulkDelete}
                    disabled={isBulkOperating}
                  >
                    <LinearGradient
                      colors={['#EF4444', '#DC2626']}
                      style={[
                        styles.dialogButton,
                        {
                          borderRadius: 16,
                          paddingVertical: 16,
                          flex: 1,
                          alignItems: 'center',
                          justifyContent: 'center'
                        },
                        isBulkOperating && { opacity: 0.7 }
                      ]}
                    >
                      {isBulkOperating ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={[styles.dialogButtonText, { color: '#fff', fontSize: 16, fontWeight: '700' }]}>Delete</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View >
      </Modal >


    </View >
  );
}

const styles = StyleSheet.create({
  circle1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  circle2: {
    position: 'absolute',
    bottom: -100,
    left: -50,
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: 'transparent',
  },
  appName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10b981',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  headerBackButton: {
    padding: 8,
    marginRight: 8,
    marginLeft: -8,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 22,
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748b',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerActionButton: {
    padding: 8,
    borderRadius: 8,
  },
  // Balance Section
  balanceSection: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  balanceCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2, shadowColor: '#000' },
      web: { boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.05)' },
    }),
  },
  balanceLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 0,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  currencyConvertButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  currencyConvertText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  convertedNetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  convertedNetText: {
    fontSize: 14,
    fontWeight: '700',
  },
  balanceValue: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  balanceStats: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 12,
    padding: 8,
  },
  balanceStatItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  balanceStatDivider: {
    width: 1,
    backgroundColor: '#cbd5e1',
  },
  miniIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 0,
  },
  miniValue: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Search
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: '#0f172a',
  },

  // List
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  entryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
        shadowColor: '#000',
      },
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
      },
    }),
  },
  entryIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  entryIconIn: {
    // backgroundColor applied dynamically
  },
  entryIconOut: {
    // backgroundColor applied dynamically
  },
  entryContent: {
    flex: 1,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  entryDescription: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontWeight: '700',
    flexShrink: 1,
  },
  recurringBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  recurringBadgeText: {
    fontSize: 9,
    color: '#10b981',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  entryAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  textIn: {
    color: '#10b981',
  },
  textOut: {
    color: '#ef4444',
  },
  entryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entryDate: {
    fontSize: 11,
    fontWeight: '500',
  },
  entryMetaText: {
    fontSize: 11,
    fontWeight: '500',
  },
  entryBalancePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  entryBalanceText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  entryAction: {
    padding: 3,
    marginLeft: 2,
  },
  selectionCheckCircle: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Attachment pill (inline inside card footer)
  attachmentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  attachmentPillText: {
    fontSize: 10,
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
  attachEmptySub: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_400Regular',
    textAlign: 'center',
    lineHeight: 17,
  },
  imagePreviewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.94)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreviewCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 8,
  },
  imagePreviewDownloadBtn: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 8,
  },
  imagePreviewFull: {
    width: '92%',
    height: '82%',
  },

  // Attachment bottom-sheet modal
  attachModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  attachModalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 28,
    maxHeight: '80%',
  },
  attachSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  attachSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.15)',
  },
  attachSheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  attachSheetSub: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk_400Regular',
    marginTop: 2,
  },
  attachGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 10,
    minHeight: 70,
  },
  attachMediaTile: {
    width: 64,
    height: 64,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  attachMediaTileText: {
    fontSize: 10,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontWeight: '700',
  },
  attachThumbWrap: {
    position: 'relative',
    width: 64,
    height: 64,
    borderRadius: 12,
    overflow: 'hidden',
  },
  attachThumbLarge: {
    width: 64,
    height: 64,
  },
  attachThumbDelete: {
    position: 'absolute',
    top: 3,
    right: 3,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 10,
    padding: 3,
  },
  attachUploadBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  attachUploadBtnText: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },

  // FAB
  fabContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  fabWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  fabCircle: {
    width: 60,
    height: 60,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#ef4444',
    marginBottom: 16,
  },
  backButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#0f172a',
    fontWeight: '600',
  },
  // Modals & Bottom Sheets
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '80%',
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#0f172a',
  },
  // Filters
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 12,
    marginTop: 8,
  },
  filterChipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipActive: {
    borderColor: '#10b981',
  },
  filterChipText: {
    fontSize: 14,
    color: '#64748b',
  },
  filterChipTextActive: {
    color: '#10b981',
    fontWeight: '600',
  },
  applyButton: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Custom Date
  customDateContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  dateInputWrapper: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  dateInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#0f172a',
  },
  // Dialog (Copy)
  dialogContent: {
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    alignSelf: 'center',
    marginBottom: 'auto',
    marginTop: 'auto',
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
  },
  dialogEmpty: {
    textAlign: 'center',
    color: '#64748b',
    marginVertical: 20,
  },
  bookList: {
    maxHeight: 200,
  },
  bookOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    marginBottom: 8,
  },
  bookOptionSelected: {
    // backgroundColor applied dynamically
  },
  bookOptionText: {
    fontSize: 15,
    color: '#0f172a',
  },
  bookOptionTextSelected: {
    color: '#10b981',
    fontWeight: '600',
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24,
  },
  dialogButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  dialogButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  // Redesigned Floating Bulk Action Dock
  bulkDockContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 999,
  },
  bulkDockCard: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 24,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
        shadowColor: '#000',
      },
      web: {
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.35), 0 2px 6px rgba(0, 0, 0, 0.15)',
        backdropFilter: 'blur(20px)',
      },
    }),
  },
  dockSheen: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 1.5,
  },
  dockHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  dockBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  dockBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  dockCloseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dockCloseBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dockButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  dockActionButton: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 4,
    borderRadius: 16,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  dockActionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },

  // Popup Styles (Export Modal)
  createPopup: {
    backgroundColor: '#fff',
    borderRadius: 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 8, shadowColor: '#000' },
      web: { boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)' },
    }),
  },
  popupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  popupTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  popupContent: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#0f172a',
  },
  helperText: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 8,
  },
  popupFooter: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#10b981',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
