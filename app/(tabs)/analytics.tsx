import React, { useMemo, useState } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
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
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/providers/theme-provider';
import { useBusiness } from '@/providers/business-provider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatCurrency } from '@/utils/currency-utils';
import { getFontFamily } from '@/config/font-config';
import { BlurView } from 'expo-blur';

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
    const { colors, isDark, deviceFont, theme } = useTheme();
    const { books, currentBusiness } = useBusiness();
    const insets = useSafeAreaInsets();
    const [timeRange, setTimeRange] = useState<TimeRange>('month');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);
    const [sortModalVisible, setSortModalVisible] = useState(false);
    const [selectedSort, setSelectedSort] = useState<string>('balance-desc');

    const isWithinTimeRange = (dateString: string, range: TimeRange) => {
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
            default: return true;
        }
    };

    // Calculate analytics from books
    const analytics = useMemo(() => {
        if (!books || books.length === 0) {
            return {
                totalCashIn: 0,
                totalCashOut: 0,
                netBalance: 0,
                totalTransactions: 0,
                bookCount: 0,
                topBooks: [],
            };
        }

        let filteredBooks = books.filter(b => b.businessId === currentBusiness?.id);

        // Apply Time Range Filter
        filteredBooks = filteredBooks.filter(book => isWithinTimeRange(book.createdAt, timeRange));

        // Apply Search Filter
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            filteredBooks = filteredBooks.filter(book => book.name.toLowerCase().includes(q));
        }

        let totalCashIn = 0;
        let totalCashOut = 0;

        filteredBooks.forEach(book => {
            totalCashIn += book.totalCashIn || 0;
            totalCashOut += book.totalCashOut || 0;
        });

        const topBooks = [...filteredBooks];

        // Apply Sorting to Top Books
        topBooks.sort((a, b) => {
            switch (selectedSort) {
                case 'name-asc': return a.name.localeCompare(b.name);
                case 'name-desc': return b.name.localeCompare(a.name);
                case 'balance-asc': return (a.netBalance || 0) - (b.netBalance || 0);
                case 'balance-desc':
                default: return Math.abs(b.netBalance || 0) - Math.abs(a.netBalance || 0);
            }
        });

        return {
            totalCashIn,
            totalCashOut,
            netBalance: totalCashIn - totalCashOut,
            totalTransactions: filteredBooks.reduce((acc, book) => acc + ((book as any).entryCount || 0), 0),
            bookCount: filteredBooks.length,
            topBooks: topBooks.slice(0, 5),
        };
    }, [books, currentBusiness, searchQuery, timeRange, selectedSort]);

    const StatCard = ({
        title,
        value,
        icon: Icon,
        color,
        trend,
        trendValue
    }: {
        title: string;
        value: string;
        icon: any;
        color: string;
        trend?: 'up' | 'down';
        trendValue?: string;
    }) => (
        <Animated.View entering={FadeIn.delay(100).duration(200)} style={[styles.statCard, { borderColor: colors.border, overflow: 'hidden' }]}>
            <BlurView
                intensity={isDark ? 30 : 50}
                tint={isDark ? 'dark' : 'light'}
                style={[StyleSheet.absoluteFill, { backgroundColor: colors.card + '90' }]}
            />
            <View style={styles.statContent}>
                <View style={styles.statHeader}>
                    <View style={[styles.statIcon, { backgroundColor: `${color}20` }]}>
                        <Icon size={14} color={color} />
                    </View>
                    {trend && (
                        <View style={[styles.trendBadge, { backgroundColor: trend === 'up' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)' }]}>
                            {trend === 'up' ? (
                                <ArrowUpRight size={10} color="#10b981" />
                            ) : (
                                <ArrowDownRight size={10} color="#ef4444" />
                            )}
                            {trendValue && (
                                <Text style={[styles.trendText, { color: trend === 'up' ? '#10b981' : '#ef4444' }]}>
                                    {trendValue}
                                </Text>
                            )}
                        </View>
                    )}
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
                <Text style={[styles.statTitle, { color: colors.textSecondary }]}>{title}</Text>
            </View>
        </Animated.View>
    );

    const ProgressBar = ({ label, value, total, color }: { label: string; value: number; total: number; color: string }) => {
        const percentage = total > 0 ? (value / total) * 100 : 0;
        return (
            <View style={styles.progressItem}>
                <View style={styles.progressHeader}>
                    <Text style={[styles.progressLabel, { color: colors.text }]} numberOfLines={1}>{label}</Text>
                    <Text style={[styles.progressValue, { color: colors.textSecondary }]}>
                        {formatCurrency(value, currentBusiness?.currency)}
                    </Text>
                </View>
                <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                    <LinearGradient
                        colors={[color, color]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.progressFill, { width: `${Math.min(percentage, 100)}%` }]}
                    />
                </View>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />

            {/* Decorative Circles */}
            <View style={[styles.circle1, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.05)' : 'rgba(16, 185, 129, 0.1)' }]} />
            <View style={[styles.circle2, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.03)' : 'rgba(16, 185, 129, 0.08)' }]} />

            <ScrollView
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <Animated.View entering={FadeIn.duration(200)} style={styles.header}>
                    <View style={styles.headerTopRow}>
                        <Text style={[styles.appName, { color: colors.primary }]}>Analytics</Text>
                        <View style={styles.headerActions}>
                            <TouchableOpacity
                                style={[styles.headerIconButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                                onPress={() => router.push('/notes')}
                            >
                                <FileText size={16} color={colors.textSecondary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.headerIconButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                                onPress={() => {
                                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                    setIsSearchExpanded(true);
                                }}
                            >
                                <Search size={16} color={colors.textSecondary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.headerIconButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                                onPress={() => setSortModalVisible(true)}
                            >
                                <SlidersHorizontal size={16} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    </View>
                    {!isSearchExpanded ? (
                        <Text style={[styles.headerTitle, { fontFamily: getFontFamily(deviceFont), color: colors.text }]}>
                            {currentBusiness?.name || 'Overview'}
                        </Text>
                    ) : (
                        <Animated.View entering={FadeIn.duration(200)} style={styles.searchBarContainer}>
                            <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                <Search size={14} color={colors.textSecondary} style={styles.searchIcon} />
                                <TextInput
                                    style={[styles.searchInput, { color: colors.text }]}
                                    placeholder="Search..."
                                    placeholderTextColor={colors.textSecondary}
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    autoFocus
                                />
                                <TouchableOpacity
                                    onPress={() => {
                                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                        setIsSearchExpanded(false);
                                        setSearchQuery('');
                                    }}
                                >
                                    <X size={14} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>
                        </Animated.View>
                    )}
                </Animated.View>

                {/* Main Balance Card */}
                <Animated.View entering={FadeIn.delay(150).duration(200)}>
                    <View style={[styles.balanceCard, { borderColor: colors.border, overflow: 'hidden' }]}>
                        <BlurView
                            intensity={isDark ? 40 : 60}
                            tint={isDark ? 'dark' : 'light'}
                            style={StyleSheet.absoluteFill}
                        />
                        <LinearGradient
                            colors={isDark ? ['rgba(10,10,10,0.4)', 'rgba(17,17,17,0.4)'] : ['rgba(255,255,255,0.6)', 'rgba(248,250,252,0.6)']}
                            style={StyleSheet.absoluteFill}
                        />
                        <View style={styles.balanceHeader}>
                            <View style={[styles.balanceIcon, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#dcfce7' }]}>
                                <Wallet size={18} color="#10b981" />
                            </View>
                            <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>Net Balance</Text>
                        </View>
                        <Text style={[
                            styles.balanceValue,
                            { color: analytics.netBalance >= 0 ? '#10b981' : '#ef4444' }
                        ]}>
                            {formatCurrency(analytics.netBalance, currentBusiness?.currency)}
                        </Text>

                        <View style={styles.balanceStats}>
                            <View style={styles.balanceStatItem}>
                                <View style={[styles.miniIcon, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#dcfce7' }]}>
                                    <TrendingUp size={14} color="#10b981" />
                                </View>
                                <View>
                                    <Text style={[styles.miniLabel, { color: colors.textSecondary }]}>Total In</Text>
                                    <Text style={[styles.miniValue, { color: '#10b981' }]}>
                                        {formatCurrency(analytics.totalCashIn, currentBusiness?.currency)}
                                    </Text>
                                </View>
                            </View>
                            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                            <View style={styles.balanceStatItem}>
                                <View style={[styles.miniIcon, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2' }]}>
                                    <TrendingDown size={14} color="#ef4444" />
                                </View>
                                <View>
                                    <Text style={[styles.miniLabel, { color: colors.textSecondary }]}>Total Out</Text>
                                    <Text style={[styles.miniValue, { color: '#ef4444' }]}>
                                        {formatCurrency(analytics.totalCashOut, currentBusiness?.currency)}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </Animated.View>

                {/* Quick Stats */}
                <View style={styles.statsGrid}>
                    <StatCard
                        title="Books"
                        value={analytics.bookCount.toString()}
                        icon={BarChart3}
                        color="#6366f1"
                    />
                    <StatCard
                        title="Transactions"
                        value={analytics.totalTransactions.toString()}
                        icon={ArrowRightLeft}
                        color="#f59e0b"
                    />
                </View>

                {/* Top Books Section */}
                {analytics.topBooks.length > 0 && (
                    <Animated.View entering={FadeIn.delay(300).duration(200)} style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <PieChart size={20} color={colors.primary} />
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Top Books by Balance</Text>
                        </View>
                        <View style={[styles.sectionCard, { borderColor: colors.border, overflow: 'hidden' }]}>
                            <BlurView
                                intensity={isDark ? 30 : 50}
                                tint={isDark ? 'dark' : 'light'}
                                style={[StyleSheet.absoluteFill, { backgroundColor: colors.card + '80' }]}
                            />
                            <View style={{ padding: 12 }}>
                                {analytics.topBooks.map((book) => (
                                    <ProgressBar
                                        key={book.id}
                                        label={book.name}
                                        value={Math.abs(book.netBalance || 0)}
                                        total={Math.max(analytics.totalCashIn, analytics.totalCashOut) || 1}
                                        color={book.netBalance >= 0 ? '#10b981' : '#ef4444'}
                                    />
                                ))}
                            </View>
                        </View>
                    </Animated.View>
                )}

                {/* Cash Flow Summary */}
                <Animated.View entering={FadeIn.delay(400).duration(200)} style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <DollarSign size={20} color={colors.primary} />
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Cash Flow Summary</Text>
                    </View>
                    <View style={[styles.sectionCard, { borderColor: colors.border, overflow: 'hidden' }]}>
                        <BlurView
                            intensity={isDark ? 30 : 50}
                            tint={isDark ? 'dark' : 'light'}
                            style={[StyleSheet.absoluteFill, { backgroundColor: colors.card + '80' }]}
                        />
                        <View style={{ padding: 12 }}>
                            <View style={styles.flowRow}>
                                <View style={styles.flowItem}>
                                    <View style={[styles.flowIcon, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                                        <TrendingUp size={16} color="#10b981" />
                                    </View>
                                    <View style={styles.flowInfo}>
                                        <Text style={[styles.flowLabel, { color: colors.textSecondary }]}>Money In</Text>
                                        <Text style={[styles.flowValue, { color: '#10b981' }]}>
                                            {formatCurrency(analytics.totalCashIn, currentBusiness?.currency)}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                            <View style={[styles.flowDivider, { backgroundColor: colors.border }]} />
                            <View style={styles.flowRow}>
                                <View style={styles.flowItem}>
                                    <View style={[styles.flowIcon, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                                        <TrendingDown size={16} color="#ef4444" />
                                    </View>
                                    <View style={styles.flowInfo}>
                                        <Text style={[styles.flowLabel, { color: colors.textSecondary }]}>Money Out</Text>
                                        <Text style={[styles.flowValue, { color: '#ef4444' }]}>
                                            {formatCurrency(analytics.totalCashOut, currentBusiness?.currency)}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </View>
                </Animated.View>
            </ScrollView>

            {/* Sort Modal */}
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
                                            const isActive = group === 'Sort By' ? selectedSort === option.value : timeRange === option.value;
                                            return (
                                                <TouchableOpacity
                                                    key={option.value}
                                                    style={[
                                                        styles.sortOptionItem,
                                                        { backgroundColor: colors.card, borderColor: colors.border },
                                                        isActive && [styles.sortOptionActive, { backgroundColor: theme === 'dark' ? 'rgba(33, 201, 141, 0.1)' : '#eff6ff', borderColor: colors.primary }]
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
                </TouchableOpacity>
            </Modal>
        </View>
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
        fontWeight: '600',
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
        padding: 0,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
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
        fontWeight: '500',
    },
    balanceValue: {
        fontSize: 24,
        fontWeight: '700',
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
        fontWeight: '500',
        marginBottom: 1,
    },
    miniValue: {
        fontSize: 12,
        fontWeight: '700',
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
        fontWeight: '600',
    },
    statValue: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 2,
    },
    statTitle: {
        fontSize: 11,
        fontWeight: '500',
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
        fontWeight: '700',
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
        fontWeight: '600',
        flex: 1,
        marginRight: 8,
    },
    progressValue: {
        fontSize: 11,
        fontWeight: '500',
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
        fontWeight: '500',
        marginBottom: 2,
    },
    flowValue: {
        fontSize: 16,
        fontWeight: '700',
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
        fontWeight: '700',
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
        fontWeight: '600',
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
        fontWeight: '600',
    },
    sortOptionTextActive: {
        fontWeight: '700',
    },
    activeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 8,
    },
});
