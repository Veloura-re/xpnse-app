import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Business } from '@/types';
import {
  Building2,
  Users,
  LogOut,
  ChevronRight,
  Trash2,
  MessageSquare,
  Shield,
  Mail,
  Globe,
  CreditCard,
  ArrowRightLeft,
  Edit3,
  Search,
  X,
  AlertCircle,
  Type,
  Check,
  Plus,
  FileText,
  Bell,
} from 'lucide-react-native';
import { useAuth } from '@/providers/auth-provider';
import { useBusiness } from '@/providers/business-provider';
import { useTheme } from '@/providers/theme-provider';
import { RoleBadge } from '@/components/role-badge';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { CURRENCIES } from '@/constants/currencies';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useFonts, AbrilFatface_400Regular } from '@expo-google-fonts/abril-fatface';
import { AVAILABLE_FONTS, getFontFamily } from '@/config/font-config';
import { LOGO_OPTIONS, BUSINESS_ICONS } from '@/constants/logos';
import { FlatList } from 'react-native';

// Expandable sections state type
type ExpandedSection = 'feedback' | 'privacy' | null;

export default function SettingsScreen() {
  const { user, logout, updateProfile, deleteAccount, reauthenticate } = useAuth();
  const { currentBusiness, getUserRole, deleteBusiness, updateBusiness, updateBusinessFont } = useBusiness();
  const { colors, deviceFont, setDeviceFont, isDark, theme } = useTheme();
  const userRole = getUserRole();
  const insets = useSafeAreaInsets();

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteBusinessModal, setShowDeleteBusinessModal] = useState(false);
  const [businessToDelete, setBusinessToDelete] = useState<Business | null>(null);
  const [deleteBusinessConfirm, setDeleteBusinessConfirm] = useState('');

  // Business name editing state
  const [showEditBusinessNameModal, setShowEditBusinessNameModal] = useState(false);
  const [editBusinessName, setEditBusinessName] = useState('');
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showFontModal, setShowFontModal] = useState(false);
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [selectedLogoId, setSelectedLogoId] = useState<string>('1');
  const [logoSearchQuery, setLogoSearchQuery] = useState('');

  // Currency Search State
  const [currencySearchQuery, setCurrencySearchQuery] = useState('');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const filteredCurrencies = CURRENCIES.filter(c =>
    c.name.toLowerCase().includes(currencySearchQuery.toLowerCase()) ||
    c.code.toLowerCase().includes(currencySearchQuery.toLowerCase()) ||
    c.symbol.toLowerCase().includes(currencySearchQuery.toLowerCase())
  );

  const [isDeletingBusiness, setIsDeletingBusiness] = useState(false);

  // Fonts loaded in RootLayout

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    setShowLogoutModal(false);
    logout();
  };

  const handleDeleteBusiness = () => {
    if (!currentBusiness) return;
    setBusinessToDelete(currentBusiness);
    setDeleteBusinessConfirm('');
    setShowDeleteBusinessModal(true);
  };

  const SectionHeader = ({ title }: { title: string }) => (
    <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>{title}</Text>
  );

  const SettingsCard = ({ children, style }: { children: React.ReactNode; style?: any }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, style]}>
      {children}
    </View>
  );

  const SettingsRow = ({
    icon: Icon,
    label,
    subLabel,
    onPress,
    rightElement,
    color,
    destructive = false,
    isLast = false,
    useGrayBackground = false
  }: any) => {
    const iconColor = color || colors.primary;
    const iconBgColor = useGrayBackground && isDark
      ? '#2C3333'
      : destructive
        ? 'rgba(239, 68, 68, 0.1)'
        : isDark
          ? `${iconColor}20`
          : `${iconColor}15`;
    return (
      <TouchableOpacity
        style={[styles.row, { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }, isLast && styles.rowLast]}
        onPress={onPress}
        disabled={!onPress}
        activeOpacity={onPress ? 0.7 : 1}
      >
        <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
          <Icon size={20} color={destructive ? '#ef4444' : iconColor} />
        </View>
        <View style={styles.rowContent}>
          <Text style={[styles.rowLabel, { color: colors.text }, destructive && { color: '#ef4444' }]}>{label}</Text>
          {subLabel && <Text style={[styles.rowSubLabel, { color: colors.textSecondary }]}>{subLabel}</Text>}
        </View>
        {rightElement || (onPress && <ChevronRight size={18} color={colors.textSecondary} />)}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>


      {/* Decorative Circles */}
      <View style={[styles.circle1, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.05)' : 'rgba(16, 185, 129, 0.1)' }]} />
      <View style={[styles.circle2, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.03)' : 'rgba(16, 185, 129, 0.08)' }]} />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeIn.duration(200)} style={styles.headerContainer}>
          <View style={styles.headerTopRow}>
            <Text style={[styles.appName, { color: colors.primary }]}>Settings</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={[styles.notificationButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => router.push('/notes')}
                activeOpacity={0.7}
              >
                <FileText size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.notificationButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => router.push('/notifications')}
                activeOpacity={0.7}
              >
                <Bell size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={[styles.headerTitle, { fontFamily: getFontFamily(deviceFont), color: colors.text }]}>Preferences</Text>
        </Animated.View>

        <Animated.View entering={FadeIn.duration(200)}>
          {/* Profile Card */}
          <View style={[styles.profileCard, { backgroundColor: isDark ? colors.surface : colors.card, borderColor: colors.border }]}>
            <LinearGradient
              colors={isDark ? [colors.surface, '#0A0C0C'] : ['#ffffff', '#f8fafc']}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                <LinearGradient
                  colors={['#10b981', '#059669']}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={styles.avatarText}>
                  {user?.name?.substring(0, 2).toUpperCase() || user?.displayName?.substring(0, 2).toUpperCase() || user?.email?.substring(0, 2).toUpperCase() || 'US'}
                </Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={[styles.profileName, { color: colors.text }]}>{user?.name || user?.displayName || 'User'}</Text>
                <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>{user?.email}</Text>
              </View>
              <TouchableOpacity
                style={[styles.editProfileButton, { backgroundColor: isDark ? 'rgba(33, 201, 141, 0.1)' : '#f0fdf4' }]}
                onPress={() => router.push('/account-settings')}
              >
                <Text style={[styles.editProfileText, { color: colors.primary }]}>Edit</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Business Section */}
          {currentBusiness && (
            <>
              <SectionHeader title="Business" />
              <SettingsCard>
                <View style={[styles.businessCardHeader, { backgroundColor: isDark ? colors.surface : 'transparent' }]}>
                  <TouchableOpacity
                    onPress={() => {
                      const currentLogo = LOGO_OPTIONS.find(l => l.icon === currentBusiness.icon && (l.color === currentBusiness.color || l.darkColor === currentBusiness.color));
                      setSelectedLogoId(currentLogo?.id || '1');
                      setShowLogoModal(true);
                    }}
                    activeOpacity={0.7}
                    style={[styles.businessIcon, { backgroundColor: currentBusiness.color || colors.primary }]}
                  >
                    {(() => {
                      const Icon = currentBusiness.icon && BUSINESS_ICONS[currentBusiness.icon] ? BUSINESS_ICONS[currentBusiness.icon] : Building2;
                      return <Icon size={24} color="#fff" />;
                    })()}
                    <View style={styles.editIconBadge}>
                      <Plus size={10} color="#fff" />
                    </View>
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.businessName, { color: colors.text }]}>{currentBusiness.name}</Text>
                    <View style={styles.roleContainer}>
                      <RoleBadge role={userRole} size="small" />
                    </View>
                  </View>
                </View>

                <SettingsRow
                  icon={ArrowRightLeft}
                  label="Switch Business"
                  onPress={() => router.push('/business-switcher')}
                  color={isDark ? "#6366f1" : "#6366f1"}
                  useGrayBackground={true}
                />
                {(userRole === 'owner' || userRole === 'partner') && (
                  <>
                    <SettingsRow
                      icon={Edit3}
                      label="Edit Business Name"
                      onPress={() => {
                        setEditBusinessName(currentBusiness.name);
                        setShowEditBusinessNameModal(true);
                      }}
                      color={isDark ? "#10b981" : "#059669"}
                      useGrayBackground={true}
                    />
                    <SettingsRow
                      icon={CreditCard}
                      label="Currency"
                      subLabel={currentBusiness.currency || 'USD ($)'}
                      onPress={() => setShowCurrencyModal(true)}
                      color="#10b981"
                    />
                    <SettingsRow
                      icon={Type}
                      label="Display Font"
                      subLabel={AVAILABLE_FONTS.find(f => f.id === deviceFont)?.name || 'Inter'}
                      onPress={() => setShowFontModal(true)}
                      color={colors.primary}
                      useGrayBackground={true}
                    />
                  </>
                )}
                {userRole === 'owner' && (
                  <SettingsRow
                    icon={Trash2}
                    label="Delete Business"
                    destructive
                    onPress={handleDeleteBusiness}
                    isLast
                  />
                )}
              </SettingsCard>
            </>
          )}

          {/* Support Section */}
          <SectionHeader title="Support" />
          <SettingsCard>
            <SettingsRow
              icon={MessageSquare}
              label="Send Feedback"
              onPress={() => setShowFeedbackModal(true)}
              color="#f59e0b"
            />

            <SettingsRow
              icon={Shield}
              label="Privacy Policy"
              onPress={() => setShowPrivacyModal(true)}
              color="#10b981"
              isLast
            />
          </SettingsCard>

          {/* Logout */}
          <TouchableOpacity style={[styles.logoutButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={handleLogout} activeOpacity={0.8}>
            <View style={[styles.logoutIconContainer, { backgroundColor: isDark ? '#2C3333' : '#fef2f2' }]}>
              <LogOut size={18} color="#ef4444" />
            </View>
            <Text style={[styles.logoutText, { color: "#ef4444" }]}>Sign Out</Text>
            <ChevronRight size={18} color="#ef4444" />
          </TouchableOpacity>

          <Text style={[styles.versionText, { color: colors.textSecondary }]}>Version 1.0.0 • Vaulta</Text>
        </Animated.View>
      </ScrollView>

      {/* Logout Modal */}
      {/* Logout Modal */}
      <Modal visible={showLogoutModal} transparent animationType="fade" onRequestClose={() => setShowLogoutModal(false)} statusBarTranslucent={true}>
        <View
          style={[styles.modalOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)' }]}
        >
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'padding'} keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 20} style={{ width: '100%', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <Animated.View
              entering={FadeIn.duration(200)}
              style={[
                styles.modalContent,
                {
                  backgroundColor: isDark ? '#0A0A0A' : '#ffffff',
                  borderColor: isDark ? '#2C3333' : '#e2e8f0',
                  borderWidth: 1,
                  borderRadius: 32,
                  padding: 32,
                  width: '100%',
                  maxWidth: 360,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 20 },
                  shadowOpacity: 0.3,
                  shadowRadius: 40,
                  elevation: 20,
                }
              ]}
            >
              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <View style={{
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 16
                }}>
                  <LogOut size={32} color="#EF4444" />
                </View>
                <Text style={{ fontSize: 24, fontFamily: getFontFamily(deviceFont), color: colors.text, marginBottom: 8 }}>Sign Out</Text>
                <Text style={{ fontSize: 16, color: colors.textSecondary, textAlign: 'center' }}>Are you sure you want to sign out of your account?</Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity style={[styles.modalCancel, { backgroundColor: isDark ? '#1C1C1E' : '#F1F5F9', borderRadius: 16, height: 56, justifyContent: 'center' }]} onPress={() => setShowLogoutModal(false)}>
                  <Text style={[styles.modalCancelText, { color: colors.text, fontSize: 16, fontWeight: '600' }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ flex: 1, borderRadius: 16, overflow: 'hidden' }} onPress={confirmLogout} activeOpacity={0.9}>
                  <LinearGradient
                    colors={['#ef4444', '#dc2626']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ height: 56, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Text style={[styles.modalDestructiveText, { fontSize: 16, fontWeight: '700' }]}>Sign Out</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Delete Business Modal */}
      {/* Delete Business Modal */}
      <Modal visible={showDeleteBusinessModal} transparent animationType="fade" onRequestClose={() => setShowDeleteBusinessModal(false)} statusBarTranslucent={true}>
        <View
          style={[styles.modalOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)' }]}
        >
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'padding'} keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 20} style={{ width: '100%', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <Animated.View
              entering={FadeIn.duration(200)}
              style={[
                styles.deleteModalContent,
                {
                  backgroundColor: isDark ? '#0A0A0A' : '#ffffff',
                  borderColor: isDark ? '#2C3333' : '#e2e8f0',
                  borderWidth: 1,
                  borderRadius: 32,
                  padding: 32,
                  width: '100%',
                  maxWidth: 400,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 20 },
                  shadowOpacity: 0.3,
                  shadowRadius: 40,
                  elevation: 20,
                }
              ]}
            >
              <View style={{ alignItems: 'center', marginBottom: 24 }}>
                <View style={{
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 16
                }}>
                  <Trash2 size={32} color="#EF4444" />
                </View>
                <Text style={{ fontSize: 24, fontFamily: getFontFamily(deviceFont), color: colors.text, marginBottom: 8, textAlign: 'center' }}>Delete Business</Text>
                <Text style={{ fontSize: 16, color: '#EF4444', textAlign: 'center', fontWeight: '500' }}>
                  This action is irreversible.
                </Text>
              </View>

              <Text style={[styles.deleteModalHint, { color: colors.textSecondary, marginBottom: 12 }]}>
                Type <Text style={{ fontWeight: '700', color: colors.text }}>{businessToDelete?.name}</Text> to confirm
              </Text>

              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: isDark ? '#1C1C1E' : '#F8FAFC',
                    borderColor: isDark ? '#333' : '#e2e8f0',
                    color: colors.text,
                    borderWidth: 1,
                    borderRadius: 16,
                    padding: 18,
                    fontSize: 16
                  }
                ]}
                placeholder="Enter business name"
                placeholderTextColor={colors.textSecondary}
                value={deleteBusinessConfirm}
                onChangeText={setDeleteBusinessConfirm}
                autoCapitalize="none"
              />

              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalCancel, { backgroundColor: isDark ? '#1C1C1E' : '#F1F5F9', borderRadius: 16, height: 56, justifyContent: 'center' }]} onPress={() => setShowDeleteBusinessModal(false)}>
                  <Text style={[styles.modalCancelText, { color: colors.text, fontSize: 16, fontWeight: '600' }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1, borderRadius: 16, overflow: 'hidden', opacity: deleteBusinessConfirm === businessToDelete?.name ? 1 : 0.5 }}
                  onPress={async () => {
                    if (deleteBusinessConfirm === businessToDelete?.name && businessToDelete) {
                      try {
                        setIsDeletingBusiness(true);
                        await new Promise(resolve => setTimeout(resolve, 100));
                        await deleteBusiness(businessToDelete.id);
                        setShowDeleteBusinessModal(false);
                      } catch (error) {
                        Alert.alert('Error', 'Failed to delete business');
                      } finally {
                        setIsDeletingBusiness(false);
                        setBusinessToDelete(null);
                      }
                    }
                  }}
                  disabled={deleteBusinessConfirm !== businessToDelete?.name || isDeletingBusiness}
                  activeOpacity={0.9}
                >
                  <LinearGradient colors={['#ef4444', '#dc2626']} style={[styles.modalSaveButton, { height: 56, justifyContent: 'center' }]}>
                    {isDeletingBusiness ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={[styles.modalDestructiveText, { fontSize: 16, fontWeight: '700' }]}>Delete</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Edit Business Name Modal */}
      {/* Edit Business Name Modal */}
      <Modal visible={showEditBusinessNameModal} transparent animationType="fade" onRequestClose={() => setShowEditBusinessNameModal(false)} statusBarTranslucent={true}>
        <View
          style={[styles.modalOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)' }]}
        >
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'padding'} keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 20} style={{ width: '100%', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <Animated.View
              entering={FadeIn.duration(200)}
              style={[
                styles.modalContent,
                {
                  backgroundColor: isDark ? '#0A0A0A' : '#ffffff',
                  borderColor: isDark ? '#2C3333' : '#e2e8f0',
                  borderWidth: 1,
                  borderRadius: 32,
                  padding: 32,
                  width: '100%',
                  maxWidth: 400,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 20 },
                  shadowOpacity: 0.3,
                  shadowRadius: 40,
                  elevation: 20,
                }
              ]}
            >
              <View style={{ alignItems: 'center', marginBottom: 24 }}>
                <View style={{
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  backgroundColor: isDark ? 'rgba(33, 201, 141, 0.15)' : '#EFF6FF',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 16
                }}>
                  <Edit3 size={32} color={isDark ? colors.primary : '#10b981'} />
                </View>
                <Text style={[styles.modalTitle, { fontFamily: getFontFamily(deviceFont), color: colors.text, fontSize: 24, marginBottom: 8 }]}>Edit Business Name</Text>
                <Text style={{ fontSize: 16, color: colors.textSecondary, textAlign: 'center' }}>Update the name of your business.</Text>
              </View>

              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: isDark ? '#1C1C1E' : '#F8FAFC',
                    borderColor: isDark ? '#333' : '#e2e8f0',
                    color: colors.text,
                    borderWidth: 1,
                    borderRadius: 16,
                    padding: 18,
                    fontSize: 16,
                    marginBottom: 24
                  }
                ]}
                placeholder="Business Name"
                placeholderTextColor={colors.textSecondary}
                value={editBusinessName}
                onChangeText={setEditBusinessName}
                autoCapitalize="words"
              />

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity style={[styles.modalCancel, { backgroundColor: isDark ? '#1C1C1E' : '#F1F5F9', borderRadius: 16, height: 56, justifyContent: 'center' }]} onPress={() => setShowEditBusinessNameModal(false)}>
                  <Text style={[styles.modalCancelText, { color: colors.text, fontSize: 16, fontWeight: '600' }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1, borderRadius: 16, overflow: 'hidden', opacity: !editBusinessName.trim() ? 0.5 : 1 }}
                  onPress={() => {
                    if (editBusinessName.trim() && currentBusiness) {
                      updateBusiness({ name: editBusinessName.trim() });
                      setShowEditBusinessNameModal(false);
                    }
                  }}
                  disabled={!editBusinessName.trim()}
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={isDark ? ['#10b981', '#059669'] : ['#10b981', '#059669']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ height: 56, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Text style={[styles.modalConfirmText, { fontSize: 16, fontWeight: '700' }]}>Save</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Currency Selection Modal */}
      {/* Currency Selection Modal */}
      <Modal visible={showCurrencyModal} transparent animationType="fade" onRequestClose={() => setShowCurrencyModal(false)} statusBarTranslucent={true}>
        <View
          style={[styles.modalOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)' }]}
        >
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'padding'} keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 20} style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <Animated.View
              entering={FadeIn.duration(200)}
              style={[
                styles.modalContent,
                {
                  backgroundColor: isDark ? '#0A0A0A' : '#ffffff',
                  borderColor: isDark ? '#2C3333' : '#e2e8f0',
                  borderWidth: 1,
                  borderRadius: 32,
                  padding: 0,
                  width: '100%',
                  maxWidth: 400,
                  height: 600,
                  maxHeight: '85%',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 20 },
                  shadowOpacity: 0.3,
                  shadowRadius: 40,
                  elevation: 20,
                  overflow: 'hidden'
                }
              ]}
            >
              <View style={[styles.modalHeader, { borderBottomColor: isDark ? '#2C3333' : '#e2e8f0', padding: 20 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: isDark ? 'rgba(33, 201, 141, 0.15)' : '#EFF6FF',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    <CreditCard size={20} color={isDark ? colors.primary : '#10b981'} />
                  </View>
                  <View>
                    <Text style={[styles.modalTitle, { fontFamily: getFontFamily(deviceFont), color: colors.text }]}>Select Currency</Text>
                    <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Choose your business currency</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.closeButton, { backgroundColor: isDark ? '#1C1C1E' : '#F1F5F9' }]}
                  onPress={() => {
                    setShowCurrencyModal(false);
                    setCurrencySearchQuery('');
                  }}
                >
                  <X size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={{ paddingHorizontal: 20, paddingBottom: 12, paddingTop: 12 }}>
                <View style={[styles.currencySearchContainer, { backgroundColor: isDark ? '#1C1C1E' : '#F8FAFC', borderColor: isDark ? '#333' : '#e2e8f0', borderRadius: 12 }]}>
                  <Search size={20} color={colors.textSecondary} />
                  <TextInput
                    style={[styles.currencySearchInput, { color: colors.text }]}
                    placeholder="Search currency..."
                    placeholderTextColor={colors.textSecondary}
                    value={currencySearchQuery}
                    onChangeText={setCurrencySearchQuery}
                  />
                  {currencySearchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setCurrencySearchQuery('')}>
                      <X size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
                {filteredCurrencies.map((currency) => (
                  <TouchableOpacity
                    key={currency.code}
                    style={[
                      styles.currencyOption,
                      { borderBottomColor: isDark ? '#2C3333' : '#e2e8f0' },
                      currentBusiness?.currency === currency.code && [styles.currencyOptionSelected, { backgroundColor: isDark ? 'rgba(33, 201, 141, 0.1)' : '#f0f9ff' }]
                    ]}
                    onPress={() => {
                      if (currentBusiness) {
                        updateBusiness({ currency: currency.code });
                        setShowCurrencyModal(false);
                        setCurrencySearchQuery('');
                      }
                    }}
                  >
                    <View style={styles.currencyInfo}>
                      <Text style={[styles.currencySymbol, { color: colors.text, fontWeight: '700' }]}>{currency.symbol}</Text>
                      <Text style={[styles.currencyName, { color: colors.textSecondary }]}>{currency.name} ({currency.code})</Text>
                    </View>
                    {currentBusiness?.currency === currency.code && (
                      <View style={[styles.checkDot, { backgroundColor: isDark ? colors.primary : '#10b981', borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : '#f0fdf4' }]}>
                        <Check size={12} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
                {filteredCurrencies.length === 0 && (
                  <View style={styles.emptyState}>
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No currency found</Text>
                  </View>
                )}
              </ScrollView>
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Font Modal */}
      {/* Font Modal */}
      <Modal visible={showFontModal} transparent animationType="fade" onRequestClose={() => setShowFontModal(false)} statusBarTranslucent={true}>
        <View
          style={[styles.modalOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)' }]}
        >
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'padding'} keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 20} style={{ width: '100%', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <Animated.View
              entering={FadeIn.duration(200)}
              style={[
                styles.modalContent,
                {
                  backgroundColor: isDark ? '#0A0A0A' : '#ffffff',
                  borderColor: isDark ? '#2C3333' : '#e2e8f0',
                  borderWidth: 1,
                  borderRadius: 32,
                  padding: 0,
                  width: '100%',
                  maxWidth: 400,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 20 },
                  shadowOpacity: 0.3,
                  shadowRadius: 40,
                  elevation: 20,
                  overflow: 'hidden'
                }
              ]}
            >
              <View style={[styles.modalHeader, { borderBottomColor: isDark ? '#2C3333' : '#e2e8f0', padding: 20 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: isDark ? 'rgba(33, 201, 141, 0.15)' : '#EFF6FF',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    <Type size={20} color={isDark ? colors.primary : '#10b981'} />
                  </View>
                  <View>
                    <Text style={[styles.modalTitle, { fontFamily: getFontFamily(deviceFont), color: colors.text }]}>Display Font</Text>
                    <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Choose your preferred font</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.closeButton, { backgroundColor: isDark ? '#1C1C1E' : '#F1F5F9' }]}
                  onPress={() => setShowFontModal(false)}
                >
                  <X size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ width: '100%', maxHeight: 400 }} contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 12 }} showsVerticalScrollIndicator={false}>
                {AVAILABLE_FONTS.map((font) => (
                  <TouchableOpacity
                    key={font.id}
                    style={[
                      styles.fontOption,
                      {
                        backgroundColor: isDark ? '#1C1C1E' : '#F8FAFC',
                        borderColor: isDark ? '#333' : '#e2e8f0',
                        borderWidth: 1,
                        borderRadius: 16,
                        marginBottom: 8,
                        padding: 16
                      },
                      (deviceFont || 'abril') === font.id && [styles.fontOptionSelected, { borderColor: isDark ? colors.primary : '#10b981', backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#f0fdf4' }]
                    ]}
                    onPress={() => {
                      setDeviceFont(font.id);
                      setShowFontModal(false);
                    }}
                  >
                    <View style={styles.fontInfo}>
                      <Text style={[styles.fontPreview, { color: colors.text, fontSize: 18, marginBottom: 4 }, font.id !== 'system' && { fontFamily: font.family }]}>
                        {font.name}
                      </Text>
                      <Text style={[styles.fontDescription, { color: colors.textSecondary }]}>{font.displayText}</Text>
                    </View>
                    {(deviceFont || 'abril') === font.id && (
                      <View style={[styles.checkDot, { backgroundColor: isDark ? colors.primary : '#10b981', borderColor: isDark ? 'rgba(33, 201, 141, 0.3)' : '#f0fdf4' }]}>
                        <Check size={12} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Logo Edit Modal */}
      {/* Logo Edit Modal */}
      <Modal visible={showLogoModal} transparent animationType="fade" onRequestClose={() => setShowLogoModal(false)} statusBarTranslucent={true}>
        <View
          style={[styles.modalOverlay, { justifyContent: 'flex-end', padding: 0, backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)' }]}
        >
          <View style={[styles.modalContent, {
            height: '92%',
            maxHeight: '92%',
            padding: 0,
            backgroundColor: isDark ? '#0A0A0A' : '#ffffff',
            borderColor: isDark ? '#2C3333' : '#e2e8f0',
            borderTopLeftRadius: 32,
            borderTopRightRadius: 32,
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
            borderWidth: 1,
            width: '100%',
          }]}>
            {/* Header with drag indicator */}
            <View style={{ alignItems: 'center', paddingTop: 16, paddingBottom: 8 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: isDark ? '#333' : '#e2e8f0' }} />
            </View>

            {/* Title and Close */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16 }}>
              <View>
                <Text style={{ fontFamily: getFontFamily(deviceFont), fontSize: 28, color: colors.text }}>Choose Logo</Text>
                <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4 }}>Select an icon for your business</Text>
              </View>
              <TouchableOpacity
                style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? colors.surface : '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}
                onPress={() => setShowLogoModal(false)}
              >
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Current Selection Preview */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginHorizontal: 20,
              padding: 16,
              borderRadius: 16,
              backgroundColor: isDark ? '#1e293b' : '#f8fafc',
              marginBottom: 16,
              gap: 16,
            }}>
              {(() => {
                const selectedLogo = LOGO_OPTIONS.find(l => l.id === selectedLogoId);
                const Icon = selectedLogo && BUSINESS_ICONS[selectedLogo.icon] ? BUSINESS_ICONS[selectedLogo.icon] : Building2;
                const iconColor = selectedLogo ? (isDark ? selectedLogo.darkColor : selectedLogo.color) : colors.primary;
                const bgColor = selectedLogo ? (isDark ? selectedLogo.darkColor + '25' : selectedLogo.color + '15') : '#eff6ff';
                return (
                  <>
                    <View style={{
                      width: 64,
                      height: 64,
                      borderRadius: 20,
                      backgroundColor: bgColor,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 2,
                      borderColor: iconColor,
                    }}>
                      <Icon size={32} color={iconColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 2 }}>SELECTED</Text>
                      <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>{selectedLogo?.label || 'None'}</Text>
                    </View>
                  </>
                );
              })()}
            </View>

            {/* Search Bar - Full Width Fix */}
            <View style={{ paddingHorizontal: 20, marginBottom: 16, width: '100%' }}>
              <View style={[
                styles.searchBarContainer,
                {
                  backgroundColor: isDark ? '#1C1C1E' : '#F8FAFC',
                  borderColor: isDark ? '#333' : '#e2e8f0',
                  height: 52,
                  borderRadius: 16,
                  borderWidth: 1,
                  width: '100%',
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                }
              ]}>
                <Search size={20} color={colors.textSecondary} />
                <TextInput
                  style={{
                    flex: 1,
                    marginLeft: 12,
                    fontSize: 16,
                    color: colors.text,
                    height: '100%',
                    textAlignVertical: 'center',
                    paddingVertical: 0,
                  }}
                  placeholder="Search 255 logos..."
                  placeholderTextColor={colors.textSecondary}
                  value={logoSearchQuery}
                  onChangeText={setLogoSearchQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {logoSearchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setLogoSearchQuery('')}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <X size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Logo Grid */}
            <View style={{ flex: 1, width: '100%' }}>
              <FlatList
                key="logo-picker-grid-settings-redesigned"
                data={LOGO_OPTIONS.filter(l => l.label.toLowerCase().includes(logoSearchQuery.toLowerCase()))}
                numColumns={4}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ gap: 12, paddingHorizontal: 20, paddingBottom: 20 }}
                columnWrapperStyle={{ gap: 10, justifyContent: 'flex-start' }}
                keyExtractor={(item) => item.id}
                ListEmptyComponent={
                  <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 60 }}>
                    <Search size={40} color={colors.textSecondary} style={{ marginBottom: 12, opacity: 0.5 }} />
                    <Text style={{ color: colors.textSecondary, fontSize: 16 }}>No logos found</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4 }}>Try a different search term</Text>
                  </View>
                }
                renderItem={({ item }) => {
                  const Icon = BUSINESS_ICONS[item.icon] || Building2;
                  const isSelected = selectedLogoId === item.id;
                  return (
                    <TouchableOpacity
                      onPress={() => setSelectedLogoId(item.id)}
                      activeOpacity={0.7}
                      style={{ alignItems: 'center', width: '23%', marginBottom: 8 }}
                    >
                      <View style={{
                        width: '100%',
                        aspectRatio: 1,
                        borderRadius: 20,
                        backgroundColor: isSelected ? (isDark ? item.darkColor + '30' : item.color + '15') : (isDark ? '#1C1C1E' : '#F8FAFC'),
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: isSelected ? 2 : 1,
                        borderColor: isSelected ? (isDark ? item.darkColor : item.color) : (isDark ? '#333' : '#e2e8f0'),
                        marginBottom: 8,
                      }}>
                        <Icon size={26} color={isSelected ? (isDark ? item.darkColor : item.color) : colors.textSecondary} />
                      </View>
                      <Text style={{
                        fontSize: 11,
                        color: isSelected ? colors.text : colors.textSecondary,
                        textAlign: 'center',
                        fontWeight: isSelected ? '600' : '500'
                      }} numberOfLines={1}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />
            </View>

            {/* Save Button */}
            <View style={{ padding: 20, paddingBottom: 32, borderTopWidth: 1, borderTopColor: colors.border }}>
              <TouchableOpacity
                style={{ borderRadius: 16, overflow: 'hidden' }}
                onPress={() => {
                  const selectedLogo = LOGO_OPTIONS.find(l => l.id === selectedLogoId);
                  if (selectedLogo && currentBusiness) {
                    updateBusiness({
                      icon: selectedLogo.icon,
                      color: selectedLogo.color
                    });
                    setShowLogoModal(false);
                  }
                }}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={isDark ? [colors.primary, colors.primary] : ['#10b981', '#059669']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ padding: 18, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                >
                  <Text style={{ fontSize: 17, fontWeight: '700', color: '#fff' }}>Save Changes</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Feedback Modal */}
      <Modal visible={showFeedbackModal} transparent animationType="fade" onRequestClose={() => setShowFeedbackModal(false)} statusBarTranslucent={true}>
        <View
          style={[styles.modalOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)' }]}
        >
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'padding'} keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 20} style={{ flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' }}>
            <TouchableWithoutFeedback onPress={() => setShowFeedbackModal(false)}>
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
            </TouchableWithoutFeedback>

            <Animated.View
              entering={FadeIn.duration(200)}
              style={[
                styles.modalContent,
                {
                  backgroundColor: isDark ? '#0A0A0A' : '#ffffff',
                  borderColor: isDark ? '#2C3333' : '#e2e8f0',
                  borderWidth: 1,
                  width: '90%',
                  maxWidth: 400
                }
              ]}
            >
              <View style={[styles.modalHeader, { borderBottomColor: colors.border, padding: 20 }]}>
                <View>
                  <Text style={[styles.modalTitle, { fontFamily: getFontFamily(deviceFont), color: colors.text, fontSize: 22 }]}>Contact Support</Text>
                  <Text style={[styles.modalMessage, { color: colors.textSecondary }]}>We'd love to hear from you!</Text>
                </View>
                <TouchableOpacity onPress={() => setShowFeedbackModal(false)} style={[styles.closeButton, { backgroundColor: isDark ? colors.surface : '#f1f5f9' }]}>
                  <X size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={{ padding: 24 }}>
                <View style={{
                  backgroundColor: isDark ? 'rgba(16, 185, 129, 0.05)' : '#f0fdf4',
                  padding: 20,
                  borderRadius: 16,
                  alignItems: 'center',
                  marginBottom: 24,
                  borderWidth: 1,
                  borderColor: isDark ? 'rgba(16, 185, 129, 0.2)' : colors.border
                }}>
                  <View style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#f0fdf4',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: 16
                  }}>
                    <Mail size={28} color={colors.primary} />
                  </View>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 6 }}>
                    vaulta.feedback@gmail.com
                  </Text>
                  <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 }}>
                    Send us your questions, feedback, or just say hello!
                  </Text>
                </View>

                <TouchableOpacity
                  style={{ borderRadius: 16, overflow: 'hidden' }}
                  onPress={() => {
                    Linking.openURL('mailto:vaulta.feedback@gmail.com');
                    setShowFeedbackModal(false);
                  }}
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={isDark ? [colors.primary, colors.primary] : ['#10b981', '#059669']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ padding: 18, alignItems: 'center' }}
                  >
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>Open Mail App</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Privacy Policy Modal */}
      <Modal visible={showPrivacyModal} transparent animationType="fade" onRequestClose={() => setShowPrivacyModal(false)} statusBarTranslucent={true}>
        <View
          style={[styles.modalOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)' }]}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 20}
            style={{ flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' }}
          >
            <TouchableWithoutFeedback onPress={() => setShowPrivacyModal(false)}>
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
            </TouchableWithoutFeedback>

            <Animated.View
              entering={FadeIn.duration(200)}
              style={[
                styles.modalContent,
                {
                  backgroundColor: isDark ? '#0A0A0A' : '#ffffff',
                  borderColor: isDark ? '#2C3333' : '#e2e8f0',
                  borderWidth: 1,
                  width: '90%',
                  maxWidth: 400
                }
              ]}
            >
              <View style={[styles.modalHeader, { borderBottomColor: colors.border, padding: 20 }]}>
                <View>
                  <Text style={[styles.modalTitle, { fontFamily: getFontFamily(deviceFont), color: colors.text }]}>Privacy Policy</Text>
                  <Text style={[styles.modalMessage, { color: colors.textSecondary }]}>Your data security is our priority.</Text>
                </View>
                <TouchableOpacity onPress={() => setShowPrivacyModal(false)} style={[styles.closeButton, { backgroundColor: isDark ? colors.surface : '#f1f5f9' }]}>
                  <X size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={{ padding: 24 }}>
                <View style={{
                  backgroundColor: isDark ? 'rgba(16, 185, 129, 0.05)' : '#f0fdf4',
                  padding: 16,
                  borderRadius: 16,
                  marginBottom: 20,
                  borderWidth: 1,
                  borderColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#dcfce7'
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Shield size={24} color="#10b981" style={{ marginRight: 12 }} />
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#10b981' }}>Data Protection</Text>
                  </View>
                  <Text style={{ fontSize: 14, color: isDark ? '#10b981' : '#15803d', lineHeight: 20 }}>
                    We use industry-standard encryption to protect your financial data. Your information is never shared with third parties without your consent.
                  </Text>
                </View>

                <View style={{ gap: 12 }}>
                  <TouchableOpacity
                    style={{ borderRadius: 16, overflow: 'hidden' }}
                    onPress={() => {
                      Linking.openURL('https://vaulta.com/privacy');
                      setShowPrivacyModal(false);
                    }}
                    activeOpacity={0.9}
                  >
                    <LinearGradient
                      colors={isDark ? [colors.primary, colors.primary] : ['#10b981', '#059669']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{ padding: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                    >
                      <Globe size={18} color="#fff" />
                      <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>View Full Policy</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{ borderRadius: 16, overflow: 'hidden' }}
                    onPress={() => {
                      Linking.openURL('mailto:privacy@vaulta.com');
                      setShowPrivacyModal(false);
                    }}
                    activeOpacity={0.9}
                  >
                    <LinearGradient
                      colors={isDark ? [colors.primary, colors.primary] : ['#10b981', '#059669']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{ padding: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                    >
                      <Mail size={18} color="#fff" />
                      <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Contact Privacy Team</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

    </View >
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  circle1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  circle2: {
    position: 'absolute',
    bottom: -100,
    left: -50,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
  },
  scrollContent: {
    padding: 16,
  },
  headerContainer: {
    marginBottom: 16,
    marginTop: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  appName: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  headerTitle: {
    fontFamily: 'AbrilFatface_400Regular',
    fontSize: 36,
    marginBottom: 12,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 32,
    marginBottom: 16,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  // Profile Card
  profileCard: {
    marginTop: 10,
    borderRadius: 24,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 2,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'transparent',
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 12,
  },
  editProfileButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  editProfileText: {
    fontSize: 14,
    fontWeight: '600',
  },
  businessCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 4,
  },
  businessIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  businessName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  roleContainer: {
    alignSelf: 'flex-start',
  },
  divider: {
    height: 1,
    marginLeft: 56,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 0,
  },
  rowSubLabel: {
    fontSize: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  logoutIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  logoutText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 24,
    marginBottom: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    borderRadius: 20,
    overflow: 'hidden',
    width: '90%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontFamily: 'AbrilFatface_400Regular',
    fontSize: 22,
  },
  modalMessage: {
    fontSize: 14,
    marginTop: 4,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  modalCancel: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalDestructive: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    alignItems: 'center',
  },
  modalDestructiveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  modalConfirm: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#10b981',
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    margin: 16,
    fontSize: 14,
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  currencySearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  currencySearchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  currencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  currencyOptionSelected: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  currencyInfo: {
    flex: 1,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  currencyName: {
    fontSize: 14,
  },
  checkDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 4,
  },
  fontOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 12,
  },
  fontOptionSelected: {
  },
  fontInfo: {
    flex: 1,
  },
  fontPreview: {
    fontSize: 20,
    marginBottom: 4,
  },
  fontDescription: {
    fontSize: 13,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Delete Modal Styles
  deleteModalContent: {
    borderRadius: 20,
    width: '90%',
    maxWidth: 340,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 8, shadowColor: '#000' },
    }),
  },
  deleteModalTitle: {
    fontFamily: 'AbrilFatface_400Regular',
    fontSize: 22,
  },
  deleteModalHint: {
    fontSize: 14,
    marginBottom: 0,
    marginTop: 10,
    marginLeft: 4,
  },
  modalBody: {
    padding: 16,
  },
  warningBox: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    gap: 12,
    alignItems: 'center',
    marginBottom: 4,
    borderWidth: 1,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  modalSaveButton: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  deleteModalInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 12,
    width: '100%',
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 16,
    textAlign: 'center',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  editIconBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
