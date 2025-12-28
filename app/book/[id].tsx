import React, { useMemo, useState, useLayoutEffect, useCallback } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, SlideInRight, SlideOutRight } from 'react-native-reanimated';
import { useLocalSearchParams, router, useNavigation } from 'expo-router';
import {
  Plus,
  Minus,
  Edit3,
  Trash2,
  TrendingUp,
  TrendingDown,
  Copy,
  FileDown,
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
} from 'lucide-react-native';
import { formatCurrency } from '@/utils/currency-utils';
import { useBusiness } from '@/providers/business-provider';
import { BookEntry } from '@/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EntryEditModal } from '@/components/entry-edit-modal';
import { BookEditModal } from '@/components/book-edit-modal';
import { exportToExcel, exportToPDF, exportToCSV } from '@/utils/exportUtils';
import { v4 as uuidv4 } from 'uuid';
import { getFontFamily } from '@/config/font-config';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

import { usePaginatedEntries } from '@/hooks/use-paginated-entries';



import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const { books, addEntry, updateEntry, deleteEntry, transferEntry, getUserRole, parties, currentBusiness, updateBook, deleteBook } = useBusiness();
  const { deviceFont, colors, theme, isDark } = useTheme();
  const { user } = useAuth();
  const userRole = getUserRole();
  const insets = useSafeAreaInsets();

  // Use paginated entries
  const {
    entries: paginatedEntries,
    loading: entriesLoading,
    hasMore,
    loadMore,
    refresh
  } = usePaginatedEntries(currentBusiness?.id || null, id);

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

  // Bulk Selection States
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [bulkTransferModalVisible, setBulkTransferModalVisible] = useState(false);
  const [bulkCopyModalVisible, setBulkCopyModalVisible] = useState(false);
  const [bulkDeleteConfirmation, setBulkDeleteConfirmation] = useState(false);
  const [isBulkOperating, setIsBulkOperating] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);

  // Filters
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'year' | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'cash_in' | 'cash_out'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [newEntryInitialType, setNewEntryInitialType] = useState<'cash_in' | 'cash_out'>('cash_in');

  const book = books.find(b => b.id === id);

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
      // No need to refresh as books are updated via context/snapshot
    } catch (error) {
      console.error("Failed to update book:", error);
      Alert.alert("Error", "Failed to update book. Please try again.");
    }
  }, [updateBook]);

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

    return bookEntries.map(entry => {
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

      // Transfer entries to target book
      for (const entry of entriesToTransfer) {
        await transferEntry(entry, targetBookId);
      }

      setBulkTransferModalVisible(false);
      exitSelectionMode();
      refresh();


    } catch (error) {
      console.error("Failed to transfer entries:", error);
      Alert.alert("Error", "Failed to transfer entries. Please try again.");
    } finally {
      setIsBulkOperating(false);
    }
  }, [targetBookId, selectedEntries, filteredEntries, addEntry, refresh, exitSelectionMode]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedEntries.size === 0) return;

    try {
      setIsBulkOperating(true);

      // Delete all selected entries
      const deletePromises = Array.from(selectedEntries).map(entryId => deleteEntry(entryId));
      await Promise.all(deletePromises);

      setBulkDeleteConfirmation(false);
      exitSelectionMode();
      refresh();


    } catch (error) {
      console.error("Failed to delete entries:", error);
      Alert.alert("Error", "Failed to delete entries. Please try again.");
    } finally {
      setIsBulkOperating(false);
    }
  }, [selectedEntries, deleteEntry, refresh, exitSelectionMode]);

  const handleBulkCopy = useCallback(async () => {
    if (!targetBookId || selectedEntries.size === 0) return;

    try {
      setIsBulkOperating(true);
      const entriesToCopy = filteredEntries.filter(e => selectedEntries.has(e.id));
      const targetBookName = books.find(b => b.id === targetBookId)?.name;

      // Copy entries to target book (without deleting from source)
      for (const entry of entriesToCopy) {
        const newEntry = {
          ...entry,
          id: uuidv4(),
          bookId: targetBookId,
          createdAt: new Date().toISOString(),
        };
        await addEntry(newEntry, { bookName: targetBookName });
      }

      setBulkCopyModalVisible(false);
      exitSelectionMode();
      refresh();


    } catch (error) {
      console.error("Failed to copy entries:", error);
      Alert.alert("Error", "Failed to copy entries. Please try again.");
    } finally {
      setIsBulkOperating(false);
    }
  }, [targetBookId, selectedEntries, filteredEntries, addEntry, refresh, exitSelectionMode, books]);

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
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />

      {/* Decorative Circles */}
      <View style={[styles.circle1, { backgroundColor: isDark ? 'rgba(33, 201, 141, 0.05)' : 'rgba(16, 185, 129, 0.1)' }]} />
      <View style={[styles.circle2, { backgroundColor: isDark ? 'rgba(33, 201, 141, 0.03)' : 'rgba(16, 185, 129, 0.08)' }]} />

      {/* Header */}
      <Animated.View entering={FadeIn.delay(100).duration(200)} style={styles.header}>
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
              <Text style={[styles.appName, { color: colors.primary }]}>Ledger</Text>
              <Text style={[styles.headerTitle, { fontFamily: getFontFamily(deviceFont), color: colors.text }]} numberOfLines={1}>{book?.name}</Text>
            </View>
            <View style={styles.headerActions}>
              {(userRole === 'owner' || userRole === 'partner') && (
                <>
                  <TouchableOpacity
                    style={[styles.headerActionButton, { backgroundColor: colors.card }]}
                    onPress={() => setSelectionMode(true)}
                  >
                    <CheckSquare size={20} color={colors.text} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.headerActionButton, { backgroundColor: colors.card }]}
                    onPress={() => setEditBookModalVisible(true)}
                  >
                    <Edit3 size={20} color={colors.text} />
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity
                style={[styles.headerActionButton, { backgroundColor: colors.card }]}
                onPress={() => setFilterMenuOpen(true)}
              >
                <SlidersHorizontal size={20} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.headerActionButton, { backgroundColor: colors.card }]}
                onPress={() => setExportMenuOpen(true)}
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
      </Animated.View>

      <Animated.View entering={FadeIn.delay(200).duration(200)} style={{ flex: 1 }}>
        {/* Main Balance Card */}
        <View style={styles.balanceSection}>
          <View style={[styles.balanceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>Net Balance</Text>
            <Text style={[styles.balanceValue, { color: netBalance >= 0 ? '#10b981' : '#ef4444' }]}>
              {formatCurrency(netBalance, currentBusiness?.currency)}
            </Text>

            <View style={[styles.balanceStats, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc' }]}>
              <View style={styles.balanceStatItem}>
                <View style={[styles.miniIcon, { backgroundColor: theme === 'dark' ? 'rgba(16, 185, 129, 0.2)' : '#dcfce7' }]}>
                  <TrendingUp size={12} color="#10b981" />
                </View>
                <View>
                  <Text style={[styles.miniLabel, { color: colors.textSecondary }]}>Cash In</Text>
                  <Text style={[styles.miniValue, { color: '#10b981' }]}>{formatCurrency(totalCashIn, currentBusiness?.currency)}</Text>
                </View>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.balanceStatItem}>
                <View style={[styles.miniIcon, { backgroundColor: theme === 'dark' ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2' }]}>
                  <TrendingDown size={12} color="#ef4444" />
                </View>
                <View>
                  <Text style={[styles.miniLabel, { color: colors.textSecondary }]}>Cash Out</Text>
                  <Text style={[styles.miniValue, { color: '#ef4444' }]}>{formatCurrency(totalCashOut, currentBusiness?.currency)}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={[styles.searchWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
              <TouchableOpacity
                style={[styles.entryItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => selectionMode ? toggleSelection(item.id) : handleEditEntry(item)}
                activeOpacity={0.7}
              >
                {selectionMode && (
                  <TouchableOpacity
                    onPress={() => toggleSelection(item.id)}
                    style={{ marginRight: 12 }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    {isSelected ? (
                      <CheckSquare size={22} color={colors.primary} />
                    ) : (
                      <Square size={22} color={colors.textSecondary} />
                    )}
                  </TouchableOpacity>
                )}
                <View style={[
                  styles.entryIcon,
                  { backgroundColor: item.type === 'cash_in' ? (isDark ? 'rgba(16, 185, 129, 0.2)' : '#dcfce7') : (isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2') }
                ]}>
                  {item.type === 'cash_in' ? (
                    <TrendingUp size={16} color="#10b981" />
                  ) : (
                    <TrendingDown size={16} color="#ef4444" />
                  )}
                </View>

                <View style={styles.entryContent}>
                  <View style={styles.entryHeader}>
                    <Text style={[styles.entryDescription, { color: colors.text }]} numberOfLines={1}>
                      {item.description || (item.type === 'cash_in' ? 'Cash In' : 'Cash Out')}
                    </Text>
                    <Text style={[
                      styles.entryAmount,
                      item.type === 'cash_in' ? styles.textIn : styles.textOut
                    ]}>
                      {item.type === 'cash_out' ? '-' : '+'}{formatCurrency(item.amount, currentBusiness?.currency)}
                    </Text>
                  </View>

                  <View style={styles.entryFooter}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.entryDate, { color: colors.textSecondary }]}>
                        {isToday ? 'Today' : entryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {book?.settings?.showPaymentMode && item.paymentMode && ` • ${item.paymentMode}`}
                        {book?.settings?.showCategory && item.category && ` • ${item.category}`}
                        {partyName && ` • ${partyName}`}
                        {` • Entered by ${creatorName}`}
                      </Text>
                      {item.displayBalance !== undefined && (
                        <Text style={[styles.entryBalance, { color: colors.textSecondary }]}>
                          Bal: {formatCurrency(item.displayBalance, currentBusiness?.currency)}
                        </Text>
                      )}
                    </View>

                    {(userRole === 'owner' || userRole === 'partner') && (
                      <TouchableOpacity
                        style={styles.entryAction}
                        onPress={(e) => {
                          e.stopPropagation();
                          setMenuEntry(item);
                        }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <MoreVertical size={14} color={colors.textSecondary} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          initialNumToRender={15}
          windowSize={10}
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
      </Animated.View>

      {/* FABs or Bulk Action Bar */}
      {(userRole === 'owner' || userRole === 'partner') && !selectionMode && (
        <View style={styles.fabContainer}>
          <TouchableOpacity
            style={styles.fabWrapper}
            onPress={() => handleAddEntryWithType('cash_out')}
            activeOpacity={0.9}
          >
            <LinearGradient colors={['#ef4444', '#dc2626']} style={styles.fabCircle}>
              <Minus size={24} color="#fff" strokeWidth={3} />
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.fabWrapper}
            onPress={() => handleAddEntryWithType('cash_in')}
            activeOpacity={0.9}
          >
            <LinearGradient colors={['#10b981', '#059669']} style={styles.fabCircle}>
              <Plus size={24} color="#fff" strokeWidth={3} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* Bulk Action Bar */}
      {selectionMode && selectedEntries.size > 0 && (
        <View style={[styles.bulkActionBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <View style={styles.bulkActionInfo}>
            <Text style={[styles.bulkActionCount, { fontFamily: getFontFamily(deviceFont), color: colors.text }]}>
              {selectedEntries.size} {selectedEntries.size === 1 ? 'entry' : 'entries'}
            </Text>
          </View>
          <View style={styles.bulkActionButtons}>
            <TouchableOpacity
              style={[styles.bulkActionButton, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => {
                setTargetBookId(otherBooks[0]?.id || null);
                setBulkTransferModalVisible(true);
              }}
            >
              <ArrowRight size={20} color="#0ea5e9" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bulkActionButton, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => {
                setTargetBookId(otherBooks[0]?.id || null);
                setBulkCopyModalVisible(true);
              }}
            >
              <Copy size={20} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bulkActionButton, styles.bulkActionButtonDanger, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2', borderColor: '#ef4444' }]}
              onPress={() => setBulkDeleteConfirmation(true)}
            >
              <Trash2 size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
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

      {/* Export Filename Modal */}
      <Modal
        visible={exportModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setExportModalVisible(false)}
        statusBarTranslucent={true}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); setExportModalVisible(false); }}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
          <View style={[styles.createPopup, { width: Math.min(SCREEN_WIDTH - 32, 400), backgroundColor: colors.surface }]}>
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
                  selectTextOnFocus
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
        </KeyboardAvoidingView>
      </Modal>

      {/* Filter Menu Modal */}
      <Modal
        visible={filterMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterMenuOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setFilterMenuOpen(false)}>
          <View style={styles.bottomSheetOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.bottomSheet, { backgroundColor: colors.surface }]}>
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
        </TouchableWithoutFeedback>
      </Modal>

      {/* Export Menu Modal */}
      <Modal
        visible={exportMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setExportMenuOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setExportMenuOpen(false)}>
          <View style={styles.bottomSheetOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.bottomSheet, { backgroundColor: colors.surface, paddingBottom: 40 }]}>
                <View style={[styles.bottomSheetHeader, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.bottomSheetTitle, { color: colors.text }]}>Export Book</Text>
                  <TouchableOpacity onPress={() => setExportMenuOpen(false)}>
                    <X size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.menuItem} onPress={() => handleExport('pdf')}>
                  <View style={[styles.menuIcon, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2' }]}>
                    <FileDown size={20} color="#ef4444" />
                  </View>
                  <Text style={[styles.menuText, { color: colors.text }]}>Export as PDF</Text>
                  <ChevronDown size={20} color={colors.textSecondary} style={{ transform: [{ rotate: '-90deg' }] }} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem} onPress={() => handleExport('csv')}>
                  <View style={[styles.menuIcon, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#dcfce7' }]}>
                    <FileDown size={20} color="#10b981" />
                  </View>
                  <Text style={[styles.menuText, { color: colors.text }]}>Export as CSV</Text>
                  <ChevronDown size={20} color={colors.textSecondary} style={{ transform: [{ rotate: '-90deg' }] }} />
                </TouchableOpacity>

                <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={() => handleExport('xlsx')}>
                  <View style={[styles.menuIcon, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#f0fdf4' }]}>
                    <FileDown size={20} color={colors.primary} />
                  </View>
                  <Text style={[styles.menuText, { color: colors.text }]}>Export as Excel</Text>
                  <ChevronDown size={20} color={colors.textSecondary} style={{ transform: [{ rotate: '-90deg' }] }} />
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Entry Actions Modal */}
      <Modal
        visible={!!menuEntry}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuEntry(null)}
      >
        <TouchableWithoutFeedback onPress={() => {
          setMenuEntry(null);
          setDeleteConfirmation(false);
        }}>
          <View style={styles.bottomSheetOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.bottomSheet, { backgroundColor: colors.surface }]}>
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
                  <View style={{ alignItems: 'center', padding: 20 }}>
                    <View style={[styles.menuIcon, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2', width: 56, height: 56, borderRadius: 28, marginBottom: 16 }]}>
                      <Trash2 size={28} color="#ef4444" />
                    </View>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 8 }}>Delete Entry?</Text>
                    <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 24 }}>
                      Are you sure you want to delete this entry? This action cannot be undone.
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                      <TouchableOpacity
                        style={[styles.applyButton, { backgroundColor: colors.card, flex: 1 }, isDeleting && { opacity: 0.5 }]}
                        onPress={() => setDeleteConfirmation(false)}
                        disabled={isDeleting}
                      >
                        <Text style={[styles.applyButtonText, { color: colors.text }]}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.applyButton, { backgroundColor: '#ef4444', flex: 1 }, isDeleting && { opacity: 0.7 }]}
                        onPress={async () => {
                          if (menuEntry) {
                            await handleDeleteEntry(menuEntry.id);
                            setMenuEntry(null);
                            // setDeleteConfirmation(false) is handled in handleDeleteEntry or finally block? 
                            // Actually handleDeleteEntry handles it.
                          }
                        }}
                        disabled={isDeleting}
                      >
                        {isDeleting ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                            <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                            <Text style={styles.applyButtonText}>Deleting...</Text>
                          </View>
                        ) : (
                          <Text style={styles.applyButtonText}>Delete</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
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
        <View
          style={[styles.modalOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)' }]}
        >
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'padding'} keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 20} style={{ width: '100%', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <Animated.View
              entering={FadeIn.duration(200)}
              style={[
                styles.dialogContent,
                {
                  backgroundColor: isDark ? '#0A0A0A' : '#ffffff',
                  borderColor: isDark ? '#2C3333' : '#e2e8f0',
                  borderWidth: 1,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 20 },
                  shadowOpacity: 0.3,
                  shadowRadius: 40,
                  elevation: 20,
                  width: '100%',
                  maxWidth: 380,
                  padding: 24
                }
              ]}
            >
              <View style={[styles.menuIcon, { backgroundColor: isDark ? 'rgba(33, 201, 141, 0.15)' : '#EFF6FF', width: 60, height: 60, borderRadius: 30, marginBottom: 20, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' }]}>
                <Copy size={30} color={isDark ? '#21C98D' : '#3B82F6'} />
              </View>

              <Text style={[styles.headerTitle, { fontSize: 24, color: colors.text, textAlign: 'center', marginBottom: 8 }]}>Copy Entry</Text>
              <Text style={{ fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginBottom: 24 }}>
                Copy this entry to...
              </Text>

              {otherBooks.length === 0 ? (
                <Text style={styles.dialogEmpty}>No other books available</Text>
              ) : (
                <View style={styles.bookList}>
                  {otherBooks.map(b => (
                    <TouchableOpacity
                      key={b.id}
                      style={[
                        styles.bookOption,
                        { backgroundColor: isDark ? '#1C1C1E' : '#F8FAFC', borderColor: isDark ? '#333' : '#E2E8F0', borderWidth: 1 },
                        targetBookId === b.id && { borderColor: colors.primary, backgroundColor: isDark ? 'rgba(33, 201, 141, 0.1)' : '#f0fdf4' }
                      ]}
                      onPress={() => setTargetBookId(b.id)}
                    >
                      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: targetBookId === b.id ? '#21C98D' : (isDark ? '#333' : '#e2e8f0'), alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: targetBookId === b.id ? '#fff' : colors.text }}>{b.name.charAt(0).toUpperCase()}</Text>
                      </View>
                      <Text style={[styles.bookOptionText, { color: colors.text, flex: 1, fontSize: 16, fontWeight: '600' }, targetBookId === b.id && { color: isDark ? '#21C98D' : '#059669' }]}>{b.name}</Text>
                      {targetBookId === b.id && <Check size={20} color="#21C98D" />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <View style={[styles.dialogActions, { marginTop: 12 }]}>
                <TouchableOpacity
                  style={[styles.dialogButton, { backgroundColor: isDark ? '#1C1C1E' : '#F1F5F9', flex: 1, paddingVertical: 16, borderRadius: 16 }]}
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
                    colors={targetBookId ? ['#21C98D', '#10B981'] : ['#94a3b8', '#64748b']}
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
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Transfer Modal */}
      {/* Transfer Modal */}
      <Modal
        visible={transferModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTransferModalVisible(false)}
        statusBarTranslucent={true}
      >
        <View
          style={[styles.modalOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)' }]}
        >
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'padding'} keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 20} style={{ width: '100%', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <Animated.View
              entering={FadeIn.duration(200)}
              style={[
                styles.dialogContent,
                {
                  backgroundColor: isDark ? '#0A0A0A' : '#ffffff',
                  borderColor: isDark ? '#2C3333' : '#e2e8f0',
                  borderWidth: 1,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 20 },
                  shadowOpacity: 0.3,
                  shadowRadius: 40,
                  elevation: 20,
                  width: '100%',
                  maxWidth: 380,
                  padding: 24
                }
              ]}
            >
              <View style={[styles.menuIcon, { backgroundColor: isDark ? 'rgba(14, 165, 233, 0.15)' : '#F0F9FF', width: 60, height: 60, borderRadius: 30, marginBottom: 20, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' }]}>
                <ArrowRight size={30} color={isDark ? '#0EA5E9' : '#0EA5E9'} />
              </View>

              <Text style={[styles.headerTitle, { fontSize: 24, color: colors.text, textAlign: 'center', marginBottom: 8 }]}>Transfer Entry</Text>
              <Text style={{ fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginBottom: 24 }}>
                Transfer this entry to...
              </Text>

              {otherBooks.length === 0 ? (
                <Text style={styles.dialogEmpty}>No other books available</Text>
              ) : (
                <View style={styles.bookList}>
                  {otherBooks.map(b => (
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
                  ))}
                </View>
              )}
              <View style={[styles.dialogActions, { marginTop: 12 }]}>
                <TouchableOpacity
                  style={[styles.dialogButton, { backgroundColor: isDark ? '#1C1C1E' : '#F1F5F9', flex: 1, paddingVertical: 16, borderRadius: 16 }]}
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
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Bulk Transfer Modal */}
      {/* Bulk Transfer Modal */}
      <Modal
        visible={bulkTransferModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBulkTransferModalVisible(false)}
        statusBarTranslucent={true}
      >
        <View
          style={[styles.modalOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)' }]}
        >
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'padding'} keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 20} style={{ width: '100%', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <Animated.View
              entering={FadeIn.duration(200)}
              style={[
                styles.dialogContent,
                {
                  backgroundColor: isDark ? '#0A0A0A' : '#ffffff',
                  borderColor: isDark ? '#2C3333' : '#e2e8f0',
                  borderWidth: 1,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 20 },
                  shadowOpacity: 0.3,
                  shadowRadius: 40,
                  elevation: 20,
                  width: '100%',
                  maxWidth: 380,
                  padding: 24
                }
              ]}
            >
              <View style={[styles.menuIcon, { backgroundColor: isDark ? 'rgba(14, 165, 233, 0.15)' : '#F0F9FF', width: 60, height: 60, borderRadius: 30, marginBottom: 20, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' }]}>
                <ArrowRight size={30} color={isDark ? '#0EA5E9' : '#0EA5E9'} />
              </View>

              <Text style={[styles.headerTitle, { fontSize: 24, color: colors.text, textAlign: 'center', marginBottom: 8 }]}>Bulk Transfer</Text>
              <Text style={{ fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginBottom: 24 }}>
                Transfer {selectedEntries.size} entries to...
              </Text>

              {otherBooks.length === 0 ? (
                <Text style={styles.dialogEmpty}>No other books available</Text>
              ) : (
                <View style={styles.bookList}>
                  {otherBooks.map(b => (
                    <TouchableOpacity
                      key={b.id}
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
                  ))}
                </View>
              )}
              <View style={[styles.dialogActions, { marginTop: 12 }]}>
                <TouchableOpacity
                  style={[styles.dialogButton, { backgroundColor: isDark ? '#1C1C1E' : '#F1F5F9', flex: 1, paddingVertical: 16, borderRadius: 16 }]}
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
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Bulk Copy Modal */}
      {/* Bulk Copy Modal */}
      <Modal
        visible={bulkCopyModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBulkCopyModalVisible(false)}
        statusBarTranslucent={true}
      >
        <View
          style={[styles.modalOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)' }]}
        >
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'padding'} keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 20} style={{ width: '100%', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <Animated.View
              entering={FadeIn.duration(200)}
              style={[
                styles.dialogContent,
                {
                  backgroundColor: isDark ? '#0A0A0A' : '#ffffff',
                  borderColor: isDark ? '#2C3333' : '#e2e8f0',
                  borderWidth: 1,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 20 },
                  shadowOpacity: 0.3,
                  shadowRadius: 40,
                  elevation: 20,
                  width: '100%',
                  maxWidth: 380,
                  padding: 24
                }
              ]}
            >
              <View style={[styles.menuIcon, { backgroundColor: isDark ? 'rgba(33, 201, 141, 0.15)' : '#f0fdf4', width: 60, height: 60, borderRadius: 30, marginBottom: 20, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' }]}>
                <Copy size={30} color={colors.primary} />
              </View>

              <Text style={[styles.headerTitle, { fontSize: 24, color: colors.text, textAlign: 'center', marginBottom: 8 }]}>Bulk Copy</Text>
              <Text style={{ fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginBottom: 24 }}>
                Copy {selectedEntries.size} entries to...
              </Text>

              {otherBooks.length === 0 ? (
                <Text style={styles.dialogEmpty}>No other books available</Text>
              ) : (
                <View style={styles.bookList}>
                  {otherBooks.map(b => (
                    <TouchableOpacity
                      key={b.id}
                      style={[
                        styles.bookOption,
                        { backgroundColor: isDark ? '#1C1C1E' : '#F8FAFC', borderColor: isDark ? '#333' : '#E2E8F0', borderWidth: 1 },
                        targetBookId === b.id && { borderColor: '#10b981', backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#f0fdf4' }
                      ]}
                      onPress={() => setTargetBookId(b.id)}
                      disabled={isBulkOperating}
                    >
                      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: targetBookId === b.id ? '#10b981' : (isDark ? '#333' : '#e2e8f0'), alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: targetBookId === b.id ? '#fff' : colors.text }}>{b.name.charAt(0).toUpperCase()}</Text>
                      </View>
                      <Text style={[styles.bookOptionText, { color: colors.text, flex: 1, fontSize: 16, fontWeight: '600' }, targetBookId === b.id && { color: isDark ? '#10b981' : '#059669' }]}>{b.name}</Text>
                      {targetBookId === b.id && <Check size={20} color="#10b981" />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <View style={[styles.dialogActions, { marginTop: 12 }]}>
                <TouchableOpacity
                  style={[styles.dialogButton, { backgroundColor: isDark ? '#1C1C1E' : '#F1F5F9', flex: 1, paddingVertical: 16, borderRadius: 16 }]}
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
                    colors={targetBookId ? ['#10b981', '#059669'] : ['#94a3b8', '#64748b']}
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
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Bulk Delete Confirmation Modal */}
      {/* Bulk Delete Confirmation Modal */}
      <Modal
        visible={bulkDeleteConfirmation}
        transparent
        animationType="fade"
        onRequestClose={() => !isBulkOperating && setBulkDeleteConfirmation(false)}
        statusBarTranslucent={true}
      >
        <View
          style={[styles.modalOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)' }]}
        >
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'padding'} keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 20} style={{ width: '100%', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <Animated.View
              entering={FadeIn.duration(200)}
              style={[
                styles.dialogContent,
                {
                  backgroundColor: isDark ? '#0A0A0A' : '#ffffff',
                  borderColor: isDark ? '#2C3333' : '#e2e8f0',
                  borderWidth: 1,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 20 },
                  shadowOpacity: 0.3,
                  shadowRadius: 40,
                  elevation: 20,
                  width: '100%',
                  maxWidth: 380
                }
              ]}
            >
              <View style={{ alignItems: 'center' }}>
                <View style={[
                  styles.menuIcon,
                  {
                    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2',
                    width: 72,
                    height: 72,
                    borderRadius: 36,
                    marginBottom: 20
                  }
                ]}>
                  <Trash2 size={32} color="#ef4444" />
                </View>
                <Text style={[styles.headerTitle, { fontSize: 22, color: colors.text, marginBottom: 8, textAlign: 'center' }]}>Delete Entries?</Text>
                <Text style={{ fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginBottom: 28, paddingHorizontal: 10, lineHeight: 24 }}>
                  Are you sure you want to delete {selectedEntries.size} {selectedEntries.size === 1 ? 'entry' : 'entries'}? This cannot be undone.
                </Text>

                <View style={styles.dialogActions}>
                  <TouchableOpacity
                    style={[
                      styles.dialogButton,
                      {
                        backgroundColor: isDark ? '#1C1C1E' : '#F1F5F9',
                        flex: 1,
                        paddingVertical: 16,
                        borderRadius: 16
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
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </Modal>


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
    fontFamily: 'AbrilFatface_400Regular',
    fontSize: 24,
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
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    justifyContent: 'center',
    gap: 10,
  },
  statDivider: {
    width: 1,
    height: 20,
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
    padding: 8,
    borderRadius: 12,
    marginBottom: 6,
    borderWidth: 1,
  },
  entryIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
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
    marginBottom: 2,
  },
  entryDescription: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
    flex: 1,
    marginRight: 8,
  },
  entryAmount: {
    fontSize: 13,
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
    fontSize: 10,
    color: '#94a3b8',
    flex: 1,
  },
  entryBalance: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 0,
  },
  entryAction: {
    padding: 4,
  },

  // FAB
  fabContainer: {
    position: 'absolute',
    bottom: 30,
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
    width: 50,
    height: 50,
    borderRadius: 12,
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
  // Bulk Action Bar
  bulkActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
        shadowColor: '#000',
      },
    }),
  },
  bulkActionInfo: {
    flex: 1,
  },
  bulkActionCount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  bulkActionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  bulkActionButton: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: 44, // Optional: fixed width for square buttons
    height: 44,
  },
  bulkActionButtonDanger: {
    // backgroundColor applied dynamically
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
