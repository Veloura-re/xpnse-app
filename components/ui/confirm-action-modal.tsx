import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Trash2, AlertTriangle, X } from 'lucide-react-native';
import { useTheme } from '@/providers/theme-provider';
import { GlassBackdrop } from '@/components/ui/glass-backdrop';

interface ConfirmActionModalProps {
  visible: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConfirmActionModal({
  visible,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = true,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmActionModalProps) {
  const { colors, isDark } = useTheme();

  if (!visible) return null;

  const gradientColors = destructive
    ? (['#ef4444', '#dc2626'] as const)
    : (['#10b981', '#059669'] as const);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <GlassBackdrop isDark={isDark} onPress={onCancel} />

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
              onPress={onCancel}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
              disabled={loading}
            >
              <X size={16} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* Icon Orb */}
            <View
              style={[
                styles.iconOrb,
                {
                  backgroundColor: destructive
                    ? 'rgba(239, 68, 68, 0.12)'
                    : 'rgba(16, 185, 129, 0.12)',
                  borderColor: destructive
                    ? 'rgba(239, 68, 68, 0.3)'
                    : 'rgba(16, 185, 129, 0.3)',
                },
              ]}
            >
              {destructive ? (
                <Trash2 size={26} color="#ef4444" strokeWidth={2} />
              ) : (
                <AlertTriangle size={26} color="#10b981" strokeWidth={2} />
              )}
            </View>

            {/* Title & Description */}
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {description}
            </Text>

            {/* Buttons */}
            <View style={styles.buttonStack}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={onConfirm}
                activeOpacity={0.85}
                disabled={loading}
              >
                <LinearGradient
                  colors={gradientColors}
                  style={styles.gradientBtn}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.primaryBtnText}>{confirmLabel}</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#e2e8f0',
                  },
                ]}
                onPress={onCancel}
                activeOpacity={0.7}
                disabled={loading}
              >
                <Text style={[styles.secondaryBtnText, { color: colors.text }]}>
                  {cancelLabel}
                </Text>
              </TouchableOpacity>
            </View>
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
    maxWidth: 360,
    borderRadius: 24,
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
    top: 14,
    right: 14,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  iconOrb: {
    width: 58,
    height: 58,
    borderRadius: 20,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk_700Bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk_400Regular',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 22,
    paddingHorizontal: 6,
  },
  buttonStack: {
    width: '100%',
    gap: 10,
  },
  primaryButton: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
  },
  gradientBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  secondaryButton: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
});
