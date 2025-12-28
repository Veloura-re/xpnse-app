import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Lock, Mail, Eye, EyeOff, Check, X, AlertCircle, CheckCircle } from 'lucide-react-native';

export default function SecurityScreen() {
    const { user, updatePassword, updateEmail, reauthenticate } = useAuth();
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [activeTab, setActiveTab] = useState<'password' | 'email'>('password');
    const [isLoading, setIsLoading] = useState(false);

    // Password State
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPasswords, setShowPasswords] = useState(false);

    // Email State
    const [newEmail, setNewEmail] = useState('');
    const [emailPassword, setEmailPassword] = useState(''); // Password required for email change

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [modalConfig, setModalConfig] = useState<{ type: 'success' | 'error', title: string, message: string }>({
        type: 'error',
        title: '',
        message: ''
    });

    const showModal = (type: 'success' | 'error', title: string, message: string) => {
        setModalConfig({ type, title, message });
        setModalVisible(true);
    };

    const handleUpdatePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            showModal('error', 'Error', 'Please fill in all fields');
            return;
        }

        if (newPassword !== confirmPassword) {
            showModal('error', 'Error', 'New passwords do not match');
            return;
        }

        if (newPassword.length < 6) {
            showModal('error', 'Error', 'Password must be at least 6 characters');
            return;
        }

        setIsLoading(true);
        try {
            const result = await updatePassword(currentPassword, newPassword);
            if (result.success) {
                showModal('success', 'Success', 'Password updated successfully');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            } else {
                showModal('error', 'Error', result.error || 'Failed to update password');
            }
        } catch (error) {
            showModal('error', 'Error', 'An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateEmail = async () => {
        if (!newEmail || !emailPassword) {
            showModal('error', 'Error', 'Please enter new email and current password');
            return;
        }

        if (!newEmail.includes('@')) {
            showModal('error', 'Error', 'Please enter a valid email address');
            return;
        }

        setIsLoading(true);
        try {
            // First re-authenticate to confirm ownership
            const reauth = await reauthenticate(emailPassword);
            if (!reauth.success) {
                showModal('error', 'Error', reauth.error || 'Incorrect password');
                setIsLoading(false);
                return;
            }

            // Then update email
            const result = await updateEmail(newEmail);
            if (result.success) {
                showModal('success', 'Success', 'Email updated successfully. Please verify your new email if required.');
                setNewEmail('');
                setEmailPassword('');
            } else {
                showModal('error', 'Error', result.error || 'Failed to update email');
            }
        } catch (error) {
            showModal('error', 'Error', 'An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen
                options={{
                    title: 'Security',
                    headerStyle: { backgroundColor: colors.background },
                    headerShadowVisible: false,
                    headerTitleStyle: { fontSize: 17, fontWeight: '600', color: colors.text },
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: -8, padding: 8 }}>
                            <ChevronLeft size={24} color={colors.text} />
                        </TouchableOpacity>
                    ),
                }}
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
            >
                <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}>

                    {/* Tab Switcher */}
                    <View style={[styles.tabContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'password' && [styles.activeTab, { backgroundColor: isDark ? 'rgba(33, 201, 141, 0.1)' : '#f0fdf4' }]]}
                            onPress={() => setActiveTab('password')}
                        >
                            <Lock size={18} color={activeTab === 'password' ? colors.primary : colors.textSecondary} />
                            <Text style={[styles.tabText, { color: colors.textSecondary }, activeTab === 'password' && [styles.activeTabText, { color: colors.primary }]]}>Password</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'email' && [styles.activeTab, { backgroundColor: isDark ? 'rgba(33, 201, 141, 0.1)' : '#f0fdf4' }]]}
                            onPress={() => setActiveTab('email')}
                        >
                            <Mail size={18} color={activeTab === 'email' ? colors.primary : colors.textSecondary} />
                            <Text style={[styles.tabText, { color: colors.textSecondary }, activeTab === 'email' && [styles.activeTabText, { color: colors.primary }]]}>Email</Text>
                        </TouchableOpacity>
                    </View>

                    {activeTab === 'password' ? (
                        <View style={[styles.formContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <View style={styles.header}>
                                <Text style={[styles.headerTitle, { color: colors.text }]}>Change Password</Text>
                                <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Ensure your account is using a long, random password to stay secure.</Text>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: colors.text }]}>Current Password</Text>
                                <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                                    <View style={styles.inputIcon}>
                                        <Lock size={20} color={colors.textSecondary} />
                                    </View>
                                    <TextInput
                                        style={[styles.input, { color: colors.text }]}
                                        value={currentPassword}
                                        onChangeText={setCurrentPassword}
                                        placeholder="Enter current password"
                                        secureTextEntry={!showPasswords}
                                        placeholderTextColor={colors.textSecondary}
                                    />
                                    <TouchableOpacity onPress={() => setShowPasswords(!showPasswords)} style={styles.eyeIcon}>
                                        {showPasswords ? <EyeOff size={20} color={colors.textSecondary} /> : <Eye size={20} color={colors.textSecondary} />}
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: colors.text }]}>New Password</Text>
                                <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                                    <View style={styles.inputIcon}>
                                        <Lock size={20} color={colors.textSecondary} />
                                    </View>
                                    <TextInput
                                        style={[styles.input, { color: colors.text }]}
                                        value={newPassword}
                                        onChangeText={setNewPassword}
                                        placeholder="Enter new password"
                                        secureTextEntry={!showPasswords}
                                        placeholderTextColor={colors.textSecondary}
                                    />
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: colors.text }]}>Confirm New Password</Text>
                                <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                                    <View style={styles.inputIcon}>
                                        <Lock size={20} color={colors.textSecondary} />
                                    </View>
                                    <TextInput
                                        style={[styles.input, { color: colors.text }]}
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                        placeholder="Confirm new password"
                                        secureTextEntry={!showPasswords}
                                        placeholderTextColor={colors.textSecondary}
                                    />
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[styles.submitButton, { backgroundColor: colors.primary }, isLoading && styles.submitButtonDisabled]}
                                onPress={handleUpdatePassword}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <>
                                        <Check size={20} color="#fff" style={{ marginRight: 8 }} />
                                        <Text style={styles.submitButtonText}>Update Password</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={[styles.formContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <View style={styles.header}>
                                <Text style={[styles.headerTitle, { color: colors.text }]}>Change Email</Text>
                                <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Update your email address. You may need to verify your new email.</Text>
                            </View>

                            <View style={[styles.currentEmailContainer, { backgroundColor: colors.surface }]}>
                                <Text style={[styles.currentEmailLabel, { color: colors.textSecondary }]}>Current Email</Text>
                                <Text style={[styles.currentEmailValue, { color: colors.text }]}>{user?.email}</Text>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: colors.text }]}>New Email Address</Text>
                                <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                                    <View style={styles.inputIcon}>
                                        <Mail size={20} color={colors.textSecondary} />
                                    </View>
                                    <TextInput
                                        style={[styles.input, { color: colors.text }]}
                                        value={newEmail}
                                        onChangeText={setNewEmail}
                                        placeholder="Enter new email"
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        placeholderTextColor={colors.textSecondary}
                                    />
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: colors.text }]}>Current Password</Text>
                                <Text style={[styles.helperText, { color: colors.textSecondary }]}>Required to confirm changes</Text>
                                <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                                    <View style={styles.inputIcon}>
                                        <Lock size={20} color={colors.textSecondary} />
                                    </View>
                                    <TextInput
                                        style={[styles.input, { color: colors.text }]}
                                        value={emailPassword}
                                        onChangeText={setEmailPassword}
                                        placeholder="Enter password"
                                        secureTextEntry
                                        placeholderTextColor={colors.textSecondary}
                                    />
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[styles.submitButton, { backgroundColor: colors.primary }, isLoading && styles.submitButtonDisabled]}
                                onPress={handleUpdateEmail}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <>
                                        <Check size={20} color="#fff" style={{ marginRight: 8 }} />
                                        <Text style={styles.submitButtonText}>Update Email</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}

                </ScrollView>
            </KeyboardAvoidingView>

            {/* Custom Success/Error Modal */}
            <Modal
                visible={modalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: modalConfig.type === 'error' ? '#ef4444' : '#10b981' }]}>
                                {modalConfig.title}
                            </Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={[styles.closeButton, { backgroundColor: colors.card }]}>
                                <X size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.modalBody}>
                            <View style={[styles.statusIconContainer, { backgroundColor: modalConfig.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)' }]}>
                                {modalConfig.type === 'error' ? (
                                    <AlertCircle size={32} color="#ef4444" />
                                ) : (
                                    <CheckCircle size={32} color="#10b981" />
                                )}
                            </View>
                            <Text style={[styles.modalMessage, { color: colors.textSecondary }]}>{modalConfig.message}</Text>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: modalConfig.type === 'error' ? '#ef4444' : '#10b981' }]}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.modalButtonText}>OK</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    content: {
        padding: 20,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: 'transparent',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 2,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 8,
    },
    activeTab: {
        backgroundColor: 'transparent',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: 'inherit',
        marginLeft: 8,
    },
    activeTabText: {
        color: 'inherit',
    },
    formContainer: {
        backgroundColor: 'transparent',
        padding: 20,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 2,
    },
    header: {
        marginBottom: 24,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: 'inherit',
        marginBottom: 8,
    },
    headerSubtitle: {
        fontSize: 14,
        color: 'inherit',
        lineHeight: 20,
    },
    currentEmailContainer: {
        backgroundColor: 'transparent',
        padding: 12,
        borderRadius: 8,
        marginBottom: 20,
    },
    currentEmailLabel: {
        fontSize: 12,
        color: 'inherit',
        marginBottom: 4,
    },
    currentEmailValue: {
        fontSize: 14,
        fontWeight: '600',
        color: 'inherit',
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: 'inherit',
        marginBottom: 8,
    },
    helperText: {
        fontSize: 12,
        color: 'inherit',
        marginBottom: 8,
        fontStyle: 'italic',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'transparent',
        borderRadius: 12,
        backgroundColor: 'transparent',
        height: 50,
    },
    inputIcon: {
        paddingHorizontal: 12,
    },
    input: {
        flex: 1,
        height: '100%',
        color: 'inherit',
        fontSize: 15,
    },
    eyeIcon: {
        paddingHorizontal: 12,
    },
    submitButton: {
        flexDirection: 'row',
        backgroundColor: '#10b981',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    submitButtonDisabled: {
        opacity: 0.7,
    },
    submitButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: 'transparent',
        borderRadius: 20,
        width: '85%',
        maxWidth: 320,
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 0,
    },
    modalTitle: {
        fontFamily: 'AbrilFatface_400Regular',
        fontSize: 22,
    },
    closeButton: {
        padding: 4,
        backgroundColor: 'transparent',
        borderRadius: 12,
    },
    modalBody: {
        padding: 20,
        alignItems: 'center',
    },
    statusIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    modalMessage: {
        fontSize: 14,
        color: 'inherit',
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 20,
    },
    modalButton: {
        width: '100%',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    modalButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#fff',
    },
});
