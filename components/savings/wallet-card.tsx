import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
  HandCoins,
} from 'lucide-react-native';
import { useTheme } from '@/providers/theme-provider';
import { MemberAccount } from '@/types';
import { formatCurrency } from '@/utils/currency-utils';

interface WalletCardProps {
  account: MemberAccount | null;
  currency?: string;
  onAddMoney: () => void;
  onSendMoney: () => void;
  onCashOut: () => void;
  onRequestMoney?: () => void;
}

export const WalletCard: React.FC<WalletCardProps> = ({
  account,
  currency = 'USD',
  onAddMoney,
  onSendMoney,
  onCashOut,
  onRequestMoney,
}) => {
  const { colors, isDark } = useTheme();
  const [isBalanceHidden, setIsBalanceHidden] = useState(false);

  const mainBalance = account?.mainBalance ?? 0;
  const lockedBalance = account?.lockedSavingsBalance ?? 0;
  const totalBalance = mainBalance + lockedBalance;

  const liquidRatio = totalBalance > 0
    ? Math.min(100, Math.max(0, Math.round((mainBalance / totalBalance) * 100)))
    : 100;
  const lockedRatio = 100 - liquidRatio;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.cardShell,
          {
            backgroundColor: isDark ? '#0c1311' : '#ffffff',
            borderColor: isDark ? 'rgba(16, 185, 129, 0.25)' : 'rgba(16, 185, 129, 0.2)',
            shadowColor: isDark ? '#000000' : '#10b981',
            shadowOpacity: isDark ? 0.4 : 0.08,
            shadowRadius: isDark ? 16 : 14,
            elevation: isDark ? 6 : 3,
          },
        ]}
      >
        {/* Subtle Top Rim Gradient Sheen */}
        <LinearGradient
          colors={
            isDark
              ? ['rgba(16, 185, 129, 0.4)', 'rgba(52, 211, 153, 0.1)', 'transparent']
              : ['rgba(16, 185, 129, 0.3)', 'rgba(16, 185, 129, 0.05)', 'transparent']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.topSheen}
        />

        {/* 1. Header: Status & Controls */}
        <View style={styles.headerRow}>
          <View style={styles.badgeGroup}>
            <View
              style={[
                styles.statusPill,
                {
                  backgroundColor: isDark
                    ? 'rgba(16, 185, 129, 0.12)'
                    : 'rgba(16, 185, 129, 0.08)',
                  borderColor: isDark
                    ? 'rgba(16, 185, 129, 0.3)'
                    : 'rgba(16, 185, 129, 0.25)',
                },
              ]}
            >
              <View style={styles.statusDot} />
              <Text
                style={[
                  styles.statusText,
                  { color: isDark ? '#34d399' : '#059669' },
                ]}
              >
                SPENDABLE VAULT
              </Text>
            </View>
          </View>

          <View style={styles.controlsRow}>
            <View
              style={[
                styles.currencyPill,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.06)'
                    : '#f1f5f9',
                  borderColor: isDark
                    ? 'rgba(255, 255, 255, 0.1)'
                    : '#e2e8f0',
                },
              ]}
            >
              <Text
                style={[
                  styles.currencyText,
                  { color: isDark ? '#e2e8f0' : '#475569' },
                ]}
              >
                {currency}
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setIsBalanceHidden(!isBalanceHidden)}
              style={[
                styles.iconButton,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.06)'
                    : '#f1f5f9',
                  borderColor: isDark
                    ? 'rgba(255, 255, 255, 0.08)'
                    : '#e2e8f0',
                },
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {isBalanceHidden ? (
                <EyeOff size={15} color={isDark ? '#94a3b8' : '#64748b'} />
              ) : (
                <Eye size={15} color={isDark ? '#94a3b8' : '#64748b'} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. Primary Available Balance Display */}
        <View style={styles.balanceSection}>
          <Text
            style={[
              styles.balanceLabel,
              { color: isDark ? '#94a3b8' : '#64748b' },
            ]}
          >
            AVAILABLE BALANCE
          </Text>
          <Text
            style={[
              styles.balanceValue,
              { color: isDark ? '#ffffff' : '#0f172a' },
            ]}
            numberOfLines={1}
          >
            {isBalanceHidden ? '••••••••' : formatCurrency(mainBalance, currency)}
          </Text>
        </View>

        {/* 3. Minimalist Liquidity Ratio Bar */}
        <View style={styles.ratioModule}>
          <View style={styles.ratioHeader}>
            <View style={styles.ratioLabelGroup}>
              <View style={[styles.ratioIndicatorDot, { backgroundColor: '#10b981' }]} />
              <Text
                style={[
                  styles.ratioCaption,
                  { color: isDark ? '#cbd5e1' : '#475569' },
                ]}
              >
                Liquid: {liquidRatio}%
              </Text>
            </View>

            <View style={styles.ratioLabelGroup}>
              <View style={[styles.ratioIndicatorDot, { backgroundColor: '#f59e0b' }]} />
              <Text
                style={[
                  styles.ratioCaption,
                  { color: isDark ? '#cbd5e1' : '#475569' },
                ]}
              >
                Locked: {lockedRatio}%
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.ratioTrack,
              {
                backgroundColor: isDark
                  ? 'rgba(255, 255, 255, 0.08)'
                  : '#e2e8f0',
              },
            ]}
          >
            <View
              style={[
                styles.ratioFillLiquid,
                { width: `${liquidRatio}%` },
              ]}
            />
            <View
              style={[
                styles.ratioFillLocked,
                { width: `${lockedRatio}%` },
              ]}
            />
          </View>
        </View>

        {/* 4. Secondary Metric Pods */}
        <View style={styles.metricsRow}>
          {/* Locked in Goals */}
          <View
            style={[
              styles.metricCard,
              {
                backgroundColor: isDark
                  ? 'rgba(255, 255, 255, 0.03)'
                  : '#f8fafc',
                borderColor: isDark
                  ? 'rgba(255, 255, 255, 0.06)'
                  : '#e2e8f0',
              },
            ]}
          >
            <View style={styles.metricCardHeader}>
              <View
                style={[
                  styles.metricIconBox,
                  {
                    backgroundColor: isDark
                      ? 'rgba(245, 158, 11, 0.12)'
                      : 'rgba(245, 158, 11, 0.1)',
                  },
                ]}
              >
                <Lock size={12} color="#f59e0b" />
              </View>
              <Text
                style={[
                  styles.metricCardLabel,
                  { color: isDark ? '#94a3b8' : '#64748b' },
                ]}
              >
                LOCKED VAULTS
              </Text>
            </View>
            <Text
              style={[
                styles.metricCardValue,
                { color: isDark ? '#ffffff' : '#0f172a' },
              ]}
              numberOfLines={1}
            >
              {isBalanceHidden ? '••••' : formatCurrency(lockedBalance, currency)}
            </Text>
          </View>

          {/* Total Net Reserve */}
          <View
            style={[
              styles.metricCard,
              {
                backgroundColor: isDark
                  ? 'rgba(255, 255, 255, 0.03)'
                  : '#f8fafc',
                borderColor: isDark
                  ? 'rgba(255, 255, 255, 0.06)'
                  : '#e2e8f0',
              },
            ]}
          >
            <View style={styles.metricCardHeader}>
              <View
                style={[
                  styles.metricIconBox,
                  {
                    backgroundColor: isDark
                      ? 'rgba(16, 185, 129, 0.12)'
                      : 'rgba(16, 185, 129, 0.1)',
                  },
                ]}
              >
                <ShieldCheck size={12} color="#10b981" />
              </View>
              <Text
                style={[
                  styles.metricCardLabel,
                  { color: isDark ? '#94a3b8' : '#64748b' },
                ]}
              >
                TOTAL NET WORTH
              </Text>
            </View>
            <Text
              style={[
                styles.metricCardValue,
                { color: isDark ? '#ffffff' : '#0f172a' },
              ]}
              numberOfLines={1}
            >
              {isBalanceHidden ? '••••' : formatCurrency(totalBalance, currency)}
            </Text>
          </View>
        </View>

        {/* 5. Minimalist Ergonomic Action Buttons */}
        <View style={styles.actionDock}>
          {/* Add Money (Primary) */}
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={onAddMoney}
            style={styles.primaryActionOuter}
          >
            <LinearGradient
              colors={['#10b981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryActionBtn}
            >
              <ArrowDownLeft size={15} color="#ffffff" strokeWidth={2.5} />
              <Text style={styles.primaryActionText}>Add Money</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Send */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onSendMoney}
            style={[
              styles.secondaryActionBtn,
              {
                backgroundColor: isDark
                  ? 'rgba(255, 255, 255, 0.05)'
                  : '#f1f5f9',
                borderColor: isDark
                  ? 'rgba(255, 255, 255, 0.1)'
                  : '#e2e8f0',
              },
            ]}
          >
            <ArrowUpRight
              size={14}
              color={isDark ? '#34d399' : '#059669'}
              strokeWidth={2}
            />
            <Text
              style={[
                styles.secondaryActionText,
                { color: isDark ? '#e2e8f0' : '#1e293b' },
              ]}
            >
              Send
            </Text>
          </TouchableOpacity>

          {/* Request */}
          {onRequestMoney && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onRequestMoney}
              style={[
                styles.secondaryActionBtn,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.05)'
                    : '#f1f5f9',
                  borderColor: isDark
                    ? 'rgba(255, 255, 255, 0.1)'
                    : '#e2e8f0',
                },
              ]}
            >
              <HandCoins
                size={14}
                color={isDark ? '#34d399' : '#059669'}
                strokeWidth={2}
              />
              <Text
                style={[
                  styles.secondaryActionText,
                  { color: isDark ? '#e2e8f0' : '#1e293b' },
                ]}
              >
                Request
              </Text>
            </TouchableOpacity>
          )}

          {/* Cash Out */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onCashOut}
            style={[
              styles.secondaryActionBtn,
              {
                backgroundColor: isDark
                  ? 'rgba(255, 255, 255, 0.05)'
                  : '#f1f5f9',
                borderColor: isDark
                  ? 'rgba(255, 255, 255, 0.1)'
                  : '#e2e8f0',
              },
            ]}
          >
            <Landmark
              size={14}
              color={isDark ? '#34d399' : '#059669'}
              strokeWidth={2}
            />
            <Text
              style={[
                styles.secondaryActionText,
                { color: isDark ? '#e2e8f0' : '#1e293b' },
              ]}
            >
              Cash Out
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginTop: 2,
    marginBottom: 12,
  },
  cardShell: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  topSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  badgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 0.8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  statusText: {
    fontSize: 9.5,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 0.8,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currencyPill: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    borderWidth: 0.8,
  },
  currencyText: {
    fontSize: 10,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 0.4,
  },
  iconButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceSection: {
    marginBottom: 14,
  },
  balanceLabel: {
    fontSize: 10,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 0.9,
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 34,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: -0.6,
  },
  ratioModule: {
    marginBottom: 14,
  },
  ratioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  ratioLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  ratioIndicatorDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  ratioCaption: {
    fontSize: 10.5,
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
  ratioTrack: {
    height: 6,
    borderRadius: 3,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  ratioFillLiquid: {
    height: '100%',
    backgroundColor: '#10b981',
  },
  ratioFillLocked: {
    height: '100%',
    backgroundColor: '#f59e0b',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 0.8,
    padding: 12,
  },
  metricCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  metricIconBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricCardLabel: {
    fontSize: 8.5,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 0.8,
  },
  metricCardValue: {
    fontSize: 14.5,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: -0.3,
  },
  actionDock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryActionOuter: {
    flex: 1.3,
    borderRadius: 12,
    overflow: 'hidden',
  },
  primaryActionBtn: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  primaryActionText: {
    fontSize: 12.5,
    color: '#ffffff',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  secondaryActionBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 0.8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 6,
  },
  secondaryActionText: {
    fontSize: 11,
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
});
