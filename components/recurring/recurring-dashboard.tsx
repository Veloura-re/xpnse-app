import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Repeat,
  SlidersHorizontal,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  PauseCircle,
  PlayCircle,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/providers/theme-provider';
import { RecurringRule, Book } from '@/types';
import { formatCurrency } from '@/utils/currency-utils';
import { isRuleDue, getFrequencyLabel, formatDueBadge, parseDateString, getTodayString } from '@/utils/recurring-engine';
import * as Haptics from 'expo-haptics';

export type FilterType = 'all' | 'expense' | 'income' | 'due' | 'paused';

interface RecurringDashboardProps {
  recurringRules: RecurringRule[];
  books: Book[];
  businessCurrency: string;
  activeFilter: FilterType;
  onSelectFilter: (filter: FilterType) => void;
  onPostAllDue: (dueRules: RecurringRule[]) => Promise<void>;
  isPostingBatch?: boolean;
  onOpenCreate: () => void;
}

export function RecurringDashboard({
  recurringRules,
  books,
  businessCurrency,
  activeFilter,
  onSelectFilter,
  onPostAllDue,
  isPostingBatch = false,
  onOpenCreate,
}: RecurringDashboardProps) {
  const { colors, isDark } = useTheme();

  // Aggregate Metrics & Forecasts
  const data = useMemo(() => {
    let monthlyExpenses = 0;
    let monthlyIncome = 0;
    let dueCount = 0;
    let totalDueAmount = 0;
    let pausedCount = 0;
    let expenseCount = 0;
    let incomeCount = 0;

    const dueRules: RecurringRule[] = [];
    const activeRules: RecurringRule[] = [];
    const frequencyCounts: Record<string, number> = {
      daily: 0,
      weekly: 0,
      biweekly: 0,
      monthly: 0,
      quarterly: 0,
      yearly: 0,
    };

    let topExpenseRule: RecurringRule | null = null;
    let maxExpenseNormalized = 0;

    const todayStr = getTodayString();
    const todayDate = parseDateString(todayStr);
    const in7Days = new Date(todayDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    const in30Days = new Date(todayDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    let next7DaysExpense = 0;
    let next30DaysExpense = 0;

    recurringRules.forEach((rule) => {
      if (rule.status === 'paused') {
        pausedCount++;
      } else {
        activeRules.push(rule);
      }

      if (rule.type === 'cash_in') {
        incomeCount++;
      } else {
        expenseCount++;
      }

      if (frequencyCounts[rule.frequency] !== undefined) {
        frequencyCounts[rule.frequency]++;
      }

      if (rule.status === 'active') {
        let multiplier = 1;
        switch (rule.frequency) {
          case 'daily':
            multiplier = 30;
            break;
          case 'weekly':
            multiplier = 4.33;
            break;
          case 'biweekly':
            multiplier = 2.16;
            break;
          case 'monthly':
            multiplier = 1;
            break;
          case 'quarterly':
            multiplier = 0.33;
            break;
          case 'yearly':
            multiplier = 0.083;
            break;
        }

        const normalizedMonthly = (rule.amount || 0) * multiplier;

        if (rule.type === 'cash_in') {
          monthlyIncome += normalizedMonthly;
        } else {
          monthlyExpenses += normalizedMonthly;
          if (normalizedMonthly > maxExpenseNormalized) {
            maxExpenseNormalized = normalizedMonthly;
            topExpenseRule = rule;
          }

          // Upcoming window calculations
          if (rule.nextDueDate) {
            const dueDate = parseDateString(rule.nextDueDate);
            if (dueDate <= in7Days) {
              next7DaysExpense += rule.amount || 0;
            }
            if (dueDate <= in30Days) {
              next30DaysExpense += rule.amount || 0;
            }
          }
        }

        if (isRuleDue(rule.nextDueDate, todayStr)) {
          dueCount++;
          dueRules.push(rule);
          totalDueAmount += rule.amount || 0;
        }
      }
    });

    const netMonthly = monthlyIncome - monthlyExpenses;
    const totalVolume = monthlyExpenses + monthlyIncome;
    const incomePercent = totalVolume > 0 ? (monthlyIncome / totalVolume) * 100 : 50;
    const expensePercent = totalVolume > 0 ? (monthlyExpenses / totalVolume) * 100 : 50;

    // Find next upcoming rule (not due yet)
    const upcomingRules = activeRules
      .filter((r) => !isRuleDue(r.nextDueDate, todayStr))
      .sort((a, b) => (a.nextDueDate > b.nextDueDate ? 1 : -1));
    const nextUpcomingRule = upcomingRules[0] || null;

    return {
      monthlyExpenses,
      monthlyIncome,
      netMonthly,
      dueCount,
      dueRules,
      totalDueAmount,
      pausedCount,
      activeCount: activeRules.length,
      expenseCount,
      incomeCount,
      incomePercent,
      expensePercent,
      topExpenseRule,
      next7DaysExpense,
      next30DaysExpense,
      nextUpcomingRule,
      frequencyCounts,
    };
  }, [recurringRules]);

  const handleBatchPost = () => {
    if (data.dueRules.length === 0 || isPostingBatch) return;
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (e) {}
    }
    onPostAllDue(data.dueRules);
  };

  const handleFilterClick = (filter: FilterType) => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (e) {}
    }
    onSelectFilter(filter);
  };

  const filterOptions: { id: FilterType; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: recurringRules.length },
    { id: 'expense', label: 'Expenses', count: data.expenseCount },
    { id: 'income', label: 'Income', count: data.incomeCount },
    { id: 'due', label: 'Due Now', count: data.dueCount },
    { id: 'paused', label: 'Paused', count: data.pausedCount },
  ];

  return (
    <View style={styles.container}>
      {/* 1. HERO FORECAST CARD */}
      <View
        style={[
          styles.heroCard,
          {
            backgroundColor: colors.cardGlass,
            borderColor: colors.borderGlass,
          },
        ]}
      >
        {/* Top Sheen */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 20,
            right: 20,
            height: 1,
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.09)' : 'rgba(255, 255, 255, 0.7)',
            zIndex: 10,
          }}
        />

        {/* Hero Header */}
        <View style={styles.heroTopRow}>
          <View>
            <Text
              style={[
                styles.heroPreTitle,
                { color: colors.textSecondary, fontFamily: 'SpaceGrotesk_700Bold' },
              ]}
            >
              MONTHLY CASH FLOW FORECAST
            </Text>
            <View style={styles.heroValueRow}>
              <Text
                style={[
                  styles.heroMainValue,
                  {
                    color:
                      data.netMonthly >= 0
                        ? colors.primary
                        : '#EF4444',
                    fontFamily: 'SpaceGrotesk_700Bold',
                  },
                ]}
              >
                {data.netMonthly >= 0 ? '+' : ''}
                {formatCurrency(data.netMonthly, businessCurrency)}
              </Text>
              <View
                style={[
                  styles.netTrendBadge,
                  {
                    backgroundColor:
                      data.netMonthly >= 0
                        ? isDark
                          ? 'rgba(16, 185, 129, 0.15)'
                          : '#dcfce7'
                        : isDark
                        ? 'rgba(239, 68, 68, 0.15)'
                        : '#fee2e2',
                  },
                ]}
              >
                {data.netMonthly >= 0 ? (
                  <TrendingUp size={12} color={colors.primary} />
                ) : (
                  <TrendingDown size={12} color="#EF4444" />
                )}
                <Text
                  style={[
                    styles.netTrendText,
                    {
                      color: data.netMonthly >= 0 ? colors.primary : '#EF4444',
                      fontFamily: 'SpaceGrotesk_700Bold',
                    },
                  ]}
                >
                  {data.netMonthly >= 0 ? 'Surplus' : 'Deficit'}
                </Text>
              </View>
            </View>
          </View>

          <View
            style={[
              styles.sparkleBadge,
              {
                backgroundColor: isDark
                  ? 'rgba(255, 255, 255, 0.05)'
                  : 'rgba(0, 0, 0, 0.04)',
                borderColor: colors.borderGlass,
              },
            ]}
          >
            <Repeat size={16} color={colors.primary} />
          </View>
        </View>

        {/* Dual Split Bills vs Income */}
        <View style={styles.splitRow}>
          {/* Bills Card */}
          <TouchableOpacity
            style={[
              styles.splitCard,
              {
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.08)' : '#fef2f2',
                borderColor: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.15)',
              },
            ]}
            onPress={() => handleFilterClick('expense')}
            activeOpacity={0.7}
          >
            <View style={styles.splitHeader}>
              <View
                style={[
                  styles.splitIconWrap,
                  { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2' },
                ]}
              >
                <TrendingDown size={12} color="#EF4444" />
              </View>
              <Text
                style={[
                  styles.splitLabel,
                  { color: '#EF4444', fontFamily: 'SpaceGrotesk_700Bold' },
                ]}
              >
                BILLS OUTFLOW
              </Text>
            </View>
            <Text
              style={[
                styles.splitValue,
                { color: colors.text, fontFamily: 'SpaceGrotesk_700Bold' },
              ]}
            >
              {formatCurrency(data.monthlyExpenses, businessCurrency)}
            </Text>
            <Text
              style={[
                styles.splitSub,
                { color: colors.textSecondary, fontFamily: 'SpaceGrotesk_400Regular' },
              ]}
            >
              {data.expenseCount} active schedules
            </Text>
          </TouchableOpacity>

          {/* Income Card */}
          <TouchableOpacity
            style={[
              styles.splitCard,
              {
                backgroundColor: isDark ? 'rgba(16, 185, 129, 0.08)' : '#f0fdf4',
                borderColor: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.15)',
              },
            ]}
            onPress={() => handleFilterClick('income')}
            activeOpacity={0.7}
          >
            <View style={styles.splitHeader}>
              <View
                style={[
                  styles.splitIconWrap,
                  { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#dcfce7' },
                ]}
              >
                <TrendingUp size={12} color={colors.primary} />
              </View>
              <Text
                style={[
                  styles.splitLabel,
                  { color: colors.primary, fontFamily: 'SpaceGrotesk_700Bold' },
                ]}
              >
                INCOME INFLOW
              </Text>
            </View>
            <Text
              style={[
                styles.splitValue,
                { color: colors.text, fontFamily: 'SpaceGrotesk_700Bold' },
              ]}
            >
              {formatCurrency(data.monthlyIncome, businessCurrency)}
            </Text>
            <Text
              style={[
                styles.splitSub,
                { color: colors.textSecondary, fontFamily: 'SpaceGrotesk_400Regular' },
              ]}
            >
              {data.incomeCount} active schedules
            </Text>
          </TouchableOpacity>
        </View>

        {/* Proportional Ratio Bar */}
        {recurringRules.length > 0 && (
          <View style={styles.meterContainer}>
            <View style={styles.meterHeader}>
              <Text
                style={[
                  styles.meterLabel,
                  { color: colors.textSecondary, fontFamily: 'SpaceGrotesk_600SemiBold' },
                ]}
              >
                Inflow Ratio: {Math.round(data.incomePercent)}%
              </Text>
              <Text
                style={[
                  styles.meterLabel,
                  { color: colors.textSecondary, fontFamily: 'SpaceGrotesk_600SemiBold' },
                ]}
              >
                Outflow Ratio: {Math.round(data.expensePercent)}%
              </Text>
            </View>
            <View
              style={[
                styles.meterTrack,
                { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' },
              ]}
            >
              <View
                style={[
                  styles.meterFillIncome,
                  {
                    width: `${data.incomePercent}%`,
                    backgroundColor: colors.primary,
                  },
                ]}
              />
              <View
                style={[
                  styles.meterFillExpense,
                  {
                    width: `${data.expensePercent}%`,
                    backgroundColor: '#EF4444',
                  },
                ]}
              />
            </View>
          </View>
        )}
      </View>

      {/* 2. DUE NOW RADAR OR ALL-CAUGHT-UP RADAR */}
      {data.dueCount > 0 ? (
        <View
          style={[
            styles.dueRadarCard,
            {
              backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#fff1f2',
              borderColor: isDark ? 'rgba(239, 68, 68, 0.35)' : '#fecdd3',
            },
          ]}
        >
          <View style={styles.dueRadarLeft}>
            <View style={styles.dueIconBadge}>
              <AlertTriangle size={16} color="#EF4444" />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.dueRadarTitle,
                  { color: '#EF4444', fontFamily: 'SpaceGrotesk_700Bold' },
                ]}
              >
                {data.dueCount} {data.dueCount === 1 ? 'Schedule' : 'Schedules'} Due Now
              </Text>
              <Text
                style={[
                  styles.dueRadarSub,
                  { color: colors.textSecondary, fontFamily: 'SpaceGrotesk_400Regular' },
                ]}
              >
                Total {formatCurrency(data.totalDueAmount, businessCurrency)} ready to post
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.postAllBtn, { backgroundColor: '#EF4444' }]}
            onPress={handleBatchPost}
            disabled={isPostingBatch}
            activeOpacity={0.8}
          >
            {isPostingBatch ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Zap size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text
                  style={[
                    styles.postAllBtnText,
                    { fontFamily: 'SpaceGrotesk_700Bold' },
                  ]}
                >
                  Post All
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : data.nextUpcomingRule ? (
        <View
          style={[
            styles.upcomingCard,
            {
              backgroundColor: colors.cardGlass,
              borderColor: colors.borderGlass,
            },
          ]}
        >
          <View style={styles.upcomingLeft}>
            <View
              style={[
                styles.upcomingIconBadge,
                { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#dcfce7' },
              ]}
            >
              <ShieldCheck size={16} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.upcomingTitle,
                  { color: colors.text, fontFamily: 'SpaceGrotesk_700Bold' },
                ]}
              >
                All Current Schedules Recorded
              </Text>
              <Text
                style={[
                  styles.upcomingSub,
                  { color: colors.textSecondary, fontFamily: 'SpaceGrotesk_400Regular' },
                ]}
                numberOfLines={1}
              >
                Next: {data.nextUpcomingRule.description} ({formatDueBadge(data.nextUpcomingRule.nextDueDate).label})
              </Text>
            </View>
          </View>

          <View style={styles.upcomingRightAmount}>
            <Text
              style={[
                styles.upcomingAmountText,
                {
                  color:
                    data.nextUpcomingRule.type === 'cash_in'
                      ? colors.primary
                      : '#EF4444',
                  fontFamily: 'SpaceGrotesk_700Bold',
                },
              ]}
            >
              {formatCurrency(data.nextUpcomingRule.amount, businessCurrency)}
            </Text>
          </View>
        </View>
      ) : null}

      {/* 3. PROJECTION TILES (7-Day & 30-Day Outlook) */}
      <View style={styles.tilesRow}>
        <View
          style={[
            styles.tileCard,
            {
              backgroundColor: colors.cardGlass,
              borderColor: colors.borderGlass,
            },
          ]}
        >
          <View style={styles.tileHeader}>
            <Clock size={12} color={colors.textSecondary} />
            <Text
              style={[
                styles.tileLabel,
                { color: colors.textSecondary, fontFamily: 'SpaceGrotesk_700Bold' },
              ]}
            >
              NEXT 7 DAYS
            </Text>
          </View>
          <Text
            style={[
              styles.tileValue,
              { color: colors.text, fontFamily: 'SpaceGrotesk_700Bold' },
            ]}
          >
            {formatCurrency(data.next7DaysExpense, businessCurrency)}
          </Text>
          <Text
            style={[
              styles.tileSub,
              { color: colors.textSecondary, fontFamily: 'SpaceGrotesk_400Regular' },
            ]}
          >
            upcoming bills
          </Text>
        </View>

        <View
          style={[
            styles.tileCard,
            {
              backgroundColor: colors.cardGlass,
              borderColor: colors.borderGlass,
            },
          ]}
        >
          <View style={styles.tileHeader}>
            <Calendar size={12} color={colors.textSecondary} />
            <Text
              style={[
                styles.tileLabel,
                { color: colors.textSecondary, fontFamily: 'SpaceGrotesk_700Bold' },
              ]}
            >
              NEXT 30 DAYS
            </Text>
          </View>
          <Text
            style={[
              styles.tileValue,
              { color: colors.text, fontFamily: 'SpaceGrotesk_700Bold' },
            ]}
          >
            {formatCurrency(data.next30DaysExpense, businessCurrency)}
          </Text>
          <Text
            style={[
              styles.tileSub,
              { color: colors.textSecondary, fontFamily: 'SpaceGrotesk_400Regular' },
            ]}
          >
            estimated 30d total
          </Text>
        </View>

        <View
          style={[
            styles.tileCard,
            {
              backgroundColor: colors.cardGlass,
              borderColor: colors.borderGlass,
            },
          ]}
        >
          <View style={styles.tileHeader}>
            <Repeat size={12} color={colors.textSecondary} />
            <Text
              style={[
                styles.tileLabel,
                { color: colors.textSecondary, fontFamily: 'SpaceGrotesk_700Bold' },
              ]}
            >
              ACTIVE
            </Text>
          </View>
          <Text
            style={[
              styles.tileValue,
              { color: colors.primary, fontFamily: 'SpaceGrotesk_700Bold' },
            ]}
          >
            {data.activeCount} / {recurringRules.length}
          </Text>
          <Text
            style={[
              styles.tileSub,
              { color: colors.textSecondary, fontFamily: 'SpaceGrotesk_400Regular' },
            ]}
          >
            {data.pausedCount} paused
          </Text>
        </View>
      </View>

      {/* 4. INTERACTIVE 1-TAP FILTER PILLS */}
      <View style={styles.filterStrip}>
        {filterOptions.map((opt) => {
          const isSelected = activeFilter === opt.id;
          return (
            <TouchableOpacity
              key={opt.id}
              style={[
                styles.filterPill,
                {
                  backgroundColor: isSelected
                    ? isDark
                      ? 'rgba(16, 185, 129, 0.2)'
                      : '#dcfce7'
                    : colors.cardGlass,
                  borderColor: isSelected ? colors.primary : colors.borderGlass,
                },
              ]}
              onPress={() => handleFilterClick(opt.id)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterPillText,
                  {
                    color: isSelected ? colors.primary : colors.textSecondary,
                    fontFamily: isSelected ? 'SpaceGrotesk_700Bold' : 'SpaceGrotesk_600SemiBold',
                  },
                ]}
              >
                {opt.label}
              </Text>
              <View
                style={[
                  styles.filterPillBadge,
                  {
                    backgroundColor: isSelected
                      ? colors.primary
                      : isDark
                      ? 'rgba(255, 255, 255, 0.08)'
                      : 'rgba(0, 0, 0, 0.06)',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterPillBadgeText,
                    {
                      color: isSelected ? '#FFFFFF' : colors.textSecondary,
                      fontFamily: 'SpaceGrotesk_700Bold',
                    },
                  ]}
                >
                  {opt.count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 12,
  },
  heroCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    overflow: 'hidden',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  heroPreTitle: {
    fontSize: 10,
    letterSpacing: 0.8,
    marginBottom: 4,
    textTransform: 'uppercase',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  heroValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroMainValue: {
    fontSize: 26,
    letterSpacing: -0.5,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  netTrendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  netTrendText: {
    fontSize: 11,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  sparkleBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splitRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  splitCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  splitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  splitIconWrap: {
    width: 20,
    height: 20,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splitLabel: {
    fontSize: 9.5,
    letterSpacing: 0.5,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  splitValue: {
    fontSize: 16,
    marginBottom: 2,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  splitSub: {
    fontSize: 11,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  meterContainer: {
    marginTop: 2,
  },
  meterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  meterLabel: {
    fontSize: 10.5,
    fontFamily: 'SpaceGrotesk_500Medium',
  },
  meterTrack: {
    height: 6,
    borderRadius: 4,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  meterFillIncome: {
    height: '100%',
  },
  meterFillExpense: {
    height: '100%',
  },
  dueRadarCard: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dueRadarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 10,
  },
  dueIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dueRadarTitle: {
    fontSize: 13.5,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  dueRadarSub: {
    fontSize: 11,
    marginTop: 1,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  postAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  postAllBtnText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  upcomingCard: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  upcomingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 10,
  },
  upcomingIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upcomingTitle: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  upcomingSub: {
    fontSize: 11,
    marginTop: 1,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  upcomingRightAmount: {
    alignItems: 'flex-end',
  },
  upcomingAmountText: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  tilesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tileCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 10,
  },
  tileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  tileLabel: {
    fontSize: 9,
    letterSpacing: 0.5,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  tileValue: {
    fontSize: 13.5,
    marginBottom: 2,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  tileSub: {
    fontSize: 10,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  filterStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
  filterPillBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 10,
    minWidth: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPillBadgeText: {
    fontSize: 10,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
});
