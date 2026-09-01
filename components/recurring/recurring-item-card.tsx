import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  Repeat,
  ChevronRight,
  Send,
} from 'lucide-react-native';
import { useTheme } from '@/providers/theme-provider';
import { getFontFamily } from '@/config/font-config';
import { RecurringRule, Book } from '@/types';
import { formatCurrency } from '@/utils/currency-utils';
import { getFrequencyLabel, formatDueBadge } from '@/utils/recurring-engine';
import * as Haptics from 'expo-haptics';

interface RecurringItemCardProps {
  rule: RecurringRule;
  book?: Book;
  businessCurrency?: string;
  onPress: () => void;
  onPostNow: (rule: RecurringRule) => void;
  onTogglePause: (rule: RecurringRule) => void;
}

export function RecurringItemCard({
  rule,
  book,
  businessCurrency = 'USD',
  onPress,
  onPostNow,
  onTogglePause,
}: RecurringItemCardProps) {
  const { colors, isDark, deviceFont } = useTheme();

  const isCashIn = rule.type === 'cash_in';
  const isPaused = rule.status === 'paused';
  const isCompleted = rule.status === 'completed';

  const dueBadge = formatDueBadge(rule.nextDueDate);
  const frequencyLabel = getFrequencyLabel(rule.frequency, rule.interval);

  const handlePostNow = (e: any) => {
    e.stopPropagation();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPostNow(rule);
  };

  const handleToggle = (e: any) => {
    e.stopPropagation();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onTogglePause(rule);
  };

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: isDark ? colors.surface : '#FFFFFF',
          borderColor: dueBadge.isDueToday || dueBadge.isOverdue
            ? isCashIn
              ? colors.primary
              : '#EF4444'
            : colors.border,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.25 : 0.04,
          shadowRadius: 8,
          elevation: isDark ? 2 : 1,
          opacity: isPaused ? 0.65 : 1,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.topRow}>
        <View style={styles.leftInfo}>
          <View
            style={[
              styles.typeIcon,
              {
                backgroundColor: isCashIn
                  ? isDark
                    ? 'rgba(16, 185, 129, 0.15)'
                    : 'rgba(16, 185, 129, 0.1)'
                  : isDark
                  ? 'rgba(239, 68, 68, 0.15)'
                  : 'rgba(239, 68, 68, 0.1)',
              },
            ]}
          >
            {isCashIn ? (
              <TrendingUp size={16} color={colors.primary} />
            ) : (
              <TrendingDown size={16} color="#EF4444" />
            )}
          </View>
          <View style={styles.titleColumn}>
            <Text
              style={[
                styles.descriptionText,
                { color: colors.text, fontFamily: 'SpaceGrotesk_700Bold' },
              ]}
              numberOfLines={1}
            >
              {rule.description}
            </Text>
            <View style={styles.metaRow}>
              {book && (
                <Text
                  style={[
                    styles.bookName,
                    { color: colors.textSecondary, fontFamily: 'SpaceGrotesk_400Regular' },
                  ]}
                >
                  {book.name} •{' '}
                </Text>
              )}
              <Text
                style={[
                  styles.frequencyTag,
                  { color: colors.textSecondary, fontFamily: 'SpaceGrotesk_500Medium' },
                ]}
              >
                {frequencyLabel}
              </Text>
              {rule.category ? (
                <Text
                  style={[
                    styles.categoryTag,
                    { color: colors.textSecondary, fontFamily: 'SpaceGrotesk_400Regular' },
                  ]}
                >
                  {' '}• {rule.category}
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        {/* Amount */}
        <View style={styles.amountColumn}>
          <Text
            style={[
              styles.amountText,
              {
                color: isCashIn ? colors.primary : '#EF4444',
                fontFamily: 'SpaceGrotesk_700Bold',
              },
            ]}
          >
            {isCashIn ? '+' : '-'}
            {rule.originalCurrency && rule.originalCurrency !== businessCurrency
              ? `${rule.originalAmount?.toFixed(2)} ${rule.originalCurrency}`
              : formatCurrency(rule.amount, businessCurrency)}
          </Text>

          {rule.originalCurrency && rule.originalCurrency !== businessCurrency && (
            <Text
              style={[
                styles.baseAmountSub,
                { color: colors.textSecondary, fontFamily: 'SpaceGrotesk_400Regular' },
              ]}
            >
              ≈ {formatCurrency(rule.amount, businessCurrency)}
            </Text>
          )}
        </View>
      </View>

      <View style={[styles.bottomRow, { borderTopColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#EAE5DE' }]}>
        <View style={styles.dueSection}>
          <View
            style={[
              styles.dueBadge,
              {
                backgroundColor: dueBadge.isOverdue
                  ? 'rgba(239, 68, 68, 0.15)'
                  : dueBadge.isDueToday
                  ? isDark
                    ? 'rgba(16, 185, 129, 0.2)'
                    : 'rgba(16, 185, 129, 0.12)'
                  : isDark
                  ? 'rgba(255, 255, 255, 0.06)'
                  : 'rgba(0, 0, 0, 0.04)',
                borderColor: dueBadge.isOverdue
                  ? '#EF4444'
                  : dueBadge.isDueToday
                  ? colors.primary
                  : 'transparent',
              },
            ]}
          >
            <Clock
              size={12}
              color={
                dueBadge.isOverdue
                  ? '#EF4444'
                  : dueBadge.isDueToday
                  ? colors.primary
                  : colors.textSecondary
              }
              style={{ marginRight: 4 }}
            />
            <Text
              style={[
                styles.dueBadgeText,
                {
                  color: dueBadge.isOverdue
                    ? '#EF4444'
                    : dueBadge.isDueToday
                    ? colors.primary
                    : colors.textSecondary,
                  fontFamily: 'SpaceGrotesk_700Bold',
                },
              ]}
            >
              {dueBadge.label} ({rule.nextDueDate})
            </Text>
          </View>

          {rule.autoPost ? (
            <View
              style={[
                styles.autoPostTag,
                { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.08)' },
              ]}
            >
              <Text
                style={[
                  styles.autoPostText,
                  { color: colors.primary, fontFamily: 'SpaceGrotesk_500Medium' },
                ]}
              >
                Auto-Posts
              </Text>
            </View>
          ) : (
            <View
              style={[
                styles.autoPostTag,
                { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)' },
              ]}
            >
              <Text
                style={[
                  styles.autoPostText,
                  { color: colors.textSecondary, fontFamily: 'SpaceGrotesk_500Medium' },
                ]}
              >
                Manual Confirm
              </Text>
            </View>
          )}
        </View>

        <View style={styles.actionsGroup}>
          <TouchableOpacity
            style={[
              styles.pauseBtn,
              { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)' },
            ]}
            onPress={handleToggle}
          >
            {isPaused ? (
              <PlayCircle size={15} color={colors.primary} />
            ) : (
              <PauseCircle size={15} color={colors.textSecondary} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.postNowBtn,
              {
                backgroundColor: isCashIn
                  ? isDark
                    ? 'rgba(16, 185, 129, 0.2)'
                    : 'rgba(16, 185, 129, 0.12)'
                  : isDark
                  ? 'rgba(239, 68, 68, 0.15)'
                  : 'rgba(239, 68, 68, 0.1)',
                borderColor: isCashIn ? colors.primary : '#EF4444',
              },
            ]}
            onPress={handlePostNow}
          >
            <Send size={12} color={isCashIn ? colors.primary : '#EF4444'} style={{ marginRight: 4 }} />
            <Text
              style={[
                styles.postNowText,
                {
                  color: isCashIn ? colors.primary : '#EF4444',
                  fontFamily: 'SpaceGrotesk_700Bold',
                },
              ]}
            >
              Post Now
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  leftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  typeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  titleColumn: {
    flex: 1,
  },
  descriptionText: {
    fontSize: 15,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    flexWrap: 'wrap',
  },
  bookName: {
    fontSize: 12,
  },
  frequencyTag: {
    fontSize: 12,
  },
  categoryTag: {
    fontSize: 12,
  },
  amountColumn: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 15,
  },
  baseAmountSub: {
    fontSize: 11,
    marginTop: 2,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  dueSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  dueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  dueBadgeText: {
    fontSize: 11,
  },
  autoPostTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  autoPostText: {
    fontSize: 11,
  },
  actionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pauseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  postNowText: {
    fontSize: 11,
  },
});
