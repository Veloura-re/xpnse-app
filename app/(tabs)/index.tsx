import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  LayoutAnimation,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { formatCurrency } from '@/utils/currency-utils';

import { router } from 'expo-router';
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Edit3,
  Search,
  SlidersHorizontal,
  X,
  Check,
  BookOpen,
  ChevronDown,
  FileText,
  Bell,
} from 'lucide-react-native';
import { useBusiness } from '@/providers/business-provider';
import { Book } from '@/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookEditModal } from '@/components/book-edit-modal';
import { useFirebase } from '@/providers/firebase-provider';
import { VirtualGuideModal } from '@/components/virtual-guide-modal';
import { useStorage } from '@/providers/storage-provider';
import { db } from '@/config/firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { debounce } from '@/utils/debounce';
import { getFontFamily } from '@/config/font-config';
import { useTheme } from '@/providers/theme-provider';
import { BUSINESS_ICONS, LOGO_OPTIONS } from '@/constants/logos';
import { Building2 } from 'lucide-react-native';

type SortOption =
  | 'name-asc' | 'name-desc'
  | 'balance-asc' | 'balance-desc'
  | 'cashin-asc' | 'cashin-desc'
  | 'cashout-asc' | 'cashout-desc'
  | 'date-asc' | 'date-desc'
  | 'activity-desc'
  | 'today' | 'week' | 'month' | 'year' | 'all';

interface SortConfig {
  label: string;
  value: SortOption;
  group: 'Sort By' | 'Time Filter';
}

const SORT_OPTIONS: SortConfig[] = [
  { label: 'Recently Active', value: 'activity-desc', group: 'Sort By' },
  { label: 'Newest First', value: 'date-desc', group: 'Sort By' },
  { label: 'Oldest First', value: 'date-asc', group: 'Sort By' },
  { label: 'Name (A-Z)', value: 'name-asc', group: 'Sort By' },
  { label: 'Balance (High-Low)', value: 'balance-desc', group: 'Sort By' },
  { label: 'All Time', value: 'all', group: 'Time Filter' },
  { label: 'This Year', value: 'year', group: 'Time Filter' },
  { label: 'This Month', value: 'month', group: 'Time Filter' },
  { label: 'This Week', value: 'week', group: 'Time Filter' },
  { label: 'Today', value: 'today', group: 'Time Filter' },
];

