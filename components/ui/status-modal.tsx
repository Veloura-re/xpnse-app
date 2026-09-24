import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react-native';
import { useTheme } from '@/providers/theme-provider';
import { GlassBackdrop } from '@/components/ui/glass-backdrop';

export interface StatusModalProps {
  visible: boolean;
  type?: 'success' | 'error' | 'info';
  badgeText?: string;
  title: string;
  message: string;
  buttonText?: string;
  autoCloseMs?: number;
  onClose: () => void;
}

export function StatusModal({
  visible,
  type = 'success',
  badgeText,
  title,
  message,
  buttonText = 'Done',
  autoCloseMs,
  onClose,
}: StatusModalProps) {
  const { colors, isDark } = useTheme();

  useEffect(() => {
    if (visible && autoCloseMs && autoCloseMs > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseMs);
      return () => clearTimeout(timer);
    }
  }, [visible, autoCloseMs, onClose]);

  if (!visible) return null;

  const isSuccess = type === 'success';
  const isError = type === 'error';

  const accentColor = isSuccess ? '#10b981' : isError ? '#ef4444' : '#3b82f6';
  const gradientColors: readonly [string, string] = isSuccess
    ? ['#10b981', '#059669']
    : isError
    ? ['#ef4444', '#dc2626']
    : ['#3b82f6', '#2563eb'];

  const resolvedBadge = badgeText || (isSuccess ? 'SYSTEM SUCCESS' : isError ? 'ACTION FAILED' : 'NOTICE');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <GlassBackdrop isDark={isDark} onPress={onClose} />

        <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
          <View
            style={[
              styles.card,
              {
                backgroundColor: isDark ? 'rgba(20, 20, 26, 0.96)' : 'rgba(255, 255, 255, 0.98)',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
              },
            ]}
          >
            {/* Top Sheen */}
            <LinearGradient
              colors={
                isDark
                  ? ['rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.02)', 'transparent']
                  : ['rgba(255, 255, 255, 0.8)', 'rgba(255, 255, 255, 0.2)', 'transparent']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.topSheen}
            />

            {/* Close Button */}
            <TouchableOpacity
              style={[
                styles.closeBtn,
                { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)' },
              ]}
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
            >
              <X size={16} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* Glowing Icon Orb */}
            <View
              style={[
                styles.iconOrb,
                {
                  backgroundColor: isSuccess
                    ? 'rgba(16, 185, 129, 0.12)'
                    : isError
                    ? 'rgba(239, 68, 68, 0.12)'
                    : 'rgba(59, 130, 246, 0.12)',
                  borderColor: isSuccess
                    ? 'rgba(16, 185, 129, 0.3)'
                    : isError
                    ? 'rgba(239, 68, 68, 0.3)'
                    : 'rgba(59, 130, 246, 0.3)',
                },
              ]}
            >
              {isSuccess ? (
                <CheckCircle2 size={30} color="#10b981" strokeWidth={2.2} />
              ) : isError ? (
                <AlertCircle size={30} color="#ef4444" strokeWidth={2.2} />
              ) : (
                <Info size={30} color="#3b82f6" strokeWidth={2.2} />
              )}
            </View>

            {/* Status Pill Badge */}
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)',
                },
              ]}
            >
              <View style={[styles.statusDot, { backgroundColor: accentColor }]} />
              <Text style={[styles.statusBadgeText, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                {resolvedBadge}
              </Text>
            </View>

            {/* Title & Message */}
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>

            {/* Primary Action Button */}
            <TouchableOpacity
              style={styles.buttonWrapper}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={gradientColors}
                style={styles.gradientBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.buttonText}>{buttonText}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 26,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.35,
    shadowRadius: 30,
    elevation: 20,
    overflow: 'hidden',
  },
  topSheen: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 1,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  iconOrb: {
    width: 64,
    height: 64,
    borderRadius: 22,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 14,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 10,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 0.7,
  },
  title: {
    fontSize: 19,
    fontFamily: 'SpaceGrotesk_700Bold',
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  message: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk_400Regular',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  buttonWrapper: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  gradientBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
});
