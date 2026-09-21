import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera, Image as ImageIcon, X, FileText, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/providers/theme-provider';
import { GlassBackdrop } from '@/components/ui/glass-backdrop';

interface AttachmentSourceModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectCamera: () => void;
  onSelectGallery: () => void;
}

export function AttachmentSourceModal({
  visible,
  onClose,
  onSelectCamera,
  onSelectGallery,
}: AttachmentSourceModalProps) {
  const { colors, isDark } = useTheme();

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <GlassBackdrop isDark={isDark} onPress={onClose} />

          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View
              style={[
                styles.sheet,
                {
                  backgroundColor: isDark ? 'rgba(20, 20, 26, 0.96)' : 'rgba(255, 255, 255, 0.97)',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
                },
              ]}
            >
              {/* Drag Handle Indicator */}
              <View style={styles.handleWrap}>
                <View
                  style={[
                    styles.handle,
                    { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(0, 0, 0, 0.15)' },
                  ]}
                />
              </View>

              {/* Header */}
              <View style={styles.header}>
                <View style={{ flex: 1 }}>
                  <View style={styles.badgeRow}>
                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)',
                          borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)',
                        },
                      ]}
                    >
                      <FileText size={11} color="#10b981" />
                      <Text style={styles.badgeText}>DOCUMENT PROOF</Text>
                    </View>
                  </View>
                  <Text style={[styles.title, { color: colors.text }]}>Add Attachment</Text>
                  <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    Attach an invoice, receipt, or transaction voucher
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.closeBtn,
                    { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' },
                  ]}
                  onPress={onClose}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.7}
                >
                  <X size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Option Cards */}
              <View style={styles.optionsList}>
                {/* Camera Card */}
                <TouchableOpacity
                  style={[
                    styles.optionCard,
                    {
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#f8fafc',
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
                    },
                  ]}
                  onPress={() => {
                    onClose();
                    setTimeout(onSelectCamera, 120);
                  }}
                  activeOpacity={0.75}
                >
                  <LinearGradient
                    colors={['#10b981', '#059669']}
                    style={styles.iconOrb}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Camera size={22} color="#ffffff" strokeWidth={2} />
                  </LinearGradient>

                  <View style={styles.optionContent}>
                    <Text style={[styles.optionTitle, { color: colors.text }]}>Take Photo</Text>
                    <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                      Capture a physical receipt or invoice with camera
                    </Text>
                  </View>

                  <ChevronRight size={18} color={colors.textSecondary} />
                </TouchableOpacity>

                {/* Photo Library Card */}
                <TouchableOpacity
                  style={[
                    styles.optionCard,
                    {
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#f8fafc',
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
                    },
                  ]}
                  onPress={() => {
                    onClose();
                    setTimeout(onSelectGallery, 120);
                  }}
                  activeOpacity={0.75}
                >
                  <LinearGradient
                    colors={['#3b82f6', '#2563eb']}
                    style={styles.iconOrb}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <ImageIcon size={22} color="#ffffff" strokeWidth={2} />
                  </LinearGradient>

                  <View style={styles.optionContent}>
                    <Text style={[styles.optionTitle, { color: colors.text }]}>Photo Library</Text>
                    <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                      Select from photos, saved bills, or scanned documents
                    </Text>
                  </View>

                  <ChevronRight size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Cancel Button */}
              <TouchableOpacity
                style={[
                  styles.cancelBtn,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0',
                  },
                ]}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={[styles.cancelText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  sheet: {
    width: '100%',
    maxWidth: 480,
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
    elevation: 24,
    overflow: 'hidden',
  },
  handleWrap: {
    alignItems: 'center',
    paddingVertical: 6,
    marginBottom: 6,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: {
    color: '#10b981',
    fontSize: 10,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 0.6,
  },
  title: {
    fontSize: 19,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk_400Regular',
    lineHeight: 18,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  optionsList: {
    gap: 12,
    marginBottom: 16,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  iconOrb: {
    width: 48,
    height: 48,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontFamily: 'SpaceGrotesk_700Bold',
    marginBottom: 3,
  },
  optionDescription: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_400Regular',
    lineHeight: 16,
  },
  cancelBtn: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
});
