import React, { useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useTheme } from '@/providers/theme-provider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Shield, Eye, Lock, Trash2, Bell, Globe, Mail } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BackgroundDecor } from '@/components/ui/background-decor';

const EFFECTIVE_DATE = 'September 1, 2025';
const APP_NAME = 'spndy';
const CONTACT_EMAIL = 'lucyosck21@gmail.com';

interface SectionProps {
  icon: React.ElementType;
  iconColor: string;
  title: string;
  children: React.ReactNode;
  isDark: boolean;
  colors: any;
}

function Section({ icon: Icon, iconColor, title, children, isDark, colors }: SectionProps) {
  return (
    <View style={[sectionStyles.container, {
      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
      borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
    }]}>
      <View style={sectionStyles.header}>
        <View style={[sectionStyles.iconWrap, { backgroundColor: iconColor + (isDark ? '20' : '15') }]}>
          <Icon size={18} color={iconColor} />
        </View>
        <Text style={[sectionStyles.title, { color: colors.text, fontFamily: 'SpaceGrotesk_700Bold' }]}>
          {title}
        </Text>
      </View>
      <View style={sectionStyles.body}>{children}</View>
    </View>
  );
}

function Paragraph({ text, colors }: { text: string; colors: any }) {
  return (
    <Text style={[sectionStyles.paragraph, { color: colors.textSecondary }]}>{text}</Text>
  );
}

function Bullet({ text, colors }: { text: string; colors: any }) {
  return (
    <View style={sectionStyles.bulletRow}>
      <View style={[sectionStyles.bulletDot, { backgroundColor: colors.primary }]} />
      <Text style={[sectionStyles.bulletText, { color: colors.textSecondary }]}>{text}</Text>
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    gap: 10,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    letterSpacing: -0.2,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  body: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 8,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: 10,
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 8,
    flexShrink: 0,
  },
  bulletText: {
    fontSize: 14,
    lineHeight: 22,
    flex: 1,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
});

