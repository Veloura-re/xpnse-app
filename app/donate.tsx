import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
} from 'react-native';
import { ChevronLeft, CreditCard, Heart } from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/providers/theme-provider';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AVAILABLE_FONTS, getFontFamily } from '@/config/font-config';

export default function DonateScreen() {
  const { colors, isDark, deviceFont } = useTheme();
  const insets = useSafeAreaInsets();
  const fontStyle = getFontFamily(deviceFont);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={isDark ? ['rgba(16, 185, 129, 0.05)', 'transparent'] : ['rgba(16, 185, 129, 0.1)', 'transparent']}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text, fontFamily: fontStyle }]}>Support Us</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#f0fdf4' }]}>
            <Heart size={40} color="#10b981" fill="#10b981" />
          </View>
          
          <Text style={[styles.title, { color: colors.text, fontFamily: fontStyle }]}>Support the Developer</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            If you find spndy helpful, consider supporting the developer. Your contributions help keep the app updated, secure, and free for everyone!
          </Text>

          <View style={[styles.donateCard, { 
            backgroundColor: isDark ? '#111' : '#fff',
            borderColor: isDark ? '#222' : '#e2e8f0',
          }]}>
            <View style={{
              backgroundColor: isDark ? 'rgba(16, 185, 129, 0.08)' : '#f0fdf4',
              borderRadius: 20,
              padding: 24,
              borderWidth: 1.5,
              borderColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#10b981',
              borderStyle: 'dashed',
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <LinearGradient
                  colors={['#10b981', '#059669']}
                  style={{ padding: 10, borderRadius: 12 }}
                >
                  <CreditCard size={24} color="#fff" />
                </LinearGradient>
                <View style={{ backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#dcfce7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: isDark ? colors.primary : '#059669', letterSpacing: 0.5 }}>BYBIT CARD</Text>
                </View>
              </View>
              
              <Text style={{
                fontSize: 26,
                fontFamily: fontStyle,
                color: colors.text,
                letterSpacing: 1.5,
                fontWeight: '900',
                marginBottom: 12,
                textAlign: 'center'
              }}>
                4938 7554 2557 0742
              </Text>
              
              <View style={{ borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', paddingTop: 16, alignItems: 'center' }}>
                <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>Account Holder Name</Text>
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>Kidus Mamo Negash</Text>
              </View>
            </View>
          </View>

          <View style={[styles.infoBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Every donation helps me cover server costs and dedicate more time to building new features for spndy. Thank you for being part of the community!
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
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  content: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  donateCard: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20 },
      android: { elevation: 5 },
    }),
  },
  infoBox: {
    width: '100%',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
