import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
  Linking,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ShieldCheck,
  ShieldAlert,
  Camera,
  HardDrive,
  CheckCircle2,
  Lock,
  ExternalLink,
  X,
} from 'lucide-react-native';
import { useTheme } from '@/providers/theme-provider';
import { GlassBackdrop } from '@/components/ui/glass-backdrop';

interface PermissionModalProps {
  visible: boolean;
  type: 'storage' | 'camera';
  isDeniedBySystem?: boolean;
  onClose: () => void;
  onAllow: () => void | Promise<void>;
  onOpenSettings?: () => void;
}

export function PermissionModal({
  visible,
  type,
  isDeniedBySystem = false,
  onClose,
  onAllow,
  onOpenSettings,
}: PermissionModalProps) {
  const { colors, isDark } = useTheme();

  if (!visible) return null;

  const isStorage = type === 'storage';

  const handleSettingsPress = () => {
    if (onOpenSettings) {
      onOpenSettings();
    } else if (Platform.OS !== 'web') {
      Linking.openSettings().catch(() => {});
    }
  };

  const title = isDeniedBySystem
    ? isStorage
      ? 'Storage Access Restricted'
      : 'Camera Access Restricted'
    : isStorage
    ? 'Storage Access Permission'
    : 'Camera Access Permission';

  const description = isDeniedBySystem
    ? isStorage
      ? 'Storage and media library access has been disabled in system settings. To attach receipts, invoices, and documents, please grant access in your device settings.'
      : 'Camera access has been disabled in system settings. To capture receipt photos in real time, please grant access in your device settings.'
    : isStorage
    ? 'spndy requires photo library access strictly to let you select and attach receipts, invoices, and payment proof to your financial records.'
    : 'spndy requires camera access strictly to capture physical receipts, invoices, and bills directly from your device camera.';

  const accentColor = isDeniedBySystem ? '#f59e0b' : '#10b981';
  const accentGradient: readonly [string, string] = isDeniedBySystem
    ? ['#f59e0b', '#d97706']
    : ['#10b981', '#059669'];

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

        <View
          style={[
            styles.card,
            {
              backgroundColor: isDark ? 'rgba(20, 20, 24, 0.94)' : 'rgba(255, 255, 255, 0.96)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
            },
          ]}
        >
          {/* Top Sheen Line */}
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

          {/* Close button in top-right */}
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

          {/* Icon Badge */}
          <View
            style={[
              styles.iconOrb,
              {
                backgroundColor: isDeniedBySystem
                  ? 'rgba(245, 158, 11, 0.12)'
                  : 'rgba(16, 185, 129, 0.12)',
                borderColor: isDeniedBySystem
                  ? 'rgba(245, 158, 11, 0.3)'
                  : 'rgba(16, 185, 129, 0.3)',
              },
            ]}
          >
            {isDeniedBySystem ? (
              <ShieldAlert size={28} color="#f59e0b" strokeWidth={2} />
            ) : isStorage ? (
              <HardDrive size={28} color="#10b981" strokeWidth={2} />
            ) : (
              <Camera size={28} color="#10b981" strokeWidth={2} />
            )}
          </View>

          {/* Security Tag */}
          <View
            style={[
              styles.securityTag,
              {
                backgroundColor: isDark
                  ? 'rgba(255, 255, 255, 0.06)'
                  : 'rgba(0, 0, 0, 0.04)',
                borderColor: isDark
                  ? 'rgba(255, 255, 255, 0.1)'
                  : 'rgba(0, 0, 0, 0.06)',
              },
            ]}
          >
            <ShieldCheck size={11} color={accentColor} />
            <Text
              style={[
                styles.securityTagText,
                { color: isDark ? '#94a3b8' : '#64748b' },
              ]}
            >
              PRIVACY & SECURITY ASSURANCE
            </Text>
          </View>

          {/* Title & Description */}
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {description}
          </Text>

          {/* Trust Guarantees Box */}
          <View
            style={[
              styles.trustBox,
              {
                backgroundColor: isDark
                  ? 'rgba(255, 255, 255, 0.03)'
                  : 'rgba(248, 250, 252, 0.8)',
                borderColor: isDark
                  ? 'rgba(255, 255, 255, 0.08)'
                  : 'rgba(226, 232, 240, 0.8)',
              },
            ]}
          >
            <View style={styles.trustItem}>
              <CheckCircle2 size={13} color="#10b981" />
              <Text
                style={[
                  styles.trustText,
                  { color: isDark ? '#cbd5e1' : '#475569' },
                ]}
              >
                Only selected media is processed
              </Text>
            </View>
            <View style={styles.trustItem}>
              <Lock size={13} color="#10b981" />
              <Text
                style={[
                  styles.trustText,
                  { color: isDark ? '#cbd5e1' : '#475569' },
                ]}
              >
                Strictly attached to your book entries
              </Text>
            </View>
            <View style={styles.trustItem}>
              <ShieldCheck size={13} color="#10b981" />
              <Text
                style={[
                  styles.trustText,
                  { color: isDark ? '#cbd5e1' : '#475569' },
                ]}
              >
                Zero tracking or third-party sharing
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonStack}>
            {isDeniedBySystem ? (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleSettingsPress}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={accentGradient}
                  style={styles.gradientBtn}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <ExternalLink size={16} color="#ffffff" style={{ marginRight: 8 }} />
                  <Text style={styles.primaryBtnText}>Open Device Settings</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={onAllow}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={accentGradient}
                  style={styles.gradientBtn}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <ShieldCheck size={16} color="#ffffff" style={{ marginRight: 8 }} />
                  <Text style={styles.primaryBtnText}>Allow Access</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.secondaryButton,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.06)'
                    : '#f1f5f9',
                  borderColor: isDark
                    ? 'rgba(255, 255, 255, 0.12)'
                    : '#e2e8f0',
                },
              ]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={[styles.secondaryBtnText, { color: colors.text }]}>
                {isDeniedBySystem ? 'Dismiss' : 'Not Now'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
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
    borderRadius: 28,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.35,
    shadowRadius: 32,
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
    width: 32,
    height: 32,
    borderRadius: 16,
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
    marginTop: 8,
    marginBottom: 16,
  },
  securityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
  },
  securityTagText: {
    fontSize: 9,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 0.8,
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
    lineHeight: 19,
    marginBottom: 18,
    paddingHorizontal: 8,
  },
  trustBox: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 8,
    marginBottom: 22,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trustText: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_500Medium',
  },
  buttonStack: {
    width: '100%',
    gap: 10,
  },
  primaryButton: {
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  secondaryButton: {
    width: '100%',
    paddingVertical: 13,
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
