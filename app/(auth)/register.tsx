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
  Alert,
  StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, Lock, Eye, EyeOff, User, ArrowRight, AlertCircle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackgroundDecor } from '@/components/ui/background-decor';
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button';
import * as Haptics from 'expo-haptics';

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

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0D0D0E' : '#F8F9FA' }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <BackgroundDecor />

      {/* Subtle ambient glow orbs */}
      <View
        style={[
          styles.glowOrbTop,
          { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.10)' : 'rgba(16, 185, 129, 0.06)' },
        ]}
      />
      <View
        style={[
          styles.glowOrbBottom,
          { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.07)' : 'rgba(99, 102, 241, 0.04)' },
        ]}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: Math.max(insets.top + 28, 52),
              paddingBottom: Math.max(insets.bottom + 28, 48),
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Claude-style Centered Header */}
          <View style={styles.headerContainer}>
            <Text style={[styles.welcomeHeadline, { color: colors.text }]}>Create your account</Text>
            <Text style={[styles.welcomeSubtitle, { color: colors.textSecondary }]}>
              Enter your details to get started
            </Text>
          </View>

          {/* Claude-style Form Box */}
          <View
            style={[
              styles.formCard,
              {
                backgroundColor: isDark ? '#141416' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
                shadowColor: '#000',
                shadowOpacity: isDark ? 0.30 : 0.05,
                shadowRadius: 20,
                elevation: isDark ? 4 : 2,
              },
            ]}
          >
            {/* Error Banner */}
            {error && (
              <View
                style={[
                  styles.errorBanner,
                  {
                    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEE2E2',
                    borderColor: isDark ? 'rgba(239, 68, 68, 0.25)' : '#FCA5A5',
                  },
                ]}
              >
                <AlertCircle size={16} color="#EF4444" style={{ marginRight: 8, marginTop: 1 }} />
                <Text style={[styles.errorText, { color: isDark ? '#FCA5A5' : '#B91C1C' }]}>
                  {error}
                </Text>
              </View>
            )}

            {/* Full Name Field */}
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
                    borderColor:
                      focusedField === 'name'
                        ? '#10B981'
                        : isDark
                        ? 'rgba(255, 255, 255, 0.08)'
                        : '#E2E8F0',
                  },
                ]}
              >
                <View style={styles.inputIcon}>
                  <User
                    size={17}
                    color={focusedField === 'name' ? '#10B981' : colors.textSecondary}
                  />
                </View>
                <TextInput
                  style={[styles.textInput, { color: colors.text }]}
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

            {/* Email Field */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Email</Text>
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
                    borderColor:
                      focusedField === 'email'
                        ? '#10B981'
                        : isDark
                        ? 'rgba(255, 255, 255, 0.08)'
                        : '#E2E8F0',
                  },
                ]}
              >
                <View style={styles.inputIcon}>
                  <Mail
                    size={17}
                    color={focusedField === 'email' ? '#10B981' : colors.textSecondary}
                  />
                </View>
                <TextInput
                  style={[styles.textInput, { color: colors.text }]}
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

            {/* Password Field */}
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
                    borderColor:
                      focusedField === 'password'
                        ? '#10B981'
                        : isDark
                        ? 'rgba(255, 255, 255, 0.08)'
                        : '#E2E8F0',
                  },
                ]}
              >
                <View style={styles.inputIcon}>
                  <Lock
                    size={17}
                    color={focusedField === 'password' ? '#10B981' : colors.textSecondary}
                  />
                </View>
                <TextInput
                  style={[styles.textInput, { color: colors.text }]}
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
                  style={styles.eyeToggle}
                >
                  {showPassword ? (
                    <EyeOff size={17} color={colors.textSecondary} />
                  ) : (
                    <Eye size={17} color={colors.textSecondary} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password Field */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                Confirm Password
              </Text>
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
                    borderColor:
                      focusedField === 'confirmPassword'
                        ? '#10B981'
                        : isDark
                        ? 'rgba(255, 255, 255, 0.08)'
                        : '#E2E8F0',
                  },
                ]}
              >
                <View style={styles.inputIcon}>
                  <Lock
                    size={17}
                    color={focusedField === 'confirmPassword' ? '#10B981' : colors.textSecondary}
                  />
                </View>
                <TextInput
                  style={[styles.textInput, { color: colors.text }]}
                  placeholder="Re-enter password"
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
                  style={styles.eyeToggle}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={17} color={colors.textSecondary} />
                  ) : (
                    <Eye size={17} color={colors.textSecondary} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Primary Action Button */}
            <TouchableOpacity
              onPress={handleRegister}
              disabled={isSubmitting}
              activeOpacity={0.88}
              style={styles.primaryButtonWrapper}
            >
              <LinearGradient
                colors={['#10B981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryButton}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <View style={styles.primaryButtonContent}>
                    <Text style={styles.primaryButtonText}>Create account</Text>
                    <ArrowRight size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Claude-style Divider */}
            <View style={styles.dividerContainer}>
              <View
                style={[
                  styles.dividerLine,
                  { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E5E7EB' },
                ]}
              />
              <Text style={[styles.dividerLabel, { color: colors.textSecondary }]}>OR</Text>
              <View
                style={[
                  styles.dividerLine,
                  { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E5E7EB' },
                ]}
              />
            </View>

            {/* Google Sign Up - Placed Under the Box Fields & Primary Button */}
            <GoogleSignInButton
              mode="register"
              onError={(err) => setError(err)}
              onSuccess={() => router.replace('/(tabs)')}
              disabled={isSubmitting}
            />
          </View>

          {/* Bottom Switch to Sign In */}
          <View style={styles.bottomNavRow}>
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
              <Text style={[styles.bottomNavAction, { color: '#10B981' }]}>Sign in</Text>
            </TouchableOpacity>
          </View>

          {/* Claude-style Terms and Privacy Policy Footer */}
          <View style={styles.legalFooterRow}>
            <Text style={[styles.legalText, { color: colors.textSecondary }]}>
              By continuing, you agree to our{' '}
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/terms-of-service')}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            >
              <Text style={[styles.legalLink, { color: colors.text }]}>Terms of Service</Text>
            </TouchableOpacity>
            <Text style={[styles.legalText, { color: colors.textSecondary }]}> and </Text>
            <TouchableOpacity
              onPress={() => router.push('/privacy-policy')}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            >
              <Text style={[styles.legalLink, { color: colors.text }]}>Privacy Policy</Text>
            </TouchableOpacity>
            <Text style={[styles.legalText, { color: colors.textSecondary }]}>.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  glowOrbTop: {
    position: 'absolute',
    top: -80,
    left: '20%',
    width: 280,
    height: 280,
    borderRadius: 140,
  },
  glowOrbBottom: {
    position: 'absolute',
    bottom: -100,
    right: '15%',
    width: 260,
    height: 260,
    borderRadius: 130,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  welcomeHeadline: {
    fontSize: 27,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: -0.6,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_400Regular',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  formCard: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 26,
    paddingTop: 28,
    paddingBottom: 24,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 18,
  },
  errorText: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk_400Regular',
    flex: 1,
    lineHeight: 18,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk_500Medium',
    marginBottom: 6,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_400Regular',
    height: '100%',
  },
  eyeToggle: {
    padding: 6,
    marginLeft: 4,
  },
  primaryButtonWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 6,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 2,
  },
  primaryButton: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 0.2,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerLabel: {
    fontSize: 11,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 1.4,
    paddingHorizontal: 12,
    textTransform: 'uppercase',
  },
  bottomNavRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
  },
  bottomNavText: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  bottomNavAction: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  legalFooterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
    paddingHorizontal: 16,
  },
  legalText: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_400Regular',
    lineHeight: 18,
  },
  legalLink: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_500Medium',
    textDecorationLine: 'underline',
    lineHeight: 18,
  },
});
