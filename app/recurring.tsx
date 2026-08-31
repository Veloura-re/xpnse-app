import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
  Alert,
  Dimensions,
  ScrollView,
  StatusBar,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import {
  ChevronLeft,
  Plus,
  Repeat,
  TrendingDown,
  TrendingUp,
  Clock,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Sun,
  Moon,
  SlidersHorizontal,
  ChevronDown,
  Check,
  X,
} from 'lucide-react-native';
import { GlassBackdrop } from '@/components/ui/glass-backdrop';
import { useTheme } from '@/providers/theme-provider';
import { useBusiness } from '@/providers/business-provider';
import { RecurringRule } from '@/types';
import { RecurringItemCard } from '@/components/recurring/recurring-item-card';
import { RecurringRuleModal } from '@/components/recurring/recurring-rule-modal';
import { RecurringDashboard, FilterType } from '@/components/recurring/recurring-dashboard';
import { formatCurrency } from '@/utils/currency-utils';
import { isRuleDue } from '@/utils/recurring-engine';
import { BackgroundDecor } from '@/components/ui/background-decor';
import * as Haptics from 'expo-haptics';

const FILTER_LABELS: Record<FilterType, string> = {
  all: 'All Schedules',
  expense: 'Expenses Only',
  income: 'Income Only',
  due: 'Due Now',
  paused: 'Paused',
};

