import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { UserRole, User } from '@/types';
import { useBusiness } from '@/providers/business-provider';
import { useTheme } from '@/providers/theme-provider';
import { getFontFamily } from '@/config/font-config';
import { Search, CheckCircle, XCircle, User as UserIcon, Check } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface InviteTeamMemberFormProps {
  onSuccess?: () => void;
}

const roleOptions: { label: string; value: UserRole; description: string }[] = [
  {
    label: 'Owner',
    value: 'owner',
    description: 'Full access to all features, including team management and business settings',
  },
  {
    label: 'Partner',
    value: 'partner',
    description: 'Can create and edit entries, but cannot manage team members or business settings',
  },
  {
    label: 'Viewer',
    value: 'viewer',
    description: 'Can only view data, cannot make any changes',
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

  // Search for user by email with debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (email.trim() && /^\S+@\S+\.\S+$/.test(email.trim())) {
        handleSearch();
      } else {
        setSearchResult(null);
        setSearchPerformed(false);
      }
    }, 500);

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
    try {
      const result = await searchUserByEmail(email.trim());
      if (result.success && result.user) {
        setSearchResult({ found: true, user: result.user });
      } else {
        setSearchResult({ found: false, message: result.message || 'User not found' });
      }
      setSearchPerformed(true);
    } catch (error) {
      console.error('Error searching for user:', error);
      setSearchResult({ found: false, message: 'Failed to search for user' });
      setSearchPerformed(true);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (!searchResult?.found) {
      Alert.alert('Error', 'Please search for a valid user first');
      return;
    }

    setIsLoading(true);
    try {
      const { success, message } = await inviteTeamMember(email.trim(), selectedRole);
      if (success) {
        Alert.alert('Success', `${searchResult.user?.name || email} has been added to the team`);
        setEmail('');
        setSearchResult(null);
        setSearchPerformed(false);
        onSuccess?.();
      } else {
        Alert.alert('Error', message || 'Failed to add team member');
      }
    } catch (error) {
      console.error('Error inviting team member:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentBusiness) {
    return (
      <View style={styles.container}>
        <Text>No business selected</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.formGroup, { marginBottom: 14 }]}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>USER EMAIL</Text>
        <View style={[
          styles.inputContainer,
          {
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc',
            borderColor: isSearching ? colors.primary : (isDark ? '#2C3333' : '#e2e8f0'),
            borderWidth: 1.5,
            borderRadius: 14,
            height: 48,
          }
        ]}>
          <View style={styles.inputIconWrapper}>
            <Search size={18} color={colors.textSecondary} />
          </View>
          <TextInput
            style={[
              styles.input,
              {
                color: colors.text,
                paddingLeft: 40,
                fontSize: 14,
              }
            ]}
            placeholder="Search by email..."
            placeholderTextColor={colors.textSecondary}
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setSearchPerformed(false);
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!isLoading}
          />
          {isSearching && (
            <ActivityIndicator
              size="small"
              color={colors.primary}
              style={{ marginRight: 16 }}
            />
          )}
        </View>
        {/* Search Result */}
        {searchPerformed && searchResult && (
          <View style={[
            styles.searchResult,
            {
              backgroundColor: searchResult.found ? (isDark ? 'rgba(16, 185, 129, 0.05)' : '#f0fdf4') : (isDark ? 'rgba(239, 68, 68, 0.05)' : '#fef2f2'),
              borderColor: searchResult.found ? colors.success : colors.error,
              borderRadius: 16,
              padding: 12,
              borderWidth: 1,
              marginTop: 12,
              flexDirection: 'row',
              alignItems: 'center',
            }
          ]}>
            {searchResult.found && searchResult.user ? (
              <>
                <View style={[styles.userAvatar, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#dcfce7', width: 40, height: 40, borderRadius: 12 }]}>
                  <UserIcon size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.userName, { color: colors.text, fontSize: 15, fontWeight: '700' }]} numberOfLines={1}>
                    {searchResult.user.name || searchResult.user.displayName}
                  </Text>
                  <Text style={[styles.userEmail, { color: colors.textSecondary, fontSize: 13 }]} numberOfLines={1}>
                    {searchResult.user.email}
                  </Text>
                </View>
                <CheckCircle size={20} color={colors.success} />
              </>
            ) : (
              <>
                <XCircle size={20} color={colors.error} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ color: colors.error, fontSize: 14, fontWeight: '600' }}>User Not Found</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }} numberOfLines={1}>
                    {searchResult.message || 'Email not registered'}
                  </Text>
                </View>
              </>
            )}
          </View>
        )}
      </View>

      {searchResult?.found && (
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.textSecondary, marginTop: 4 }]}>ASSIGN ROLE</Text>
          <View style={styles.roleGrid}>
            {roleOptions.map((role) => (
              <TouchableOpacity
                key={role.value}
                style={[
                  styles.roleCard,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc',
                    borderColor: selectedRole === role.value ? colors.primary : (isDark ? '#2C3333' : '#e2e8f0'),
                  },
                  selectedRole === role.value && { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#f0fdf4' }
                ]}
                onPress={() => setSelectedRole(role.value)}
                disabled={isLoading}
              >
                <View style={styles.roleCardHeader}>
                  <Text style={[styles.roleLabel, { color: selectedRole === role.value ? colors.primary : colors.text }]}>
                    {role.label}
                  </Text>
                  <View style={[
                    styles.roleRadio,
                    {
                      borderColor: selectedRole === role.value ? colors.primary : colors.textSecondary,
                      backgroundColor: selectedRole === role.value ? colors.primary : 'transparent',
                    }
                  ]}>
                    {selectedRole === role.value && <Check size={12} color="#fff" />}
                  </View>
                </View>
                <Text style={[styles.roleDescription, { color: colors.textSecondary }]}>
                  {role.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <TouchableOpacity
        style={{ marginTop: 12, opacity: (isLoading || !searchResult?.found) ? 0.5 : 1 }}
        onPress={handleSubmit}
        disabled={isLoading || !searchResult?.found}
      >
        <LinearGradient
          colors={['#10b981', '#059669']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 14, padding: 15, alignItems: 'center', justifyContent: 'center' }}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={[styles.submitButtonText, { color: '#fff', fontSize: 16, fontWeight: '700' }]}>
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
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 6,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  inputIconWrapper: {
    position: 'absolute',
    left: 16,
    zIndex: 1,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 15,
  },
  searchResult: {
    marginTop: 12,
  },
  userAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
  },
  userEmail: {
    marginTop: 1,
  },
  roleGrid: {
    gap: 10,
  },
  roleCard: {
    borderRadius: 12,
    padding: 10,
    borderWidth: 1.5,
  },
  roleCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: '700',
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
    lineHeight: 14,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
