import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { UserRole, User } from '@/types';
import { useBusiness } from '@/providers/business-provider';
import { useTheme } from '@/providers/theme-provider';
import {
  Search,
  CheckCircle2,
  XCircle,
  User as UserIcon,
  Check,
  UserCheck,
  AlertCircle,
  X,
  Plus,
  Shield,
  Eye,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { RoleBadge } from '@/components/role-badge';

interface InviteTeamMemberFormProps {
  onSuccess?: () => void;
}

const roleOptions: { label: string; value: UserRole; description: string; icon: any }[] = [
  {
    label: 'Partner',
    value: 'partner',
    description: 'Can record, edit, and export book entries, create personal savings vaults, stash funds, and contribute to group treasury.',
    icon: Shield,
  },
  {
    label: 'Viewer',
    value: 'viewer',
    description: 'Read-only access. Can inspect books, savings balances, and analytics without modifying data.',
    icon: Eye,
  },
];

export default function InviteTeamMemberForm({ onSuccess }: InviteTeamMemberFormProps) {
  const { colors, isDark } = useTheme();
  const { inviteTeamMember, searchUserByEmail, currentBusiness } = useBusiness();
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('partner');
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<{ found: boolean; user?: User; message?: string } | null>(null);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [addedMember, setAddedMember] = useState<{ user: User; role: UserRole } | null>(null);

  // Search for user by email with debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (email.trim() && /^\S+@\S+\.\S+$/.test(email.trim())) {
        handleSearch();
      } else {
        setSearchResult(null);
        setSearchPerformed(false);
        setFormError(null);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [email]);

  const handleSearch = async () => {
    if (!email.trim()) return;

    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setSearchResult({ found: false, message: 'Please enter a valid email address' });
      setSearchPerformed(true);
      return;
    }

    setIsSearching(true);
    setSearchPerformed(false);
    setFormError(null);
    try {
      const result = await searchUserByEmail(email.trim());
      if (result.success && result.user) {
        setSearchResult({ found: true, user: result.user });
      } else {
        setSearchResult({ found: false, message: result.message || 'No registered user found with this email' });
      }
      setSearchPerformed(true);
    } catch (error) {
      console.error('Error searching for user:', error);
      setSearchResult({ found: false, message: 'Could not complete user search' });
      setSearchPerformed(true);
    } finally {
      setIsSearching(false);
    }
  };

  const handleResetForm = () => {
    setEmail('');
    setSearchResult(null);
    setSearchPerformed(false);
    setFormError(null);
    setAddedMember(null);
    setSelectedRole('partner');
  };

  const handleSubmit = async () => {
    setFormError(null);

    if (!email.trim()) {
      setFormError('Please enter an email address');
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setFormError('Please enter a valid email address format');
      return;
    }

    if (!searchResult?.found || !searchResult.user) {
      setFormError('Please select a verified user from the search result');
      return;
    }

    setIsLoading(true);
    try {
      const { success, message } = await inviteTeamMember(email.trim(), selectedRole);
      if (success) {
        if (Platform.OS !== 'web') {
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (e) {}
        }
        setAddedMember({
          user: searchResult.user,
          role: selectedRole,
        });
      } else {
        if (Platform.OS !== 'web') {
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          } catch (e) {}
        }
        setFormError(message || 'Failed to add team member');
      }
    } catch (error: any) {
      console.error('Error inviting team member:', error);
      if (Platform.OS !== 'web') {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } catch (e) {}
      }
      setFormError(error?.message || 'An unexpected error occurred while adding the member');
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentBusiness) {
    return (
      <View style={styles.container}>
        <Text style={{ color: colors.textSecondary, fontFamily: 'SpaceGrotesk_500Medium', fontSize: 14 }}>
          No business selected
        </Text>
      </View>
    );
  }

  // Render Post-Addition Success Screen
  if (addedMember) {
    return (
      <View style={styles.successContainer}>
        <View
          style={[
            styles.successIconBadge,
            {
              backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#DCFCE7',
              borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0',
            }
          ]}
        >
          <UserCheck size={36} color="#10B981" strokeWidth={2.2} />
        </View>

        <Text style={[styles.successTitle, { color: colors.text }]}>
          Member Added
        </Text>
        <Text style={[styles.successSubtitle, { color: colors.textSecondary }]}>
          {addedMember.user.name || addedMember.user.displayName || addedMember.user.email} has been granted{' '}
          <Text style={{ color: colors.primary, fontFamily: 'SpaceGrotesk_700Bold' }}>
            {addedMember.role}
          </Text>{' '}
          access to {currentBusiness.name}.
        </Text>

        {/* Member Profile Card */}
        <View
          style={[
            styles.addedMemberCard,
            {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F8FAFC',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
            }
          ]}
        >
          <View style={[styles.avatarBox, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#DCFCE7' }]}>
            <UserIcon size={20} color="#10B981" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.addedMemberName, { color: colors.text }]} numberOfLines={1}>
              {addedMember.user.name || addedMember.user.displayName || addedMember.user.email}
            </Text>
            <Text style={[styles.addedMemberEmail, { color: colors.textSecondary }]} numberOfLines={1}>
              {addedMember.user.email}
            </Text>
          </View>
          <RoleBadge role={addedMember.role} size="small" />
        </View>

        {/* Action Buttons */}
        <View style={styles.successActionsRow}>
          <TouchableOpacity
            style={[
              styles.secondaryBtn,
              {
                borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#CBD5E1',
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F1F5F9',
              }
            ]}
            onPress={handleResetForm}
            activeOpacity={0.7}
          >
            <Plus size={16} color={colors.text} style={{ marginRight: 6 }} />
            <Text style={[styles.secondaryBtnText, { color: colors.text }]}>
              Add Another
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.primaryDoneBtn}
            onPress={() => {
              handleResetForm();
              onSuccess?.();
            }}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#10B981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientBtn}
            >
              <Check size={16} color="#FFFFFF" strokeWidth={2.5} style={{ marginRight: 6 }} />
              <Text style={styles.primaryDoneBtnText}>Done</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Form Error Banner */}
      {formError && (
        <View
          style={[
            styles.errorBanner,
            {
              backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2',
              borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FCA5A5',
            }
          ]}
        >
          <AlertCircle size={18} color="#EF4444" style={{ marginRight: 8, marginTop: 1 }} />
          <Text style={[styles.errorBannerText, { color: isDark ? '#FCA5A5' : '#DC2626' }]}>
            {formError}
          </Text>
          <TouchableOpacity onPress={() => setFormError(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
      )}

      {/* User Email Input */}
      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>USER EMAIL</Text>
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#F8FAFC',
              borderColor: isSearching
                ? colors.primary
                : searchResult?.found
                ? '#10B981'
                : isDark
                ? 'rgba(255, 255, 255, 0.1)'
                : '#E2E8F0',
            }
          ]}
        >
          <View style={styles.inputIconWrapper}>
            <Search size={18} color={colors.textSecondary} />
          </View>
          <TextInput
            style={[
              styles.input,
              {
                color: colors.text,
              }
            ]}
            placeholder="name@example.com"
            placeholderTextColor={colors.textSecondary}
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setSearchPerformed(false);
              setFormError(null);
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isLoading}
          />
          {isSearching && (
            <ActivityIndicator
              size="small"
              color={colors.primary}
              style={{ marginRight: 14 }}
            />
          )}
        </View>

        {/* Search Feedback */}
        {searchPerformed && searchResult && (
          <View
            style={[
              styles.searchResult,
              {
                backgroundColor: searchResult.found
                  ? isDark
                    ? 'rgba(16, 185, 129, 0.08)'
                    : '#F0FDF4'
                  : isDark
                  ? 'rgba(239, 68, 68, 0.08)'
                  : '#FEF2F2',
                borderColor: searchResult.found ? '#10B981' : '#EF4444',
              }
            ]}
          >
            {searchResult.found && searchResult.user ? (
              <>
                <View
                  style={[
                    styles.userAvatar,
                    {
                      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#DCFCE7',
                    }
                  ]}
                >
                  <UserIcon size={18} color="#10B981" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                    {searchResult.user.name || searchResult.user.displayName || searchResult.user.email}
                  </Text>
                  <Text style={[styles.userEmail, { color: colors.textSecondary }]} numberOfLines={1}>
                    {searchResult.user.email}
                  </Text>
                </View>
                <CheckCircle2 size={20} color="#10B981" />
              </>
            ) : (
              <>
                <XCircle size={20} color="#EF4444" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={{ color: '#EF4444', fontSize: 13, fontFamily: 'SpaceGrotesk_700Bold' }}>
                    User Not Found
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular', marginTop: 1 }}>
                    {searchResult.message || 'No registered account found with this email.'}
                  </Text>
                </View>
              </>
            )}
          </View>
        )}
      </View>

      {/* Role Selection */}
      {searchResult?.found && (
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>SELECT ROLE</Text>
          <View style={styles.roleGrid}>
            {roleOptions.map((role) => {
              const isSelected = selectedRole === role.value;
              const IconComp = role.icon;
              return (
                <TouchableOpacity
                  key={role.value}
                  style={[
                    styles.roleCard,
                    {
                      backgroundColor: isSelected
                        ? isDark
                          ? 'rgba(16, 185, 129, 0.12)'
                          : '#ECFDF5'
                        : isDark
                        ? 'rgba(255, 255, 255, 0.03)'
                        : '#F8FAFC',
                      borderColor: isSelected ? '#10B981' : isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
                    }
                  ]}
                  onPress={() => setSelectedRole(role.value)}
                  disabled={isLoading}
                  activeOpacity={0.7}
                >
                  <View style={styles.roleCardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          backgroundColor: isSelected
                            ? isDark
                              ? 'rgba(16, 185, 129, 0.2)'
                              : '#D1FAE5'
                            : isDark
                            ? 'rgba(255, 255, 255, 0.06)'
                            : '#E2E8F0',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <IconComp size={15} color={isSelected ? '#10B981' : colors.textSecondary} />
                      </View>
                      <Text
                        style={[
                          styles.roleLabel,
                          {
                            color: isSelected ? '#10B981' : colors.text,
                          }
                        ]}
                      >
                        {role.label}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.roleRadio,
                        {
                          borderColor: isSelected ? '#10B981' : isDark ? '#4B5563' : '#CBD5E1',
                          backgroundColor: isSelected ? '#10B981' : 'transparent',
                        }
                      ]}
                    >
                      {isSelected && <Check size={11} color="#FFFFFF" strokeWidth={3} />}
                    </View>
                  </View>
                  <Text style={[styles.roleDescription, { color: colors.textSecondary }]}>
                    {role.description}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Submit Button */}
      <TouchableOpacity
        style={{ marginTop: 8, opacity: isLoading || !searchResult?.found ? 0.5 : 1 }}
        onPress={handleSubmit}
        disabled={isLoading || !searchResult?.found}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={['#10B981', '#059669']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.submitGradient}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>
              Add to Team
            </Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 0,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_500Medium',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    marginBottom: 6,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    height: 50,
    overflow: 'hidden',
  },
  inputIconWrapper: {
    position: 'absolute',
    left: 14,
    zIndex: 1,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_500Medium',
    paddingLeft: 42,
    paddingRight: 14,
  },
  searchResult: {
    marginTop: 10,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  userEmail: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_400Regular',
    marginTop: 1,
  },
  roleGrid: {
    gap: 10,
  },
  roleCard: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
  },
  roleCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  roleLabel: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  roleRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleDescription: {
    fontSize: 11,
    lineHeight: 15,
    fontFamily: 'SpaceGrotesk_400Regular',
    marginTop: 2,
  },
  submitGradient: {
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  // Success Screen Styles
  successContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  successIconBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontFamily: 'SpaceGrotesk_700Bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk_400Regular',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
    marginBottom: 18,
  },
  addedMemberCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 20,
  },
  avatarBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addedMemberName: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  addedMemberEmail: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_400Regular',
    marginTop: 1,
  },
  successActionsRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  secondaryBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
  primaryDoneBtn: {
    flex: 1,
    height: 48,
  },
  gradientBtn: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryDoneBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
});