export default function RecurringScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark, setTheme } = useTheme();
  const {
    recurringRules,
    books,
    currentBusiness,
    togglePauseRecurringRule,
    postRecurringEntryNow,
  } = useBusiness();

  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRule, setSelectedRule] = useState<RecurringRule | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [isPostingBatch, setIsPostingBatch] = useState(false);

  const businessCurrency = currentBusiness?.currency || 'USD';

  // Strictly filter rules belonging to the active business
  const currentBusinessRules = useMemo(() => {
    if (!currentBusiness) return [];
    return recurringRules.filter((r) => !r.businessId || r.businessId === currentBusiness.id);
  }, [recurringRules, currentBusiness?.id]);

  // Compute summary stats
  const stats = useMemo(() => {
    let monthlyExpenses = 0;
    let monthlyIncome = 0;
    let dueCount = 0;
    let pausedCount = 0;
    let expenseCount = 0;
    let incomeCount = 0;

    currentBusinessRules.forEach((rule) => {
      if (rule.status === 'paused') {
        pausedCount++;
      }
      if (rule.type === 'cash_in') {
        incomeCount++;
      } else {
        expenseCount++;
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
        }

        if (isRuleDue(rule.nextDueDate)) {
          dueCount++;
        }
      }
    });

    return {
      monthlyExpenses,
      monthlyIncome,
      dueCount,
      pausedCount,
      expenseCount,
      incomeCount,
      activeCount: currentBusinessRules.filter((r) => r.status === 'active').length,
    };
  }, [currentBusinessRules]);

  // Filter list
  const filteredRules = useMemo(() => {
    return currentBusinessRules.filter((rule) => {
      if (activeFilter === 'expense') return rule.type === 'cash_out';
      if (activeFilter === 'income') return rule.type === 'cash_in';
      if (activeFilter === 'due') return rule.status === 'active' && isRuleDue(rule.nextDueDate);
      if (activeFilter === 'paused') return rule.status === 'paused';
      return true;
    });
  }, [currentBusinessRules, activeFilter]);

  const handleCreateNew = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (e) {}
    }
    setSelectedRule(null);
    setModalVisible(true);
  };

  const handleEditRule = (rule: RecurringRule) => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (e) {}
    }
    setSelectedRule(rule);
    setModalVisible(true);
  };

  const handlePostNow = async (rule: RecurringRule) => {
    try {
      await postRecurringEntryNow(rule);
      if (Platform.OS !== 'web') {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (e) {}
      }
      Alert.alert(
        'Transaction Posted',
        `"${rule.description}" has been recorded in the book. Next due date updated to ${rule.nextDueDate}.`
      );
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not post recurring transaction.');
    }
  };

  const handlePostAllDue = async (dueRules: RecurringRule[]) => {
    if (dueRules.length === 0) return;
    setIsPostingBatch(true);
    let successCount = 0;
    try {
      for (const rule of dueRules) {
        try {
          await postRecurringEntryNow(rule);
          successCount++;
        } catch (e) {
          console.error(`Failed to post rule ${rule.id}`, e);
        }
      }
      if (Platform.OS !== 'web') {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (e) {}
      }
      Alert.alert(
        'Batch Posting Complete',
        `Recorded ${successCount} of ${dueRules.length} due transactions.`
      );
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not batch post recurring transactions.');
    } finally {
      setIsPostingBatch(false);
    }
  };

  const handleTogglePause = async (rule: RecurringRule) => {
    await togglePauseRecurringRule(rule.id);
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top,
          paddingBottom: insets.bottom + 16,
        },
      ]}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <BackgroundDecor />
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      {/* Redesigned Clean Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[
              styles.headerIconButton,
              { backgroundColor: colors.surfaceGlass, borderColor: colors.borderGlass },
            ]}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ChevronLeft size={22} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.headerTitleGroup}>
            <Text style={[styles.headerPreTitle, { color: colors.primary, fontFamily: 'SpaceGrotesk_700Bold' }]}>
              SCHEDULES
            </Text>
            <Text
              style={[
                styles.headerTitle,
                { color: colors.text, fontFamily: 'SpaceGrotesk_700Bold' },
              ]}
              numberOfLines={1}
            >
              Recurring
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[
              styles.headerIconButton,
              { backgroundColor: colors.surfaceGlass, borderColor: colors.borderGlass },
            ]}
            onPress={() => setTheme(isDark ? 'light' : 'dark')}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {isDark ? <Sun size={17} color="#F59E0B" /> : <Moon size={17} color={colors.textSecondary} />}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleCreateNew}
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
            <Plus size={18} color="#FFFFFF" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Recurring Rules List with Integrated Interactive Dashboard */}
      <FlatList
        data={filteredRules}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <RecurringDashboard
            recurringRules={recurringRules}
            books={books}
            businessCurrency={businessCurrency}
            activeFilter={activeFilter}
            onSelectFilter={setActiveFilter}
            onPostAllDue={handlePostAllDue}
            isPostingBatch={isPostingBatch}
            onOpenCreate={handleCreateNew}
          />
        }
        renderItem={({ item }) => {
          const book = books.find((b) => b.id === item.bookId);
          return (
            <View style={{ paddingHorizontal: 16 }}>
              <RecurringItemCard
                rule={item}
                book={book}
                businessCurrency={businessCurrency}
                onPress={() => handleEditRule(item)}
                onPostNow={handlePostNow}
                onTogglePause={handleTogglePause}
              />
            </View>
          );
        }}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View
              style={[
                styles.emptyIconBox,
                { backgroundColor: colors.surfaceGlass, borderColor: colors.borderGlass },
              ]}
            >
              <Repeat size={32} color={colors.textSecondary} />
            </View>
            <Text
              style={[
                styles.emptyTitle,
                { color: colors.text, fontFamily: 'SpaceGrotesk_700Bold' },
              ]}
            >
              {activeFilter === 'all'
                ? 'No Recurring Schedules'
                : `No ${FILTER_LABELS[activeFilter]}`}
            </Text>
            <Text
              style={[
                styles.emptySub,
                { color: colors.textSecondary, fontFamily: 'SpaceGrotesk_400Regular' },
              ]}
            >
              Automate rent, salaries, subscriptions, and regular cash flow with 1 tap.
            </Text>
            <TouchableOpacity
              style={[styles.createEmptyBtn, { backgroundColor: colors.primary }]}
              onPress={handleCreateNew}
              activeOpacity={0.85}
            >
              <Plus size={16} color="#FFFFFF" style={{ marginRight: 6 }} strokeWidth={2.5} />
              <Text
                style={[
                  styles.createEmptyBtnText,
                  { fontFamily: 'SpaceGrotesk_700Bold' },
                ]}
              >
                Add First Schedule
              </Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Consolidated Overview & Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType={Platform.OS === 'web' ? 'none' : 'fade'}
        onRequestClose={() => setShowFilterModal(false)}
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <GlassBackdrop isDark={isDark} onPress={() => setShowFilterModal(false)} />
          <View
            style={[
              styles.filterSheetContent,
              {
                backgroundColor: colors.surfaceGlass,
                borderColor: colors.borderGlass,
                paddingBottom: insets.bottom + 20,
              },
            ]}
          >
            {/* Top Sheen */}
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 24,
                right: 24,
                height: 1,
                backgroundColor: isDark
                  ? 'rgba(255, 255, 255, 0.08)'
                  : 'rgba(255, 255, 255, 0.65)',
                zIndex: 10,
              }}
            />

            {/* Sheet Header */}
            <View style={styles.sheetHeader}>
              <View>
                <Text
                  style={[
                    styles.sheetTitle,
                    { color: colors.text, fontFamily: 'SpaceGrotesk_700Bold' },
                  ]}
                >
                  Overview & Filters
                </Text>
                <Text
                  style={[
                    styles.sheetSubtitle,
                    { color: colors.textSecondary, fontFamily: 'SpaceGrotesk_400Regular' },
                  ]}
                >
                  Monthly projections & schedule filters
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.closeSheetBtn,
                  { backgroundColor: colors.surfaceGlass, borderColor: colors.borderGlass },
                ]}
                onPress={() => setShowFilterModal(false)}
                activeOpacity={0.7}
              >
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Stat Cards Breakdown */}
            <View style={styles.modalStatsRow}>
              <View
                style={[
                  styles.modalStatCard,
                  {
                    backgroundColor: colors.cardGlass,
                    borderColor: colors.borderGlass,
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <View
                    style={[
                      styles.statIconBadge,
                      { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2' },
                    ]}
                  >
                    <TrendingDown size={11} color="#EF4444" />
                  </View>
                  <Text
                    style={[
                      styles.modalStatLabel,
                      { color: colors.textSecondary, fontFamily: 'SpaceGrotesk_700Bold' },
                    ]}
                  >
                    MONTHLY BILLS
                  </Text>
                </View>
                <Text
                  style={[
                    styles.modalStatValue,
                    { color: '#EF4444', fontFamily: 'SpaceGrotesk_700Bold' },
                  ]}
                >
                  {formatCurrency(stats.monthlyExpenses, businessCurrency)}
                </Text>
              </View>

              <View
                style={[
                  styles.modalStatCard,
                  {
                    backgroundColor: colors.cardGlass,
                    borderColor: colors.borderGlass,
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <View
                    style={[
                      styles.statIconBadge,
                      { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#dcfce7' },
                    ]}
                  >
                    <TrendingUp size={11} color="#10b981" />
                  </View>
                  <Text
                    style={[
                      styles.modalStatLabel,
                      { color: colors.textSecondary, fontFamily: 'SpaceGrotesk_700Bold' },
                    ]}
                  >
                    MONTHLY INCOME
                  </Text>
                </View>
                <Text
                  style={[
                    styles.modalStatValue,
                    { color: '#10b981', fontFamily: 'SpaceGrotesk_700Bold' },
                  ]}
                >
                  {formatCurrency(stats.monthlyIncome, businessCurrency)}
                </Text>
              </View>
            </View>

            {/* Filter Options List */}
            <Text
              style={[
                styles.filterSectionTitle,
                { color: colors.textSecondary, fontFamily: 'SpaceGrotesk_700Bold' },
              ]}
            >
              FILTER SCHEDULES
            </Text>

            <View style={styles.filterOptionsList}>
              {(
                [
                  { id: 'all', label: 'All Schedules', count: recurringRules.length },
                  { id: 'expense', label: 'Expenses (Cash Out)', count: stats.expenseCount },
                  { id: 'income', label: 'Income (Cash In)', count: stats.incomeCount },
                  { id: 'due', label: 'Due Now', count: stats.dueCount },
                  { id: 'paused', label: 'Paused Schedules', count: stats.pausedCount },
                ] as { id: FilterType; label: string; count: number }[]
              ).map((item) => {
                const isSelected = activeFilter === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.filterOptionRow,
                      {
                        backgroundColor: isSelected
                          ? isDark
                            ? 'rgba(16, 185, 129, 0.15)'
                            : '#f0fdf4'
                          : colors.cardGlass,
                        borderColor: isSelected ? colors.primary : colors.borderGlass,
                      },
                    ]}
                    onPress={() => {
                      if (Platform.OS !== 'web') {
                        try {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        } catch (e) {}
                      }
                      setActiveFilter(item.id);
                      setShowFilterModal(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                      <View
                        style={[
                          styles.radioCircle,
                          {
                            borderColor: isSelected ? colors.primary : colors.borderGlass,
                            backgroundColor: isSelected ? colors.primary : 'transparent',
                          },
                        ]}
                      >
                        {isSelected && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                      </View>
                      <Text
                        style={[
                          styles.filterOptionLabel,
                          {
                            color: isSelected ? colors.text : colors.textSecondary,
                            fontFamily: isSelected ? 'SpaceGrotesk_700Bold' : 'SpaceGrotesk_500Medium',
                          },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.filterOptionCountBadge,
                        {
                          backgroundColor: isSelected
                            ? isDark
                              ? 'rgba(16, 185, 129, 0.25)'
                              : '#dcfce7'
                            : isDark
                            ? 'rgba(255, 255, 255, 0.06)'
                            : 'rgba(0, 0, 0, 0.05)',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterOptionCountText,
                          {
                            color: isSelected ? colors.primary : colors.textSecondary,
                            fontFamily: 'SpaceGrotesk_700Bold',
                          },
                        ]}
                      >
                        {item.count}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* Create / Edit Recurring Schedule Modal */}
      <RecurringRuleModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        rule={selectedRule}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleGroup: {
    flex: 1,
  },
  headerPreTitle: {
    fontSize: 9,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 18,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  singleButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  singleFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  singleButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  singleButtonIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  singleButtonTitle: {
    fontSize: 13,
  },
  singleButtonSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  dueDotBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  dueDotText: {
    color: '#FFFFFF',
    fontSize: 9,
  },
  chevronBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  createEmptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 14,
  },
  createEmptyBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  filterSheetContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    overflow: 'hidden',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
  },
  sheetSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeSheetBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  modalStatCard: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  statIconBadge: {
    width: 18,
    height: 18,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 5,
  },
  modalStatLabel: {
    fontSize: 9,
    letterSpacing: 0.5,
  },
  modalStatValue: {
    fontSize: 15,
  },
  filterSectionTitle: {
    fontSize: 10,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  filterOptionsList: {
    gap: 8,
  },
  filterOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterOptionLabel: {
    fontSize: 13,
  },
  filterOptionCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  filterOptionCountText: {
    fontSize: 11,
  },
});
