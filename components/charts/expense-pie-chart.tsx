import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { BookEntry } from '@/types';

interface ExpensePieChartProps {
    entries: BookEntry[];
}

export const ExpensePieChart = ({ entries }: ExpensePieChartProps) => {
    // Filter for expenses only
    const expenses = entries.filter(e => e.type === 'cash_out');
    const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);

    // Aggregate by category
    const categoryMap = new Map<string, number>();
    expenses.forEach(e => {
        const category = e.category || 'Uncategorized';
        categoryMap.set(category, (categoryMap.get(category) || 0) + e.amount);
    });

    // Prepare data for chart
    const data = Array.from(categoryMap.entries()).map(([name, value], index) => {
        // Generate colors based on index
        const colors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#059669', '#10b981', '#34d399', '#ec4899'];
        const color = colors[index % colors.length];

        return {
            value,
            color,
            text: `${Math.round((value / totalExpense) * 100)}%`,
            name, // Custom property for legend
        };
    }).sort((a, b) => b.value - a.value); // Sort by value descending

    if (totalExpense === 0) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>Expense Breakdown</Text>
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No expenses to show</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Expense Breakdown</Text>
            <View style={styles.content}>
                <View style={styles.chartWrapper}>
                    <PieChart
                        data={data}
                        donut
                        showText
                        textColor="white"
                        radius={80}
                        innerRadius={50}
                        textSize={10}
                        focusOnPress
                        centerLabelComponent={() => (
                            <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1f2937' }}>
                                    {totalExpense.toLocaleString()}
                                </Text>
                                <Text style={{ fontSize: 10, color: '#6b7280' }}>Total</Text>
                            </View>
                        )}
                    />
                </View>
                <View style={styles.legend}>
                    {data.map((item, index) => (
                        <View key={index} style={styles.legendItem}>
                            <View style={[styles.dot, { backgroundColor: item.color }]} />
                            <Text style={styles.legendText} numberOfLines={1}>
                                {item.name} ({Math.round((item.value / totalExpense) * 100)}%)
                            </Text>
                        </View>
                    ))}
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
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    chartWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    legend: {
        flex: 1,
        marginLeft: 20,
        gap: 8,
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
        color: '#4b5563',
        flex: 1,
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
