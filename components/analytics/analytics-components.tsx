import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { formatCurrency } from '@/utils/currency-utils';

interface StatCardProps {
    title: string;
    value: string;
    icon: any;
    color: string;
    trend?: 'up' | 'down';
    trendValue?: string;
    colors: any;
    isDark: boolean;
}

export const StatCard = React.memo(({
    title,
    value,
    icon: Icon,
    color,
    trend,
    trendValue,
    colors,
    isDark
}: StatCardProps) => (
    <View style={[
        styles.statCard, 
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
        <View style={styles.statContent}>
            <View style={styles.statHeader}>
                <View style={[styles.statIcon, { backgroundColor: `${color}18` }]}>
                    <Icon size={16} color={color} />
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
    </View>
));

interface ProgressBarProps {
    label: string;
    value: number;
    total: number;
    color: string;
    colors: any;
    isDark: boolean;
    currency?: string;
}

export const ProgressBar = React.memo(({ label, value, total, color, colors, isDark, currency }: ProgressBarProps) => {
    const percentage = total > 0 ? (value / total) * 100 : 0;
    return (
        <View style={styles.progressItem}>
            <View style={styles.progressHeader}>
                <Text style={[styles.progressLabel, { color: colors.text }]} numberOfLines={1}>{label}</Text>
                <Text style={[styles.progressValue, { color: colors.textSecondary }]}>
                    {formatCurrency(value, currency)}
                </Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                <LinearGradient
                    colors={[color, color]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.progressFill, { width: `${Math.min(percentage, 100)}%` }]}
                />
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    statCard: {
        flex: 1,
        borderRadius: 16,
        borderWidth: 1,
        minHeight: 100,
    },
    statContent: {
        padding: 14,
    },
    statHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
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
        fontSize: 12,
        fontFamily: 'SpaceGrotesk_400Regular',
    },
    progressItem: {
        marginBottom: 12,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    progressLabel: {
        fontSize: 13,
        fontFamily: 'SpaceGrotesk_500Medium',
        flex: 1,
        marginRight: 8,
    },
    progressValue: {
        fontSize: 12,
        fontFamily: 'SpaceGrotesk_600SemiBold',
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
});
