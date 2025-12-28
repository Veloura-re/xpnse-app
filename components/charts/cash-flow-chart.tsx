import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { BookEntry } from '@/types';
import { format, parseISO, startOfDay, eachDayOfInterval, subDays, isSameDay } from 'date-fns';

interface CashFlowChartProps {
    entries: BookEntry[];
    days?: number;
}

export const CashFlowChart = ({ entries, days = 7 }: CashFlowChartProps) => {
    const screenWidth = Dimensions.get('window').width;

    // Process data
    const endDate = startOfDay(new Date());
    const startDate = subDays(endDate, days - 1);
    const dateRange = eachDayOfInterval({ start: startDate, end: endDate });

    const cashInPoints: Array<{ value: number; label: string; dataPointText: string }> = [];
    const cashOutPoints: Array<{ value: number; label: string; dataPointText: string }> = [];

    dateRange.forEach((date) => {
        const dayEntries = entries.filter(e => isSameDay(parseISO(e.createdAt), date));

        const cashIn = dayEntries
            .filter(e => e.type === 'cash_in')
            .reduce((sum, e) => sum + e.amount, 0);

        const cashOut = dayEntries
            .filter(e => e.type === 'cash_out')
            .reduce((sum, e) => sum + e.amount, 0);

        const label = format(date, 'dd/MM');

        cashInPoints.push({
            value: cashIn,
            label: label,
            dataPointText: cashIn > 0 ? cashIn.toString() : '',
        });

        cashOutPoints.push({
            value: cashOut,
            label: label,
            dataPointText: cashOut > 0 ? cashOut.toString() : '',
        });
    });

    // If no data, show empty state or flat line
    const hasData = entries.length > 0;

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Cash Flow Trend</Text>
            <View style={styles.chartContainer}>
                <LineChart
                    data={cashInPoints}
                    data2={cashOutPoints}
                    height={220}
                    width={screenWidth - 60}
                    spacing={40}
                    initialSpacing={20}
                    color1="#10b981" // Green for Cash In
                    color2="#ef4444" // Red for Cash Out
                    textColor1="#10b981"
                    textColor2="#ef4444"
                    dataPointsHeight={6}
                    dataPointsWidth={6}
                    dataPointsColor1="#10b981"
                    dataPointsColor2="#ef4444"
                    textShiftY={-2}
                    textShiftX={-5}
                    textFontSize={10}
                    xAxisThickness={1}
                    yAxisThickness={1}
                    yAxisTextStyle={{ color: '#6b7280', fontSize: 10 }}
                    xAxisLabelTextStyle={{ color: '#6b7280', fontSize: 10 }}
                    hideRules
                    curved
                    isAnimated
                />
            </View>
            <View style={styles.legend}>
                <View style={styles.legendItem}>
                    <View style={[styles.dot, { backgroundColor: '#10b981' }]} />
                    <Text style={styles.legendText}>Cash In</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
                    <Text style={styles.legendText}>Cash Out</Text>
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
        marginLeft: -10, // Adjust for axis labels
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
});
