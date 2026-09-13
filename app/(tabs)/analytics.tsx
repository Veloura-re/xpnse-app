import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Dimensions,
    StatusBar,
    LayoutAnimation,
    Modal,
    TextInput,
    Keyboard,
    Platform,
    FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    ArrowUpRight,
    ArrowDownRight,
    BarChart3,
    PieChart,
    Wallet,
    ArrowRightLeft,
    Search,
    SlidersHorizontal,
    X,
    Check,
    FileText,
    FileDown,
    Sun,
    Moon,
} from 'lucide-react-native';
import { router, useFocusEffect } from 'expo-router';
import { useTheme } from '@/providers/theme-provider';
import { useBusiness } from '@/providers/business-provider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatCurrency } from '@/utils/currency-utils';
import { getFontFamily } from '@/config/font-config';
import { BlurView } from 'expo-blur';
import { GlassBackdrop } from '@/components/ui/glass-backdrop';
import { StatCard, ProgressBar } from '@/components/analytics/analytics-components';
import { usePaginatedEntries } from '@/hooks/use-paginated-entries';
import { BackgroundDecor } from '@/components/ui/background-decor';
import { exportToPDF } from '@/utils/exportUtils';
import { ActivityIndicator } from 'react-native';
import { BookEntry } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type TimeRange = 'today' | 'week' | 'month' | 'year' | 'all';

interface SortConfig {
    label: string;
    value: string;
    group: 'Sort By' | 'Time Filter';
}

const SORT_OPTIONS: SortConfig[] = [
    { label: 'Top Books (Balance)', value: 'balance-desc', group: 'Sort By' },
    { label: 'Smallest Balance', value: 'balance-asc', group: 'Sort By' },
    { label: 'Name (A-Z)', value: 'name-asc', group: 'Sort By' },
    { label: 'Name (Z-A)', value: 'name-desc', group: 'Sort By' },
    { label: 'All Time', value: 'all', group: 'Time Filter' },
    { label: 'This Year', value: 'year', group: 'Time Filter' },
    { label: 'This Month', value: 'month', group: 'Time Filter' },
    { label: 'This Week', value: 'week', group: 'Time Filter' },
    { label: 'Today', value: 'today', group: 'Time Filter' },
];

