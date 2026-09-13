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
    Image,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { GlassBackdrop } from '@/components/ui/glass-backdrop';
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
    Camera,
    Calendar,
    Sparkles,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getFontFamily } from '@/config/font-config';
import { useBusiness } from '@/providers/business-provider';
import { useTheme } from '@/providers/theme-provider';
import { BackgroundDecor } from '@/components/ui/background-decor';
import { pickImage, uploadImage } from '@/utils/imageUpload';

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
                            fontFamily: 'SpaceGrotesk_400Regular',
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
            <View style={modalStyles.modalOverlay}>
                <GlassBackdrop isDark={isDark} onPress={onClose} />
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
                                                backgroundColor: colors.surfaceGlass,
                                                borderColor: colors.borderGlass,
                                                borderWidth: 1,
                                                borderRadius: 28,
                                                padding: 24,
                                                overflow: 'hidden',
                                            }
                                        ]}
                                    >
                                        {/* Top Sheen */}
                                        <View
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 24,
                                                right: 24,
                                                height: 1,
                                                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.65)',
                                                zIndex: 10,
                                            }}
                                        />
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
    const [verificationMessage, setVerificationMessage] = useState('');
    const [deleteAccountPassword, setDeleteAccountPassword] = useState('');
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

    const handleUploadPhoto = async () => {
        try {
            setIsUploadingPhoto(true);
            const localUri = await pickImage();
            if (!localUri) return;
            const url = await uploadImage(localUri, `users/${user?.uid}/profile`);
            if (url) {
                await updateProfile({ photoURL: url });
            }
        } catch (err) {
            console.error('Profile photo upload error:', err);
            Alert.alert('Error', 'Could not upload profile photo.');
        } finally {
            setIsUploadingPhoto(false);
        }
    };

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

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <BackgroundDecor />
            <Stack.Screen options={{ headerShown: false }} />

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
                    <View style={[
                        styles.profileCard,
                        {
                            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.8)',
                            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
                            shadowColor: isDark ? '#000' : '#2A2015',
                            shadowOffset: { width: 0, height: 10 },
                            shadowOpacity: isDark ? 0.3 : 0.08,
                            shadowRadius: 20,
                            elevation: isDark ? 0 : 5,
                        }
                    ]}>
                        {isDark ? (
                            <LinearGradient
                                colors={['rgba(33, 201, 141, 0.08)', 'rgba(33, 201, 141, 0.01)', 'transparent']}
                                style={StyleSheet.absoluteFill}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            />
                        ) : (
                            <LinearGradient
                                colors={['rgba(255, 255, 255, 0.95)', 'rgba(240, 253, 244, 0.5)']}
                                style={StyleSheet.absoluteFill}
                            />
                        )}

                        <View style={styles.avatarWrapper}>
                            <TouchableOpacity
                                activeOpacity={0.85}
                                onPress={handleUploadPhoto}
                                disabled={isUploadingPhoto}
                                style={{ alignItems: 'center', justifyContent: 'center' }}
                            >
                                <View style={styles.avatarRing}>
                                    <LinearGradient
                                        colors={['#10b981', '#059669', '#34d399']}
                                        style={StyleSheet.absoluteFill}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                    />
                                </View>
                                <View style={[styles.avatarContainer, { borderColor: isDark ? '#18181b' : '#ffffff', backgroundColor: colors.surface }]}>
                                    {user?.photoURL ? (
                                        <Image
                                            source={{ uri: user.photoURL }}
                                            style={{ width: '100%', height: '100%', borderRadius: 41 }}
                                            resizeMode="cover"
                                        />
                                    ) : (
                                        <>
                                            <LinearGradient
                                                colors={[colors.primary, customDarken(colors.primary, 20)]}
                                                style={StyleSheet.absoluteFill}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 1 }}
                                            />
                                            <Text style={styles.avatarText}>
                                                {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                                            </Text>
                                        </>
                                    )}
                                </View>

                                {/* Camera badge */}
                                <View style={[styles.avatarCameraBadge, { borderColor: isDark ? '#18181b' : '#ffffff' }]}>
                                    {isUploadingPhoto ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Camera size={13} color="#fff" />
                                    )}
                                </View>
                            </TouchableOpacity>

                            {/* Change Photo Pill */}
                            <TouchableOpacity
                                style={[
                                    styles.changePhotoPill,
                                    {
                                        backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#ecfdf5',
                                        borderColor: isDark ? 'rgba(16, 185, 129, 0.25)' : '#a7f3d0',
                                    }
                                ]}
                                onPress={handleUploadPhoto}
                                disabled={isUploadingPhoto}
                                activeOpacity={0.8}
                            >
                                {isUploadingPhoto ? (
                                    <ActivityIndicator size="small" color={colors.primary} />
                                ) : (
                                    <Camera size={13} color={colors.primary} />
                                )}
                                <Text style={[styles.changePhotoPillText, { color: colors.primary }]}>
                                    {isUploadingPhoto ? 'Uploading...' : (user?.photoURL ? 'Change Profile Photo' : 'Upload Profile Photo')}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.userInfo}>
                            <Text style={[styles.userName, { color: colors.text, fontFamily: getFontFamily(deviceFont, 'bold') }]}>
                                {user?.name || 'User'}
                            </Text>
                            <View style={[styles.emailBadge, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9' }]}>
                                <Mail size={13} color={colors.textSecondary} />
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
                                <Calendar size={14} color={colors.textSecondary} />
                                <Text style={[styles.statText, { color: colors.textSecondary }]}>
                                    {fbUser?.metadata?.creationTime
                                        ? `${new Date(fbUser.metadata.creationTime).getFullYear()}`
                                        : '2025'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Profile Settings Card */}
                    <View style={[
                        styles.sectionCard,
                        {
                            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.7)',
                            borderColor: colors.border,
                            shadowColor: isDark ? 'transparent' : '#000',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.05,
                            shadowRadius: 10,
                            elevation: isDark ? 0 : 2,
                        }
                    ]}>
                        <View style={[styles.sectionHeader, { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.05)' : colors.border }]}>
                            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>PERSONAL INFO</Text>
                        </View>

                        {/* Profile Photo Item */}
                        <TouchableOpacity style={styles.settingItem} onPress={handleUploadPhoto} disabled={isUploadingPhoto} activeOpacity={0.7}>
                            <View style={[styles.settingIcon, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.12)' : '#eef2ff' }]}>
                                <Camera size={18} color="#6366f1" />
                            </View>
                            <View style={styles.settingContent}>
                                <Text style={[styles.settingLabel, { color: colors.text }]}>Profile Photo</Text>
                                <Text style={[styles.settingValue, { color: colors.textSecondary }]}>
                                    {isUploadingPhoto ? 'Uploading photo...' : (user?.photoURL ? 'Custom photo set' : 'Initials avatar')}
                                </Text>
                            </View>
                            {user?.photoURL ? (
                                <Image
                                    source={{ uri: user.photoURL }}
                                    style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: colors.border }}
                                    resizeMode="cover"
                                />
                            ) : (
                                <View style={{
                                    width: 34,
                                    height: 34,
                                    borderRadius: 17,
                                    backgroundColor: colors.primary,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}>
                                    <Text style={{ color: '#fff', fontSize: 13, fontFamily: 'SpaceGrotesk_700Bold' }}>
                                        {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                                    </Text>
                                </View>
                            )}
                            <ChevronRight size={18} color={colors.textSecondary} style={{ marginLeft: 8 }} />
                        </TouchableOpacity>

                        <View style={[styles.settingDivider, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : colors.border }]} />

                        {/* Display Name Item */}
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
                    <View style={[
                        styles.sectionCard,
                        {
                            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.7)',
                            borderColor: colors.border,
                            shadowColor: isDark ? 'transparent' : '#000',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.05,
                            shadowRadius: 10,
                            elevation: isDark ? 0 : 2,
                        }
                    ]}>
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

        </View>
    );
}

