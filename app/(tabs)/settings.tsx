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
  Image,
} from 'react-native';
import { Business } from '@/types';
import { GlassBackdrop } from '@/components/ui/glass-backdrop';
import {
  Building2,
  Users,
  LogOut,
  ChevronRight,
  Trash2,
  MessageSquare,
  Shield,
  ShieldAlert,
  Mail,
  Globe,
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
  Heart,
  FileDown,
  SlidersHorizontal,
  Repeat,
  Sun,
  Moon,
  Camera,
} from 'lucide-react-native';
import { useAuth } from '@/providers/auth-provider';
import { useBusiness } from '@/providers/business-provider';
import { useNotifications } from '@/providers/notification-provider';
import { useTheme } from '@/providers/theme-provider';
import { RoleBadge } from '@/components/role-badge';
import { BackgroundDecor } from '@/components/ui/background-decor';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import { AVAILABLE_FONTS, getFontFamily } from '@/config/font-config';
import { LOGO_OPTIONS, BUSINESS_ICONS } from '@/constants/logos';
import { FlatList } from 'react-native';
import { exportToPDF, exportToExcel, exportToCSV } from '@/utils/exportUtils';
import { usePaginatedEntries } from '@/hooks/use-paginated-entries';
import { pickImage, uploadImage } from '@/utils/imageUpload';

const ANALYTICS_SORT_OPTIONS = [
  { label: 'Top Books (Balance)', value: 'balance-desc', group: 'Sort By' },
  { label: 'Smallest Balance', value: 'balance-asc', group: 'Sort By' },
  { label: 'Name (A-Z)', value: 'name-asc', group: 'Sort By' },
  { label: 'Name (Z-A)', value: 'name-desc', group: 'Sort By' },
  { label: 'All Time', value: 'all', group: 'Time Filter' },
  { label: 'This Year', value: 'year', group: 'Time Filter' },
  { label: 'This Month', value: 'month', group: 'Time Filter' },
  { label: 'This Week', value: 'week', group: 'Time Filter' },
  { label: 'Today', value: 'today', group: 'Time Filter' },
];

// Expandable sections state type
type ExpandedSection = 'feedback' | 'privacy' | null;

