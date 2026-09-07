import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  Eye,
  EyeOff,
  Lock,
  Wallet,
  ShieldCheck,
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
}

export const WalletCard: React.FC<WalletCardProps> = ({
  account,
  currency = 'USD',
  onAddMoney,
  onSendMoney,
  onCashOut,
}) => {
  const { colors, isDark } = useTheme();
  const [isBalanceHidden, setIsBalanceHidden] = useState(false);

  const mainBalance = account?.mainBalance ?? 0;
  const lockedBalance = account?.lockedSavingsBalance ?? 0;
  const totalBalance = mainBalance + lockedBalance;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={
          isDark
            ? ['#13221c', '#0d1814', '#0a120f']
            : ['#047857', '#065f46', '#064e3b']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.card,
          {
            borderColor: isDark ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.2)',
            shadowColor: '#10B981',
            shadowOpacity: isDark ? 0.2 : 0.25,
          },
        ]}
      >
        {/* Subtle Decorative Backdrop Elements */}
        <View style={styles.topRow}>
          <View style={styles.walletHeaderLeft}>
            <View style={styles.iconBubble}>
              <Wallet size={16} color="#34d399" />
            </View>
            <Text style={styles.walletLabel}>PERSONAL WALLET</Text>
          </View>

          <View style={styles.topRightControls}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setIsBalanceHidden(!isBalanceHidden)}
              style={styles.eyeButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {isBalanceHidden ? (
                <EyeOff size={18} color="#a7f3d0" />
              ) : (
                <Eye size={18} color="#a7f3d0" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Primary Spendable Balance */}
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceCaption}>Spendable Balance</Text>
          <Text style={styles.balanceText} numberOfLines={1}>
            {isBalanceHidden ? '••••••••' : formatCurrency(mainBalance, currency)}
          </Text>
        </View>

        {/* Secondary Info: Locked in Vaults & Total */}
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <View style={styles.statIconWrap}>
              <Lock size={12} color="#6ee7b7" />
            </View>
            <Text style={styles.statLabel}>Locked Vaults:</Text>
            <Text style={styles.statValue}>
              {isBalanceHidden ? '••••' : formatCurrency(lockedBalance, currency)}
            </Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <View style={styles.statIconWrap}>
              <ShieldCheck size={12} color="#6ee7b7" />
            </View>
            <Text style={styles.statLabel}>Net Worth:</Text>
            <Text style={styles.statValue}>
              {isBalanceHidden ? '••••' : formatCurrency(totalBalance, currency)}
            </Text>
          </View>
        </View>

        {/* Quick Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onAddMoney}
            style={styles.actionButton}
          >
            <View style={[styles.actionIconCircle, { backgroundColor: '#10B981' }]}>
              <ArrowDownLeft size={18} color="#ffffff" />
            </View>
            <Text style={styles.actionText}>Add Money</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onSendMoney}
            style={styles.actionButton}
          >
            <View style={[styles.actionIconCircle, { backgroundColor: 'rgba(255, 255, 255, 0.18)' }]}>
              <ArrowUpRight size={18} color="#ffffff" />
            </View>
            <Text style={styles.actionText}>Send</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onCashOut}
            style={styles.actionButton}
          >
            <View style={[styles.actionIconCircle, { backgroundColor: 'rgba(255, 255, 255, 0.18)' }]}>
              <Landmark size={18} color="#ffffff" />
            </View>
            <Text style={styles.actionText}>Cash Out</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginVertical: 12,
  },
  card: {
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 8,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  walletHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#a7f3d0',
    letterSpacing: 1.1,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  topRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eyeButton: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  balanceContainer: {
    marginBottom: 16,
  },
  balanceCaption: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  balanceText: {
    fontSize: 34,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statIconWrap: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.75)',
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  statValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  statDivider: {
    width: 1,
    height: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  actionIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
});