export default function AnalyticsScreen() {
    const { colors, isDark, deviceFont, theme, setTheme } = useTheme();
    const { books, currentBusiness } = useBusiness();
    const insets = useSafeAreaInsets();
    const [timeRange, setTimeRange] = useState<TimeRange>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);
    const [sortModalVisible, setSortModalVisible] = useState(false);
    const [selectedSort, setSelectedSort] = useState<string>('balance-desc');
    const [aggregateTotals, setAggregateTotals] = useState<{ totalCashIn: number, totalCashOut: number, netBalance: number, count: number } | null>(null);
    const [isGlobal, setIsGlobal] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [exportModalVisible, setExportModalVisible] = useState(false);
    const [exportFileName, setExportFileName] = useState('');

    // Calculate dates for transaction fetching
    const { startDate, endDate } = useMemo(() => {
        const now = new Date();
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        let start: Date | undefined;

        switch (timeRange) {
            case 'today':
                start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
                break;
            case 'week':
                start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0, 0);
                break;
            case 'month':
                start = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate(), 0, 0, 0, 0);
                break;
            case 'year':
                start = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate(), 0, 0, 0, 0);
                break;
            case 'all':
                start = undefined;
                break;
        }
        return { startDate: start, endDate: end };
    }, [timeRange]);

    const {
        entries: transactions,
        loading: loadingTransactions,
        hasMore: hasMoreTransactions,
        loadMore: loadMoreTransactions,
        getTotals,
        refresh: refreshTransactions
    } = usePaginatedEntries(isGlobal ? null : (currentBusiness?.id || null), undefined, {
        pageSize: 200,
        startDate,
        endDate: timeRange !== 'all' ? endDate : undefined
    });

    // Fetch aggregate totals when period changes or screen is focused
    useFocusEffect(
        useCallback(() => {
            let isActive = true;
            const fetchTotals = async () => {
                const totals = await getTotals();
                if (isActive && totals) {
                    setAggregateTotals(totals);
                }
            };
            fetchTotals();
            refreshTransactions();

            return () => {
                isActive = false;
            };
        }, [getTotals, refreshTransactions])
    );

    // Strictly compute active business books and active book IDs
    const businessBooks = useMemo(() => {
        return isGlobal ? books : books.filter(b => b.businessId === currentBusiness?.id);
    }, [books, currentBusiness?.id, isGlobal]);

    const activeBookIdSet = useMemo(() => {
        return new Set(businessBooks.map(b => b.id));
    }, [businessBooks]);

    // Valid transactions strictly belonging to active, non-deleted books
    const validTransactions = useMemo(() => {
        return transactions.filter(entry => entry.bookId && activeBookIdSet.has(entry.bookId));
    }, [transactions, activeBookIdSet]);

    // Calculate analytics from transactions and books with complete precision
    const analytics = useMemo(() => {
        if (!businessBooks || businessBooks.length === 0) {
            return {
                totalCashIn: 0,
                totalCashOut: 0,
                netBalance: 0,
                totalTransactions: 0,
                bookCount: 0,
                topBooks: [],
                isLoading: loadingTransactions
            };
        }

        let totalCashIn = 0;
        let totalCashOut = 0;
        let totalTransactions = 0;
        const periodBalanceMap: Record<string, { in: number, out: number, net: number }> = {};

        // Initialize period balance map for each active book
        businessBooks.forEach(book => {
            periodBalanceMap[book.id] = { in: 0, out: 0, net: 0 };
        });

        if (timeRange === 'all') {
            // Lifetime totals directly computed from active books
            businessBooks.forEach(book => {
                const bookIn = Number(book.totalCashIn) || 0;
                const bookOut = Number(book.totalCashOut) || 0;
                totalCashIn += bookIn;
                totalCashOut += bookOut;
            });
            totalTransactions = validTransactions.length;
        } else {
            // Filter transactions strictly for the active time window and active books
            const startMs = startDate ? startDate.getTime() : 0;
            const endMs = endDate ? endDate.getTime() : Infinity;

            const relevantTransactions = validTransactions.filter(entry => {
                const entryTime = entry.createdAt 
                    ? new Date(entry.createdAt).getTime() 
                    : (entry.date ? new Date(entry.date + 'T00:00:00').getTime() : 0);
                return entryTime >= startMs && entryTime <= endMs;
            });

            relevantTransactions.forEach((entry: BookEntry) => {
                const amount = Number(entry.amount) || 0;
                if (entry.type === 'cash_in') {
                    totalCashIn += amount;
                    if (periodBalanceMap[entry.bookId]) {
                        periodBalanceMap[entry.bookId].in += amount;
                    }
                } else {
                    totalCashOut += amount;
                    if (periodBalanceMap[entry.bookId]) {
                        periodBalanceMap[entry.bookId].out += amount;
                    }
                }

                if (periodBalanceMap[entry.bookId]) {
                    periodBalanceMap[entry.bookId].net = 
                        periodBalanceMap[entry.bookId].in - periodBalanceMap[entry.bookId].out;
                }
            });

            totalTransactions = relevantTransactions.length;
        }

        const safeTotalIn = isNaN(totalCashIn) ? 0 : totalCashIn;
        const safeTotalOut = isNaN(totalCashOut) ? 0 : totalCashOut;
        const safeNet = safeTotalIn - safeTotalOut;

        // Prepare Top Books data with strictly computed balances
        let topBooks = businessBooks.map(book => {
            const periodData = periodBalanceMap[book.id];
            const displayBalance = timeRange === 'all'
                ? (typeof book.netBalance === 'number' ? book.netBalance : (Number(book.totalCashIn || 0) - Number(book.totalCashOut || 0)))
                : (periodData?.net || 0);

            return {
                ...book,
                displayBalance,
            };
        });

        // Filter by search query if active
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            topBooks = topBooks.filter(book => book.name.toLowerCase().includes(q));
        }

        // Apply Sorting based on displayBalance
        topBooks.sort((a, b) => {
            switch (selectedSort) {
                case 'name-asc': return a.name.localeCompare(b.name);
                case 'name-desc': return b.name.localeCompare(a.name);
                case 'balance-asc': return a.displayBalance - b.displayBalance;
                case 'balance-desc':
                default: return b.displayBalance - a.displayBalance;
            }
        });

        return {
            totalCashIn: safeTotalIn,
            totalCashOut: safeTotalOut,
            netBalance: safeNet,
            totalTransactions,
            bookCount: businessBooks.length,
            topBooks,
            isLoading: loadingTransactions
        };
    }, [businessBooks, activeBookIdSet, searchQuery, timeRange, selectedSort, validTransactions, loadingTransactions, startDate, endDate]);

    const handleExportBusinessPDF = async () => {
        if (!currentBusiness || validTransactions.length === 0) return;
        const dateStr = new Date().toISOString().split('T')[0];
        const defaultName = `${currentBusiness.name.replace(/[^a-zA-Z0-9]/g, '_')}_Business_Export_${dateStr}`;
        setExportFileName(defaultName);
        setExportModalVisible(true);
    };

    const confirmExportPDF = async () => {
        if (!currentBusiness || validTransactions.length === 0) return;
        setExportModalVisible(false);
        setIsExporting(true);
        try {
            const rangeLabel = timeRange === 'all' ? 'All Time' : timeRange.charAt(0).toUpperCase() + timeRange.slice(1);
            await exportToPDF(currentBusiness, validTransactions, { 
                fileName: exportFileName || 'Business_Export', 
                isBusiness: true, 
                rangeLabel 
            });
        } catch (error) {
            console.error('Error exporting PDF:', error);
        } finally {
            setIsExporting(false);
        }
    };

    const renderHeader = () => (
        <View>
            <View style={styles.header}>
                <View style={styles.headerTopRow}>
                    <Text style={[styles.appName, { color: colors.primary, fontFamily: 'SpaceGrotesk_700Bold' }]}>spndy</Text>
                </View>
                {!isSearchExpanded ? (
                    <Text style={[styles.headerTitle, { fontFamily: 'SpaceGrotesk_700Bold', color: colors.text }]}>
                        {isGlobal ? 'Global Overview' : (currentBusiness?.name || 'Overview')}
                    </Text>
                ) : (
                    <View style={styles.searchBarContainer}>
                        <View style={[styles.searchBar, { backgroundColor: colors.surfaceGlass, borderColor: colors.borderGlass }]}>
                            <Search size={14} color={colors.textSecondary} style={styles.searchIcon} />
                            <TextInput
                                style={[styles.searchInput, { color: colors.text }]}
                                placeholder="Search..."
                                placeholderTextColor={colors.textSecondary}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoFocus={true}
                            />
                            <TouchableOpacity
                                onPress={() => {
                                    LayoutAnimation.configureNext({ duration: 100, update: { type: LayoutAnimation.Types.easeInEaseOut } });
                                    setIsSearchExpanded(false);
                                    setSearchQuery('');
                                }}
                            >
                                <X size={14} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>

            <View style={[
                styles.balanceCard, 
                { 
                    backgroundColor: isDark ? colors.surface : '#FFFFFF', 
                    borderColor: colors.border,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: isDark ? 0.25 : 0.05,
                    shadowRadius: 12,
                    elevation: isDark ? 3 : 1,
                }
            ]}>
                <View style={styles.balanceHeader}>
                    <View style={[styles.balanceIcon, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#dcfce7' }]}>
                        <Wallet size={18} color="#10b981" />
                    </View>
                    <Text style={[styles.balanceLabel, { color: colors.textSecondary, fontFamily: 'SpaceGrotesk_500Medium' }]}>Net Balance</Text>
                </View>
                {analytics.isLoading ? (
                    <ActivityIndicator color={colors.primary} size="large" style={{ marginVertical: 10, alignSelf: 'flex-start' }} />
                ) : (
                    <Text style={[
                        styles.balanceValue,
                        { fontFamily: 'SpaceGrotesk_700Bold', color: analytics.netBalance >= 0 ? '#10b981' : '#ef4444' }
                    ]}>
                        {formatCurrency(analytics.netBalance, currentBusiness?.currency)}
                    </Text>
                )}

                <View style={styles.balanceStats}>
                    <View style={styles.balanceStatItem}>
                        <View style={[styles.miniIcon, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#dcfce7' }]}>
                            <TrendingUp size={14} color="#10b981" />
                        </View>
                        <View>
                            <Text style={[styles.miniLabel, { color: colors.textSecondary, fontFamily: 'SpaceGrotesk_400Regular' }]}>Total In</Text>
                            <Text style={[styles.miniValue, { color: '#10b981', fontFamily: 'SpaceGrotesk_700Bold' }]}>
                                {analytics.isLoading ? '---' : formatCurrency(analytics.totalCashIn, currentBusiness?.currency)}
                            </Text>
                        </View>
                    </View>
                    <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.balanceStatItem}>
                        <View style={[styles.miniIcon, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2' }]}>
                            <TrendingDown size={14} color="#ef4444" />
                        </View>
                        <View>
                            <Text style={[styles.miniLabel, { color: colors.textSecondary, fontFamily: 'SpaceGrotesk_400Regular' }]}>Total Out</Text>
                            <Text style={[styles.miniValue, { color: '#ef4444', fontFamily: 'SpaceGrotesk_700Bold' }]}>
                                {analytics.isLoading ? '---' : formatCurrency(analytics.totalCashOut, currentBusiness?.currency)}
                            </Text>
                        </View>
                    </View>
                </View>
            </View>

            <View style={styles.statsGrid}>
                <StatCard
                    title="Books"
                    value={analytics.bookCount.toString()}
                    icon={BarChart3}
                    color="#6366f1"
                    colors={colors}
                    isDark={isDark}
                />
                <StatCard
                    title="Volume"
                    value={analytics.isLoading ? "..." : formatCurrency(analytics.totalCashIn + analytics.totalCashOut, currentBusiness?.currency)}
                    icon={ArrowRightLeft}
                    color="#f59e0b"
                    colors={colors}
                    isDark={isDark}
                />
            </View>

            {analytics.topBooks.length > 0 && (
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <PieChart size={18} color={colors.primary} />
                        <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: 'SpaceGrotesk_700Bold' }]}>Top Books by Balance</Text>
                    </View>
                    <View style={[
                        styles.sectionCard, 
                        { 
                            backgroundColor: isDark ? colors.surface : '#FFFFFF', 
                            borderColor: colors.border,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: isDark ? 0.2 : 0.04,
                            shadowRadius: 8,
                            elevation: isDark ? 2 : 1,
                        }
                    ]}>
                        <View style={{ padding: 14 }}>
                            {analytics.topBooks.map((book) => (
                                <TouchableOpacity 
                                    key={book.id} 
                                    onPress={() => router.push(`/book/${book.id}`)}
                                    activeOpacity={0.7}
                                >
                                    <ProgressBar
                                        label={book.name}
                                        value={Math.abs(book.displayBalance || 0)}
                                        total={Math.max(analytics.totalCashIn, analytics.totalCashOut, Math.abs(analytics.netBalance)) || 1}
                                        color={book.displayBalance >= 0 ? '#10b981' : '#ef4444'}
                                        colors={colors}
                                        isDark={isDark}
                                        currency={currentBusiness?.currency}
                                    />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>
            )}

            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <DollarSign size={18} color={colors.primary} />
                    <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: 'SpaceGrotesk_700Bold' }]}>Cash Flow Summary</Text>
                </View>
                <View style={[
                    styles.sectionCard, 
                    { 
                        backgroundColor: isDark ? colors.surface : '#FFFFFF', 
                        borderColor: colors.border,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: isDark ? 0.2 : 0.04,
                        shadowRadius: 8,
                        elevation: isDark ? 2 : 1,
                    }
                ]}>
                    <View style={{ padding: 14 }}>
                        <View style={styles.flowRow}>
                            <View style={styles.flowItem}>
                                <View style={[styles.flowIcon, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#dcfce7' }]}>
                                    <TrendingUp size={16} color="#10b981" />
                                </View>
                                <View style={styles.flowInfo}>
                                    <Text style={[styles.flowLabel, { color: colors.textSecondary, fontFamily: 'SpaceGrotesk_400Regular' }]}>Money In</Text>
                                    <Text style={[styles.flowValue, { color: '#10b981', fontFamily: 'SpaceGrotesk_700Bold' }]}>
                                        {formatCurrency(analytics.totalCashIn, currentBusiness?.currency)}
                                    </Text>
                                </View>
                            </View>
                        </View>
                        <View style={[styles.flowDivider, { backgroundColor: colors.border }]} />
                        <View style={styles.flowRow}>
                            <View style={styles.flowItem}>
                                <View style={[styles.flowIcon, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2' }]}>
                                    <TrendingDown size={16} color="#ef4444" />
                                </View>
                                <View style={styles.flowInfo}>
                                    <Text style={[styles.flowLabel, { color: colors.textSecondary, fontFamily: 'SpaceGrotesk_400Regular' }]}>Money Out</Text>
                                    <Text style={[styles.flowValue, { color: '#ef4444', fontFamily: 'SpaceGrotesk_700Bold' }]}>
                                        {formatCurrency(analytics.totalCashOut, currentBusiness?.currency)}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>
            </View>

            <View style={styles.sectionHeader}>
                <ArrowRightLeft size={18} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: 'SpaceGrotesk_700Bold' }]}>Recent Activity</Text>
            </View>
        </View>
    );

    const renderTransactionItem = ({ item: entry, index }: { item: BookEntry, index: number }) => {
        const entryDate = new Date(entry.createdAt);
        const isLast = index === transactions.length - 1;
        let bookName = 'Unknown Book';
        const book = books.find(b => b.id === entry.bookId);
        if (book) bookName = book.name;

        return (
            <View key={entry.id}>
                <View style={[styles.transactionItem, { padding: 12 }]}>
                    <View style={[
                        styles.transactionIcon,
                        { backgroundColor: entry.type === 'cash_in' ? (isDark ? 'rgba(16, 185, 129, 0.15)' : '#dcfce7') : (isDark ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2') }
                    ]}>
                        {entry.type === 'cash_in' ? (
                            <ArrowDownRight size={18} color="#10b981" />
                        ) : (
                            <ArrowUpRight size={18} color="#ef4444" />
                        )}
                    </View>
                    <View style={styles.transactionInfo}>
                        <Text style={[styles.transactionTitle, { color: colors.text }]} numberOfLines={1}>
                            {entry.description || (entry.type === 'cash_in' ? 'Cash In' : 'Cash Out')}
                        </Text>
                        <View style={styles.transactionMeta}>
                            <Text style={[styles.transactionDate, { color: colors.textSecondary }]}>
                                {entryDate.toLocaleDateString()}
                            </Text>
                            <Text style={[styles.transactionBook, { color: colors.textSecondary }]}>
                                • {bookName}
                            </Text>
                        </View>
                    </View>
                    <Text style={[
                        styles.transactionAmount,
                        { color: entry.type === 'cash_in' ? '#10b981' : '#ef4444' }
                    ]}>
                        {entry.type === 'cash_in' ? '+' : '-'}{formatCurrency(Number(entry.amount), currentBusiness?.currency)}
                    </Text>
                </View>
                {!isLast && <View style={[styles.divider, { backgroundColor: colors.border, marginHorizontal: 12 }]} />}
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
            <BackgroundDecor />
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />

            <FlatList
                data={validTransactions}
                renderItem={renderTransactionItem}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={
                    !loadingTransactions ? (
                        <View style={{ padding: 20, alignItems: 'center' }}>
                            <Text style={{ color: colors.textSecondary }}>No transactions found</Text>
                        </View>
                    ) : null
                }
                ListFooterComponent={
                    loadingTransactions ? (
                        <View style={{ padding: 16 }}>
                            <ActivityIndicator color={colors.primary} />
                        </View>
                    ) : null
                }
                onEndReached={() => hasMoreTransactions && loadMoreTransactions()}
                onEndReachedThreshold={0.5}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20, flexGrow: 1 }]}
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                keyExtractor={(item) => item.id}
            />

            {/* Sort Modal */}
            <Modal visible={sortModalVisible} transparent animationType="fade" onRequestClose={() => setSortModalVisible(false)} statusBarTranslucent={true}>
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
                            <Text style={[styles.bottomSheetTitle, { fontFamily: 'SpaceGrotesk_700Bold', color: colors.text }]}>Sort & Filter</Text>
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
                                            const isActive = group === 'Sort By' ? selectedSort === option.value : timeRange === option.value;
                                            return (
                                                <TouchableOpacity
                                                    key={option.value}
                                                    style={[
                                                        styles.sortOptionItem,
                                                        { backgroundColor: colors.card, borderColor: colors.border },
                                                        isActive && [styles.sortOptionActive, { backgroundColor: isDark ? 'rgba(33, 201, 141, 0.1)' : '#eff6ff', borderColor: colors.primary }]
                                                    ]}
                                                    onPress={() => {
                                                        if (group === 'Sort By') {
                                                            setSelectedSort(option.value);
                                                        } else {
                                                            setTimeRange(option.value as TimeRange);
                                                        }
                                                        setSortModalVisible(false);
                                                    }}
                                                >
                                                    {isActive && <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />}
                                                    <Text style={[styles.sortOptionTextItem, { color: colors.textSecondary }, isActive && [styles.sortOptionTextActive, { color: colors.text }]]}>
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
            </Modal >

            {/* Export Filename Modal */}
            <Modal
                visible={exportModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setExportModalVisible(false)}
                statusBarTranslucent={true}
            >
                <View style={styles.modalOverlay}>
                    <GlassBackdrop isDark={isDark} onPress={() => setExportModalVisible(false)} />
                    <View style={[styles.popupContainer, { backgroundColor: colors.surfaceGlass, borderColor: colors.borderGlass, borderWidth: 1, borderRadius: 24, overflow: 'hidden' }]}>
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
                        <View style={[styles.popupHeader, { borderBottomColor: colors.border }]}>
                            <Text style={[styles.popupTitle, { color: colors.text, fontFamily: 'SpaceGrotesk_700Bold' }]}>Name Your File</Text>
                            <TouchableOpacity onPress={() => setExportModalVisible(false)} style={styles.popupCloseButton}>
                                <X size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.popupContent}>
                            <View style={styles.inputWrapper}>
                                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Filename</Text>
                                <TextInput
                                    style={[styles.modalTextInput, { 
                                        backgroundColor: isDark ? colors.surface : '#F8FAFC',
                                        borderColor: colors.border,
                                        color: colors.text
                                    }]}
                                    value={exportFileName}
                                    onChangeText={setExportFileName}
                                    placeholder="Enter filename"
                                    placeholderTextColor={colors.textSecondary}
                                    autoFocus={true}
                                />
                                <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                                    Extension (.pdf) will be added automatically
                                </Text>
                            </View>

                            <View style={styles.popupFooter}>
                                <TouchableOpacity
                                    style={[styles.modalCancelButton, { backgroundColor: isDark ? colors.border : '#F1F5F9' }]}
                                    onPress={() => setExportModalVisible(false)}
                                >
                                    <Text style={[styles.modalCancelButtonText, { color: colors.text }]}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalSaveButton, { backgroundColor: colors.primary, opacity: isExporting ? 0.7 : 1 }]}
                                    onPress={confirmExportPDF}
                                    disabled={isExporting}
                                >
                                    {isExporting ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Text style={styles.modalSaveButtonText}>Export Report</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>
        </View >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: 12,
    },
    circle1: {
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: 150,
        top: -100,
        right: -100,
    },
    circle2: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        bottom: 100,
        left: -50,
    },
    header: {
        marginBottom: 16,
    },
    appName: {
        fontSize: 11,
        fontFamily: 'SpaceGrotesk_700Bold',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        marginBottom: 2,
    },
    headerTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    headerActions: {
        flexDirection: 'row',
        gap: 8,
    },
    headerIconButton: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    searchBarContainer: {
        marginTop: 4,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        borderWidth: 1,
    },
    searchIcon: {
        marginRight: 6,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'SpaceGrotesk_500Medium',
        padding: 0,
    },
    headerTitle: {
        fontSize: 22,
        fontFamily: 'SpaceGrotesk_700Bold',
    },
    balanceCard: {
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
    },
    balanceHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    balanceIcon: {
        width: 36,
        height: 36,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    balanceLabel: {
        fontSize: 12,
        fontFamily: 'SpaceGrotesk_500Medium',
    },
    balanceValue: {
        fontSize: 24,
        fontFamily: 'SpaceGrotesk_700Bold',
        marginBottom: 12,
    },
    balanceStats: {
        flexDirection: 'row',
        borderRadius: 12,
        padding: 10,
        backgroundColor: 'rgba(255,255,255,0.03)',
    },
    balanceStatItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    miniIcon: {
        width: 24,
        height: 24,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    miniLabel: {
        fontSize: 10,
        fontFamily: 'SpaceGrotesk_500Medium',
        marginBottom: 1,
    },
    miniValue: {
        fontSize: 12,
        fontFamily: 'SpaceGrotesk_700Bold',
    },
    statDivider: {
        width: 1,
        marginHorizontal: 12,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 16,
    },
    statCard: {
        flex: 1,
        borderRadius: 16,
        borderWidth: 1,
        minHeight: 100,
    },
    statContent: {
        padding: 12,
    },
    statHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    statIcon: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    trendBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    trendText: {
        fontSize: 9,
        fontFamily: 'SpaceGrotesk_600SemiBold',
    },
    statValue: {
        fontSize: 18,
        fontFamily: 'SpaceGrotesk_700Bold',
        marginBottom: 2,
    },
    statTitle: {
        fontSize: 11,
        fontFamily: 'SpaceGrotesk_500Medium',
    },
    section: {
        marginBottom: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 14,
        fontFamily: 'SpaceGrotesk_700Bold',
    },
    sectionCard: {
        borderRadius: 16,
        borderWidth: 1,
    },
    progressItem: {
        marginBottom: 10,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    progressLabel: {
        fontSize: 12,
        fontFamily: 'SpaceGrotesk_600SemiBold',
        flex: 1,
        marginRight: 8,
    },
    progressValue: {
        fontSize: 11,
        fontFamily: 'SpaceGrotesk_500Medium',
    },
    progressTrack: {
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
    flowRow: {
        paddingVertical: 8,
    },
    flowItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    flowIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    flowInfo: {
        flex: 1,
    },
    flowLabel: {
        fontSize: 11,
        fontFamily: 'SpaceGrotesk_500Medium',
        marginBottom: 2,
    },
    flowValue: {
        fontSize: 16,
        fontFamily: 'SpaceGrotesk_700Bold',
    },
    flowDivider: {
        height: 1,
        marginVertical: 4,
    },
    sortModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    bottomSheet: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingBottom: 40,
        maxHeight: '80%',
    },
    bottomSheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        borderBottomWidth: 1,
    },
    bottomSheetTitle: {
        fontSize: 20,
        fontFamily: 'SpaceGrotesk_700Bold',
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    bottomSheetContent: {
        padding: 20,
    },
    sortSection: {
        marginBottom: 24,
    },
    sortSectionTitle: {
        fontSize: 12,
        fontFamily: 'SpaceGrotesk_700Bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 12,
        marginLeft: 4,
    },
    sortGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    sortOptionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
        minWidth: '48%',
    },
    sortOptionActive: {
        borderWidth: 1.5,
    },
    sortOptionTextItem: {
        fontSize: 13,
        fontFamily: 'SpaceGrotesk_600SemiBold',
    },
    sortOptionTextActive: {
        fontFamily: 'SpaceGrotesk_700Bold',
    },
    activeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 8,
    },
    transactionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    transactionIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    transactionInfo: {
        flex: 1,
    },
    transactionTitle: {
        fontSize: 14,
        fontFamily: 'SpaceGrotesk_600SemiBold',
        marginBottom: 2,
    },
    transactionMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    transactionDate: {
        fontSize: 12,
        fontFamily: 'SpaceGrotesk_500Medium',
    },
    transactionBook: {
        fontSize: 12,
        fontFamily: 'SpaceGrotesk_500Medium',
    },
    transactionAmount: {
        fontSize: 15,
        fontFamily: 'SpaceGrotesk_700Bold',
    },
    divider: {
        height: 1,
    },
    loadMoreButton: {
        padding: 16,
        borderTopWidth: 1,
        alignItems: 'center',
    },
    loadMoreText: {
        fontSize: 14,
        fontFamily: 'SpaceGrotesk_600SemiBold',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 20,
    },
    popupContainer: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 24,
        overflow: 'hidden',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
    },
    popupHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 18,
        borderBottomWidth: 1,
    },
    popupTitle: {
        fontSize: 18,
        fontFamily: 'SpaceGrotesk_700Bold',
    },
    popupCloseButton: {
        padding: 4,
    },
    popupContent: {
        padding: 20,
    },
    inputWrapper: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 12,
        fontFamily: 'SpaceGrotesk_600SemiBold',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    modalTextInput: {
        height: 52,
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 16,
        fontSize: 16,
        fontFamily: 'SpaceGrotesk_500Medium',
    },
    helperText: {
        fontSize: 11,
        fontFamily: 'SpaceGrotesk_400Regular',
        marginTop: 6,
        fontStyle: 'italic',
    },
    popupFooter: {
        flexDirection: 'row',
        gap: 12,
    },
    modalCancelButton: {
        flex: 1,
        height: 52,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalCancelButtonText: {
        fontSize: 15,
        fontFamily: 'SpaceGrotesk_600SemiBold',
    },
    modalSaveButton: {
        flex: 2,
        height: 52,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalSaveButtonText: {
        fontSize: 15,
        fontFamily: 'SpaceGrotesk_700Bold',
        color: '#FFFFFF',
    },
});
