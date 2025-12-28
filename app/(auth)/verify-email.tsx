import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, ScrollView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/providers/auth-provider';
import { useFirebase } from '@/providers/firebase-provider';
import { auth } from '@/config/firebase';
import { applyActionCode } from 'firebase/auth';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { resendVerificationEmail, reloadCurrentUser } = useFirebase();
  const [status, setStatus] = useState<'idle' | 'verifying' | 'verified' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const params = useLocalSearchParams<{ mode?: string; oobCode?: string }>();

  // Handle Firebase action link on web (verifyEmail)
  useEffect(() => {
    const maybeVerifyFromLink = async () => {
      if (Platform.OS === 'web' && params?.mode === 'verifyEmail' && params?.oobCode) {
        try {
          setStatus('verifying');
          if (!auth) throw new Error("Auth not initialized");
          await applyActionCode(auth, params.oobCode);
          await reloadCurrentUser();
          setStatus('verified');
          setMessage('Email verified successfully!');
          setTimeout(() => router.replace('/(tabs)'), 100);
        } catch (e: any) {
          setStatus('error');
          setMessage(e?.message || 'Verification link is invalid or expired.');
        }
      }
    };
    maybeVerifyFromLink();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.mode, params?.oobCode]);

  const handleResend = useCallback(async () => {
    const { error } = await resendVerificationEmail();
    if (error) {
      Alert.alert('Error', error.message || 'Failed to send verification email');
    } else {
      Alert.alert('Verification Email Sent', 'Please check your inbox (and spam folder).');
    }
  }, [resendVerificationEmail]);

  const handleCheck = useCallback(async () => {
    await reloadCurrentUser();
    if (auth?.currentUser?.emailVerified) {
      setStatus('verified');
      setMessage('Email verified! Redirecting...');
      setTimeout(() => router.replace('/(tabs)'), 100);
    } else {
      Alert.alert('Not Verified Yet', 'Please click the verification link in your email.');
    }
  }, [reloadCurrentUser, router]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Verify your email</Text>
        <Text style={styles.subtitle}>
          We sent a verification link to your email{user?.email ? ` (${user.email})` : ''}. Please open it and complete verification.
        </Text>

        <View style={styles.steps}>
          <View style={styles.stepRow}>
            <Text style={styles.stepIndex}>1</Text>
            <Text style={styles.stepText}>Open your inbox and find our email.</Text>
          </View>
          <View style={styles.stepRow}>
            <Text style={styles.stepIndex}>2</Text>
            <Text style={styles.stepText}>Click the &quot;Verify email&quot; button or link.</Text>
          </View>
          <View style={styles.stepRow}>
            <Text style={styles.stepIndex}>3</Text>
            <Text style={styles.stepText}>Return to the app and tap &quot;I&apos;ve verified&quot;.</Text>
          </View>
        </View>

        {message ? (
          <Text style={[styles.message, status === 'error' ? styles.messageError : styles.messageSuccess]}>
            {message}
          </Text>
        ) : null}

        <View style={styles.actions}>
          <TouchableOpacity style={[styles.button, styles.secondary]} onPress={handleResend}>
            <Text style={styles.buttonTextSecondary}>Resend Email</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.primary]} onPress={handleCheck}>
            <Text style={styles.buttonTextPrimary}>I&apos;ve verified</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.replace('/(auth)/login')} style={styles.linkRow}>
          <Text style={styles.linkText}>Back to Sign In</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f8fafc',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 16,
  },
  steps: {
    marginVertical: 8,
    gap: 8,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
    color: '#0f172a',
    fontWeight: '700',
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  stepText: {
    flex: 1,
    color: '#0f172a',
  },
  message: {
    marginTop: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  messageSuccess: {
    color: '#16a34a',
  },
  messageError: {
    color: '#dc2626',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  primary: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  secondary: {
    backgroundColor: 'white',
    borderColor: '#cbd5e1',
  },
  buttonTextPrimary: {
    color: 'white',
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: '#0f172a',
    fontWeight: '600',
  },
  linkRow: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkText: {
    color: '#10b981',
    fontWeight: '600',
  },
});
