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
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import {
  Eye,
  EyeOff,
  AlertCircle,
  Sun,
  Moon,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button';
import { GitHubSignInButton } from '@/components/auth/github-sign-in-button';
import * as Haptics from 'expo-haptics';

export default function LoginScreen() {
  const { login } = useAuth();
  const { isDark, setTheme } = useTheme();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleLogin = async (overrideEmail?: string, overridePassword?: string) => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (e) {}
    }

    const targetEmail = overrideEmail ?? email.trim();
    const targetPassword = overridePassword ?? password;

    if (!targetEmail || !targetPassword) {
      setError('Please enter your email and password.');
      return;
    }
    setError(null);

    try {
      setIsSubmitting(true);
      const result = await login(targetEmail, targetPassword);
      if (result.success) {
        if (Platform.OS !== 'web') {
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (e) {}
        }
        router.replace('/(tabs)');
      } else {
        setError(result.error || 'Invalid email or password. Please verify credentials.');
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected authentication error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePasswordVisibility = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (e) {}
    }
    setShowPassword((prev) => !prev);
  };

  const toggleTheme = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (e) {}
    }
    setTheme(isDark ? 'light' : 'dark');
  };

  const textPrimary = isDark ? '#ffffff' : '#0f172a';
  const textSecondary = isDark ? '#94a3b8' : '#64748b';
  const inputBg = isDark ? 'rgba(15, 23, 20, 0.75)' : '#ffffff';
  const inputBorder = isDark ? 'rgba(16, 185, 129, 0.22)' : '#e2e8f0';
  const cardBg = isDark ? 'rgba(11, 20, 17, 0.85)' : '#ffffff';
  const cardBorder = isDark ? 'rgba(16, 185, 129, 0.25)' : 'rgba(16, 185, 129, 0.18)';

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Atmospheric Green Background Gradient */}
      <LinearGradient
        colors={
          isDark
            ? ['#031711', '#061a14', '#08120f', '#060a09']
            : ['#ecfdf5', '#f0fdf4', '#f8fafc', '#ffffff']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Ambient Emerald Glow Orbs */}
      <View
        style={[
          styles.glowOrbTop,
          {
            backgroundColor: isDark
              ? 'rgba(16, 185, 129, 0.18)'
              : 'rgba(16, 185, 129, 0.12)',
          },
        ]}
      />
      <View
        style={[
          styles.glowOrbBottom,
          {
            backgroundColor: isDark
              ? 'rgba(5, 150, 105, 0.14)'
              : 'rgba(52, 211, 153, 0.10)',
          },
        ]}
      />

      {/* Top Controls Header: Brand & Theme Switcher */}
      <View
        style={[
          styles.navBar,
          {
            paddingTop: Math.max(insets.top + 10, 24),
          },
        ]}
      >
        <Text style={[styles.navBrandText, { color: isDark ? '#34d399' : '#059669' }]}>
          spndy
        </Text>

        <TouchableOpacity
          activeOpacity={0.75}
          onPress={toggleTheme}
          style={[
            styles.themeToggleBtn,
            {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#ffffff',
              borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : '#e2e8f0',
            },
          ]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {isDark ? (
            <Sun size={17} color="#f59e0b" />
          ) : (
            <Moon size={17} color="#64748b" />
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: Math.max(insets.bottom + 24, 40),
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.centerCard,
              {
                backgroundColor: cardBg,
                borderColor: cardBorder,
                shadowColor: isDark ? '#000000' : '#10b981',
                shadowOpacity: isDark ? 0.35 : 0.08,
                shadowRadius: 18,
                elevation: isDark ? 5 : 2,
              },
            ]}
          >
            {/* ChatGPT-style Typography Header */}
            <Text style={[styles.headline, { color: textPrimary }]}>
              Welcome back
            </Text>
            <Text style={[styles.subheadline, { color: textSecondary }]}>
              Log in to your spndy account to continue
            </Text>

            {/* Error Notification */}
            {error && (
              <View
                style={[
                  styles.errorBox,
                  {
                    backgroundColor: isDark
                      ? 'rgba(239, 68, 68, 0.12)'
                      : '#fef2f2',
                    borderColor: isDark
                      ? 'rgba(239, 68, 68, 0.3)'
                      : '#fecaca',
                  },
                ]}
              >
                <AlertCircle size={16} color="#ef4444" style={{ marginRight: 8 }} />
                <Text
                  style={[
                    styles.errorText,
                    { color: isDark ? '#fca5a5' : '#dc2626' },
                  ]}
                >
                  {error}
                </Text>
              </View>
            )}

            {/* Form Fields */}
            <View style={styles.formContainer}>
              {/* Email Field */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: textSecondary }]}>
                  Email address
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: inputBg,
                      borderColor:
                        focusedField === 'email' ? '#10b981' : inputBorder,
                      color: textPrimary,
                    },
                  ]}
                  placeholder="name@example.com"
                  placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
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

              {/* Password Field */}
              <View style={styles.fieldGroup}>
                <View style={styles.passwordRow}>
                  <Text style={[styles.fieldLabel, { color: textSecondary }]}>
                    Password
                  </Text>
                  <TouchableOpacity
                    onPress={() => router.push('/(auth)/forgot-password')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.forgotLink}>Forgot password?</Text>
                  </TouchableOpacity>
                </View>

                <View
                  style={[
                    styles.passwordInputContainer,
                    {
                      backgroundColor: inputBg,
                      borderColor:
                        focusedField === 'password' ? '#10b981' : inputBorder,
                    },
                  ]}
                >
                  <TextInput
                    style={[styles.passwordInput, { color: textPrimary }]}
                    placeholder="Enter password"
                    placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
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
                    onPress={togglePasswordVisibility}
                    style={styles.eyeBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    {showPassword ? (
                      <EyeOff size={17} color={textSecondary} />
                    ) : (
                      <Eye size={17} color={textSecondary} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Primary Continue Button */}
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={isSubmitting}
                onPress={() => handleLogin()}
                style={styles.primaryBtnWrapper}
              >
                <LinearGradient
                  colors={['#10b981', '#059669']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryBtn}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Continue</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Minimalist Divider */}
            <View style={styles.dividerRow}>
              <View
                style={[
                  styles.dividerLine,
                  { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0' },
                ]}
              />
              <Text style={[styles.dividerText, { color: textSecondary }]}>
                OR
              </Text>
              <View
                style={[
                  styles.dividerLine,
                  { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0' },
                ]}
              />
            </View>

            {/* Social Authentication List */}
            <View style={styles.socialStack}>
              <GoogleSignInButton
                onError={(err) => setError(err)}
                style={{ marginBottom: 10 }}
              />

              <GitHubSignInButton
                onError={(err) => setError(err)}
                style={{ marginBottom: 4 }}
              />
            </View>

            {/* Footer Navigation */}
            <View style={styles.footerRow}>
              <Text style={[styles.footerPrompt, { color: textSecondary }]}>
                Don't have an account?{' '}
              </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.push('/(auth)/register')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.footerLink}>Sign up</Text>
              </TouchableOpacity>
            </View>
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
  glowOrbTop: {
    position: 'absolute',
    top: -60,
    left: -40,
    width: 260,
    height: 260,
    borderRadius: 130,
  },
  glowOrbBottom: {
    position: 'absolute',
    bottom: -60,
    right: -40,
    width: 240,
    height: 240,
    borderRadius: 120,
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  navBrandText: {
    fontSize: 20,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: -0.6,
  },
  themeToggleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  centerCard: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  headline: {
    fontSize: 26,
    fontFamily: 'SpaceGrotesk_700Bold',
    textAlign: 'center',
    letterSpacing: -0.6,
    marginBottom: 6,
  },
  subheadline: {
    fontSize: 13.5,
    fontFamily: 'SpaceGrotesk_400Regular',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 22,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 12.5,
    fontFamily: 'SpaceGrotesk_500Medium',
    flex: 1,
  },
  formContainer: {
    gap: 14,
    marginBottom: 18,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12.5,
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
  passwordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forgotLink: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_600SemiBold',
    color: '#10b981',
  },
  textInput: {
    height: 48,
    borderRadius: 11,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_500Medium',
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 11,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  passwordInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_500Medium',
    height: '100%',
  },
  eyeBtn: {
    padding: 6,
  },
  primaryBtnWrapper: {
    borderRadius: 11,
    overflow: 'hidden',
    marginTop: 4,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryBtn: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: 14.5,
    color: '#ffffff',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 11,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 0.8,
  },
  socialStack: {
    marginBottom: 20,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerPrompt: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  footerLink: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#10b981',
  },
});