export default function SettingsScreen() {
  const { user, logout, updateProfile, deleteAccount, reauthenticate, isDeveloperAdmin } = useAuth();
  const { currentBusiness, getUserRole, deleteBusiness, updateBusiness, updateBusinessFont, books, addEntry } = useBusiness();
  const { expoPushToken } = useNotifications();
  const { colors, deviceFont, setDeviceFont, isDark, theme, setTheme } = useTheme();
  const userRole = getUserRole();
  const insets = useSafeAreaInsets();

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteBusinessModal, setShowDeleteBusinessModal] = useState(false);
  const [businessToDelete, setBusinessToDelete] = useState<Business | null>(null);
  const [deleteBusinessConfirm, setDeleteBusinessConfirm] = useState('');

  // Business name editing state
  const [showEditBusinessNameModal, setShowEditBusinessNameModal] = useState(false);
  const [editBusinessName, setEditBusinessName] = useState('');
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [selectedLogoId, setSelectedLogoId] = useState<string>('1');
  const [logoSearchQuery, setLogoSearchQuery] = useState('');

  // Photo upload state
  const [isUploadingUserPhoto, setIsUploadingUserPhoto] = useState(false);
  const [isUploadingBusinessPhoto, setIsUploadingBusinessPhoto] = useState(false);

  const handleUploadUserPhoto = async () => {
    try {
      setIsUploadingUserPhoto(true);
      const localUri = await pickImage();
      if (!localUri) return;
      const url = await uploadImage(localUri, `users/${user?.uid}/profile`);
      if (url) {
        await updateProfile({ photoURL: url });
      }
    } catch (err) {
      console.error('User photo upload error:', err);
      Alert.alert('Error', 'Could not upload profile photo.');
    } finally {
      setIsUploadingUserPhoto(false);
    }
  };

  const handleUploadBusinessPhoto = async () => {
    try {
      setIsUploadingBusinessPhoto(true);
      const localUri = await pickImage();
      if (!localUri || !currentBusiness) return;
      const url = await uploadImage(localUri, `businesses/${currentBusiness.id}/logo`);
      if (url) {
        await updateBusiness({ photoUrl: url });
        setShowLogoModal(false);
      }
    } catch (err) {
      console.error('Business photo upload error:', err);
      Alert.alert('Error', 'Could not upload business photo.');
    } finally {
      setIsUploadingBusinessPhoto(false);
    }
  };

  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const [isDeletingBusiness, setIsDeletingBusiness] = useState(false);

  // Analytics tools state
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [selectedSort, setSelectedSort] = useState<string>('balance-desc');
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportFileName, setExportFileName] = useState('');
  const [businessExportFormat, setBusinessExportFormat] = useState<'pdf' | 'xlsx' | 'csv'>('pdf');
  const [isExporting, setIsExporting] = useState(false);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'year' | 'all'>('month');

  const {
    entries: transactions,
    getTotals
  } = usePaginatedEntries(currentBusiness?.id || null, undefined, {
    pageSize: 1000, // Reasonable size for export
  });

  const handleExportBusiness = async (format: 'pdf' | 'xlsx' | 'csv' = 'pdf') => {
    if (!currentBusiness || transactions.length === 0) {
      Alert.alert('No Data', 'There are no transactions in this business to export.');
      return;
    }
    const dateStr = new Date().toISOString().split('T')[0];
    const defaultName = `${currentBusiness.name.replace(/[^a-zA-Z0-9]/g, '_')}_Business_Export_${dateStr}`;
    setExportFileName(defaultName);
    setBusinessExportFormat(format);
    setExportModalVisible(true);
  };

  const confirmExportBusiness = async () => {
    if (!currentBusiness || transactions.length === 0) return;
    setExportModalVisible(false);
    setIsExporting(true);
    try {
      const rangeLabel = timeRange === 'all' ? 'All Time' : timeRange.charAt(0).toUpperCase() + timeRange.slice(1);
      const options = {
        fileName: exportFileName || 'Business_Export',
        isBusiness: true,
        rangeLabel,
        books,
      };

      if (businessExportFormat === 'xlsx') {
        await exportToExcel(currentBusiness, transactions, options);
      } else if (businessExportFormat === 'csv') {
        await exportToCSV(currentBusiness, transactions, options);
      } else {
        await exportToPDF(currentBusiness, transactions, options);
      }
    } catch (error) {
      console.error('Error exporting business report:', error);
      Alert.alert('Export Error', 'Failed to generate business report.');
    } finally {
      setIsExporting(false);
    }
  };

  // Fonts loaded in RootLayout

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    setShowLogoutModal(false);
    logout(expoPushToken);
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
    <View style={[styles.card, { backgroundColor: colors.cardGlass, borderColor: colors.borderGlass }, style]}>
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
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <BackgroundDecor />
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerContainer}>
          <View style={styles.headerTopRow}>
            <Text style={[styles.appName, { color: colors.primary, fontFamily: 'SpaceGrotesk_700Bold' }]}>Settings</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {/* Small Theme Toggle */}
              <TouchableOpacity
                style={[styles.notificationButton, { backgroundColor: colors.surfaceGlass, borderColor: colors.borderGlass }]}
                onPress={() => setTheme(isDark ? 'light' : 'dark')}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {isDark ? <Sun size={17} color="#F59E0B" /> : <Moon size={17} color={colors.textSecondary} />}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.notificationButton, { backgroundColor: colors.surfaceGlass, borderColor: colors.borderGlass }]}
                onPress={() => router.push('/notifications')}
                activeOpacity={0.7}
              >
                <Bell size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={[styles.headerTitle, { fontFamily: 'SpaceGrotesk_700Bold', color: colors.text }]}>Preferences</Text>
        </View>

        <View>
          {/* Profile Card */}
          <View style={[styles.profileCard, { backgroundColor: colors.cardGlass, borderColor: colors.borderGlass }]}>
            <LinearGradient
              colors={isDark ? ['rgba(34, 34, 32, 0.85)', 'rgba(20, 20, 18, 0.85)'] : ['rgba(255, 255, 255, 0.92)', 'rgba(248, 250, 252, 0.85)']}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.profileHeader}>
              {/* User avatar — outer wrapper allows badge to overflow */}
              <View style={styles.avatarWrapper}>
                <TouchableOpacity
                  style={styles.avatarContainer}
                  onPress={handleUploadUserPhoto}
                  activeOpacity={0.8}
                  disabled={isUploadingUserPhoto}
                >
                  {user?.photoURL ? (
                    <Image
                      source={{ uri: user.photoURL }}
                      style={{ width: '100%', height: '100%', borderRadius: 24 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <>
                      <LinearGradient
                        colors={['#10b981', '#059669']}
                        style={StyleSheet.absoluteFill}
                      />
                      <Text style={styles.avatarText}>
                        {user?.name?.substring(0, 2).toUpperCase() || user?.displayName?.substring(0, 2).toUpperCase() || user?.email?.substring(0, 2).toUpperCase() || 'US'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
                {/* Camera badge sits outside the clipped circle */}
                <View style={[
                  styles.avatarCameraBadge,
                  { backgroundColor: colors.primary, borderColor: isDark ? '#1a1a1a' : '#ffffff' }
                ]}>
                  {isUploadingUserPhoto
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Camera size={10} color="#fff" />
                  }
                </View>
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

          {/* Developer Admin Section */}
          {isDeveloperAdmin && (
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => router.push('/admin')}
              style={{
                marginBottom: 20,
                borderRadius: 20,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: isDark ? 'rgba(99, 102, 241, 0.4)' : 'rgba(99, 102, 241, 0.25)',
                backgroundColor: isDark ? 'rgba(99, 102, 241, 0.08)' : '#eef2ff',
              }}
            >
              <View style={{ padding: 18, flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 14,
                    backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : '#e0e7ff',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 14,
                  }}
                >
                  <ShieldAlert size={24} color="#6366f1" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}>
                    <Text style={{ fontSize: 16, fontFamily: 'SpaceGrotesk_700Bold', color: colors.text, marginRight: 8 }}>
                      Developer Admin Console
                    </Text>
                    <View
                      style={{
                        paddingHorizontal: 7,
                        paddingVertical: 2,
                        borderRadius: 6,
                        backgroundColor: '#6366f1',
                      }}
                    >
                      <Text style={{ fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold', color: '#ffffff', letterSpacing: 0.5 }}>
                        ADMIN
                      </Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular', color: colors.textSecondary }}>
                    Attack defense, system health, and runtime diagnostics
                  </Text>
                </View>
                <ChevronRight size={20} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>
          )}

          {/* Business Section */}
          {currentBusiness && (
            <>
              <SectionHeader title="Business" />
              <SettingsCard>
                <View style={[styles.businessCardHeader, { backgroundColor: isDark ? colors.surface : 'transparent' }]}>
                  {/* Business icon outer wrapper — badge overflows this, not the clipped inner */}
                  <View style={styles.businessIconWrapper}>
                    <TouchableOpacity
                      onPress={() => {
                        const currentLogo = LOGO_OPTIONS.find(l => l.icon === currentBusiness.icon && (l.color === currentBusiness.color || l.darkColor === currentBusiness.color));
                        setSelectedLogoId(currentLogo?.id || '1');
                        setShowLogoModal(true);
                      }}
                      activeOpacity={0.7}
                      style={[styles.businessIcon, { backgroundColor: currentBusiness.photoUrl ? 'transparent' : (currentBusiness.color || colors.primary), padding: 0, overflow: 'hidden' }]}
                    >
                      {currentBusiness.photoUrl ? (
                        <Image
                          source={{ uri: currentBusiness.photoUrl }}
                          style={{ width: '100%', height: '100%', borderRadius: 14 }}
                          resizeMode="cover"
                        />
                      ) : (
                        (() => {
                          const Icon = currentBusiness.icon && BUSINESS_ICONS[currentBusiness.icon] ? BUSINESS_ICONS[currentBusiness.icon] : Building2;
                          return <Icon size={24} color="#fff" />;
                        })()
                      )}
                    </TouchableOpacity>
                    {/* Edit badge sits outside the clipped icon */}
                    <View style={[styles.editIconBadge, { borderColor: isDark ? '#1a1a1a' : '#ffffff' }]}>
                      <Camera size={9} color="#fff" />
                    </View>
                  </View>
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



          <SectionHeader title="Financial Tools" />
          <SettingsCard>
            <SettingsRow
              icon={Repeat}
              label="Recurring & Subscriptions"
              subLabel="Manage automated bills, rent, and scheduled cash flow"
              onPress={() => router.push('/recurring')}
              color="#10b981"
            />
            <SettingsRow
              icon={FileText}
              label="View Notes"
              onPress={() => router.push('/notes')}
              color="#f59e0b"
            />
            <SettingsRow
              icon={FileDown}
              label="Export Business Report"
              subLabel="Generate PDF, Excel, or CSV statement"
              onPress={() => handleExportBusiness('pdf')}
              color="#ec4899"
              isLast
              rightElement={isExporting ? <ActivityIndicator size="small" color="#ec4899" /> : null}
            />
          </SettingsCard>



          <SectionHeader title="Support" />
          <SettingsCard>
            <SettingsRow
              icon={Heart}
              label="Support the Developer"
              subLabel="Donate and help keep spndy free & updated"
              onPress={() => router.push('/donate')}
              color="#10b981"
            />

            <SettingsRow
              icon={MessageSquare}
              label="Send Feedback"
              onPress={() => setShowFeedbackModal(true)}
              color="#f59e0b"
            />

            <SettingsRow
              icon={Shield}
              label="Privacy Policy"
              onPress={() => router.push('/privacy-policy')}
              color="#6366f1"
            />

            <SettingsRow
              icon={FileText}
              label="Terms of Service"
              onPress={() => router.push('/terms-of-service')}
              color="#6366f1"
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



          <Text style={[styles.versionText, { color: colors.textSecondary }]}>Version 1.0.0 • spndy</Text>
        </View>
      </ScrollView>

      {/* Logout Modal */}
      <Modal visible={showLogoutModal} transparent animationType="fade" onRequestClose={() => setShowLogoutModal(false)} statusBarTranslucent={true}>
        <View style={styles.modalOverlay}>
          <GlassBackdrop isDark={isDark} onPress={() => setShowLogoutModal(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'padding'} keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 20} style={{ width: '100%', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <View
              style={[
                styles.modalContent,
                {
                  backgroundColor: colors.surfaceGlass,
                  borderColor: colors.borderGlass,
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
                <Text style={{ fontSize: 24, fontFamily: 'SpaceGrotesk_700Bold', color: colors.text, marginBottom: 8 }}>Sign Out</Text>
                <Text style={{ fontSize: 15, fontFamily: 'SpaceGrotesk_400Regular', color: colors.textSecondary, textAlign: 'center' }}>Are you sure you want to sign out of your account?</Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity style={[styles.modalCancel, { backgroundColor: isDark ? '#1C1C1E' : '#F1F5F9', borderRadius: 16, height: 56, justifyContent: 'center' }]} onPress={() => setShowLogoutModal(false)}>
                  <Text style={[styles.modalCancelText, { color: colors.text, fontSize: 16, fontFamily: 'SpaceGrotesk_600SemiBold' }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ flex: 1, borderRadius: 16, overflow: 'hidden' }} onPress={confirmLogout} activeOpacity={0.9}>
                  <LinearGradient
                    colors={['#ef4444', '#dc2626']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ height: 56, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Text style={[styles.modalDestructiveText, { fontSize: 16, fontFamily: 'SpaceGrotesk_700Bold' }]}>Sign Out</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Delete Business Modal */}
      <Modal visible={showDeleteBusinessModal} transparent animationType="fade" onRequestClose={() => setShowDeleteBusinessModal(false)} statusBarTranslucent={true}>
        <View style={styles.modalOverlay}>
          <GlassBackdrop isDark={isDark} onPress={() => setShowDeleteBusinessModal(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'padding'} keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 20} style={{ width: '100%', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <View
              style={[
                styles.deleteModalContent,
                {
                  backgroundColor: colors.surfaceGlass,
                  borderColor: colors.borderGlass,
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
                <Text style={{ fontSize: 24, fontFamily: 'SpaceGrotesk_700Bold', color: colors.text, marginBottom: 8, textAlign: 'center' }}>Delete Business</Text>
                <Text style={{ fontSize: 16, color: '#EF4444', textAlign: 'center', fontFamily: 'SpaceGrotesk_500Medium' }}>
                  This action is irreversible.
                </Text>
              </View>

              <Text style={[styles.deleteModalHint, { color: colors.textSecondary, marginBottom: 12 }]}>
                Type <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', color: colors.text }}>{businessToDelete?.name}</Text> to confirm
              </Text>

              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: isDark ? '#1C1C1E' : '#F8FAFC',
                    borderColor: isDark ? '#333' : '#e2e8f0',
                    color: colors.text,
                    fontFamily: 'SpaceGrotesk_500Medium',
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
                  <Text style={[styles.modalCancelText, { color: colors.text, fontSize: 16, fontFamily: 'SpaceGrotesk_600SemiBold' }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    borderRadius: 16,
                    overflow: 'hidden',
                    opacity: (deleteBusinessConfirm.trim().toLowerCase() === (businessToDelete?.name || '').trim().toLowerCase()) ? 1 : 0.5
                  }}
                  onPress={async () => {
                    const isMatched = deleteBusinessConfirm.trim().toLowerCase() === (businessToDelete?.name || '').trim().toLowerCase();
                    if (isMatched && businessToDelete) {
                      try {
                        setIsDeletingBusiness(true);
                        await deleteBusiness(businessToDelete.id);
                        setShowDeleteBusinessModal(false);
                        setBusinessToDelete(null);
                        setDeleteBusinessConfirm('');
                        router.replace('/(tabs)');
                      } catch (error: any) {
                        Alert.alert('Error', error?.message || 'Failed to delete business');
                      } finally {
                        setIsDeletingBusiness(false);
                      }
                    }
                  }}
                  disabled={deleteBusinessConfirm.trim().toLowerCase() !== (businessToDelete?.name || '').trim().toLowerCase() || isDeletingBusiness}
                  activeOpacity={0.9}
                >
                  <LinearGradient colors={['#ef4444', '#dc2626']} style={[styles.modalSaveButton, { height: 56, justifyContent: 'center' }]}>
                    {isDeletingBusiness ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={[styles.modalDestructiveText, { fontSize: 16, fontFamily: 'SpaceGrotesk_700Bold' }]}>Delete</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Edit Business Name Modal */}
      <Modal visible={showEditBusinessNameModal} transparent animationType="fade" onRequestClose={() => setShowEditBusinessNameModal(false)} statusBarTranslucent={true}>
        <View style={styles.modalOverlay}>
          <GlassBackdrop isDark={isDark} onPress={() => setShowEditBusinessNameModal(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'padding'} keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 20} style={{ width: '100%', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <View
              style={[
                styles.modalContent,
                {
                  backgroundColor: colors.surfaceGlass,
                  borderColor: colors.borderGlass,
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
                  <Text style={[styles.modalCancelText, { color: colors.text, fontSize: 16, fontFamily: 'SpaceGrotesk_600SemiBold' }]}>Cancel</Text>
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
                    <Text style={[styles.modalConfirmText, { fontSize: 16, fontFamily: 'SpaceGrotesk_700Bold' }]}>Save</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>





      {/* Analytics Sort Modal */}
      <Modal visible={sortModalVisible} transparent animationType="fade" onRequestClose={() => setSortModalVisible(false)} statusBarTranslucent={true}>
        <View style={styles.modalOverlay}>
          <GlassBackdrop isDark={isDark} onPress={() => setSortModalVisible(false)} />
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border, padding: 0, maxWidth: 400, maxHeight: '80%', overflow: 'hidden' }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5', justifyContent: 'center', alignItems: 'center' }}>
                  <SlidersHorizontal size={20} color="#10b981" />
                </View>
                <Text style={[styles.modalTitle, { color: colors.text, fontSize: 20 }]}>Sort & Filter</Text>
              </View>
              <TouchableOpacity onPress={() => setSortModalVisible(false)} style={[styles.closeButton, { backgroundColor: isDark ? '#1C1C1E' : '#F1F5F9' }]}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20 }}>
              {['Sort By', 'Time Filter'].map((group) => (
                <View key={group} style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 12, fontFamily: 'SpaceGrotesk_700Bold', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>{group}</Text>
                  <View style={{ gap: 8 }}>
                    {ANALYTICS_SORT_OPTIONS.filter(opt => opt.group === group).map(option => {
                      const isActive = group === 'Sort By' ? selectedSort === option.value : timeRange === option.value;
                      return (
                        <TouchableOpacity
                          key={option.value}
                          style={[
                            { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: isDark ? '#1C1C1E' : '#F8FAFC' },
                            isActive && { borderColor: colors.primary, backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#f0fdf4' }
                          ]}
                          onPress={() => {
                            if (group === 'Sort By') {
                              setSelectedSort(option.value);
                            } else {
                              setTimeRange(option.value as any);
                            }
                            setSortModalVisible(false);
                          }}
                        >
                          <Text style={[{ fontSize: 15, color: colors.textSecondary, fontFamily: 'SpaceGrotesk_500Medium' }, isActive && { color: colors.text, fontFamily: 'SpaceGrotesk_600SemiBold' }]}>
                            {option.label}
                          </Text>
                          {isActive && <Check size={18} color={colors.primary} style={{ marginLeft: 'auto' }} />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Export Business Modal */}
      <Modal visible={exportModalVisible} transparent animationType="fade" onRequestClose={() => setExportModalVisible(false)} statusBarTranslucent={true}>
        <View style={styles.modalOverlay}>
          <GlassBackdrop isDark={isDark} onPress={() => setExportModalVisible(false)} />
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border, padding: 0, maxWidth: 400, overflow: 'hidden' }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: isDark ? 'rgba(236, 72, 153, 0.15)' : '#fdf2f8', justifyContent: 'center', alignItems: 'center' }}>
                  <FileDown size={20} color="#ec4899" />
                </View>
                <Text style={[styles.modalTitle, { color: colors.text, fontSize: 20 }]}>Export Report</Text>
              </View>
              <TouchableOpacity onPress={() => setExportModalVisible(false)} style={[styles.closeButton, { backgroundColor: isDark ? '#1C1C1E' : '#F1F5F9' }]}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 24 }}>
              <View style={{ marginBottom: 18 }}>
                <Text style={{ fontSize: 12, fontFamily: 'SpaceGrotesk_600SemiBold', color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Export Format
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {[
                    { id: 'pdf', label: 'PDF Document', ext: '.pdf' },
                    { id: 'xlsx', label: 'Excel Sheet', ext: '.xlsx' },
                    { id: 'csv', label: 'CSV Data', ext: '.csv' },
                  ].map((fmt) => {
                    const isSelected = businessExportFormat === fmt.id;
                    return (
                      <TouchableOpacity
                        key={fmt.id}
                        onPress={() => setBusinessExportFormat(fmt.id as 'pdf' | 'xlsx' | 'csv')}
                        style={{
                          flex: 1,
                          paddingVertical: 10,
                          paddingHorizontal: 8,
                          borderRadius: 12,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: isSelected
                            ? (isDark ? 'rgba(236, 72, 153, 0.2)' : '#fdf2f8')
                            : (isDark ? '#1C1C1E' : '#F8FAFC'),
                          borderWidth: 1.5,
                          borderColor: isSelected ? '#ec4899' : colors.border,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontFamily: isSelected ? 'SpaceGrotesk_700Bold' : 'SpaceGrotesk_500Medium',
                            color: isSelected ? '#ec4899' : colors.textSecondary,
                          }}
                        >
                          {fmt.label}
                        </Text>
                        <Text
                          style={{
                            fontSize: 10,
                            fontFamily: 'SpaceGrotesk_400Regular',
                            color: isSelected ? '#ec4899' : colors.textSecondary,
                            opacity: 0.8,
                            marginTop: 2,
                          }}
                        >
                          {fmt.ext}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 12, fontFamily: 'SpaceGrotesk_600SemiBold', color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase' }}>Filename</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: isDark ? '#1C1C1E' : '#F8FAFC', borderColor: colors.border, color: colors.text, margin: 0 }]}
                  value={exportFileName}
                  onChangeText={setExportFileName}
                  placeholder="Enter filename"
                  placeholderTextColor={colors.textSecondary}
                  autoFocus={true}
                />
                <Text style={{ fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular', color: colors.textSecondary, marginTop: 6, fontStyle: 'italic' }}>
                  .{businessExportFormat} will be added automatically
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  style={[styles.modalCancel, { backgroundColor: isDark ? '#1C1C1E' : '#F1F5F9' }]}
                  onPress={() => setExportModalVisible(false)}
                >
                  <Text style={[styles.modalCancelText, { color: colors.text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalConfirm, { backgroundColor: '#ec4899', flex: 2, opacity: isExporting ? 0.7 : 1 }]}
                  onPress={confirmExportBusiness}
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.modalConfirmText}>
                      {businessExportFormat === 'pdf' ? 'Export PDF' : businessExportFormat === 'xlsx' ? 'Export Excel' : 'Export CSV'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
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
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 }}>
              <View>
                <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 28, color: colors.text }}>Choose Logo</Text>
                <Text style={{ fontSize: 14, fontFamily: 'SpaceGrotesk_400Regular', color: colors.textSecondary, marginTop: 4 }}>Select an icon or upload a photo</Text>
              </View>
              <TouchableOpacity
                style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? colors.surface : '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}
                onPress={() => setShowLogoModal(false)}
              >
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Use a Photo option */}
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                marginHorizontal: 20,
                marginBottom: 14,
                padding: 14,
                borderRadius: 16,
                backgroundColor: isDark ? 'rgba(99,102,241,0.12)' : '#eef2ff',
                borderWidth: 1,
                borderColor: isDark ? 'rgba(99,102,241,0.3)' : '#c7d2fe',
              }}
              onPress={handleUploadBusinessPhoto}
              disabled={isUploadingBusinessPhoto}
              activeOpacity={0.8}
            >
              {isUploadingBusinessPhoto
                ? <ActivityIndicator size="small" color="#6366f1" />
                : <Camera size={20} color="#6366f1" />
              }
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontFamily: 'SpaceGrotesk_600SemiBold', color: '#6366f1' }}>Use a Photo</Text>
                <Text style={{ fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular', color: colors.textSecondary, marginTop: 2 }}>Upload from your gallery</Text>
              </View>
              {currentBusiness?.photoUrl && (
                <Image
                  source={{ uri: currentBusiness.photoUrl }}
                  style={{ width: 40, height: 40, borderRadius: 10 }}
                  resizeMode="cover"
                />
              )}
            </TouchableOpacity>

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
                      <Text style={{ fontSize: 12, fontFamily: 'SpaceGrotesk_700Bold', color: colors.textSecondary, marginBottom: 2 }}>SELECTED</Text>
                      <Text style={{ fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold', color: colors.text }}>{selectedLogo?.label || 'None'}</Text>
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
                    fontFamily: 'SpaceGrotesk_500Medium',
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
                    <Text style={{ color: colors.textSecondary, fontSize: 16, fontFamily: 'SpaceGrotesk_500Medium' }}>No logos found</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular', marginTop: 4 }}>Try a different search term</Text>
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
                        fontFamily: isSelected ? 'SpaceGrotesk_600SemiBold' : 'SpaceGrotesk_500Medium'
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
                  <Text style={{ fontSize: 17, fontFamily: 'SpaceGrotesk_700Bold', color: '#fff' }}>Save Changes</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Feedback Modal */}
      <Modal visible={showFeedbackModal} transparent animationType="fade" onRequestClose={() => setShowFeedbackModal(false)} statusBarTranslucent={true}>
        <View style={styles.modalOverlay}>
          <GlassBackdrop isDark={isDark} onPress={() => setShowFeedbackModal(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'padding'} keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 20} style={{ flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' }}>
            <TouchableWithoutFeedback onPress={() => setShowFeedbackModal(false)}>
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
            </TouchableWithoutFeedback>

            <View
              style={[
                styles.modalContent,
                {
                  backgroundColor: colors.surfaceGlass,
                  borderColor: colors.borderGlass,
                  borderWidth: 1,
                  borderRadius: 32,
                  width: '90%',
                  maxWidth: 400,
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
              <View style={[styles.modalHeader, { borderBottomColor: colors.border, padding: 20 }]}>
                <View>
                  <Text style={[styles.modalTitle, { fontFamily: 'SpaceGrotesk_700Bold', color: colors.text, fontSize: 22 }]}>Contact Support</Text>
                  <Text style={[styles.modalMessage, { color: colors.textSecondary, fontFamily: 'SpaceGrotesk_400Regular' }]}>We'd love to hear from you!</Text>
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
                  <Text style={{ fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold', color: colors.text, marginBottom: 6 }}>
                    lucyosck21@gmail.com
                  </Text>
                  <Text style={{ fontSize: 14, fontFamily: 'SpaceGrotesk_400Regular', color: colors.textSecondary, textAlign: 'center', lineHeight: 20 }}>
                    Send us your questions, feedback, or just say hello!
                  </Text>
                </View>

                <TouchableOpacity
                  style={{ borderRadius: 16, overflow: 'hidden' }}
                  onPress={() => {
                    Linking.openURL('mailto:lucyosck21@gmail.com');
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
                    <Text style={{ fontSize: 16, fontFamily: 'SpaceGrotesk_700Bold', color: '#fff' }}>Open Mail App</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
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
    fontFamily: 'SpaceGrotesk_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  headerTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 32,
    marginBottom: 12,
  },
  sectionHeader: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_700Bold',
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
  avatarWrapper: {
    position: 'relative',
    width: 48,
    height: 48,
    marginRight: 12,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarCameraBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    zIndex: 10,
    elevation: 10,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk_700Bold',
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  editProfileButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  editProfileText: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
  businessCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 4,
  },
  businessIconWrapper: {
    position: 'relative',
    width: 48,
    height: 48,
    marginRight: 12,
  },
  businessIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  businessName: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk_700Bold',
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
    fontFamily: 'SpaceGrotesk_600SemiBold',
    marginBottom: 0,
  },
  rowSubLabel: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_400Regular',
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
    fontFamily: 'SpaceGrotesk_600SemiBold',
    color: '#ef4444',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_500Medium',
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
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 20,
  },
  modalMessage: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_400Regular',
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
    fontFamily: 'SpaceGrotesk_600SemiBold',
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
    fontFamily: 'SpaceGrotesk_700Bold',
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
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#fff',
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    margin: 16,
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_500Medium',
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_400Regular',
    marginTop: 4,
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
    fontFamily: 'SpaceGrotesk_700Bold',
    marginBottom: 4,
  },
  fontDescription: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk_500Medium',
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
    fontFamily: 'SpaceGrotesk_700Bold',
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
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 20,
  },
  deleteModalHint: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_400Regular',
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
    fontFamily: 'SpaceGrotesk_500Medium',
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
    fontFamily: 'SpaceGrotesk_500Medium',
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
    bottom: -3,
    right: -3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#10b981',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    elevation: 10,
  },
});
