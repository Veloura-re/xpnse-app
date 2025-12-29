import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BookOpen, ArrowUpRight, ArrowDownRight, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react-native';
import { formatCurrency } from '@/utils/currency-utils';
import { router } from 'expo-router';

interface BookBreakdownItemProps {
    book: any;
    currentBusiness: any;
    isDark: boolean;
    colors: any;
    isLast: boolean;
    theme: string;
}

export const BookBreakdownItem = React.memo(({ book, currentBusiness, isDark, colors, isLast, theme }: BookBreakdownItemProps) => (
    <TouchableOpacity
        style={[styles.bookRow, isLast && styles.bookRowLast, { borderBottomColor: colors.border || '#f1f5f9' }]}
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
));

interface ActivityItemProps {
    item: any;
    partyName: string | null;
    creatorName: string;
    currentBusiness: any;
    colors: any;
    isLast: boolean;
}

export const ActivityItem = React.memo(({ item, partyName, creatorName, currentBusiness, colors, isLast }: ActivityItemProps) => (
    <View style={[styles.activityRow, { borderBottomColor: colors.border || '#f1f5f9' }, isLast && styles.activityRowLast]}>
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
));

const styles = StyleSheet.create({
    bookRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
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
    activityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
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
    activityDesc: { fontSize: 14, fontWeight: '600', marginBottom: 1 },
    activityDate: { fontSize: 11, fontWeight: '500' },
    activityAmount: { fontSize: 14, fontWeight: '700', letterSpacing: -0.5 },
});
