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
  const { isDark } = useTheme();
  const [isBalanceHidden, setIsBalanceHidden] = useState(false);

  const mainBalance = account?.mainBalance ?? 0;
  const lockedBalance = account?.lockedSavingsBalance ?? 0;
  const totalBalance = mainBalance + lockedBalance;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={
          isDark
            ? ['#064e3b', '#022c22', '#011812']
            : ['#047857', '#065f46', '#022c22']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.card,
          {
            borderColor: isDark ? 'rgba(52, 211, 153, 0.3)' : 'rgba(255, 255, 255, 0.3)',
            borderTopColor: isDark ? 'rgba(52, 211, 153, 0.6)' : 'rgba(255, 255, 255, 0.55)',
            shadowColor: '#10B981',
            shadowOpacity: isDark ? 0.35 : 0.25,
          },
        ]}
      >
        {/* Ambient Glow Orbs */}
        <View style={styles.ambientGlowTopRight} />
        <View style={styles.ambientGlowBottomLeft} />

        {/* Top Header Row */}
        <View style={styles.topRow}>
          <View style={styles.walletHeaderLeft}>
            <View style={styles.emvChipContainer}>
              <View style={styles.emvChipInner} />
              <View style={styles.emvChipLineH} />
              <View style={styles.emvChipLineV} />
            </View>
            <View>
              <View style={styles.badgeRow}>
                <View style={styles.livePulseDot} />
                <Text style={styles.walletLabel}>PREMIER SPENDABLE VAULT</Text>
              </View>
              <Text style={styles.cardMaskedNumber}>DISCOVER •••• 8829</Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setIsBalanceHidden(!isBalanceHidden)}
            style={styles.eyeButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {isBalanceHidden ? (
              <EyeOff size={16} color="#a7f3d0" />
            ) : (
              <Eye size={16} color="#a7f3d0" />
            )}
          </TouchableOpacity>
        </View>

        {/* Spendable Balance Display */}
        <View style={styles.balanceContainer}>
          <View style={styles.balanceCaptionRow}>
            <Text style={styles.balanceCaption}>Available Balance</Text>
            <View style={styles.currencyBadge}>
              <Text style={styles.currencyBadgeText}>{currency}</Text>
            </View>
          </View>
          <Text style={styles.balanceText} numberOfLines={1}>
            {isBalanceHidden ? '••••••••' : formatCurrency(mainBalance, currency)}
          </Text>
        </View>

        {/* Dual Metric Glass Capsules */}
        <View style={styles.statsBar}>
          <View style={styles.statPill}>
            <View style={[styles.statIconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
              <Lock size={12} color="#FBBF24" />
            </View>
            <View style={styles.statTextWrap}>
              <Text style={styles.statLabel}>Locked Vaults</Text>
              <Text style={styles.statValue}>
                {isBalanceHidden ? '••••' : formatCurrency(lockedBalance, currency)}
              </Text>
            </View>
          </View>

          <View style={styles.statPill}>
            <View style={[styles.statIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.25)' }]}>
              <ShieldCheck size={12} color="#34D399" />
            </View>
            <View style={styles.statTextWrap}>
              <Text style={styles.statLabel}>Net Reserve</Text>
              <Text style={styles.statValue}>
                {isBalanceHidden ? '••••' : formatCurrency(totalBalance, currency)}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Action Button Bar */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onAddMoney}
            style={styles.actionPrimaryButtonWrapper}
          >
            <LinearGradient
              colors={['#10B981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionPrimaryButton}
            >
              <ArrowDownLeft size={16} color="#ffffff" />
              <Text style={styles.actionPrimaryText}>Add Money</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onSendMoney}
            style={styles.actionGlassButton}
          >
            <ArrowUpRight size={16} color="#a7f3d0" />
            <Text style={styles.actionGlassText}>Send</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onCashOut}
            style={styles.actionGlassButton}
          >
            <Landmark size={15} color="#a7f3d0" />
            <Text style={styles.actionGlassText}>Cash Out</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginTop: 2,
    marginBottom: 16,
  },
  card: {
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderTopWidth: 1.5,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 10,
  },
  ambientGlowTopRight: {
    position: 'absolute',
    top: -50,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
  },
  ambientGlowBottomLeft: {
    position: 'absolute',
    bottom: -60,
    left: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  walletHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emvChipContainer: {
    width: 32,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#FCD34D',
    borderWidth: 1,
    borderColor: '#D97706',
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emvChipInner: {
    width: '100%',
    height: '100%',
    borderRadius: 3,
    borderWidth: 0.8,
    borderColor: '#B45309',
  },
  emvChipLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 0.8,
    backgroundColor: '#B45309',
  },
  emvChipLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 0.8,
    backgroundColor: '#B45309',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34D399',
  },
  walletLabel: {
    fontSize: 10.5,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#34D399',
    letterSpacing: 1.2,
  },
  cardMaskedNumber: {
    fontSize: 11,
    fontFamily: 'SpaceGrotesk_500Medium',
    color: 'rgba(255, 255, 255, 0.65)',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  eyeButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.09)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceContainer: {
    marginBottom: 18,
  },
  balanceCaptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  balanceCaption: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.72)',
    fontFamily: 'SpaceGrotesk_500Medium',
  },
  currencyBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    borderWidth: 0.5,
    borderColor: 'rgba(52, 211, 153, 0.4)',
  },
  currencyBadgeText: {
    fontSize: 9.5,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#6EE7B7',
    letterSpacing: 0.5,
  },
  balanceText: {
    fontSize: 36,
    color: '#ffffff',
    letterSpacing: -1,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  statPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.26)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
    gap: 9,
  },
  statIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statTextWrap: {
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.65)',
    fontFamily: 'SpaceGrotesk_400Regular',
    marginBottom: 1,
  },
  statValue: {
    fontSize: 12.5,
    color: '#ffffff',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionPrimaryButtonWrapper: {
    flex: 1.3,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  actionPrimaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  actionPrimaryText: {
    fontSize: 13,
    color: '#ffffff',
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: -0.2,
  },
  actionGlassButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.09)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: 14,
    gap: 6,
  },
  actionGlassText: {
    fontSize: 13,
    color: '#ffffff',
    fontFamily: 'SpaceGrotesk_600SemiBold',
    letterSpacing: -0.2,
  },
});
