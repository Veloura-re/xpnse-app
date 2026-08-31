import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Clipboard,
} from 'react-native';
import { ChevronLeft, CreditCard, Heart, Copy, Check } from 'lucide-react-native';
import { router, Stack } from 'expo-router';
import { useTheme } from '@/providers/theme-provider';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackgroundDecor } from '@/components/ui/background-decor';
import * as Haptics from 'expo-haptics';

export default function DonateScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [copied, setCopied] = React.useState(false);

  const cardNumber = '4938 7554 2557 0742';

  const handleCopy = () => {
    const rawNumber = cardNumber.replace(/\s+/g, '');
    Clipboard.setString(rawNumber);
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        navigator.clipboard.writeText(rawNumber);
      } catch (e) {}
    }
    setCopied(true);
    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {}
    }
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <BackgroundDecor />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: colors.surfaceGlass, borderColor: colors.borderGlass }]}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text, fontFamily: 'SpaceGrotesk_700Bold' }]}>Support Us</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#f0fdf4', borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : '#bbf7d0', borderWidth: 1 }]}>
            <Heart size={36} color="#10b981" fill="#10b981" />
          </View>

          <Text style={[styles.title, { color: colors.text, fontFamily: 'SpaceGrotesk_700Bold' }]}>Support the Developer</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary, fontFamily: 'SpaceGrotesk_400Regular' }]}>
            If you find spndy helpful, consider supporting the developer. Your contributions help keep the app updated, secure, and free for everyone!
          </Text>

          <View style={[styles.donateCard, {
            backgroundColor: colors.cardGlass,
            borderColor: colors.borderGlass,
          }]}>
            {/* Top Sheen */}
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 20,
                right: 20,
                height: 1,
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.65)',
                zIndex: 10,
              }}
            />
            <View style={{
              backgroundColor: isDark ? 'rgba(16, 185, 129, 0.08)' : '#f0fdf4',
              borderRadius: 20,
              padding: 20,
              borderWidth: 1.5,
              borderColor: isDark ? 'rgba(16, 185, 129, 0.25)' : '#10b981',
              borderStyle: 'dashed',
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <LinearGradient
                  colors={['#10b981', '#059669']}
                  style={{ padding: 8, borderRadius: 12 }}
                >
                  <CreditCard size={20} color="#fff" />
                </LinearGradient>
                <View style={{ backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#dcfce7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14 }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: isDark ? colors.primary : '#059669', letterSpacing: 0.5, fontFamily: 'SpaceGrotesk_700Bold' }}>BYBIT CARD</Text>
                </View>
              </View>

              <TouchableOpacity onPress={handleCopy} activeOpacity={0.7} style={{ alignItems: 'center', paddingVertical: 6 }}>
                <Text style={{
                  fontSize: 22,
                  fontFamily: 'SpaceGrotesk_700Bold',
                  color: colors.text,
                  letterSpacing: 1.5,
                  marginBottom: 8,
                  textAlign: 'center'
                }}>
                  {cardNumber}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} color={colors.primary} />}
                  <Text style={{ fontSize: 12, color: copied ? '#10b981' : colors.primary, fontFamily: 'SpaceGrotesk_600SemiBold' }}>
                    {copied ? 'Copied to clipboard' : 'Tap to copy'}
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={{ borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', paddingTop: 14, marginTop: 10, alignItems: 'center' }}>
                <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 2, fontFamily: 'SpaceGrotesk_500Medium' }}>Account Holder Name</Text>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, fontFamily: 'SpaceGrotesk_700Bold' }}>Kidus Mamo Negash</Text>
              </View>
            </View>
          </View>

          <View style={[styles.infoBox, { backgroundColor: colors.surfaceGlass, borderColor: colors.borderGlass }]}>
            <Text style={[styles.infoText, { color: colors.textSecondary, fontFamily: 'SpaceGrotesk_400Regular' }]}>
              Every donation helps cover server costs and dedicate more time to building new features for spndy. Thank you for being part of our community!
            </Text>
          </View>
        </View>
      </ScrollView>
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
    paddingBottom: 10,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  content: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  donateCard: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20 },
      android: { elevation: 6 },
    }),
  },
  infoBox: {
    width: '100%',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
});
