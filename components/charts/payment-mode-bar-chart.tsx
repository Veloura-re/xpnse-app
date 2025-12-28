import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { BookEntry } from '@/types';

interface PaymentModeBarChartProps {
    entries: BookEntry[];
}

export const PaymentModeBarChart = ({ entries }: PaymentModeBarChartProps) => {
    const screenWidth = Dimensions.get('window').width;

    // Aggregate by payment mode
    const modeMap = new Map<string, { in: number; out: number }>();

    // Initialize common modes
    ['Cash', 'Online', 'Bank'].forEach(mode => {
        modeMap.set(mode, { in: 0, out: 0 });
    });

    entries.forEach(e => {
        const mode = e.paymentMode || 'Cash'; // Default to Cash if undefined
        // Normalize mode name if needed (e.g., 'upi' -> 'Online')
        let normalizedMode = mode;
        if (mode.toLowerCase().includes('upi') || mode.toLowerCase().includes('online')) normalizedMode = 'Online';
        else if (mode.toLowerCase().includes('bank') || mode.toLowerCase().includes('card')) normalizedMode = 'Bank';
        else normalizedMode = 'Cash';

        const current = modeMap.get(normalizedMode) || { in: 0, out: 0 };
        if (e.type === 'cash_in') current.in += e.amount;
        else current.out += e.amount;

        modeMap.set(normalizedMode, current);
    });

    // Prepare data for chart (Grouped bars)
    const barData: any[] = [];

    Array.from(modeMap.entries()).forEach(([mode, values]) => {
        if (values.in > 0 || values.out > 0) {
            barData.push({
                value: values.in,
                label: mode,
                spacing: 2,
                labelWidth: 30,
                labelTextStyle: { color: 'gray', fontSize: 10 },
                frontColor: '#10b981',
            });
            barData.push({
                value: values.out,
                frontColor: '#ef4444',
            });
        }
    });

    const hasData = barData.length > 0;

    if (!hasData) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>Payment Modes</Text>
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No data to show</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Payment Modes</Text>
            <View style={styles.chartContainer}>
                <BarChart
                    data={barData}
                    barWidth={20}
                    spacing={24}
                    roundedTop
                    roundedBottom
                    hideRules
                    xAxisThickness={1}
                    yAxisThickness={1}
                    yAxisTextStyle={{ color: '#6b7280', fontSize: 10 }}
                    noOfSections={4}
                    maxValue={Math.max(...barData.map(d => d.value)) * 1.2} // Add some headroom
                    height={180}
                    width={screenWidth - 80}
                />
            </View>
            <View style={styles.legend}>
                <View style={styles.legendItem}>
                    <View style={[styles.dot, { backgroundColor: '#10b981' }]} />
                    <Text style={styles.legendText}>In</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
                    <Text style={styles.legendText}>Out</Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 16,
    },
    chartContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    legend: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 16,
        gap: 24,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendText: {
        fontSize: 12,
        color: '#6b7280',
        fontWeight: '500',
    },
    emptyState: {
        height: 150,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        color: '#9ca3af',
        fontSize: 14,
    },
});
