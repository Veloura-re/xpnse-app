import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  LayoutAnimation,
  Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassBackdrop } from '@/components/ui/glass-backdrop';
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
  Building2,
  Sun,
  Moon,
} from 'lucide-react-native';
import { useBusiness } from '@/providers/business-provider';
import { Book } from '@/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookEditModal } from '@/components/book-edit-modal';
import * as Haptics from 'expo-haptics';
import { useFirebase } from '@/providers/firebase-provider';
import { VirtualGuideModal } from '@/components/virtual-guide-modal';
import { useStorage } from '@/providers/storage-provider';
import { db } from '@/config/firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { debounce } from '@/utils/debounce';
import { BackgroundDecor } from '@/components/ui/background-decor';
import { getFontFamily } from '@/config/font-config';
import { useTheme } from '@/providers/theme-provider';
import { BUSINESS_ICONS } from '@/constants/logos';

type SortOption =
  | 'name-asc'
  | 'name-desc'
  | 'balance-asc'
  | 'balance-desc'
  | 'cashin-asc'
  | 'cashin-desc'
  | 'cashout-asc'
  | 'cashout-desc'
  | 'date-asc'
  | 'date-desc'
  | 'activity-desc'
  | 'today'
  | 'week'
  | 'month'
  | 'year'
  | 'all';

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
const BookCard = React.memo(
  ({
    item,
    userRole,
    currency,
    onEdit,
    onPress,
  }: {
    item: Book;
    userRole: string | null;
    currency: string;
    onEdit: (book: Book) => void;
    onPress: () => void;
  }) => {
    const { colors, isDark, deviceFont } = useTheme();
    const { currentBusiness } = useBusiness();
    const bookCurrency = item.currency || item.settings?.currency || currentBusiness?.currency || 'USD';

    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: isDark ? colors.surface : '#FFFFFF',
            borderColor: isDark ? colors.border : '#E2E8F0',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.25 : 0.04,
            shadowRadius: 8,
            elevation: isDark ? 2 : 1,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.cardContent, { padding: 14 }]}
          onPress={() => {
            onPress();
            router.push(`/book/${item.id}`);
          }}
          onLongPress={() => {
            if (userRole === 'owner' || userRole === 'partner') {
              if (Platform.OS !== 'web') {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                } catch (e) {}
              }
              onEdit(item);
            }
          }}
          delayLongPress={500}
          activeOpacity={0.7}
        >
          <View style={styles.cardHeader}>
            <View
              style={[
                styles.iconContainer,
                {
                  backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)',
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                },
              ]}
            >
              <BookOpen size={20} color={colors.primary} />
            </View>
            <View style={styles.cardHeaderText}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                  <Text
                    style={[
                      styles.bookName,
                      { color: colors.text, fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16 },
                    ]}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  <View style={[styles.bookCurrencyBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: colors.border }]}>
                    <Text style={[styles.bookCurrencyBadgeText, { color: colors.textSecondary, fontFamily: 'SpaceGrotesk_700Bold' }]}>{bookCurrency}</Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.statValue,
                    item.netBalance >= 0 ? styles.textSuccess : styles.textDanger,
                    { fontSize: 14, fontFamily: 'SpaceGrotesk_700Bold', marginLeft: 'auto', marginRight: 8 },
                  ]}
                >
                  {formatCurrency(Math.abs(item.netBalance), bookCurrency)}
                </Text>
                {(userRole === 'owner' || userRole === 'partner') && (
                  <TouchableOpacity
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    onPress={(e) => {
                      e.stopPropagation();
                      onEdit(item);
                    }}
                    style={{ padding: 4 }}
                  >
                    <Edit3 size={15} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                <Text style={[styles.bookDate, { color: colors.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular' }]}>
                  {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TrendingUp size={13} color="#10B981" style={{ marginRight: 3 }} />
                    <Text style={[styles.miniStatValue, { color: colors.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk_600SemiBold' }]}>
                      {formatCurrency(item.totalCashIn || 0, bookCurrency)}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TrendingDown size={13} color="#EF4444" style={{ marginRight: 3 }} />
                    <Text style={[styles.miniStatValue, { color: colors.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk_600SemiBold' }]}>
                      {formatCurrency(item.totalCashOut || 0, bookCurrency)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  }
);

export default function BooksScreen() {
  const { currentBusiness, businesses, getUserRole, createBook, updateBook, deleteBook, createBusiness, isLoading, touchBook } =
    useBusiness();
  const { deviceFont, colors, isDark, setTheme } = useTheme();
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
    const unsubscribe = onSnapshot(
      booksQuery,
      (snapshot) => {
        const booksList: Book[] = [];
        snapshot.forEach((doc) => {
          booksList.push({ id: doc.id, ...doc.data() } as Book);
        });
        setLocalBooks(booksList);
      },
      (error) => {
        console.error('Error fetching books:', error);
      }
    );

    return () => unsubscribe();
  }, [currentBusiness?.id]);

  // Debounced search handler
  const debouncedSearch = useMemo(
    () => debounce((text: string) => setSearchQuery(text), 300),
    []
  );

  const handleSearch = useCallback(
    (text: string) => {
      setInputValue(text);
      debouncedSearch(text);
    },
    [debouncedSearch]
  );

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

  const isWithinTimeRange = useCallback(
    (dateString: string, range: 'today' | 'week' | 'month' | 'year' | 'all') => {
      if (range === 'all') return true;
      const bookDate = new Date(dateString);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      switch (range) {
        case 'today':
          return bookDate >= today;
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
        default:
          return true;
      }
    },
    []
  );

  const filteredAndSortedBooks = useMemo(() => {
    let result = [...localBooks];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((book) => book.name.toLowerCase().includes(q));
    }
    if (['today', 'week', 'month', 'year', 'all'].includes(selectedSort)) {
      result = result.filter((book) => isWithinTimeRange(book.createdAt, selectedSort as any));
    }
    result.sort((a, b) => {
      switch (selectedSort) {
        case 'activity-desc':
          return new Date(b.lastActiveAt || 0).getTime() - new Date(a.lastActiveAt || 0).getTime();
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'balance-asc':
          return a.netBalance - b.netBalance;
        case 'balance-desc':
          return b.netBalance - a.netBalance;
        case 'cashin-desc':
          return b.totalCashIn - a.totalCashIn;
        case 'cashout-desc':
          return b.totalCashOut - a.totalCashOut;
        case 'date-asc':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'date-desc':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
    return result;
  }, [localBooks, searchQuery, selectedSort, isWithinTimeRange]);

  const handleEditBook = useCallback((book: Book) => {
    setSelectedBook(book);
    setEditModalVisible(true);
  }, []);

  const handleSaveBook = useCallback(
    (bookId: string | null, data: any) => {
      if (bookId) {
        updateBook(bookId, data);
      } else {
        createBook(data.name, data.settings);
      }
      setEditModalVisible(false);
      setSelectedBook(null);
    },
    [updateBook, createBook]
  );

  const handleDeleteBook = useCallback(
    (bookId: string) => {
      deleteBook(bookId);
      setEditModalVisible(false);
      setSelectedBook(null);
    },
    [deleteBook]
  );

  const renderBookCard = useCallback(
    ({ item }: { item: Book }) => (
      <BookCard
        item={item}
        userRole={userRole}
        currency={currentBusiness?.currency || 'USD'}
        onEdit={handleEditBook}
        onPress={() => touchBook(item.id)}
      />
    ),
    [userRole, currentBusiness?.currency, handleEditBook, touchBook]
  );

  if (!currentBusiness && !isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconBg, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)' }]}>
            <BookOpen size={48} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text, fontFamily: 'SpaceGrotesk_700Bold' }]}>
            {businesses.length === 0 ? 'Welcome to spndy' : 'No Business Selected'}
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
          <View style={styles.modalOverlay}>
            <GlassBackdrop isDark={isDark} onPress={() => setCreateBusinessModalVisible(false)} />
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 20}
              style={{ width: '100%', alignItems: 'center', justifyContent: 'center' }}
            >
              <View style={[styles.modalContent, { backgroundColor: colors.surfaceGlass, borderColor: colors.borderGlass, borderWidth: 1, borderRadius: 24, overflow: 'hidden' }]}>
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
                <Text style={[styles.modalTitle, { color: colors.text, fontFamily: 'SpaceGrotesk_700Bold' }]}>Create Business</Text>
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
        </View>
      </Modal>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <BackgroundDecor />
      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerTopRow}>
          <Text style={[styles.appName, { color: colors.primary, fontFamily: 'SpaceGrotesk_700Bold' }]}>spndy</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {/* Small Light / Dark Theme Switcher beside Note button */}
            <TouchableOpacity
              style={[styles.smallThemeButton, { backgroundColor: colors.surfaceGlass, borderColor: colors.borderGlass }]}
              onPress={() => setTheme(isDark ? 'light' : 'dark')}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {isDark ? <Sun size={17} color="#F59E0B" /> : <Moon size={17} color={colors.textSecondary} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.notificationButton, { backgroundColor: colors.surfaceGlass, borderColor: colors.borderGlass }]}
              onPress={() => router.push('/notes')}
              activeOpacity={0.7}
            >
              <FileText size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.notificationButton, { backgroundColor: colors.surfaceGlass, borderColor: colors.borderGlass }]}
              onPress={() => router.push('/notifications')}
              activeOpacity={0.7}
            >
              <Bell size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={[styles.headerTitle, { fontFamily: 'SpaceGrotesk_700Bold', color: colors.text }]}>Books</Text>

        {currentBusiness && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
            {!isSearchExpanded ? (
              <>
                <TouchableOpacity
                  style={[styles.businessSwitcher, { backgroundColor: colors.surfaceGlass, borderColor: colors.borderGlass, flex: 1 }]}
                  onPress={() => router.push('/business-switcher')}
                  activeOpacity={0.7}
                >
                  {(() => {
                    const iconKey = currentBusiness.icon || 'store';
                    const BusinessIcon = BUSINESS_ICONS[iconKey] || Building2;
                    const businessColor = currentBusiness.color || colors.primary;
                    const bgColor = businessColor + (isDark ? '25' : '15');
                    return (
                      <View style={[styles.businessIcon, { backgroundColor: bgColor }]}>
                        <BusinessIcon size={16} color={businessColor} />
                      </View>
                    );
                  })()}
                  <ChevronDown size={16} color={colors.textSecondary} />
                  <Text style={[styles.businessName, { color: colors.text, fontFamily: getFontFamily(deviceFont, 'bold') }]} numberOfLines={1}>
                    {currentBusiness.name}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.headerIconButton, { backgroundColor: colors.surfaceGlass, borderColor: colors.borderGlass }]}
                  onPress={() => {
                    LayoutAnimation.configureNext({ duration: 100, update: { type: LayoutAnimation.Types.easeInEaseOut } });
                    setIsSearchExpanded(true);
                  }}
                >
                  <Search size={20} color={colors.textSecondary} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.headerIconButton,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    selectedSort !== 'date-desc' && [
                      styles.filterButtonActive,
                      { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5', borderColor: '#10b981' },
                    ],
                  ]}
                  onPress={() => setSortModalVisible(true)}
                >
                  <SlidersHorizontal size={20} color={selectedSort !== 'date-desc' ? '#10b981' : colors.textSecondary} />
                </TouchableOpacity>
              </>
            ) : (
              <View
                style={[
                  styles.searchBar,
                  { backgroundColor: colors.surface, borderColor: colors.border, flex: 1, height: 44, borderRadius: 14 },
                ]}
              >
                <Search size={18} color={colors.textSecondary} />
                <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder="Search books..."
                  value={inputValue}
                  onChangeText={handleSearch}
                  placeholderTextColor={colors.textSecondary}
                  autoFocus
                  onBlur={() => {
                    if (!inputValue) {
                      LayoutAnimation.configureNext({ duration: 100, update: { type: LayoutAnimation.Types.easeInEaseOut } });
                      setIsSearchExpanded(false);
                    }
                  }}
                />
                <TouchableOpacity
                  onPress={() => {
                    handleSearch('');
                    LayoutAnimation.configureNext({ duration: 100, update: { type: LayoutAnimation.Types.easeInEaseOut } });
                    setIsSearchExpanded(false);
                    Keyboard.dismiss();
                  }}
                >
                  <X size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>

      <View style={{ flex: 1 }}>
        {/* Verification Banner */}
        {fbUser && fbUser.email && fbUser.emailVerified === false && !dismissVerifyBanner && (
          <View style={[styles.banner, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.12)' : '#FEF3C7', borderColor: '#F59E0B' }]}>
            <Text style={[styles.bannerTitle, { color: isDark ? '#FCD34D' : '#92400E' }]}>Verify your email</Text>
            <Text style={[styles.bannerText, { color: isDark ? '#F3F4F6' : '#78350F' }]}>Check {fbUser.email} for a link.</Text>
            <View style={styles.bannerActions}>
              <TouchableOpacity
                onPress={async () => {
                  const { error } = await resendVerificationEmail();
                  setVerificationMessage(error ? 'Error sending' : 'Sent!');
                }}
              >
                <Text style={[styles.bannerLink, { color: colors.primary }]}>{verificationMessage || 'Resend'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setDismissVerifyBanner(true)}>
                <X size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Books List Content */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading books...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredAndSortedBooks}
            renderItem={renderBookCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 120 }]}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyList}>
                <View style={[styles.emptyListIconBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                  <BookOpen size={36} color={colors.textSecondary} />
                </View>
                <Text style={[styles.emptyListTitle, { color: colors.text, fontFamily: 'SpaceGrotesk_700Bold' }]}>
                  No books found
                </Text>
                <Text style={[styles.emptyListText, { color: colors.textSecondary }]}>
                  {searchQuery ? `No results for "${searchQuery}"` : 'Create a book to start tracking.'}
                </Text>
              </View>
            }
          />
        )}
      </View>

      {/* FAB Add Button */}
      {(userRole === 'owner' || userRole === 'partner') && (
        <TouchableOpacity
          style={[styles.fab, { bottom: insets.bottom + 105 }]}
          onPress={() => {
            setSelectedBook(null);
            setEditModalVisible(true);
          }}
          activeOpacity={0.8}
        >
          <LinearGradient colors={['#10b981', '#059669']} style={styles.fabGradient}>
            <Plus size={24} color="#fff" strokeWidth={2.5} />
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* Sort & Filter Modal */}
      <Modal visible={sortModalVisible} transparent animationType="fade" onRequestClose={() => setSortModalVisible(false)}>
        <View style={styles.sortModalOverlay}>
          <GlassBackdrop isDark={isDark} onPress={() => setSortModalVisible(false)} />
          <View style={[styles.bottomSheet, { backgroundColor: colors.surfaceGlass, borderColor: colors.borderGlass, borderWidth: 1, borderBottomWidth: 0, overflow: 'hidden' }]}>
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
              <Text style={[styles.bottomSheetTitle, { fontFamily: 'SpaceGrotesk_700Bold', color: colors.text }]}>
                Sort & Filter
              </Text>
              <TouchableOpacity style={[styles.closeButton, { backgroundColor: colors.card }]} onPress={() => setSortModalVisible(false)}>
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.bottomSheetContent}>
              {['Sort By', 'Time Filter'].map((group) => (
                <View key={group} style={styles.sortSection}>
                  <Text style={[styles.sortSectionTitle, { color: colors.textSecondary }]}>{group}</Text>
                  <View style={styles.sortGrid}>
                    {SORT_OPTIONS.filter((opt) => opt.group === group).map((option) => {
                      const isActive = selectedSort === option.value;
                      return (
                        <TouchableOpacity
                          key={option.value}
                          style={[
                            styles.sortOption,
                            { backgroundColor: colors.card, borderColor: colors.border },
                            isActive && [
                              styles.sortOptionActive,
                              { backgroundColor: isDark ? 'rgba(33, 201, 141, 0.1)' : '#eff6ff', borderColor: colors.primary },
                            ],
                          ]}
                          onPress={() => {
                            setSelectedSort(option.value);
                            setSortModalVisible(false);
                          }}
                        >
                          {isActive && <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />}
                          <Text
                            style={[
                              styles.sortOptionText,
                              { color: colors.textSecondary },
                              isActive && [styles.sortOptionTextActive, { color: colors.text }],
                            ]}
                          >
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
        </View>
      </Modal>

      {/* Book Edit Modal */}
      {editModalVisible && (
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
      )}

      {/* Virtual Guide Modal */}
      {virtualGuideVisible && (
        <VirtualGuideModal visible={virtualGuideVisible} onClose={handleCloseVirtualGuide} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  appName: {
    fontSize: 28,
    letterSpacing: -0.5,
  },
  notificationButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 34,
    marginBottom: 8,
    letterSpacing: -0.8,
  },
  businessSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    height: 44,
  },
  businessIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  businessName: {
    fontSize: 14,
    marginLeft: 6,
    flex: 1,
  },
  headerIconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: {
    borderWidth: 1.5,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  card: {
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1,
    elevation: 2,
  },
  cardContent: {
    borderRadius: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardHeaderText: {
    flex: 1,
  },
  bookName: {
    flex: 1,
    marginRight: 8,
  },
  statValue: {},
  bookDate: {},
  miniStatValue: {},
  textSuccess: { color: '#10B981' },
  textDanger: { color: '#EF4444' },
  banner: {
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  bannerText: {
    fontSize: 12,
    marginTop: 2,
  },
  bannerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  bannerLink: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyIconBg: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  primaryButtonWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  emptyList: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyListIconBox: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyListTitle: {
    fontSize: 18,
    marginBottom: 4,
  },
  emptyListText: {
    fontSize: 14,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    zIndex: 100,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
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
    padding: 20,
    borderBottomWidth: 1,
  },
  bottomSheetTitle: {
    fontSize: 22,
  },
  closeButton: {
    padding: 6,
    borderRadius: 10,
  },
  bottomSheetContent: {
    padding: 20,
  },
  sortSection: {
    marginBottom: 20,
  },
  sortSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sortGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: '48%',
    flex: 1,
  },
  sortOptionActive: {
    borderWidth: 1.5,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  sortOptionText: {
    fontSize: 13,
  },
  sortOptionTextActive: {
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 22,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalCancel: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalConfirmWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalConfirm: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.5,
  },
  smallThemeButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookCurrencyBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  bookCurrencyBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
