import React from 'react';
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
import { ChevronLeft, FileText, AlertCircle, Shield, Users, Ban, Repeat, TriangleAlert, Scale, Mail } from 'lucide-react-native';
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

export default function TermsOfServiceScreen() {
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
          <Text style={[styles.headerTitle, { color: colors.text, fontFamily: 'SpaceGrotesk_700Bold' }]}>Terms of Service</Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>Effective {EFFECTIVE_DATE}</Text>
        </View>
        <View style={[styles.legalBadge, { backgroundColor: isDark ? 'rgba(99,102,241,0.12)' : '#eef2ff', borderColor: isDark ? 'rgba(99,102,241,0.2)' : '#c7d2fe' }]}>
          <Scale size={14} color="#6366f1" />
          <Text style={[styles.legalBadgeText, { color: '#6366f1' }]}>Legal</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 48 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={[styles.heroBanner, {
          backgroundColor: isDark ? 'rgba(99,102,241,0.07)' : '#eef2ff',
          borderColor: isDark ? 'rgba(99,102,241,0.15)' : '#c7d2fe',
        }]}>
          <FileText size={28} color="#6366f1" style={{ marginBottom: 10 }} />
          <Text style={[styles.heroTitle, { color: colors.text, fontFamily: 'SpaceGrotesk_700Bold' }]}>
            Terms of Service
          </Text>
          <Text style={[styles.heroBody, { color: colors.textSecondary }]}>
            Please read these terms carefully before using {APP_NAME}. By creating an account or using the service, you agree to be bound by these terms.
          </Text>
        </View>

        {/* Sections */}
        <Section icon={FileText} iconColor="#6366f1" title="1. Acceptance of Terms" isDark={isDark} colors={colors}>
          <Paragraph text={`By downloading, installing, or using ${APP_NAME}, you agree to these Terms of Service and our Privacy Policy. If you do not agree to these terms, you must not use the app.`} colors={colors} />
          <Paragraph text="We reserve the right to update these terms at any time. Material changes will be communicated via in-app notification. Continued use of the service after changes constitutes acceptance." colors={colors} />
        </Section>

        <Section icon={Users} iconColor="#10b981" title="2. Account Registration" isDark={isDark} colors={colors}>
          <Bullet text="You must be at least 13 years of age to create an account." colors={colors} />
          <Bullet text="You are responsible for maintaining the confidentiality of your credentials." colors={colors} />
          <Bullet text="You must provide accurate and truthful information during registration." colors={colors} />
          <Bullet text="You are responsible for all activity that occurs under your account." colors={colors} />
          <Paragraph text="If you believe your account has been compromised, contact us immediately at the address below." colors={colors} />
        </Section>

        <Section icon={FileText} iconColor="#f59e0b" title="3. Permitted Use" isDark={isDark} colors={colors}>
          <Paragraph text={`${APP_NAME} is a personal and small business finance management tool. You may use the service to:`} colors={colors} />
          <Bullet text="Create and manage financial books, budgets, and transaction records." colors={colors} />
          <Bullet text="Invite team members to collaborate on shared business books." colors={colors} />
          <Bullet text="Export financial reports for personal or business record-keeping purposes." colors={colors} />
          <Paragraph text="The service is provided for lawful purposes only. You are responsible for ensuring that your use complies with all applicable laws and regulations." colors={colors} />
        </Section>

        <Section icon={Ban} iconColor="#ef4444" title="4. Prohibited Activities" isDark={isDark} colors={colors}>
          <Paragraph text="You must not:" colors={colors} />
          <Bullet text="Use the service for any unlawful purpose, including money laundering or fraud." colors={colors} />
          <Bullet text="Attempt to reverse engineer, decompile, or extract the source code of the app." colors={colors} />
          <Bullet text="Use automated bots, scrapers, or scripts to access or extract data from the service." colors={colors} />
          <Bullet text="Attempt to gain unauthorized access to other users' accounts or data." colors={colors} />
          <Bullet text="Transmit any malicious code, malware, or content designed to interfere with the service." colors={colors} />
          <Bullet text="Violate any applicable export control laws or sanctions." colors={colors} />
        </Section>

        <Section icon={Shield} iconColor="#10b981" title="5. Intellectual Property" isDark={isDark} colors={colors}>
          <Paragraph text={`All content within ${APP_NAME}, including but not limited to the design, interface, branding, code, and text, is owned by the developer and is protected by copyright and intellectual property laws.`} colors={colors} />
          <Paragraph text="You retain full ownership of all financial data and content you enter into the app. By using the service, you grant us a limited, non-exclusive license to store and process your data solely for the purpose of providing the service." colors={colors} />
        </Section>

        <Section icon={Repeat} iconColor="#6366f1" title="6. Service Availability" isDark={isDark} colors={colors}>
          <Paragraph text={`We aim to keep ${APP_NAME} available 24/7, but we cannot guarantee uninterrupted access. The service may be temporarily unavailable due to:`} colors={colors} />
          <Bullet text="Scheduled maintenance or upgrades." colors={colors} />
          <Bullet text="Unexpected technical failures or outages." colors={colors} />
          <Bullet text="Force majeure events beyond our control." colors={colors} />
          <Paragraph text="We will make reasonable efforts to notify users of planned downtime in advance." colors={colors} />
        </Section>

        <Section icon={TriangleAlert} iconColor="#f59e0b" title="7. Disclaimer of Warranties" isDark={isDark} colors={colors}>
          <Paragraph text={`${APP_NAME} is provided on an \"as is\" and \"as available\" basis without warranties of any kind, either express or implied. We do not warrant that:`} colors={colors} />
          <Bullet text="The service will meet your specific requirements." colors={colors} />
          <Bullet text="The service will be error-free or uninterrupted." colors={colors} />
          <Bullet text="Any data stored in the service will not be lost." colors={colors} />
          <Paragraph text="Financial records you create in the app are for informational purposes only and do not constitute professional financial, legal, or tax advice." colors={colors} />
        </Section>

        <Section icon={AlertCircle} iconColor="#ef4444" title="8. Limitation of Liability" isDark={isDark} colors={colors}>
          <Paragraph text="To the maximum extent permitted by law, the developer shall not be liable for any indirect, incidental, consequential, or punitive damages arising from your use of or inability to use the service, including loss of data or financial losses." colors={colors} />
          <Paragraph text="Our total aggregate liability to you for any claims arising out of or relating to these terms or the service shall not exceed the amount you paid for the service in the twelve months preceding the claim." colors={colors} />
        </Section>

        <Section icon={Scale} iconColor="#6366f1" title="9. Termination" isDark={isDark} colors={colors}>
          <Paragraph text="We may suspend or terminate your access to the service at any time, with or without notice, if we determine that you have violated these terms." colors={colors} />
          <Paragraph text="You may terminate your account at any time from the Settings screen. Upon termination, your data will be deleted in accordance with our Privacy Policy." colors={colors} />
        </Section>

        <Section icon={Scale} iconColor="#10b981" title="10. Governing Law" isDark={isDark} colors={colors}>
          <Paragraph text="These terms shall be governed by and construed in accordance with applicable law. Any disputes arising from or relating to these terms shall be resolved through good-faith negotiation. If negotiation fails, disputes shall be submitted to binding arbitration." colors={colors} />
        </Section>

        {/* Contact CTA */}
        <View style={[styles.contactCard, {
          backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
          borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
        }]}>
          <Text style={[styles.contactTitle, { color: colors.text, fontFamily: 'SpaceGrotesk_700Bold' }]}>
            Questions About These Terms?
          </Text>
          <Text style={[styles.contactBody, { color: colors.textSecondary }]}>
            If you have any questions about these Terms of Service, contact our legal team at:
          </Text>
          <TouchableOpacity
            onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)}
            activeOpacity={0.8}
            style={styles.contactEmailBtn}
          >
            <LinearGradient
              colors={['#6366f1', '#4f46e5']}
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
  },
  headerSub: {
    fontSize: 12,
    marginTop: 1,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  legalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  legalBadgeText: {
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
