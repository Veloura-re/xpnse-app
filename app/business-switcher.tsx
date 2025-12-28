import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  LayoutAnimation,
  ScrollView,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useBusiness } from '@/providers/business-provider';
import { useTheme } from '@/providers/theme-provider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Business } from '@/types';
import { Building2, Plus, Search, X, Check, SlidersHorizontal, MoreHorizontal, ArrowRight } from 'lucide-react-native';
import { RoleBadge } from '@/components/role-badge';
import { useFonts } from '@expo-google-fonts/abril-fatface';
import Animated, { FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { getFontFamily } from '@/config/font-config';
import { LOGO_OPTIONS, BUSINESS_ICONS } from '@/constants/logos';

type SortOption = 'name-asc' | 'name-desc' | 'date-asc' | 'date-desc' | 'activity-desc' | 'today' | 'week' | 'month' | 'year' | 'all';

interface SortConfig {
  label: string;
  value: SortOption;
  group: 'Sort By' | 'Time Filter';
}

const SORT_OPTIONS: SortConfig[] = [
  { label: 'Recently Active', value: 'activity-desc', group: 'Sort By' },
  { label: 'Name (A-Z)', value: 'name-asc', group: 'Sort By' },
  { label: 'Name (Z-A)', value: 'name-desc', group: 'Sort By' },
  { label: 'Newest First', value: 'date-desc', group: 'Sort By' },
  { label: 'Oldest First', value: 'date-asc', group: 'Sort By' },
  { label: 'All Time', value: 'all', group: 'Time Filter' },
  { label: 'This Year', value: 'year', group: 'Time Filter' },
  { label: 'This Month', value: 'month', group: 'Time Filter' },
  { label: 'This Week', value: 'week', group: 'Time Filter' },
  { label: 'Today', value: 'today', group: 'Time Filter' },
];

export default function BusinessSwitcherScreen() {
  const { businesses, currentBusiness, switchBusiness, createBusiness, getUserRole } = useBusiness();
  const { colors, deviceFont, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newBusinessName, setNewBusinessName] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [selectedSort, setSelectedSort] = useState<SortOption>('date-desc');
  const [selectedLogoId, setSelectedLogoId] = useState<string>('1');
  const [showLogoPicker, setShowLogoPicker] = useState(false);
  const [isSelectingLogo, setIsSelectingLogo] = useState(false);
  const [logoSearchQuery, setLogoSearchQuery] = useState('');
  const searchInputRef = useRef<TextInput>(null);

  const isWithinTimeRange = (dateString: string, range: SortOption): boolean => {
    if (range === 'all' || !['today', 'week', 'month', 'year'].includes(range)) return true;
    const businessDate = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (range) {
      case 'today':
        return businessDate >= today;
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return businessDate >= weekAgo;
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return businessDate >= monthAgo;
      case 'year':
        const yearAgo = new Date(today);
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        return businessDate >= yearAgo;
      default:
        return true;
    }
  };

  const filteredBusinesses = businesses
    .filter(business => {
      // Time filter
      const matchesTime = isWithinTimeRange(business.createdAt, selectedSort);
      return matchesTime;
    })
    .sort((a, b) => {
      switch (selectedSort) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'activity-desc':
          return new Date(b.lastActiveAt || 0).getTime() - new Date(a.lastActiveAt || 0).getTime();
        case 'date-desc':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'date-asc':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  const recentlyActiveBusinesses = useMemo(() => {
    return [...businesses]
      .filter(b => b.lastActiveAt)
      .sort((a, b) => new Date(b.lastActiveAt!).getTime() - new Date(a.lastActiveAt!).getTime())
      .slice(0, 4);
  }, [businesses]);

  const handleSwitchBusiness = (businessId: string) => {
    switchBusiness(businessId);
    router.back();
  };

  const handleCreateBusiness = async () => {
    if (!newBusinessName.trim()) {
      setErrorMessage('Please enter a business name');
      setShowErrorModal(true);
      return;
    }

    try {
      setIsCreating(true);
      const selectedLogo = LOGO_OPTIONS.find(l => l.id === selectedLogoId);
      await createBusiness(
        newBusinessName.trim(),
        'USD',
        selectedLogo?.icon || 'store',
        selectedLogo?.color || colors.primary
      );
      setNewBusinessName('');
      setSelectedLogoId('1');
      setShowCreateForm(false);
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Failed to create business:', error);
      setErrorMessage('Failed to create business. Please try again.');
      setShowErrorModal(true);
    } finally {
      setIsCreating(false);
    }
  };
  const handleSelectLogo = () => {
    setIsSelectingLogo(true);
    // Simulate a small delay for better UX
    setTimeout(() => {
      setShowLogoPicker(false);
      setIsSelectingLogo(false);
    }, 100);
  };

  const renderBusinessItem = ({ item }: { item: Business }) => {
    const isSelected = currentBusiness?.id === item.id;
    const userRole = getUserRole(item.id);
    const memberCount = item.members?.length ?? 0;

    const BusinessIcon = item.icon && BUSINESS_ICONS[item.icon] ? BUSINESS_ICONS[item.icon] : Building2;
    const businessColor = item.color || (isSelected ? colors.primary : colors.textSecondary);

    return (

      <TouchableOpacity
        style={[
          styles.businessItem,
          {
            backgroundColor: isSelected ? (isDark ? 'rgba(33, 201, 141, 0.1)' : 'rgba(16, 185, 129, 0.1)') : 'rgba(255, 255, 255, 0.05)',
            borderColor: isSelected ? (isDark ? 'rgba(33, 201, 141, 0.3)' : 'rgba(16, 185, 129, 0.3)') : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'),
            borderWidth: 1,
            shadowOpacity: 0,
          }
        ]}
        onPress={() => handleSwitchBusiness(item.id)}
        activeOpacity={0.7}
      >
        <View style={[
          styles.businessIcon,
          {
            backgroundColor: isSelected ? (isDark ? 'rgba(33, 201, 141, 0.1)' : '#f0fdf4') : (isDark ? '#334155' : '#f1f5f9'),
            borderRadius: 16
          }
        ]}>
          <BusinessIcon size={24} color={isSelected ? (item.color || colors.primary) : (item.color || colors.textSecondary)} />
        </View>
        <View style={styles.businessContent}>
          <Text style={[
            styles.businessName,
            {
              color: colors.text,
              fontWeight: isSelected ? '700' : '600'
            }
          ]}>
            {item.name}
          </Text>
          <View style={styles.businessMeta}>
            <RoleBadge role={userRole} size="small" />
            <Text style={[styles.businessMembers, { color: colors.textSecondary }]}>
              {memberCount} member{memberCount !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
        {isSelected && (
          <View style={[styles.checkIcon, { backgroundColor: 'transparent' }]}>
            <Check size={20} color={colors.primary} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Decorative Circles */}
      <View style={[styles.circle1, { backgroundColor: isDark ? 'rgba(33, 201, 141, 0.05)' : 'rgba(16, 185, 129, 0.1)' }]} />
      <View style={[styles.circle2, { backgroundColor: isDark ? 'rgba(33, 201, 141, 0.03)' : 'rgba(16, 185, 129, 0.08)' }]} />

      <Animated.View
        entering={FadeIn.delay(100).duration(200)}
        style={[styles.headerContainer, { paddingTop: insets.top + 50 }]}
      >
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.headerRow, { alignItems: 'flex-end', paddingBottom: 6 }]}>
          <View>
            <Text style={[styles.appName, { color: colors.primary }]}>Workspace</Text>
            <Text style={[styles.headerTitle, { fontFamily: getFontFamily(deviceFont), color: colors.text }]}>Switch Business</Text>
          </View>
          <TouchableOpacity
            style={[styles.headerIconButton, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 4 }, selectedSort !== 'date-desc' && { borderColor: colors.primary, backgroundColor: isDark ? 'rgba(33, 201, 141, 0.1)' : '#f0fdf4' }]}
            onPress={() => setSortModalVisible(true)}
          >
            <SlidersHorizontal size={20} color={selectedSort !== 'date-desc' ? colors.primary : colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <Animated.View
        entering={FadeIn.delay(200).duration(200)}
        style={styles.contentArea}
      >
        {recentlyActiveBusinesses.length >= 2 && (
          <View style={styles.recentlyActiveSection}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>RECENTLY ACTIVE</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentlyActiveList}
            >
              {recentlyActiveBusinesses.map((item) => {
                const BusinessIcon = item.icon && BUSINESS_ICONS[item.icon] ? BUSINESS_ICONS[item.icon] : Building2;
                const isSelected = currentBusiness?.id === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.recentItem,
                      {
                        backgroundColor: isSelected ? (isDark ? 'rgba(33, 201, 141, 0.1)' : 'rgba(16, 185, 129, 0.1)') : colors.card,
                        borderColor: isSelected ? colors.primary : colors.border
                      }
                    ]}
                    onPress={() => handleSwitchBusiness(item.id)}
                  >
                    <View style={[styles.recentIcon, { backgroundColor: item.color || colors.primary + '20' }]}>
                      <BusinessIcon size={20} color={item.color || colors.primary} />
                    </View>
                    <Text style={[styles.recentName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}


        <View
          style={[styles.card, { backgroundColor: isDark ? 'rgba(30, 30, 30, 0.9)' : 'rgba(255, 255, 255, 0.9)', borderColor: colors.border, overflow: 'hidden' }]}
        >
          <FlatList
            data={filteredBusinesses}
            renderItem={renderBusinessItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </Animated.View>

      {/* Floating Action Button */}
      <Animated.View
        entering={FadeIn.delay(300).duration(200)}
        style={[styles.fabContainer, { bottom: insets.bottom + 24 }]}
      >
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowCreateForm(true)}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={[colors.primary, '#059669']}
            style={styles.fabGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Plus size={28} color="#fff" strokeWidth={2.5} />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      <Modal
        visible={showCreateForm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateForm(false)}
        statusBarTranslucent={true}
      >
        <View
          style={[styles.modalOverlay, { paddingHorizontal: 20, backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)' }]}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 20}
            style={{ width: '100%', alignItems: 'center', justifyContent: 'center' }}
          >
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
              <View style={styles.modalHeader}>
                <View style={[
                  styles.modalIconContainer,
                  {
                    backgroundColor: isDark ? 'rgba(33, 201, 141, 0.15)' : '#f0fdf4',
                    width: 72,
                    height: 72,
                    borderRadius: 36,
                    marginBottom: 16
                  }
                ]}>
                  <Building2 size={32} color={colors.primary} />
                </View>
                <Text style={[styles.createFormTitle, { fontFamily: getFontFamily(deviceFont), color: colors.text }]}>Create Business</Text>
                <Text style={[styles.createFormSubtitle, { color: colors.textSecondary }]}>Start tracking finances for your new entity</Text>
              </View>

              <Text style={[styles.inputLabel, { color: colors.text, marginLeft: 4, marginBottom: 8, marginTop: 16 }]}>BUSINESS NAME</Text>
              <TextInput
                style={[
                  styles.createFormInput,
                  {
                    backgroundColor: isDark ? '#1C1C1E' : '#F8FAFC',
                    borderColor: isDark ? '#333' : '#e2e8f0',
                    color: colors.text,
                    borderWidth: 1,
                    borderRadius: 18,
                    padding: 18,
                    fontSize: 17,
                    fontWeight: '500'
                  }
                ]}
                value={newBusinessName}
                onChangeText={setNewBusinessName}
                placeholder="e.g. My Awesome Shop"
                placeholderTextColor={colors.textSecondary}
                autoFocus
                autoCapitalize="words"
              />

              <Text style={[styles.inputLabel, { color: colors.text, marginLeft: 4, marginBottom: 8, marginTop: 24 }]}>CHOOSE LOGO</Text>

              <View style={{ marginBottom: 32, alignItems: 'center' }}>
                <TouchableOpacity
                  onPress={() => setShowLogoPicker(true)}
                  activeOpacity={0.8}
                  style={{
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 16,
                    width: '100%',
                    backgroundColor: isDark ? '#1C1C1E' : '#F8FAFC',
                    padding: 16,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: isDark ? '#333' : '#e2e8f0'
                  }}
                >
                  <View style={{
                    width: 56,
                    height: 56,
                    borderRadius: 18,
                    backgroundColor: (() => {
                      const l = LOGO_OPTIONS.find(opt => opt.id === selectedLogoId);
                      return l ? (isDark ? l.darkColor + '20' : l.color + '10') : (isDark ? '#2C3333' : '#f1f5f9');
                    })(),
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 2,
                    borderColor: (() => {
                      const l = LOGO_OPTIONS.find(opt => opt.id === selectedLogoId);
                      return l ? (isDark ? l.darkColor : l.color) : colors.border;
                    })(),
                    borderStyle: selectedLogoId ? 'solid' : 'dashed'
                  }}>
                    {(() => {
                      const l = LOGO_OPTIONS.find(opt => opt.id === selectedLogoId);
                      const Icon = l ? (BUSINESS_ICONS[l.icon] || Building2) : Plus;
                      return <Icon size={26} color={l ? (isDark ? l.darkColor : l.color) : colors.textSecondary} />;
                    })()}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>
                      {LOGO_OPTIONS.find(l => l.id === selectedLogoId)?.label || 'Select Logo'}
                    </Text>
                    <Text style={{ fontSize: 14, color: colors.primary, fontWeight: '500', marginTop: 2 }}>
                      Tap to change icon
                    </Text>
                  </View>
                  <ArrowRight size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.createFormButtons}>
                <TouchableOpacity
                  style={[styles.cancelButton, { backgroundColor: isDark ? '#1C1C1E' : '#F1F5F9', borderRadius: 18, borderRightWidth: 0, paddingVertical: 18, flex: 1 }]}
                  onPress={() => {
                    setShowCreateForm(false);
                    setNewBusinessName('');
                  }}
                >
                  <Text style={[styles.cancelButtonText, { color: colors.text, fontSize: 16, fontWeight: '600' }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1 }}
                  disabled={!newBusinessName.trim() || isCreating}
                  onPress={handleCreateBusiness}
                >
                  <LinearGradient
                    colors={[colors.primary, '#059669']}
                    style={[styles.createButtonGradient, { borderRadius: 18, paddingVertical: 18, alignItems: 'center', justifyContent: 'center' }]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    {isCreating ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={[styles.createButtonText, { fontSize: 16, fontWeight: '700' }]}>Create</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Sort & Filter Modal */}
      <Modal visible={sortModalVisible} transparent animationType="fade" onRequestClose={() => setSortModalVisible(false)} statusBarTranslucent={true}>
        <TouchableOpacity style={styles.sortModalOverlay} activeOpacity={1} onPress={() => setSortModalVisible(false)}>
          <View style={[styles.bottomSheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.bottomSheetHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.bottomSheetTitle, { fontFamily: getFontFamily(deviceFont), color: colors.text }]}>Sort & Filter</Text>
              <TouchableOpacity style={[styles.sheetCloseButton, { backgroundColor: colors.card }]} onPress={() => setSortModalVisible(false)}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.bottomSheetContent}>
              {['Sort By', 'Time Filter'].map((group) => (
                <View key={group} style={styles.sortSection}>
                  <Text style={[styles.sortSectionTitle, { color: colors.textSecondary }]}>{group}</Text>
                  <View style={styles.sortGrid}>
                    {SORT_OPTIONS.filter(opt => opt.group === group).map(option => {
                      const isActive = selectedSort === option.value;
                      return (
                        <TouchableOpacity
                          key={option.value}
                          style={[styles.sortOption, { backgroundColor: colors.card, borderColor: colors.border }, isActive && [styles.sortOptionActive, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#f0fdf4', borderColor: colors.primary }]]}
                          onPress={() => {
                            setSelectedSort(option.value);
                            setSortModalVisible(false);
                          }}
                        >
                          {isActive && <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />}
                          <Text style={[styles.sortOptionText, { color: colors.textSecondary }, isActive && [styles.sortOptionTextActive, { color: colors.text }]]}>
                            {option.label}
                          </Text>
                          {isActive && <Check size={16} color={colors.primary} style={{ marginLeft: 'auto' }} />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Logo Picker Modal */}
      <Modal visible={showLogoPicker} transparent animationType="fade" onRequestClose={() => setShowLogoPicker(false)} statusBarTranslucent={true}>
        <View
          style={[styles.modalOverlay, { justifyContent: 'flex-end', backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)' }]}
        >
          <Animated.View entering={FadeIn.duration(200)} style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end' }]} pointerEvents="box-none">
            <View style={[styles.modalContent, {
              height: '85%',
              maxHeight: '85%',
              padding: 0,
              backgroundColor: isDark ? '#0A0A0A' : colors.card,
              borderColor: isDark ? '#2C3333' : colors.border,
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
              overflow: 'hidden',
              borderWidth: 1,
              shadowColor: "#000",
              shadowOffset: {
                width: 0,
                height: -4,
              },
              shadowOpacity: 0.15,
              shadowRadius: 8,
              elevation: 10,
            }]}>
              {/* Header with pill */}
              <View style={{ alignItems: 'center', paddingTop: 16, paddingBottom: 8 }}>
                <View style={{ width: 48, height: 5, borderRadius: 3, backgroundColor: isDark ? '#333' : '#e2e8f0' }} />
              </View>

              {/* Title Row */}
              <View style={{ alignItems: 'center', paddingHorizontal: 24, paddingBottom: 24 }}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontFamily: getFontFamily(deviceFont), fontSize: 28, color: colors.text, textAlign: 'center' }}>Choose Logo</Text>
                  <Text style={{ fontSize: 15, color: colors.textSecondary, marginTop: 4, textAlign: 'center' }}>Select an icon for your business</Text>
                </View>
              </View>

              {/* Selected Preview Card */}
              <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 16,
                  borderRadius: 24,
                  backgroundColor: isDark ? '#151515' : '#f8fafc',
                  borderWidth: 1,
                  borderColor: isDark ? '#222' : '#e2e8f0',
                  gap: 16,
                }}>
                  {(() => {
                    const selectedLogo = LOGO_OPTIONS.find(l => l.id === selectedLogoId);
                    const Icon = selectedLogo && BUSINESS_ICONS[selectedLogo.icon] ? BUSINESS_ICONS[selectedLogo.icon] : Building2;
                    const iconColor = selectedLogo ? (isDark ? selectedLogo.darkColor : selectedLogo.color) : colors.primary;
                    const bgColor = selectedLogo ? (isDark ? selectedLogo.darkColor + '15' : selectedLogo.color + '10') : (isDark ? '#222' : '#f1f5f9');

                    return (
                      <>
                        <View style={{
                          width: 56,
                          height: 56,
                          borderRadius: 18,
                          backgroundColor: bgColor,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: 1,
                          borderColor: isDark ? iconColor + '40' : iconColor + '20',
                        }}>
                          <Icon size={28} color={iconColor} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '700', letterSpacing: 0.5, marginBottom: 2 }}>SELECTED ICON</Text>
                          <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>{selectedLogo?.label || 'None'}</Text>
                        </View>
                        <View style={{
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          backgroundColor: colors.primary,
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: selectedLogo ? 1 : 0
                        }}>
                          <Check size={14} color="#fff" strokeWidth={3} />
                        </View>
                      </>
                    );
                  })()}
                </View>
              </View>

              {/* Search Bar - Full Width Fix */}
              <View style={{ paddingHorizontal: 24, marginBottom: 16, width: '100%' }}>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: isDark ? '#1C1C1E' : (colors.inputBackground || (isDark ? '#1C1C1E' : '#F8FAFC')),
                  borderColor: isDark ? '#333' : (colors.border || '#e2e8f0'),
                  borderWidth: 1,
                  height: 52,
                  borderRadius: 16,
                  paddingHorizontal: 16,
                  width: '100%',
                }}
                >
                  <Search size={20} color={colors.textSecondary} />
                  <TextInput
                    ref={searchInputRef}
                    style={{
                      flex: 1,
                      marginLeft: 12,
                      fontSize: 16,
                      color: colors.text,
                      height: '100%',
                      textAlignVertical: 'center',
                      paddingVertical: 0,
                    }}
                    placeholder="Search icons..."
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
                      <X size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Logo Grid */}
              <View style={{ flex: 1, width: '100%' }}>
                <FlatList
                  key="logo-picker-grid-create"
                  data={LOGO_OPTIONS.filter(l => l.label.toLowerCase().includes(logoSearchQuery.toLowerCase()))}
                  numColumns={4}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{
                    gap: 16,
                    paddingHorizontal: 24,
                    paddingBottom: 120 // Extra padding for button
                  }}
                  columnWrapperStyle={{ gap: 12, justifyContent: 'space-between' }}
                  keyExtractor={(item) => item.id}
                  ListEmptyComponent={
                    <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 60 }}>
                      <View style={{
                        width: 80,
                        height: 80,
                        borderRadius: 40,
                        backgroundColor: isDark ? '#1C1C1E' : '#f1f5f9',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 16
                      }}>
                        <Search size={32} color={colors.textSecondary} />
                      </View>
                      <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>No logos found</Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 4 }}>Try a different search term</Text>
                    </View>
                  }
                  renderItem={({ item }) => {
                    const Icon = BUSINESS_ICONS[item.icon] || Building2;
                    const isSelected = selectedLogoId === item.id;

                    return (
                      <TouchableOpacity
                        onPress={() => setSelectedLogoId(item.id)}
                        activeOpacity={0.7}
                        style={{
                          alignItems: 'center',
                          // Calculate width for 4 columns with gap: (100% - 3 * 12px gap) / 4
                          width: '21%',
                          marginBottom: 4
                        }}
                      >
                        <View style={{
                          width: '100%',
                          aspectRatio: 1,
                          borderRadius: 20,
                          backgroundColor: isSelected
                            ? (isDark ? item.darkColor + '25' : item.color + '15')
                            : (isDark ? '#1C1C1E' : '#f8fafc'),
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: isSelected ? 2 : 1,
                          borderColor: isSelected
                            ? (isDark ? item.darkColor : item.color)
                            : (isDark ? '#2C2C2E' : '#f1f5f9'),
                          marginBottom: 8,
                        }}>
                          <Icon
                            size={24}
                            color={isSelected
                              ? (isDark ? item.darkColor : item.color)
                              : (isDark ? '#666' : '#94a3b8')}
                          />
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

            </View>
            {/* Select Button - Fixed at bottom */}
            <View style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: 24,
              paddingBottom: 36,

            }}>
              <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(10,10,10,0.95)' : 'rgba(255,255,255,0.95)' }]} />
              <View style={{
                height: 1,
                backgroundColor: isDark ? '#2C2C2E' : '#e2e8f0',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0
              }} />

              <TouchableOpacity
                style={{ borderRadius: 16, overflow: 'hidden', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 }}
                onPress={handleSelectLogo}
                disabled={isSelectingLogo}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={[colors.primary, '#059669']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ padding: 18, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                >
                  {isSelectingLogo ? (
                    <ActivityIndicator color="#fff" style={{ transform: [{ scale: 1.1 }] }} />
                  ) : (
                    <>
                      <Text style={{ fontSize: 17, fontWeight: '700', color: '#fff' }}>Select Logo</Text>
                      <Check size={20} color="#fff" strokeWidth={2.5} />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal >

      <Modal
        visible={showErrorModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowErrorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Error</Text>
            <Text style={[styles.modalMessage, { color: colors.textSecondary }]}>{errorMessage}</Text>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: '#ef4444' }]}
              onPress={() => setShowErrorModal(false)}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
        statusBarTranslucent={true}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
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
                alignItems: 'center',
                width: '80%',
                maxWidth: 320,
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 15 },
                shadowOpacity: 0.1,
                shadowRadius: 30,
                elevation: 20,
              }
            ]}
          >
            <View style={{ marginBottom: 20, position: 'relative' }}>
              <Animated.View
                entering={FadeIn.delay(300).duration(800)}
                style={{
                  position: 'absolute',
                  top: -8, left: -8, right: -8, bottom: -8,
                  borderRadius: 40,
                  borderWidth: 2,
                  borderColor: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)',
                  opacity: 0.5
                }}
              />
              <LinearGradient
                colors={[colors.primary, '#059669']}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: colors.primary,
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.3,
                  shadowRadius: 10,
                  elevation: 8,
                }}
              >
                <Check size={32} color="#fff" strokeWidth={3} />
              </LinearGradient>
            </View>

            <Text style={{
              color: colors.text,
              fontFamily: getFontFamily(deviceFont),
              fontSize: 26,
              textAlign: 'center',
              marginBottom: 4
            }}>
              Success!
            </Text>

            <Text style={{
              color: colors.textSecondary,
              fontSize: 14,
              textAlign: 'center',
              lineHeight: 20,
              marginBottom: 24,
              paddingHorizontal: 5
            }}>
              Your business has been created and is ready for tracking.
            </Text>

            <TouchableOpacity
              style={{ width: '100%' }}
              onPress={() => setShowSuccessModal(false)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#1F2937', '#111827']}
                style={{
                  borderRadius: 16,
                  paddingVertical: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.5 }}>Continue</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View >
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  circle1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  circle2: {
    position: 'absolute',
    bottom: -100,
    left: -50,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  headerContainer: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  headerIconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 50,
  },
  headerTop: {
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10b981',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  headerTitle: {
    fontFamily: 'AbrilFatface_400Regular',
    fontSize: 36,
    color: '#0f172a',
  },
  contentArea: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  searchBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#0f172a',
    height: '100%',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  filterButton: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  filterButtonActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  sortModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  bottomSheetTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
  },
  sheetCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSheetContent: {
    padding: 24,
    paddingTop: 16,
  },
  sortSection: {
    marginBottom: 24,
  },
  sortSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  sortGrid: {
    gap: 8,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  sortOptionActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    marginRight: 12,
  },
  sortOptionText: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
  },
  sortOptionTextActive: {
    color: '#0f172a',
    fontWeight: '600',
  },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  listContent: {
    padding: 0,
  },
  businessItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  selectedBusinessItem: {
    backgroundColor: '#f8fafc',
  },
  businessIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  selectedBusinessIcon: {
    backgroundColor: '#f0fdf4',
  },
  businessContent: {
    flex: 1,
  },
  businessName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  businessMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  businessMembers: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  checkIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  addIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#10b981',
  },
  // Floating Action Button
  fabContainer: {
    position: 'absolute',
    right: 24,
    zIndex: 1000,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    margin: 20,
    width: '90%',
    maxWidth: 380,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
  },
  modalIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  createFormTitle: {
    fontFamily: 'AbrilFatface_400Regular',
    fontSize: 24,
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center',
  },
  createFormSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
    width: '100%',
  },
  createFormInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
    marginBottom: 24,
  },
  createFormButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  createButton: {
    // Kept for backward compatibility if needed, but overridden in component
    flex: 1,
  },
  createButtonGradient: {
    width: '100%',
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#10b981',
    alignItems: 'center',
    width: '100%',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
  },
  recentlyActiveSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 4,
  },
  recentlyActiveList: {
    paddingLeft: 4,
    gap: 12,
  },
  recentItem: {
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    width: 100,
  },
  recentIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  recentName: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
  },
});