export default function PrivacyPolicyScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <BackgroundDecor />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)' }]}
          onPress={() => router.back()}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.headerTitle, { color: colors.text, fontFamily: 'SpaceGrotesk_700Bold' }]}>Privacy Policy</Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>Effective {EFFECTIVE_DATE}</Text>
        </View>
        <View style={[styles.shieldBadge, { backgroundColor: isDark ? 'rgba(16,185,129,0.12)' : '#f0fdf4', borderColor: isDark ? 'rgba(16,185,129,0.2)' : '#dcfce7' }]}>
          <Shield size={14} color="#10b981" />
          <Text style={[styles.shieldBadgeText, { color: '#10b981' }]}>Protected</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 48 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={[styles.heroBanner, {
          backgroundColor: isDark ? 'rgba(16,185,129,0.07)' : '#f0fdf4',
          borderColor: isDark ? 'rgba(16,185,129,0.15)' : '#dcfce7',
        }]}>
          <Shield size={28} color="#10b981" style={{ marginBottom: 10 }} />
          <Text style={[styles.heroTitle, { color: colors.text, fontFamily: 'SpaceGrotesk_700Bold' }]}>
            Your Privacy Matters
          </Text>
          <Text style={[styles.heroBody, { color: colors.textSecondary }]}>
            {APP_NAME} is a personal finance management app. We are committed to being transparent about how we handle your data. We collect only what is strictly necessary and never sell your information.
          </Text>
        </View>

        {/* Sections */}
        <Section icon={Eye} iconColor="#6366f1" title="Information We Collect" isDark={isDark} colors={colors}>
          <Paragraph text="We collect the following categories of information solely to provide and improve the service:" colors={colors} />
          <Bullet text="Account information: email address and display name you provide upon registration." colors={colors} />
          <Bullet text="Financial records: books, transaction entries, amounts, and categories you manually enter." colors={colors} />
          <Bullet text="Profile photo: only if you voluntarily upload one via the app." colors={colors} />
          <Bullet text="Push notification token: used only to deliver in-app notifications you opt into." colors={colors} />
          <Bullet text="Device information: OS version and platform (iOS/Android), collected for crash diagnostics only." colors={colors} />
          <Paragraph text="We do not collect your bank credentials, payment card numbers, or any external financial account data." colors={colors} />
        </Section>

        <Section icon={Lock} iconColor="#10b981" title="How We Use Your Information" isDark={isDark} colors={colors}>
          <Paragraph text="Your data is used exclusively to:" colors={colors} />
          <Bullet text="Authenticate your account and maintain secure sessions." colors={colors} />
          <Bullet text="Store and sync your financial books and transaction records across your devices." colors={colors} />
          <Bullet text="Send you notifications you explicitly enable (e.g. recurring reminders)." colors={colors} />
          <Bullet text="Diagnose technical errors and improve app stability." colors={colors} />
          <Paragraph text="We do not use your data for advertising, profiling, or any purpose beyond operating the service." colors={colors} />
        </Section>

        <Section icon={Shield} iconColor="#f59e0b" title="Data Security" isDark={isDark} colors={colors}>
          <Bullet text="All data is transmitted over TLS-encrypted connections." colors={colors} />
          <Bullet text="Financial records are stored in Firebase Firestore with per-user security rules that prevent cross-user access." colors={colors} />
          <Bullet text="Authentication is handled by Firebase Authentication, which uses industry-standard security practices including bcrypt password hashing." colors={colors} />
          <Bullet text="Profile photos and attachments are stored in Firebase Storage with access restricted to the account owner." colors={colors} />
          <Paragraph text="No security system is impenetrable. We commit to notifying users of any breach affecting their data within 72 hours of discovery." colors={colors} />
        </Section>

        <Section icon={Globe} iconColor="#6366f1" title="Third-Party Services" isDark={isDark} colors={colors}>
          <Paragraph text="We use the following third-party infrastructure providers who process data on our behalf under their own privacy policies:" colors={colors} />
          <Bullet text="Firebase (Google LLC) — authentication, database, storage, and crash analytics." colors={colors} />
          <Bullet text="Expo / EAS — mobile build and push notification delivery." colors={colors} />
          <Paragraph text="We do not integrate with advertising networks, data brokers, or analytics platforms that track user behaviour for commercial purposes." colors={colors} />
        </Section>

        <Section icon={Eye} iconColor="#ec4899" title="Data Retention" isDark={isDark} colors={colors}>
          <Bullet text="Your account data is retained for as long as your account remains active." colors={colors} />
          <Bullet text="Deleted businesses and books are removed immediately from our databases." colors={colors} />
          <Bullet text="Upon account deletion, all personal data including financial records, profile photos, and notification tokens is permanently purged within 30 days." colors={colors} />
        </Section>

        <Section icon={Trash2} iconColor="#ef4444" title="Your Rights" isDark={isDark} colors={colors}>
          <Paragraph text="You have the right to:" colors={colors} />
          <Bullet text="Access a copy of all personal data we hold about you." colors={colors} />
          <Bullet text="Correct inaccurate information via the Account Settings screen." colors={colors} />
          <Bullet text="Delete your account and all associated data at any time from Settings." colors={colors} />
          <Bullet text="Withdraw consent for push notifications via your device settings." colors={colors} />
          <Paragraph text="To exercise any right or submit a data request, contact us at the address below." colors={colors} />
        </Section>

        <Section icon={Bell} iconColor="#f59e0b" title="Children's Privacy" isDark={isDark} colors={colors}>
          <Paragraph text={`${APP_NAME} is not directed at children under the age of 13. We do not knowingly collect personal information from anyone under 13. If we become aware that a child under 13 has provided us with personal data, we will delete it immediately.`} colors={colors} />
        </Section>

        <Section icon={Shield} iconColor="#10b981" title="Changes to This Policy" isDark={isDark} colors={colors}>
          <Paragraph text="We may update this policy to reflect changes to our practices or legal requirements. We will notify you of material changes via in-app notification and update the effective date at the top of this document. Continued use of the app after changes constitutes acceptance of the revised policy." colors={colors} />
        </Section>

        {/* Contact CTA */}
        <View style={[styles.contactCard, {
          backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
          borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
        }]}>
          <Text style={[styles.contactTitle, { color: colors.text, fontFamily: 'SpaceGrotesk_700Bold' }]}>
            Contact Our Privacy Team
          </Text>
          <Text style={[styles.contactBody, { color: colors.textSecondary }]}>
            For any privacy-related questions, data access requests, or deletion requests, reach out at:
          </Text>
          <TouchableOpacity
            onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)}
            activeOpacity={0.8}
            style={styles.contactEmailBtn}
          >
            <LinearGradient
              colors={['#10b981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.contactEmailGradient}
            >
              <Mail size={16} color="#fff" />
              <Text style={styles.contactEmailText}>{CONTACT_EMAIL}</Text>
            </LinearGradient>
          </TouchableOpacity>
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
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    letterSpacing: -0.3,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  headerSub: {
    fontSize: 12,
    marginTop: 1,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  shieldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  shieldBadgeText: {
    fontSize: 11,
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
  scrollContent: {
    padding: 16,
  },
  heroBanner: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  heroBody: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  contactCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginTop: 4,
  },
  contactTitle: {
    fontSize: 16,
    marginBottom: 6,
    letterSpacing: -0.2,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  contactBody: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: 'SpaceGrotesk_400Regular',
    marginBottom: 14,
  },
  contactEmailBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  contactEmailGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 20,
  },
  contactEmailText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
});