// Memoized Book Card Component
const BookCard = React.memo(({ item, userRole, currency, onEdit, onPress }: { item: Book; userRole: string | null; currency: string; onEdit: (book: Book) => void; onPress: () => void }) => {
  const { colors, theme, isDark } = useTheme();
  const { currentBusiness } = useBusiness();

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <TouchableOpacity
        style={styles.cardContent}
        onPress={() => {
          onPress();
          router.push(`/book/${item.id}`);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: theme === 'dark' ? '#333' : '#f0fdf4' }]}>
            <BookOpen size={20} color={colors.primary} />
          </View>
          <View style={styles.cardHeaderText}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.bookName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
              <Text style={[styles.statValue, item.netBalance >= 0 ? styles.textSuccess : styles.textDanger, { fontSize: 13, marginLeft: 'auto', marginRight: 8 }]}>
                {formatCurrency(Math.abs(item.netBalance), currentBusiness?.currency)}
              </Text>
              {(userRole === 'owner' || userRole === 'partner') && (
                <TouchableOpacity
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  onPress={(e) => {
                    e.stopPropagation();
                    onEdit(item);
                  }}
                >
                  <Edit3 size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
              <Text style={[styles.bookDate, { color: colors.textSecondary }]}>
                {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TrendingUp size={12} color="#10b981" style={{ marginRight: 2 }} />
                  <Text style={[styles.miniStatValue, { color: colors.textSecondary }]}>{formatCurrency(item.totalCashIn || 0, currentBusiness?.currency)}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TrendingDown size={12} color="#ef4444" style={{ marginRight: 2 }} />
                  <Text style={[styles.miniStatValue, { color: colors.textSecondary }]}>{formatCurrency(item.totalCashOut || 0, currentBusiness?.currency)}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
});

export default function BooksScreen() {
  const { currentBusiness, businesses, getUserRole, createBook, updateBook, deleteBook, createBusiness, isLoading, touchBook } = useBusiness();
  const { deviceFont, colors, theme } = useTheme();
  const userRole = getUserRole();
  const insets = useSafeAreaInsets();
  const { user: fbUser, resendVerificationEmail } = useFirebase();
  const storage = useStorage();

  // State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [selectedSort, setSelectedSort] = useState<SortOption>('date-desc');

  // Business Creation State
  const [createBusinessModalVisible, setCreateBusinessModalVisible] = useState(false);
  const [newBusinessName, setNewBusinessName] = useState('');

  // Guide & Verification State
  const [virtualGuideVisible, setVirtualGuideVisible] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState<string>('');
  const [dismissVerifyBanner, setDismissVerifyBanner] = useState<boolean>(false);
  const [showGuideAfterBusinessCreation, setShowGuideAfterBusinessCreation] = useState(false);

  const [localBooks, setLocalBooks] = useState<Book[]>([]);

  // Load books when screen is active
  useEffect(() => {
    if (!currentBusiness || !db) {
      setLocalBooks([]);
      return;
    }

    const booksQuery = query(collection(db, 'businesses', currentBusiness.id, 'books'));
    const unsubscribe = onSnapshot(booksQuery, (snapshot) => {
      const booksList: Book[] = [];
      snapshot.forEach((doc) => {
        booksList.push({ id: doc.id, ...doc.data() } as Book);
      });
      setLocalBooks(booksList);
    }, (error) => {
      console.error("Error fetching books:", error);
    });

    return () => unsubscribe();
  }, [currentBusiness?.id]);

  // Debounced search handler
  const debouncedSearch = useMemo(
    () => debounce((text: string) => setSearchQuery(text), 300),
    []
  );

  const handleSearch = useCallback((text: string) => {
    setInputValue(text);
    debouncedSearch(text);
  }, [debouncedSearch]);

  // Virtual guide logic
  useEffect(() => {
    const checkFirstTime = async () => {
      if (isLoading || businesses.length === 0) return;
      const hasSeenGuide = await storage.getItem('has_seen_guide_v1');
      if (!hasSeenGuide) {
        setTimeout(() => setVirtualGuideVisible(true), 100);
      }
    };
    checkFirstTime();
  }, [storage, businesses.length, isLoading]);

  useEffect(() => {
    const checkAfterBusinessCreation = async () => {
      if (showGuideAfterBusinessCreation && businesses.length > 0 && !isLoading) {
        const hasSeenGuide = await storage.getItem('has_seen_guide_v1');
        if (!hasSeenGuide) {
          setTimeout(() => {
            setVirtualGuideVisible(true);
            setShowGuideAfterBusinessCreation(false);
          }, 100);
        }
      }
    };
    checkAfterBusinessCreation();
  }, [showGuideAfterBusinessCreation, businesses.length, isLoading, storage]);

  const handleCloseVirtualGuide = async () => {
    setVirtualGuideVisible(false);
    await storage.setItem('has_seen_guide_v1', 'true');
  };

  const isWithinTimeRange = useCallback((dateString: string, range: 'today' | 'week' | 'month' | 'year' | 'all') => {
    if (range === 'all') return true;
    const bookDate = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    switch (range) {
      case 'today': return bookDate >= today;
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return bookDate >= weekAgo;
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return bookDate >= monthAgo;
      case 'year':
        const yearAgo = new Date(today);
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        return bookDate >= yearAgo;
      default: return true;
    }
  }, []);

  const recentlyActiveBooks = useMemo(() => {
    return [...localBooks]
      .filter(b => b.lastActiveAt)
      .sort((a, b) => new Date(b.lastActiveAt!).getTime() - new Date(a.lastActiveAt!).getTime())
      .slice(0, 4);
  }, [localBooks]);

  const filteredAndSortedBooks = useMemo(() => {
    let result = [...localBooks];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(book => book.name.toLowerCase().includes(q));
    }
    if (['today', 'week', 'month', 'year', 'all'].includes(selectedSort)) {
      result = result.filter(book => isWithinTimeRange(book.createdAt, selectedSort as any));
    }
    result.sort((a, b) => {
      switch (selectedSort) {
        case 'activity-desc': return new Date(b.lastActiveAt || 0).getTime() - new Date(a.lastActiveAt || 0).getTime();
        case 'name-asc': return a.name.localeCompare(b.name);
        case 'name-desc': return b.name.localeCompare(a.name);
        case 'balance-asc': return a.netBalance - b.netBalance;
        case 'balance-desc': return b.netBalance - a.netBalance;
        case 'cashin-desc': return b.totalCashIn - a.totalCashIn;
        case 'cashout-desc': return b.totalCashOut - a.totalCashOut;
        case 'date-asc': return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'date-desc':
        default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
    return result;
  }, [localBooks, searchQuery, selectedSort, isWithinTimeRange]);

  const handleEditBook = useCallback((book: Book) => {
    setSelectedBook(book);
    setEditModalVisible(true);
  }, []);

  const handleSaveBook = useCallback((bookId: string | null, data: any) => {
    if (bookId) {
      updateBook(bookId, data);
    } else {
      createBook(data.name, data.settings);
    }
    setEditModalVisible(false);
    setSelectedBook(null);
  }, [updateBook, createBook]);

  const handleDeleteBook = useCallback((bookId: string) => {
    deleteBook(bookId);
    setEditModalVisible(false);
    setSelectedBook(null);
  }, [deleteBook]);

  const renderBookCard = useCallback(({ item }: { item: Book }) => (
    <BookCard item={item} userRole={userRole} currency={currentBusiness?.currency || 'USD'} onEdit={handleEditBook} onPress={() => touchBook(item.id)} />
  ), [userRole, currentBusiness?.currency, handleEditBook, touchBook]);

  if (!currentBusiness && !isLoading) {
    return (

      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <View style={[styles.circle1, { backgroundColor: theme === 'dark' ? 'rgba(33, 201, 141, 0.05)' : 'rgba(16, 185, 129, 0.1)' }]} />
        <View style={[styles.circle2, { backgroundColor: theme === 'dark' ? 'rgba(33, 201, 141, 0.03)' : 'rgba(16, 185, 129, 0.08)' }]} />
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconBg, { backgroundColor: theme === 'dark' ? '#333' : '#f0fdf4' }]}>
            <BookOpen size={48} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {businesses.length === 0 ? 'Welcome to Vaulta' : 'No Business Selected'}
          </Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {businesses.length === 0
              ? 'Start by creating your first business to track your finances.'
              : 'Please select a business to view your books.'}
          </Text>
          {businesses.length === 0 && (
            <TouchableOpacity
              style={styles.primaryButtonWrapper}
              onPress={() => {
                setNewBusinessName('');
                setCreateBusinessModalVisible(true);
              }}
              activeOpacity={0.9}
            >
              <LinearGradient colors={['#10b981', '#059669']} style={styles.primaryButton}>
                <Plus size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.primaryButtonText}>Create Business</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        {/* Create Business Modal */}
        <Modal
          visible={createBusinessModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setCreateBusinessModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 20}
            style={styles.modalOverlay}
          >
            <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setCreateBusinessModalVisible(false)} />
            <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Create Business</Text>
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>Give your business a name to get started.</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                placeholder="Business Name"
                placeholderTextColor={colors.textSecondary}
                value={newBusinessName}
                onChangeText={setNewBusinessName}
                autoFocus
              />
              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalCancel, { backgroundColor: colors.card }]} onPress={() => setCreateBusinessModalVisible(false)}>
                  <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalConfirmWrapper}
                  disabled={!newBusinessName.trim()}
                  onPress={async () => {
                    if (newBusinessName.trim()) {
                      const isFirstBusiness = businesses.length === 0;
                      await createBusiness(newBusinessName.trim());
                      setCreateBusinessModalVisible(false);
                      setNewBusinessName('');
                      if (isFirstBusiness) setShowGuideAfterBusinessCreation(true);
                    }
                  }}
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={['#10b981', '#059669']}
                    style={[styles.modalConfirm, !newBusinessName.trim() && styles.disabledButton]}
                  >
                    <Text style={styles.modalConfirmText}>Create</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <View style={[styles.circle1, { backgroundColor: theme === 'dark' ? 'rgba(33, 201, 141, 0.05)' : 'rgba(16, 185, 129, 0.1)' }]} />
      <View style={[styles.circle2, { backgroundColor: theme === 'dark' ? 'rgba(33, 201, 141, 0.03)' : 'rgba(16, 185, 129, 0.08)' }]} />

      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerTopRow}>
          <Text style={[styles.appName, { color: colors.primary }]}>Dashboard</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              style={[styles.notificationButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => router.push('/notes')}
              activeOpacity={0.7}
            >
              <FileText size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.notificationButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => router.push('/notifications')}
              activeOpacity={0.7}
            >
              <Bell size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={[styles.headerTitle, { fontFamily: getFontFamily(deviceFont), color: colors.text }]}>Books</Text>
        {currentBusiness && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {!isSearchExpanded ? (
              <>
                <TouchableOpacity
                  style={[styles.businessSwitcher, { backgroundColor: colors.surface, borderColor: colors.border, flex: 1 }]}
                  onPress={() => router.push('/business-switcher')}
                  activeOpacity={0.7}
                >
                  {(() => {
                    // Safely resolve the business icon
                    const iconKey = currentBusiness.icon || 'store';
                    const BusinessIcon = BUSINESS_ICONS[iconKey] || Building2;
                    // Ensure we have a valid color with fallback
                    const businessColor = currentBusiness.color || colors.primary;
                    const bgColor = businessColor + (theme === 'dark' ? '20' : '15');
                    return (
                      <View style={[styles.businessIcon, { backgroundColor: bgColor }]}>
                        <BusinessIcon size={16} color={businessColor} />
                      </View>
                    );
                  })()}
                  <ChevronDown size={16} color={colors.textSecondary} />
                  <Text style={[styles.businessName, { color: colors.text }]} numberOfLines={1}>{currentBusiness.name}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.headerIconButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setIsSearchExpanded(true);
                  }}
                >
                  <Search size={20} color={colors.textSecondary} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.headerIconButton, { backgroundColor: colors.surface, borderColor: colors.border }, selectedSort !== 'date-desc' && [styles.filterButtonActive, { backgroundColor: theme === 'dark' ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5', borderColor: '#10b981' }]]}
                  onPress={() => setSortModalVisible(true)}
                >
                  <SlidersHorizontal size={20} color={selectedSort !== 'date-desc' ? '#10b981' : colors.textSecondary} />
                </TouchableOpacity>
              </>
            ) : (
              <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border, flex: 1, height: 44, borderRadius: 12 }]}>
                <Search size={20} color={colors.textSecondary} />
                <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder="Search books..."
                  value={inputValue}
                  onChangeText={handleSearch}
                  placeholderTextColor={colors.textSecondary}
                  autoFocus
                  onBlur={() => {
                    if (!inputValue) {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setIsSearchExpanded(false);
                    }
                  }}
                />
                <TouchableOpacity onPress={() => {
                  handleSearch('');
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setIsSearchExpanded(false);
                  Keyboard.dismiss();
                }}>
                  <X size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )
        }
      </View >

      <View style={{ flex: 1 }}>
        {/* Search & Filter */}
        {/* Expanded Search Bar - Moved to Header */}

        {/* Verification Banner */}
        {fbUser && fbUser.email && fbUser.emailVerified === false && !dismissVerifyBanner && (
          <View style={styles.banner}>
            <Text style={styles.bannerTitle}>Verify your email</Text>
            <Text style={styles.bannerText}>Check {fbUser.email} for a link.</Text>
            <View style={styles.bannerActions}>
              <TouchableOpacity onPress={async () => {
                const { error } = await resendVerificationEmail();
                setVerificationMessage(error ? 'Error sending' : 'Sent!');
              }}>
                <Text style={styles.bannerLink}>{verificationMessage || 'Resend'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setDismissVerifyBanner(true)}>
                <X size={16} color="#4b5563" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Content */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading books...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredAndSortedBooks}
            renderItem={renderBookCard}
            keyExtractor={item => item.id}
            ListHeaderComponent={
              recentlyActiveBooks.length >= 2 ? (
                <View style={styles.recentlyActiveSection}>
                  <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>RECENTLY ACTIVE</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.recentlyActiveList}
                  >
                    {recentlyActiveBooks.map((item) => {
                      if (!currentBusiness) return null;
                      // Safely resolve the business icon
                      const iconKey = currentBusiness.icon || 'store';
                      const BusinessIcon = BUSINESS_ICONS[iconKey] || Building2;
                      // Ensure we have a valid color with fallback
                      const businessColor = currentBusiness.color || colors.primary;
                      const bgColor = businessColor + (theme === 'dark' ? '20' : '15');

                      return (
                        <TouchableOpacity
                          key={item.id}
                          style={[styles.recentBookItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                          onPress={() => {
                            touchBook(item.id);
                            router.push(`/book/${item.id}`);
                          }}
                        >
                          <View style={[styles.recentBookIcon, { backgroundColor: bgColor }]}>
                            <BusinessIcon size={20} color={businessColor} />
                          </View>
                          <Text style={[styles.recentBookName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                          <Text style={[styles.recentBookBalance, { color: colors.textSecondary }]}>
                            {formatCurrency(item.netBalance, currentBusiness?.currency)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                  <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: 16 }]}>ALL BOOKS</Text>
                </View>
              ) : null
            }
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyList}>
                <View style={styles.emptyListIcon}>
                  <BookOpen size={40} color={colors.textSecondary} />
                </View>
                <Text style={[styles.emptyListTitle, { color: colors.text }]}>No books found</Text>
                <Text style={[styles.emptyListText, { color: colors.textSecondary }]}>
                  {searchQuery ? `No results for "${searchQuery}"` : 'Create a book to start tracking.'}
                </Text>
              </View>
            }
          />
        )}
      </View>

      {/* FAB Add Button */}
      {
        (userRole === 'owner' || userRole === 'partner') && (
          <TouchableOpacity
            style={styles.fab}
            onPress={() => {
              setSelectedBook(null);
              setEditModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <LinearGradient colors={['#10b981', '#059669']} style={styles.fabGradient} />
            <Plus size={24} color="#fff" style={{ zIndex: 1 }} />
          </TouchableOpacity>
        )
      }

      {/* Sort & Filter Modal */}
      <Modal visible={sortModalVisible} transparent animationType="fade" onRequestClose={() => setSortModalVisible(false)}>
        <TouchableOpacity style={styles.sortModalOverlay} activeOpacity={1} onPress={() => setSortModalVisible(false)}>
          <View style={[styles.bottomSheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.bottomSheetHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.bottomSheetTitle, { fontFamily: getFontFamily(deviceFont), color: colors.text }]}>Sort & Filter</Text>
              <TouchableOpacity style={[styles.closeButton, { backgroundColor: colors.card }]} onPress={() => setSortModalVisible(false)}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.bottomSheetContent}>
              {['Sort By', 'Time Filter'].map((group) => (
                <View key={group} style={styles.sortSection}>
                  <Text style={[styles.sortSectionTitle, { color: colors.textSecondary }]}>{group}</Text>
                  <View style={styles.sortGrid}>
                    {SORT_OPTIONS.filter(opt => opt.group === group).map(option => {
                      const isActive = selectedSort === option.value;
                      return (
                        <TouchableOpacity
                          key={option.value}
                          style={[styles.sortOption, { backgroundColor: colors.card, borderColor: colors.border }, isActive && [styles.sortOptionActive, { backgroundColor: theme === 'dark' ? 'rgba(33, 201, 141, 0.1)' : '#eff6ff', borderColor: colors.primary }]]}
                          onPress={() => {
                            setSelectedSort(option.value);
                            setSortModalVisible(false);
                          }}
                        >
                          {isActive && <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />}
                          <Text style={[styles.sortOptionText, { color: colors.textSecondary }, isActive && [styles.sortOptionTextActive, { color: colors.text }]]}>
                            {option.label}
                          </Text>
                          {isActive && <Check size={16} color={colors.primary} style={{ marginLeft: 'auto' }} />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      <BookEditModal
        visible={editModalVisible}
        book={selectedBook}
        onClose={() => {
          setEditModalVisible(false);
          setSelectedBook(null);
        }}
        onSave={handleSaveBook}
        onDelete={handleDeleteBook}
      />

      <VirtualGuideModal visible={virtualGuideVisible} onClose={handleCloseVirtualGuide} />

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  circle1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  circle2: {
    position: 'absolute',
    bottom: -100,
    left: -50,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  headerContainer: {
    paddingHorizontal: 24,
    paddingTop: 20,
    marginBottom: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  appName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10b981',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  headerTitle: {
    fontFamily: 'AbrilFatface_400Regular',
    fontSize: 36,
    color: '#0f172a',
    marginBottom: 12,
  },
  businessSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    height: 44,
  },
  headerIconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  businessIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  businessInitial: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  businessName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
    maxWidth: 180,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 1,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#0f172a',
  },
  filterButton: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
  },
  filterButtonActive: {
    borderWidth: 1, // Ensure border width is maintained or overridden if needed. Though borderWidth: 1 is already in filterButton.
    // borderColor will be set dynamically
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  card: {
    borderRadius: 12,
    marginBottom: 12, // Increased margin to prevent overlap
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardContent: {
    padding: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  cardHeaderText: {
    flex: 1,
  },
  bookName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
    marginRight: 8,
  },
  bookDate: {
    fontSize: 12,
    color: '#64748b',
  },
  editButton: {
    padding: 8,
    borderRadius: 10,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 6,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    color: '#64748b',
    marginBottom: 0,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  textSuccess: { color: '#10b981' },
  textDanger: { color: '#ef4444' },
  statRow: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 6,
  },
  miniStat: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  miniStatValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyIconBg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  primaryButtonWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 16,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 17,
  },
  emptyList: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyListIcon: {
    marginBottom: 20,
    opacity: 0.5,
  },
  emptyListTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  emptyListText: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 100,
  },
  fabGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 30,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  sortModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  bottomSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 30,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  bottomSheetLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10b981',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  bottomSheetTitle: {
    fontFamily: 'AbrilFatface_400Regular',
    fontSize: 32,
    color: '#0f172a',
  },
  bottomSheetContent: {
    padding: 20,
  },
  closeButton: {
    padding: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
  },
  sortSection: {
    marginBottom: 24,
  },
  sortSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sortGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    minWidth: '48%',
    flex: 1,
  },
  sortOptionActive: {
    borderColor: '#10b981',
    borderWidth: 2,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    marginRight: 10,
  },
  sortOptionText: {
    fontSize: 15,
    color: '#64748b',
  },
  sortOptionTextActive: {
    color: '#10b981',
    fontWeight: '600',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 24,
    lineHeight: 24,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    color: '#0f172a',
    marginBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancel: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#475569',
    fontWeight: '600',
    fontSize: 16,
  },
  modalConfirmWrapper: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  modalConfirm: {
    padding: 16,
    alignItems: 'center',
  },
  modalConfirmText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.5,
  },
  banner: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#991b1b',
    marginBottom: 4,
  },
  bannerText: {
    fontSize: 14,
    color: '#b91c1c',
    marginBottom: 12,
  },
  bannerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc2626',
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  menuCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    // Reduced shadow for cleaner look and to prevent overlap
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2, // Reduced from 3
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  menuCardSubtitle: {
    fontSize: 13,
    color: '#64748b',
  },
  recentlyActiveSection: {
    marginBottom: 20,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 0,
    textTransform: 'uppercase',
  },
  recentlyActiveList: {
    paddingBottom: 4,
    gap: 12,
  },
  recentBookItem: {
    width: 140,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 4,
  },
  recentBookIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  recentBookName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  recentBookBalance: {
    fontSize: 12,
    fontWeight: '500',
  },
});
