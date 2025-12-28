import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Dimensions, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBusiness } from '@/providers/business-provider';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, BookOpen, Sun, Smartphone, Check, ChevronRight, Bell, FileText } from 'lucide-react-native';
import { router } from 'expo-router';
import { collection, query, orderBy, limit, getDocs, where, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { BookEntry } from '@/types';
import { LinearGradient } from 'expo-linear-gradient';
import { formatCurrency } from '@/utils/currency-utils';
import Animated, { FadeIn } from 'react-native-reanimated';
import { getFontFamily } from '@/config/font-config';
import { useTheme } from '@/providers/theme-provider';

const { width } = Dimensions.get('window');

export default function ActivityScreen() {
    const insets = useSafeAreaInsets();
    const { currentBusiness, parties, books } = useBusiness();
    const { deviceFont, colors, isDark, theme } = useTheme();
    const [recentActivity, setRecentActivity] = useState<BookEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedDays, setSelectedDays] = useState<number | null>(30);

    // Calculate totals from books
    const { totalCashIn, totalCashOut, netBalance } = useMemo(() => {
        let cashIn = 0;
        let cashOut = 0;
        let balance = 0;

        books.forEach(book => {
            if (book.businessId === currentBusiness?.id) {
                cashIn += book.totalCashIn || 0;
                cashOut += book.totalCashOut || 0;
                balance += book.netBalance || 0;
            }
        });

        return { totalCashIn: cashIn, totalCashOut: cashOut, netBalance: balance };
    }, [books, currentBusiness]);

    // Fetch recent activity
    useEffect(() => {
        if (!currentBusiness?.id || !db) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                // Calculate date filter
                let activityQuery;
                const entriesRef = collection(db!, 'businesses', currentBusiness.id, 'entries');

                if (selectedDays !== null) {
                    const cutoffDate = new Date();
                    cutoffDate.setDate(cutoffDate.getDate() - selectedDays);
                    const cutoffTimestamp = Timestamp.fromDate(cutoffDate);

                    activityQuery = query(
                        entriesRef,
                        where('date', '>=', cutoffTimestamp),
                        orderBy('date', 'desc'),
                        limit(100)
                    );
                } else {
                    // All time - no date filter
                    activityQuery = query(
                        entriesRef,
                        orderBy('date', 'desc'),
                        limit(100)
                    );
                }

                const activitySnapshot = await getDocs(activityQuery);
                const activityData = activitySnapshot.docs.map(doc => {
                    const data = doc.data();
                    // Handle Firestore Timestamp conversion safely
                    let dateStr = data.date;
                    if (data.date && typeof data.date.toDate === 'function') {
                        dateStr = data.date.toDate().toISOString();
                    } else if (data.date && data.date instanceof Date) {
                        dateStr = data.date.toISOString();
                    } else if (typeof data.date === 'string') {
                        dateStr = data.date;
                    } else {
                        // Fallback for missing or invalid date
                        dateStr = new Date().toISOString();
                    }

                    return {
                        id: doc.id,
                        ...data,
                        date: dateStr
                    } as BookEntry;
                });
                setRecentActivity(activityData);

            } catch (error) {
                console.error('Error fetching activity data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [currentBusiness?.id, selectedDays]);

    return (
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
            {/* Decorative Circles */}
            <View style={[styles.circle1, { backgroundColor: isDark ? 'rgba(33, 201, 141, 0.05)' : 'rgba(16, 185, 129, 0.1)' }]} />
            <View style={[styles.circle2, { backgroundColor: isDark ? 'rgba(33, 201, 141, 0.03)' : 'rgba(16, 185, 129, 0.08)' }]} />

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Animated.View entering={FadeIn.delay(100).duration(200)} style={styles.headerContainer}>
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
                    <Text style={[styles.headerTitle, { fontFamily: getFontFamily(deviceFont), color: colors.text }]}>Activity</Text>
                </Animated.View>

                <Animated.View entering={FadeIn.delay(200).duration(200)}>
                    {/* Summary Cards */}
                    <View style={styles.summaryContainer}>
                        <View style={[
                            styles.mainCard,
                            {
                                backgroundColor: netBalance >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                borderColor: netBalance >= 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'
                            }
                        ]}>
                            <Text style={[styles.mainCardLabel, { color: colors.textSecondary }]}>Net Balance</Text>
                            <Text style={[styles.mainCardValue, { color: netBalance >= 0 ? '#10b981' : '#ef4444' }]}>
                                {formatCurrency(netBalance, currentBusiness?.currency)}
                            </Text>
                        </View>
                        <View style={styles.row}>
                            <View style={[styles.halfCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <View style={[styles.iconCircle, { backgroundColor: theme === 'dark' ? 'rgba(16, 185, 129, 0.2)' : '#dcfce7' }]}>
                                    <TrendingUp size={24} color="#10b981" />
                                </View>
                                <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Cash In</Text>
                                <Text style={[styles.cardValue, { color: '#10b981' }]}>{formatCurrency(totalCashIn, currentBusiness?.currency)}</Text>
                            </View>
                            <View style={[styles.halfCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <View style={[styles.iconCircle, { backgroundColor: theme === 'dark' ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2' }]}>
                                    <TrendingDown size={24} color="#ef4444" />
                                </View>
                                <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Cash Out</Text>
                                <Text style={[styles.cardValue, { color: '#ef4444' }]}>{formatCurrency(totalCashOut, currentBusiness?.currency)}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Book Breakdown Section */}
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Book Breakdown</Text>
                    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        {books.filter(b => b.businessId === currentBusiness?.id).map((book, index, arr) => (
                            <TouchableOpacity
                                key={book.id}
                                style={[styles.bookRow, index === arr.length - 1 && styles.bookRowLast]}
                                onPress={() => router.push(`/book/${book.id}`)}
                            >
                                <View style={[styles.bookIcon, { backgroundColor: theme === 'dark' ? 'rgba(16, 185, 129, 0.1)' : '#f0fdf4' }]}>
                                    <BookOpen size={20} color={colors.primary} />
                                </View>
                                <View style={styles.bookInfo}>
                                    <Text style={[styles.bookName, { color: colors.text }]}>{book.name}</Text>
                                    <View style={styles.bookStats}>
                                        <View style={styles.bookStat}>
                                            <ArrowUpRight size={12} color="#10b981" />
                                            <Text style={[styles.bookStatText, { color: '#10b981' }]}>{formatCurrency(book.totalCashIn || 0, currentBusiness?.currency)}</Text>
                                        </View>
                                        <View style={styles.bookStat}>
                                            <ArrowDownRight size={12} color="#ef4444" />
                                            <Text style={[styles.bookStatText, { color: '#ef4444' }]}>{formatCurrency(book.totalCashOut || 0, currentBusiness?.currency)}</Text>
                                        </View>
                                    </View>
                                </View>
                                <Text style={[styles.bookBalance, { color: (book.netBalance || 0) >= 0 ? '#10b981' : '#ef4444' }]}>
                                    {formatCurrency(book.netBalance || 0, currentBusiness?.currency)}
                                </Text>
                                <ChevronRight size={18} color="#94a3b8" />
                            </TouchableOpacity>
                        ))}
                        {books.filter(b => b.businessId === currentBusiness?.id).length === 0 && (
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No books yet</Text>
                        )}
                    </View>

                    {/* Recent Activity */}
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Recent Activity</Text>

                    {/* Day Filter */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
                        {[
                            { label: '7 Days', value: 7 },
                            { label: '30 Days', value: 30 },
                            { label: '90 Days', value: 90 },
                            { label: 'All Time', value: null },
                        ].map((filter) => (
                            <TouchableOpacity
                                key={filter.label}
                                style={[styles.filterChip, { backgroundColor: colors.card, borderColor: colors.border }, selectedDays === filter.value && [styles.filterChipActive, { borderColor: 'transparent' }]]}
                                onPress={() => setSelectedDays(filter.value)}
                            >
                                {selectedDays === filter.value ? (
                                    <LinearGradient
                                        colors={[colors.primary, '#059669']}
                                        style={StyleSheet.absoluteFill}
                                    />
                                ) : null}
                                <Text style={[styles.filterChipText, { color: colors.textSecondary }, selectedDays === filter.value && [styles.filterChipTextActive, { color: '#fff' }]]}>
                                    {filter.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        {loading && recentActivity.length === 0 ? (
                            <ActivityIndicator size="small" color={colors.primary} style={{ padding: 20 }} />
                        ) : (
                            <>
                                {recentActivity.map((item, index, arr) => {
                                    const partyName = item.partyId ? parties.find(p => p.id === item.partyId)?.name : null;
                                    const creator = currentBusiness?.members?.find(m => m.userId === item.userId);
                                    const creatorName = creator?.user?.displayName || creator?.user?.name || creator?.user?.email?.split('@')[0] || 'Unknown User';

                                    return (
                                        <View key={item.id} style={[styles.activityRow, { borderBottomColor: colors.border }, index === arr.length - 1 && styles.activityRowLast]}>
                                            <View style={[styles.activityIcon, item.type === 'cash_in' ? styles.bgGreen : styles.bgRed]}>
                                                {item.type === 'cash_in' ? <TrendingUp size={20} color="#10b981" /> : <TrendingDown size={20} color="#ef4444" />}
                                            </View>
                                            <View style={styles.activityInfo}>
                                                <Text style={[styles.activityDesc, { color: colors.text }]} numberOfLines={1}>{item.description || 'No description'}</Text>
                                                <Text style={[styles.activityDate, { color: colors.textSecondary }]}>
                                                    {new Date(item.date).toLocaleDateString()}
                                                    {partyName ? ` • ${partyName}` : ''}
                                                    {` • by ${creatorName}`}
                                                </Text>
                                            </View>
                                            <Text style={[styles.activityAmount, { color: item.type === 'cash_in' ? '#10b981' : '#ef4444' }]}>
                                                {item.type === 'cash_in' ? '+' : '-'}{formatCurrency(item.amount, currentBusiness?.currency)}
                                            </Text>
                                        </View>
                                    );
                                })}
                                {recentActivity.length === 0 && !loading && (
                                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No recent activity</Text>
                                )}
                            </>
                        )}
                    </View>
                </Animated.View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
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
    content: {
        padding: 16,
        paddingBottom: 100,
    },
    headerContainer: {
        marginBottom: 16,
    },
    appName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#10b981',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginBottom: 8,
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
    },
    headerTitle: {
        fontFamily: 'AbrilFatface_400Regular',
        fontSize: 36,
        color: '#0f172a',
        marginBottom: 12,
    },
    summaryContainer: {
        marginBottom: 24,
    },
    mainCard: {
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    mainCardLabel: {
        fontSize: 13,
        color: '#64748b',
        marginBottom: 4,
        fontWeight: '600',
    },
    mainCardValue: {
        fontSize: 28,
        fontWeight: '800',
        letterSpacing: -1,
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    halfCard: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 2,
    },
    iconCircle: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    cardLabel: {
        fontSize: 12,
        color: '#64748b',
        marginBottom: 2,
        fontWeight: '500',
    },
    cardValue: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 12,
        marginLeft: 4,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 2,
    },
    bookRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    bookRowLast: {
        borderBottomWidth: 0,
    },
    bookIcon: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: '#f0fdf4',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    bookInfo: {
        flex: 1,
    },
    bookName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0f172a',
        marginBottom: 2,
    },
    bookStats: {
        flexDirection: 'column',
        gap: 1,
    },
    bookStat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    bookStatText: {
        fontSize: 11,
        fontWeight: '600',
    },
    bookBalance: {
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: -0.5,
        marginRight: 6,
    },
    filterContainer: {
        marginBottom: 12,
        flexDirection: 'row',
    },
    filterChip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 14,
        marginRight: 8,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        overflow: 'hidden',
    },
    filterChipActive: {
        borderColor: 'transparent',
    },
    filterChipText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748b',
    },
    filterChipTextActive: {
        color: '#fff',
    },
    activityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    activityRowLast: {
        borderBottomWidth: 0,
    },
    activityIcon: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    bgGreen: { backgroundColor: '#dcfce7' },
    bgRed: { backgroundColor: '#fee2e2' },
    activityInfo: { flex: 1 },
    activityDesc: { fontSize: 14, fontWeight: '600', color: '#0f172a', marginBottom: 1 },
    activityDate: { fontSize: 11, color: '#64748b', fontWeight: '500' },
    activityAmount: { fontSize: 14, fontWeight: '700', letterSpacing: -0.5 },
    textGreen: { color: '#10b981' },
    textRed: { color: '#ef4444' },
    emptyText: { textAlign: 'center', color: '#94a3b8', padding: 40, fontSize: 16 },
});