const modalStyles = StyleSheet.create({
    inputGroup: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 11,
        fontFamily: 'SpaceGrotesk_700Bold',
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
        fontFamily: 'SpaceGrotesk_500Medium',
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
        fontFamily: 'SpaceGrotesk_700Bold',
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
        fontFamily: 'SpaceGrotesk_700Bold',
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
        fontFamily: 'SpaceGrotesk_700Bold',
        fontSize: 16,
        letterSpacing: 0.5,
    },
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
    },
    appName: {
        fontSize: 13,
        fontFamily: 'SpaceGrotesk_700Bold',
        color: '#10b981',
        textTransform: 'uppercase',
        letterSpacing: 2.5,
        marginBottom: 6,
    },
    headerTitle: {
        fontFamily: 'SpaceGrotesk_700Bold',
        fontSize: 32,
        color: '#0f172a',
        marginBottom: 12,
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
        fontFamily: 'SpaceGrotesk_500Medium',
    },
    profileCard: {
        borderRadius: 24,
        padding: 24,
        marginBottom: 20,
        borderWidth: 1,
    },
    avatarWrapper: {
        alignItems: 'center',
        marginBottom: 16,
    },
    avatarRing: {
        position: 'absolute',
        width: 90,
        height: 90,
        borderRadius: 45,
        overflow: 'hidden',
    },
    avatarContainer: {
        width: 82,
        height: 82,
        borderRadius: 41,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderWidth: 3,
        borderColor: '#fff',
    },
    avatarCameraBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: '#10b981',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    changePhotoPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 12,
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
    },
    changePhotoPillText: {
        fontSize: 12,
        fontFamily: 'SpaceGrotesk_600SemiBold',
    },
    avatarText: {
        fontSize: 32,
        fontFamily: 'SpaceGrotesk_700Bold',
        color: '#fff',
    },
    userInfo: {
        alignItems: 'center',
        marginBottom: 16,
    },
    userName: {
        fontSize: 22,
        fontFamily: 'SpaceGrotesk_700Bold',
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
        fontFamily: 'SpaceGrotesk_500Medium',
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
        fontFamily: 'SpaceGrotesk_700Bold',
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
        fontFamily: 'SpaceGrotesk_700Bold',
        color: '#ef4444',
    },
    sectionCard: {
        borderRadius: 20,
        marginBottom: 16,
    },
    sectionHeader: {
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 10,
    },
    sectionTitle: {
        fontSize: 11,
        fontFamily: 'SpaceGrotesk_700Bold',
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
    },
    settingLabel: {
        fontSize: 14,
        fontFamily: 'SpaceGrotesk_600SemiBold',
        color: '#0f172a',
        marginBottom: 1,
    },
    settingValue: {
        fontSize: 13,
        fontFamily: 'SpaceGrotesk_400Regular',
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
        fontFamily: 'SpaceGrotesk_500Medium',
    },
});
