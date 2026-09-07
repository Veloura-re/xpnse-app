import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Alert,
  StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, Lock, Eye, EyeOff, User, ArrowRight, Check, AlertCircle, Sparkles, ShieldCheck } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackgroundDecor } from '@/components/ui/background-decor';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

export default function RegisterScreen() {
  const { register } = useAuth();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleRegister = async () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (e) {}
    }

    setError(null);
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await register(email.trim(), password, { displayName: name.trim() });
      if (result.success) {
        if (Platform.OS !== 'web') {
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (e) {}
        }
        Alert.alert(
          'Account Created',
          'Welcome to spndy! Please check your email to verify your account.',
          [{ text: 'Continue', onPress: () => router.replace('/(auth)/verify-email') }]
        );
      } else {
        setError(result.error || 'Registration failed. Please try again.');
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected registration error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const passwordsMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0D0D0E' : '#F8F9FA' }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <BackgroundDecor />

      {/* Ambient background glow orbs */}
      <View
        style={[
          styles.glowOrbTop,
          { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.08)' },
        ]}
      />
      <View
        style={[
          styles.glowOrbBottom,
          { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.08)' : 'rgba(99, 102, 241, 0.05)' },
        ]}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: Math.max(insets.top + 16, 40), paddingBottom: Math.max(insets.bottom + 24, 40) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top Header */}
          <View style={styles.headerContainer}>
            <Text style={[styles.welcomeText, { color: colors.text }]}>Create Account</Text>
            <Text style={[styles.subtitleText, { color: colors.textSecondary }]}>
              Enter your details to get started
            </Text>
          </View>

          {/* Form Card Container */}
          <View
            style={[
              styles.cardContainer,
              {
                backgroundColor: isDark ? '#141416' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
                shadowColor: '#000',
                shadowOpacity: isDark ? 0.35 : 0.05,
                shadowRadius: 16,
                elevation: isDark ? 6 : 2,
              },
            ]}
          >
            {/* Top Light Sheen */}
            <View
              style={[
                styles.topSheen,
                { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.8)' },
              ]}
            />

            {/* Error Banner */}
            {error && (
              <View style={[styles.errorBanner, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEE2E2', borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FCA5A5' }]}>
                <AlertCircle size={16} color="#EF4444" style={{ marginRight: 8, marginTop: 1 }} />
                <Text style={[styles.errorText, { color: isDark ? '#FCA5A5' : '#B91C1C' }]}>{error}</Text>
              </View>
            )}

            {/* Full Name Input */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Full Name</Text>
              <View
                style={[
                  styles.inputBox,
                  {
                    backgroundColor: isDark
                      ? focusedField === 'name'
                        ? 'rgba(16, 185, 129, 0.06)'
                        : '#1B1B1E'
                      : focusedField === 'name'
                      ? '#F0FDF4'
                      : '#F4F5F7',
                    borderColor: focusedField === 'name'
                      ? '#10B981'
                      : isDark
                      ? 'rgba(255, 255, 255, 0.08)'
                      : 'rgba(0, 0, 0, 0.08)',
                  },
                ]}
              >
                <View style={styles.inputIconContainer}>
                  <User size={18} color={focusedField === 'name' ? '#10B981' : colors.textSecondary} />
                </View>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Alex Morgan"
                  placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                  value={name}
                  onChangeText={(val) => {
                    setName(val);
                    if (error) setError(null);
                  }}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Email Address Input */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Email Address</Text>
              <View
                style={[
                  styles.inputBox,
                  {
                    backgroundColor: isDark
                      ? focusedField === 'email'
                        ? 'rgba(16, 185, 129, 0.06)'
                        : '#1B1B1E'
                      : focusedField === 'email'
                      ? '#F0FDF4'
                      : '#F4F5F7',
                    borderColor: focusedField === 'email'
                      ? '#10B981'
                      : isDark
                      ? 'rgba(255, 255, 255, 0.08)'
                      : 'rgba(0, 0, 0, 0.08)',
                  },
                ]}
              >
                <View style={styles.inputIconContainer}>
                  <Mail size={18} color={focusedField === 'email' ? '#10B981' : colors.textSecondary} />
                </View>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="name@company.com"
                  placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                  value={email}
                  onChangeText={(val) => {
                    setEmail(val);
                    if (error) setError(null);
                  }}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Password</Text>
              <View
                style={[
                  styles.inputBox,
                  {
                    backgroundColor: isDark
                      ? focusedField === 'password'
                        ? 'rgba(16, 185, 129, 0.06)'
                        : '#1B1B1E'
                      : focusedField === 'password'
                      ? '#F0FDF4'
                      : '#F4F5F7',
                    borderColor: focusedField === 'password'
                      ? '#10B981'
                      : isDark
                      ? 'rgba(255, 255, 255, 0.08)'
                      : 'rgba(0, 0, 0, 0.08)',
                  },
                ]}
              >
                <View style={styles.inputIconContainer}>
                  <Lock size={18} color={focusedField === 'password' ? '#10B981' : colors.textSecondary} />
                </View>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="At least 6 characters"
                  placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                  value={password}
                  onChangeText={(val) => {
                    setPassword(val);
                    if (error) setError(null);
                  }}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => {
                    if (Platform.OS !== 'web') {
                      try {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      } catch (e) {}
                    }
                    setShowPassword((prev) => !prev);
                  }}
                  style={styles.eyeBtn}
                >
                  {showPassword ? (
                    <EyeOff size={18} color={colors.textSecondary} />
                  ) : (
                    <Eye size={18} color={colors.textSecondary} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password Input */}
            <View style={styles.fieldGroup}>
              <View style={styles.passwordLabelRow}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Confirm Password</Text>
                {passwordsMatch && (
                  <View style={styles.matchBadge}>
                    <Check size={12} color="#10B981" />
                    <Text style={styles.matchBadgeText}>Match</Text>
                  </View>
                )}
              </View>
              <View
                style={[
                  styles.inputBox,
                  {
                    backgroundColor: isDark
                      ? focusedField === 'confirmPassword'
                        ? 'rgba(16, 185, 129, 0.06)'
                        : '#1B1B1E'
                      : focusedField === 'confirmPassword'
                      ? '#F0FDF4'
                      : '#F4F5F7',
                    borderColor: focusedField === 'confirmPassword'
                      ? '#10B981'
                      : passwordsMatch
                      ? '#10B981'
                      : isDark
                      ? 'rgba(255, 255, 255, 0.08)'
                      : 'rgba(0, 0, 0, 0.08)',
                  },
                ]}
              >
                <View style={styles.inputIconContainer}>
                  <Lock size={18} color={focusedField === 'confirmPassword' ? '#10B981' : colors.textSecondary} />
                </View>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Re-enter your password"
                  placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                  value={confirmPassword}
                  onChangeText={(val) => {
                    setConfirmPassword(val);
                    if (error) setError(null);
                  }}
                  onFocus={() => setFocusedField('confirmPassword')}
                  onBlur={() => setFocusedField(null)}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => {
                    if (Platform.OS !== 'web') {
                      try {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      } catch (e) {}
                    }
                    setShowConfirmPassword((prev) => !prev);
                  }}
                  style={styles.eyeBtn}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={18} color={colors.textSecondary} />
                  ) : (
                    <Eye size={18} color={colors.textSecondary} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Primary Sign Up Button */}
            <TouchableOpacity
              onPress={handleRegister}
              disabled={isSubmitting}
              activeOpacity={0.88}
              style={styles.actionBtnWrapper}
            >
              <LinearGradient
                colors={['#10B981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.actionBtn}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <View style={styles.actionBtnContent}>
                    <Text style={styles.actionBtnText}>Create Account</Text>
                    <ArrowRight size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
            {/* Consent text */}
            <View style={{ alignItems: 'center', marginTop: -4, marginBottom: 16, paddingHorizontal: 4 }}>
              <Text style={[styles.bottomNavText, { color: colors.textSecondary, textAlign: 'center', fontSize: 12, lineHeight: 18 }]}>
                By creating an account you agree to our{' '}
                <Text
                  style={[styles.bottomNavLink, { color: '#10B981', fontSize: 12 }]}
                  onPress={() => router.push('/terms-of-service')}
                >
                  Terms of Service
                </Text>
                {' '}and{' '}
                <Text
                  style={[styles.bottomNavLink, { color: '#10B981', fontSize: 12 }]}
                  onPress={() => router.push('/privacy-policy')}
                >
                  Privacy Policy
                </Text>
                .
              </Text>
            </View>

          </View>

          {/* Bottom Switch to Sign In */}
          <View style={styles.bottomNavContainer}>
            <Text style={[styles.bottomNavText, { color: colors.textSecondary }]}>
              Already have an account?{' '}
            </Text>
            <TouchableOpacity
              onPress={() => {
                if (Platform.OS !== 'web') {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch (e) {}
                }
                router.replace('/(auth)/login');
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.bottomNavLink, { color: '#10B981' }]}>Sign In</Text>
            </TouchableOpacity>
          </View>

          {/* Legal footer */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 10, marginBottom: 8 }}>
            <TouchableOpacity onPress={() => router.push('/privacy-policy')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[styles.bottomNavText, { color: colors.textSecondary, fontSize: 12 }]}>Privacy Policy</Text>
            </TouchableOpacity>
            <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: colors.textSecondary, opacity: 0.4 }} />
            <TouchableOpacity onPress={() => router.push('/terms-of-service')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[styles.bottomNavText, { color: colors.textSecondary, fontSize: 12 }]}>Terms of Service</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  glowOrbTop: {
    position: 'absolute',
    top: -80,
    left: -40,
    width: 260,
    height: 260,
    borderRadius: 130,
  },
  glowOrbBottom: {
    position: 'absolute',
    bottom: -100,
    right: -60,
    width: 320,
    height: 320,
    borderRadius: 160,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 32,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: -0.8,
  },
  subtitleText: {
    fontSize: 15,
    fontFamily: 'SpaceGrotesk_400Regular',
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 22,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 3,
  },
  topSheen: {
    position: 'absolute',
    top: 0,
    left: 24,
    right: 24,
    height: 1,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk_500Medium',
    flex: 1,
    lineHeight: 18,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk_500Medium',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  matchBadgeText: {
    fontSize: 11,
    color: '#10B981',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    height: 50,
    paddingHorizontal: 14,
  },
  inputIconContainer: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'SpaceGrotesk_400Regular',
    height: '100%',
  },
  eyeBtn: {
    padding: 6,
    marginLeft: 4,
  },
  actionBtnWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 16,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.24,
    shadowRadius: 10,
    elevation: 3,
  },
  actionBtn: {
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 0.3,
  },
  trustBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  trustBadgeText: {
    fontSize: 11,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  bottomNavContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  bottomNavText: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  bottomNavLink: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
});
