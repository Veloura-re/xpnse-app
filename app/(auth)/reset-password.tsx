import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useFirebase } from '@/providers/firebase-provider';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react-native';

export default function ResetPasswordScreen() {
    const { confirmPasswordReset } = useFirebase();
    const params = useLocalSearchParams<{ oobCode?: string }>();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!params.oobCode) {
            setError('Invalid or missing reset code.');
        }
    }, [params.oobCode]);

    const handleReset = async () => {
        if (!params.oobCode) {
            Alert.alert('Error', 'Invalid reset link.');
            return;
        }

        if (newPassword.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters.');
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match.');
            return;
        }

        setIsLoading(true);
        setError(null);

        const result = await confirmPasswordReset(params.oobCode, newPassword);

        setIsLoading(false);

        if (result.success) {
            Alert.alert(
                'Success',
                'Your password has been reset successfully. You can now log in with your new password.',
                [{ text: 'Go to Login', onPress: () => router.replace('/(auth)/login') }]
            );
        } else {
            Alert.alert('Error', result.error || 'Failed to reset password.');
        }
    };

    if (error) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.content}>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.button} onPress={() => router.replace('/(auth)/login')}>
                        <Text style={styles.buttonText}>Back to Login</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                <ArrowLeft size={24} color="#374151" />
            </TouchableOpacity>

            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.title}>Set New Password</Text>
                    <Text style={styles.subtitle}>
                        Please enter your new password below.
                    </Text>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>New Password</Text>
                        <View style={styles.passwordContainer}>
                            <TextInput
                                style={styles.passwordInput}
                                value={newPassword}
                                onChangeText={setNewPassword}
                                placeholder="Enter new password"
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                            />
                            <TouchableOpacity
                                style={styles.eyeIcon}
                                onPress={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? (
                                    <EyeOff size={20} color="#9ca3af" />
                                ) : (
                                    <Eye size={20} color="#9ca3af" />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Confirm Password</Text>
                        <View style={styles.passwordContainer}>
                            <TextInput
                                style={styles.passwordInput}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                placeholder="Confirm new password"
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                            />
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.button, isLoading && styles.buttonDisabled]}
                        onPress={handleReset}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={styles.buttonText}>Reset Password</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
        padding: 24,
    },
    backButton: {
        alignSelf: 'flex-start',
        marginBottom: 20,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#64748b',
        textAlign: 'center',
    },
    form: {
        marginBottom: 32,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 12,
    },
    passwordInput: {
        flex: 1,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: '#1f2937',
    },
    eyeIcon: {
        padding: 14,
    },
    button: {
        backgroundColor: '#10b981',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 8,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    errorText: {
        color: '#dc2626',
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 20,
    },
});
