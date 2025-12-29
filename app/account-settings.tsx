import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    TextInput,
    Platform,
    ActivityIndicator,
    Modal,
    KeyboardAvoidingView,
    TouchableWithoutFeedback,
    Keyboard,
    Switch,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '@/providers/auth-provider';
import { useFirebase } from '@/providers/firebase-provider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    Lock,
    Mail,
    User as UserIcon,
    Phone,
    Save,
    X,
    Eye,
    EyeOff,
    ShieldCheck,
    AlertCircle,
    Edit3,
    Moon,
    Sun,
    Smartphone,
    Check,
    ChevronRight,
    ChevronLeft,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts, AbrilFatface_400Regular } from '@expo-google-fonts/abril-fatface';
import { getFontFamily } from '@/config/font-config';
import { useBusiness } from '@/providers/business-provider';
import { useTheme } from '@/providers/theme-provider';

// ModalInput component defined outside main component to prevent re-creation on every render
const ModalInput = ({
    label,
    value,
    onChangeText,
    placeholder,
    icon: Icon,
    keyboardType = 'default',
    secureTextEntry = false,
    showPasswordToggle = false,
    onTogglePassword
}: {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder: string;
    icon?: any;
    keyboardType?: 'default' | 'email-address' | 'phone-pad';
    secureTextEntry?: boolean;
    showPasswordToggle?: boolean;
    onTogglePassword?: () => void;
}) => {
    const { colors, isDark } = useTheme();
    const [isFocused, setIsFocused] = useState(false);

    return (
        <View style={modalStyles.inputGroup}>
            <Text style={[modalStyles.inputLabel, { color: colors.textSecondary }]}>{label}</Text>
            <View style={[
                modalStyles.inputWrapper,
                {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc',
                    borderColor: isFocused ? colors.primary : (isDark ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0'),
                    borderWidth: 1.5,
                    borderRadius: 14,
                    height: 54,
                }
            ]}>
                {Icon && (
                    <View style={modalStyles.inputIcon}>
                        <Icon size={18} color={isFocused ? colors.primary : colors.textSecondary} />
                    </View>
                )}
                <TextInput
                    style={[
                        modalStyles.input,
                        {
                            color: colors.text,
                            fontFamily: 'Inter_400Regular',
                            paddingLeft: Icon ? 40 : 12,
                        },
                        showPasswordToggle && { paddingRight: 40 }
                    ]}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={colors.textSecondary}
                    keyboardType={keyboardType}
                    secureTextEntry={secureTextEntry}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    autoCapitalize="none"
                />
                {showPasswordToggle && (
                    <TouchableOpacity onPress={onTogglePassword} style={modalStyles.eyeIcon}>
                        {secureTextEntry ? <Eye size={18} color={colors.textSecondary} /> : <EyeOff size={18} color={colors.textSecondary} />}
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

// EditModal component defined outside main component to prevent re-creation on every render
const EditModal = ({
    title,
    visible,
    onClose,
    onSave,
    children,
    saveText = 'Save Changes',
    isDestructive = false,
    isLoading = false,
    fontFamily
}: {
    title: string;
    visible: boolean;
    onClose: () => void;
    onSave: () => void;
    children: React.ReactNode;
    saveText?: string;
    isDestructive?: boolean;
    isLoading?: boolean;
    fontFamily?: string;
}) => {
    const { colors, theme, isDark } = useTheme();

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
            statusBarTranslucent={true}
        >
            <View
                style={[modalStyles.modalOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.4)' }]}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
                    style={{ flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' }}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 20}
                >
                    <View style={{ flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                            <View style={{ width: '100%', maxWidth: 420 }}>
                                <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                                    <View
                                        style={[
                                            modalStyles.modalContent,
                                            {
                                                backgroundColor: isDark ? '#0A0A0A' : '#ffffff',
                                                borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0',
                                                borderWidth: 1,
                                                padding: 24,
                                            }
                                        ]}
                                    >
                                        <View style={modalStyles.modalHeader}>
                                            <View>
                                                <Text style={[modalStyles.modalTitle, fontFamily ? { fontFamily } : {}, { color: colors.text }]}>{title}</Text>
                                                <View style={[modalStyles.headerUnderline, { backgroundColor: colors.primary }]} />
                                            </View>
                                            <TouchableOpacity onPress={onClose} style={[modalStyles.closeButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }]}>
                                                <X size={20} color={colors.textSecondary} />
                                            </TouchableOpacity>
                                        </View>

                                        <ScrollView
                                            style={modalStyles.modalScrollView}
                                            contentContainerStyle={modalStyles.modalBody}
                                            showsVerticalScrollIndicator={false}
                                            keyboardShouldPersistTaps="handled"
                                        >
                                            {children}
                                        </ScrollView>

                                        <View style={modalStyles.modalFooter}>
                                            <TouchableOpacity
                                                style={[modalStyles.modalCancelButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }]}
                                                onPress={onClose}
                                                disabled={isLoading}
                                            >
                                                <Text style={[modalStyles.modalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={modalStyles.modalSaveButtonWrapper}
                                                onPress={onSave}
                                                disabled={isLoading}
                                                activeOpacity={0.9}
                                            >
                                                <LinearGradient
                                                    colors={isDestructive ? ['#ef4444', '#b91c1c'] : ['#10b981', '#059669']}
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 1 }}
                                                    style={modalStyles.modalSaveButton}
                                                >
                                                    {isLoading ? (
                                                        <ActivityIndicator color="#fff" size="small" />
                                                    ) : (
                                                        <>
                                                            {!isDestructive && <Save size={18} color="#fff" style={{ marginRight: 8 }} />}
                                                            <Text style={modalStyles.modalSaveText}>{saveText}</Text>
                                                        </>
                                                    )}
                                                </LinearGradient>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </TouchableWithoutFeedback>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
};

// Helper to darken color slightly for gradient
const customDarken = (hex: string, amount: number) => {
    return hex;
};

export default function AccountSettingsScreen() {
    const { user, updateEmail, updatePassword, updateProfile, reauthenticate, deleteAccount } = useAuth();
    const { currentBusiness } = useBusiness();
    const { deviceFont, theme, setTheme, colors, isDark } = useTheme();
    const { user: fbUser, resendVerificationEmail } = useFirebase();
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const [activeEditor, setActiveEditor] = useState<'name' | 'email' | 'password' | 'delete' | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [showThemeModal, setShowThemeModal] = useState(false);
    const [verificationMessage, setVerificationMessage] = useState('');
    const [deleteAccountPassword, setDeleteAccountPassword] = useState('');

    const [fontsLoaded] = useFonts({
        AbrilFatface_400Regular,
    });

    const resetFormStates = () => {
        setActiveEditor(null);
        if (user) {
            setName(user.name || '');
            setEmail(user.email || '');
        }
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setDeleteAccountPassword('');
        setShowCurrentPassword(false);
        setShowNewPassword(false);
        setShowConfirmPassword(false);
    };

    const handleUpdateName = async () => {
        if (!user) return;
        try {
            setIsLoading(true);
            await updateProfile({ displayName: name });
            resetFormStates();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to update name');
        } finally {
            setIsLoading(false);
        }
    };

    const handleChangeEmail = async () => {
        if (!user || !email) return;
        if (email === user.email) {
            Alert.alert('Info', 'This is already your current email');
            return;
        }
        try {
            setIsLoading(true);
            await updateEmail(email);
            resetFormStates();
            Alert.alert('Success', 'Email updated successfully');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to update email');
        } finally {
            setIsLoading(false);
        }
    };

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            Alert.alert('Error', 'Please fill in all password fields');
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert('Error', 'New passwords do not match');
            return;
        }
        if (newPassword.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters');
            return;
        }
        try {
            setIsLoading(true);
            await updatePassword(currentPassword, newPassword);
            resetFormStates();
            Alert.alert('Success', 'Password updated successfully');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to update password');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!deleteAccountPassword.trim()) {
            Alert.alert('Error', 'Please enter your password');
            return;
        }
        try {
            setIsLoading(true);
            const reauthResult = await reauthenticate(deleteAccountPassword);
            if (!reauthResult.success) {
                Alert.alert('Error', reauthResult.error || 'Invalid password');
                return;
            }
            const result = await deleteAccount();
            if (result.success) {
                resetFormStates();
                Alert.alert('Account Deleted', 'Your account has been successfully deleted.');
            } else {
                Alert.alert('Error', result.error || 'Failed to delete account');
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to delete account');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendVerification = async () => {
        try {
            setIsLoading(true);
            const { error } = await resendVerificationEmail();
            if (error) {
                setVerificationMessage('Error sending verification email');
            } else {
                setVerificationMessage('Verification email sent!');
            }
        } catch (error: any) {
            setVerificationMessage('Error occurred');
        } finally {
            setIsLoading(false);
            setTimeout(() => setVerificationMessage(''), 3000);
        }
    };

    if (!fontsLoaded) return null;

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Decorative Background Elements */}
            <View style={styles.circle1} />
            <View style={styles.circle2} />
            <View style={styles.circle3} />

            <ScrollView
                style={styles.scrollContainer}
                contentContainerStyle={{ padding: 20, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.headerContainer}>
                    <View style={styles.headerTop}>
                        <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9' }]}>
                            <ChevronLeft size={24} color={isDark ? '#fff' : '#0f172a'} />
                        </TouchableOpacity>
                    </View>
                    <Text style={[styles.appName, { color: colors.primary }]}>PROFILE</Text>
                    <Text style={[styles.headerTitle, { fontFamily: getFontFamily(deviceFont), color: colors.text }]}>Account</Text>
                    <View style={[styles.headerLine, { backgroundColor: colors.primary }]} />
                    <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>Personalize your identity and security</Text>
                </View>

                <View>
                    {/* Profile Card */}
                    <View style={[styles.profileCard, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.8)', borderColor: colors.border }]}>
                        {isDark ? (
                            <LinearGradient
                                colors={['rgba(33, 201, 141, 0.05)', 'transparent']}
                                style={StyleSheet.absoluteFill}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            />
                        ) : (
                            <LinearGradient
                                colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.5)']}
                                style={StyleSheet.absoluteFill}
                            />
                        )}

                        <View style={styles.avatarWrapper}>
                            <View style={styles.avatarRing}>
                                <LinearGradient
                                    colors={['#10b981', '#059669', '#34d399']}
                                    style={StyleSheet.absoluteFill}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                />
                            </View>
                            <View style={styles.avatarContainer}>
                                <LinearGradient
                                    colors={[colors.primary, customDarken(colors.primary, 20)]}
                                    style={StyleSheet.absoluteFill}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                />
                                <Text style={styles.avatarText}>
                                    {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.userInfo}>
                            <Text style={[styles.userName, { color: colors.text }]}>{user?.name || 'User'}</Text>
                            <View style={[styles.emailBadge, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9' }]}>
                                <Mail size={12} color={colors.textSecondary} />
                                <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{user?.email}</Text>
                            </View>
                        </View>

                        <View style={styles.decorativeLine}>
                            <LinearGradient
                                colors={['transparent', colors.border, 'transparent']}
                                style={StyleSheet.absoluteFill}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            />
                        </View>

                        <View style={styles.statsRow}>
                            <View style={[styles.statBadge, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#f8fafc', borderColor: colors.border, borderWidth: 1 }]}>
                                <ShieldCheck size={14} color={fbUser?.emailVerified ? colors.primary : colors.textSecondary} />
                                <Text style={[styles.statText, { color: fbUser?.emailVerified ? colors.primary : colors.textSecondary }]}>
                                    {fbUser?.emailVerified ? 'Verified' : 'Unverified'}
                                </Text>
                            </View>
                            <View style={[styles.statBadge, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#f8fafc', borderColor: colors.border, borderWidth: 1 }]}>
                                <UserIcon size={14} color={colors.textSecondary} />
                                <Text style={[styles.statText, { color: colors.textSecondary }]}>
                                    {fbUser?.metadata?.creationTime
                                        ? `${new Date(fbUser.metadata.creationTime).getFullYear()}`
                                        : '2024'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Appearance Settings */}
                    <View style={[styles.sectionCard, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.7)', borderColor: colors.border, borderWidth: 1 }]}>
                        <View style={[styles.sectionHeader, { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.05)' : colors.border }]}>
                            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>APPEARANCE</Text>
                        </View>

                        <TouchableOpacity style={styles.settingItem} onPress={() => setShowThemeModal(true)} activeOpacity={0.7}>
                            <View style={[styles.settingIcon, { backgroundColor: isDark ? 'rgba(33, 201, 141, 0.1)' : '#f0fdf4' }]}>
                                {theme === 'dark' ? <Moon size={18} color={colors.primary} /> :
                                    <Sun size={18} color="#f59e0b" />}
                            </View>
                            <View style={styles.settingContent}>
                                <Text style={[styles.settingLabel, { color: colors.text }]}>Visual Theme</Text>
                                <Text style={[styles.settingValue, { color: colors.textSecondary }]}>
                                    {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                                </Text>
                            </View>
                            <View style={styles.pickerArrow}>
                                <ChevronRight size={18} color={colors.textSecondary} />
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Profile Settings Card */}
                    <View style={[styles.sectionCard, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.7)', borderColor: colors.border }]}>
                        <View style={[styles.sectionHeader, { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.05)' : colors.border }]}>
                            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>PERSONAL INFO</Text>
                        </View>

                        <TouchableOpacity style={styles.settingItem} onPress={() => setActiveEditor('name')} activeOpacity={0.7}>
                            <View style={[styles.settingIcon, { backgroundColor: isDark ? 'rgba(33, 201, 141, 0.1)' : '#f0fdf1' }]}>
                                <UserIcon size={18} color={colors.primary} />
                            </View>
                            <View style={styles.settingContent}>
                                <Text style={[styles.settingLabel, { color: colors.text }]}>Display Name</Text>
                                <Text style={[styles.settingValue, { color: colors.textSecondary }]}>{user?.name || 'Not set'}</Text>
                            </View>
                            <ChevronRight size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {/* Security Settings Card */}
                    <View style={[styles.sectionCard, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.7)', borderColor: colors.border }]}>
                        <View style={[styles.sectionHeader, { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.05)' : colors.border }]}>
                            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>SECURITY</Text>
                        </View>

                        <TouchableOpacity style={styles.settingItem} onPress={() => setActiveEditor('email')} activeOpacity={0.7}>
                            <View style={[styles.settingIcon, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#ecfdf5' }]}>
                                <Mail size={18} color={isDark ? colors.primary : '#10b981'} />
                            </View>
                            <View style={styles.settingContent}>
                                <Text style={[styles.settingLabel, { color: colors.text }]}>Email Address</Text>
                                <Text style={[styles.settingValue, { color: colors.textSecondary }]}>{user?.email}</Text>
                            </View>
                            <ChevronRight size={18} color={colors.textSecondary} />
                        </TouchableOpacity>

                        <View style={[styles.settingDivider, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : colors.border }]} />

                        <TouchableOpacity style={styles.settingItem} onPress={() => setActiveEditor('password')} activeOpacity={0.7}>
                            <View style={[styles.settingIcon, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.1)' : '#fef3c7' }]}>
                                <Lock size={18} color={isDark ? '#fbbf24' : '#f59e0b'} />
                            </View>
                            <View style={styles.settingContent}>
                                <Text style={[styles.settingLabel, { color: colors.text }]}>Account Password</Text>
                                <Text style={[styles.settingValue, { color: colors.textSecondary }]}>••••••••</Text>
                            </View>
                            <ChevronRight size={18} color={colors.textSecondary} />
                        </TouchableOpacity>

                        <View style={[styles.settingDivider, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : colors.border }]} />

                        <TouchableOpacity
                            style={styles.settingItem}
                            activeOpacity={0.7}
                            onPress={fbUser?.emailVerified ? undefined : handleResendVerification}
                            disabled={fbUser?.emailVerified}
                        >
                            <View style={[styles.settingIcon, { backgroundColor: isDark ? (fbUser?.emailVerified ? 'rgba(33, 201, 141, 0.1)' : 'rgba(239, 68, 68, 0.1)') : (fbUser?.emailVerified ? '#ecfdf5' : '#fef2f2') }]}>
                                {fbUser?.emailVerified ? <ShieldCheck size={18} color={colors.primary} /> : <AlertCircle size={18} color="#ef4444" />}
                            </View>
                            <View style={styles.settingContent}>
                                <Text style={[styles.settingLabel, { color: colors.text }]}>Identity Verification</Text>
                                <Text style={[styles.settingValue, { color: fbUser?.emailVerified ? colors.primary : '#ef4444' }]}>
                                    {fbUser?.emailVerified ? 'Verified Account' : (verificationMessage || 'Requires Verification')}
                                </Text>
                            </View>
                            {!fbUser?.emailVerified && <ChevronRight size={18} color={colors.textSecondary} />}
                        </TouchableOpacity>
                    </View>

                </View>
            </ScrollView>

            {/* --- MODALS --- */}

            <EditModal
                visible={activeEditor === 'name'}
                title="Edit Name"
                onClose={resetFormStates}
                onSave={handleUpdateName}
                isLoading={isLoading}
                fontFamily={getFontFamily(deviceFont)}
            >
                <ModalInput
                    label="Full Name"
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter your full name"
                    icon={UserIcon}
                />
            </EditModal>

            <EditModal
                visible={activeEditor === 'email'}
                title="Change Email"
                onClose={resetFormStates}
                onSave={handleChangeEmail}
                isLoading={isLoading}
                fontFamily={getFontFamily(deviceFont)}
            >
                <ModalInput
                    label="Email Address"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Enter new email address"
                    keyboardType="email-address"
                    icon={Mail}
                />
            </EditModal>

            <EditModal
                visible={activeEditor === 'password'}
                title="Change Password"
                onClose={resetFormStates}
                onSave={handleChangePassword}
                isLoading={isLoading}
                fontFamily={getFontFamily(deviceFont)}
            >
                <ModalInput
                    label="Current Password"
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    placeholder="Enter current password"
                    secureTextEntry={!showCurrentPassword}
                    showPasswordToggle
                    onTogglePassword={() => setShowCurrentPassword(!showCurrentPassword)}
                    icon={Lock}
                />
                <ModalInput
                    label="New Password"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Enter new password"
                    secureTextEntry={!showNewPassword}
                    showPasswordToggle
                    onTogglePassword={() => setShowNewPassword(!showNewPassword)}
                    icon={Lock}
                />
                <ModalInput
                    label="Confirm Password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm new password"
                    secureTextEntry={!showConfirmPassword}
                    showPasswordToggle
                    onTogglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
                    icon={Lock}
                />
            </EditModal>

            <EditModal
                visible={activeEditor === 'delete'}
                title="Delete Account"
                onClose={resetFormStates}
                onSave={handleDeleteAccount}
                saveText="Delete My Account"
                isDestructive
                isLoading={isLoading}
                fontFamily={getFontFamily(deviceFont)}
            >
                <View style={styles.warningBox}>
                    <AlertCircle size={20} color="#EF4444" />
                    <Text style={styles.warningText}>
                        Warning: This action cannot be undone. All your data will be permanently deleted.
                    </Text>
                </View>
                <ModalInput
                    label="Confirm Password"
                    value={deleteAccountPassword}
                    onChangeText={setDeleteAccountPassword}
                    placeholder="Enter password to confirm"
                    secureTextEntry
                    icon={Lock}
                />
            </EditModal>

            <Modal
                visible={showThemeModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowThemeModal(false)}
                statusBarTranslucent={true}
            >
                <View style={[modalStyles.modalOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)' }]}>
                    <TouchableWithoutFeedback onPress={() => setShowThemeModal(false)}>
                        <View style={{ flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                                <View
                                    style={[
                                        modalStyles.modalContent,
                                        {
                                            backgroundColor: isDark ? '#0A0A0A' : '#ffffff',
                                            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0',
                                            borderWidth: 1,
                                            maxWidth: 340
                                        }
                                    ]}
                                >
                                    <View style={[modalStyles.modalHeader, { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9' }]}>
                                        <Text style={[modalStyles.modalTitle, { fontFamily: getFontFamily(deviceFont), color: colors.text }]}>Theme</Text>
                                        <TouchableOpacity onPress={() => setShowThemeModal(false)} style={[modalStyles.closeButton, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9' }]}>
                                            <X size={20} color={colors.textSecondary} />
                                        </TouchableOpacity>
                                    </View>

                                    <View style={{ padding: 12 }}>
                                        {(['light', 'dark'] as const).map((mode) => (
                                            <TouchableOpacity
                                                key={mode}
                                                style={[
                                                    styles.themeOption,
                                                    {
                                                        backgroundColor: theme === mode ? (isDark ? 'rgba(16, 185, 129, 0.15)' : '#f0fdf4') : 'transparent',
                                                        borderRadius: 12,
                                                        padding: 12,
                                                        flexDirection: 'row',
                                                        alignItems: 'center',
                                                        marginVertical: 4
                                                    }
                                                ]}
                                                onPress={() => {
                                                    setTheme(mode);
                                                    setShowThemeModal(false);
                                                }}
                                            >
                                                <View style={[styles.themeIcon, {
                                                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#f8fafc',
                                                    width: 44,
                                                    height: 44,
                                                    borderRadius: 14,
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    marginRight: 16
                                                }]}>
                                                    {mode === 'dark' ? <Moon size={18} color={theme === mode ? colors.primary : colors.textSecondary} /> :
                                                        <Sun size={18} color={theme === mode ? "#f59e0b" : colors.textSecondary} />}
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={{
                                                        fontSize: 15,
                                                        fontWeight: theme === mode ? '700' : '500',
                                                        color: theme === mode ? colors.text : colors.textSecondary
                                                    }}>
                                                        {mode === 'dark' ? 'Dark Mode' : 'Light Mode'}
                                                    </Text>
                                                </View>
                                                {theme === mode && <Check size={18} color={colors.primary} />}
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            </TouchableWithoutFeedback>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </Modal>

        </View>
    );
}

const modalStyles = StyleSheet.create({
    inputGroup: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 11,
        fontWeight: '800',
        marginBottom: 6,
        marginLeft: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        overflow: 'hidden',
        height: 54,
    },
    inputIcon: {
        position: 'absolute',
        left: 14,
        zIndex: 1,
    },
    input: {
        flex: 1,
        height: '100%',
        fontSize: 15,
        paddingRight: 12,
        fontWeight: '500',
    },
    eyeIcon: {
        position: 'absolute',
        right: 12,
        padding: 8,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        borderRadius: 32,
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 25 },
        shadowOpacity: 0.4,
        shadowRadius: 40,
        elevation: 25,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    headerUnderline: {
        height: 4,
        width: 24,
        borderRadius: 2,
        marginTop: 6,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    closeButton: {
        padding: 8,
        borderRadius: 12,
    },
    modalScrollView: {
        maxHeight: 400,
    },
    modalBody: {
        paddingVertical: 4,
    },
    modalFooter: {
        flexDirection: 'row',
        marginTop: 16,
        gap: 12,
    },
    modalCancelButton: {
        flex: 1,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalCancelText: {
        fontWeight: '700',
        fontSize: 15,
    },
    modalSaveButtonWrapper: {
        flex: 1.5,
        borderRadius: 14,
        overflow: 'hidden',
    },
    modalSaveButton: {
        flexDirection: 'row',
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalSaveText: {
        color: '#FFFFFF',
        fontWeight: '800',
        fontSize: 16,
        letterSpacing: 0.5,
    },
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
        overflow: 'hidden',
    },
    circle1: {
        position: 'absolute',
        top: -100,
        right: -100,
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: 'rgba(33, 201, 141, 0.08)',
    },
    circle2: {
        position: 'absolute',
        bottom: -150,
        left: -100,
        width: 400,
        height: 400,
        borderRadius: 200,
        backgroundColor: 'rgba(16, 185, 129, 0.05)',
    },
    circle3: {
        position: 'absolute',
        top: '30%',
        right: -80,
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(33, 201, 141, 0.03)',
    },
    scrollContainer: {
        flex: 1,
    },
    headerContainer: {
        marginBottom: 24,
    },
    headerTop: {
        marginBottom: 16,
        alignItems: 'flex-start',
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 2,
    },
    appName: {
        fontSize: 13,
        fontWeight: '800',
        color: '#10b981',
        textTransform: 'uppercase',
        letterSpacing: 2.5,
        marginBottom: 6,
    },
    headerTitle: {
        fontFamily: 'AbrilFatface_400Regular',
        fontSize: 42,
        color: '#0f172a',
        marginBottom: 12,
        letterSpacing: -1,
    },
    headerLine: {
        width: 40,
        height: 4,
        borderRadius: 2,
        marginBottom: 16,
    },
    pageSubtitle: {
        fontSize: 15,
        color: '#64748b',
        lineHeight: 22,
        fontWeight: '500',
    },
    profileCard: {
        borderRadius: 24,
        padding: 24,
        marginBottom: 20,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 5,
        overflow: 'hidden',
    },
    avatarWrapper: {
        alignItems: 'center',
        marginBottom: 14,
    },
    avatarRing: {
        position: 'absolute',
        width: 74,
        height: 74,
        borderRadius: 37,
        overflow: 'hidden',
    },
    avatarContainer: {
        width: 66,
        height: 66,
        borderRadius: 33,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderWidth: 3,
        borderColor: '#fff',
    },
    avatarText: {
        fontSize: 28,
        fontWeight: '700',
        color: '#fff',
    },
    userInfo: {
        alignItems: 'center',
        marginBottom: 14,
    },
    userName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: 6,
        letterSpacing: -0.3,
    },
    emailBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 16,
    },
    userEmail: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '500',
    },
    decorativeLine: {
        height: 1,
        marginBottom: 14,
        overflow: 'hidden',
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    statBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    statText: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 16,
        marginTop: 10,
        gap: 10,
    },
    logoutText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#ef4444',
    },
    sectionCard: {
        borderRadius: 20,
        marginBottom: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    sectionHeader: {
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 10,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '800',
        color: '#64748b',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    settingDivider: {
        height: 1,
        backgroundColor: '#f1f5f9',
        marginLeft: 60,
    },
    settingIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    settingContent: {
        flex: 1,
        marginLeft: 12,
    },
    pickerArrow: {
        paddingLeft: 8,
    },
    themeOption: {
        // transition is not supported in React Native
    },
    themeIcon: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    settingLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0f172a',
        marginBottom: 1,
    },
    settingValue: {
        fontSize: 13,
        color: '#64748b',
    },
    warningBox: {
        flexDirection: 'row',
        backgroundColor: '#fef2f2',
        padding: 14,
        borderRadius: 12,
        marginBottom: 16,
        gap: 10,
        alignItems: 'flex-start',
        borderWidth: 1,
        borderColor: '#fee2e2',
    },
    warningText: {
        flex: 1,
        fontSize: 13,
        color: '#b91c1c',
        lineHeight: 18,
        fontWeight: '500',
    },
});
