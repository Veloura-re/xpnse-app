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
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { AVAILABLE_FONTS, getFontFamily } from '@/config/font-config';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, ArrowLeft, Send } from 'lucide-react-native';



export default function ForgotPasswordScreen() {
  const { resetPassword, isLoading } = useAuth();
  const { deviceFont, setDeviceFont, colors, isDark } = useTheme();
  const [email, setEmail] = useState('');

  // Fonts loaded in RootLayout

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert('Missing Email', 'Please enter your email address.');
      return;
    }

    const result = await resetPassword(email);
    if (result.success) {
      Alert.alert(
        'Reset Link Sent',
        'If an account with this email exists, you will receive a password reset link.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } else {
      Alert.alert('Error', result.error || 'Failed to send reset link. Please try again.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>


      {/* Decorative Circles */}
      <View style={[styles.circle1, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.05)' : 'rgba(16, 185, 129, 0.1)' }]} />
      <View style={[styles.circle2, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.03)' : 'rgba(16, 185, 129, 0.08)' }]} />

      <View style={[styles.circle1, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.05)' : 'rgba(16, 185, 129, 0.1)' }]} />
      <View style={[styles.circle2, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.03)' : 'rgba(16, 185, 129, 0.08)' }]} />

      <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.card }]} onPress={() => router.back()}>
        <ArrowLeft size={24} color={colors.primary} />
      </TouchableOpacity>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerContainer}>
            <Text style={[styles.appName, { color: colors.primary }]}>Vaulta</Text>
            <Text style={[styles.welcomeText, { fontFamily: getFontFamily(deviceFont), color: colors.text }]}>Reset Password</Text>
            <Text style={[styles.subtitleText, { color: colors.textSecondary }]}>Enter your email to receive a reset link.</Text>
          </View>

          <View style={styles.formContainer}>
            {/* Email Input */}
            <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.iconContainer}>
                <Mail size={20} color={colors.primary} />
              </View>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Email Address"
                placeholderTextColor={colors.textSecondary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Reset Button */}
            <TouchableOpacity
              onPress={handleResetPassword}
              disabled={isLoading}
              style={styles.resetButtonWrapper}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#10b981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.resetButton}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Text style={styles.resetButtonText}>Send Reset Link</Text>
                    <Send size={20} color="white" style={{ marginLeft: 8 }} />
                  </>
                )}
              </LinearGradient>
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
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  circle1: {
    position: 'absolute',
    top: -50,
    left: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  circle2: {
    position: 'absolute',
    bottom: -100,
    right: -50,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },

  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 10,
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  headerContainer: {
    marginBottom: 40,
    alignItems: 'center',
  },
  appName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10b981',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  welcomeText: {
    fontFamily: 'AbrilFatface_400Regular',
    fontSize: 42,
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    maxWidth: 280,
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    height: 56,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#0f172a',
    height: '100%',
  },
  resetButtonWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  resetButton: {
    flexDirection: 'row',
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },

});
