import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { UserRole } from '@/types';
import { useBusiness } from '@/providers/business-provider';
import { User, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useTheme } from '@/providers/theme-provider';

interface RoleOption {
  label: string;
  value: UserRole;
  color: string;
}

export default function TeamMemberList() {
  const { currentBusiness, currentUserRole, updateTeamMemberRole, removeTeamMember } = useBusiness();
  const { colors } = useTheme();
  const [expandedMember, setExpandedMember] = useState<string | null>(null);

  if (!currentBusiness) {
    return (
      <View style={styles.container}>
        <Text>No business selected</Text>
      </View>
    );
  }

  const canEdit = currentUserRole === 'owner';
  const members = currentBusiness.members || [];

  const roleOptions: RoleOption[] = [
    { label: 'Owner', value: 'owner', color: '#f59e0b' },
    { label: 'Partner', value: 'partner', color: '#10b981' },
    { label: 'Viewer', value: 'viewer', color: '#6b7280' },
  ];

  const handleRoleChange = async (memberId: string, newRole: UserRole) => {
    const { success, message } = await updateTeamMemberRole(memberId, newRole);
    if (!success) {
      Alert.alert('Error', message);
    }
    setExpandedMember(null);
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    Alert.alert(
      'Remove Team Member',
      `Are you sure you want to remove ${memberName} from the team?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const { success, message } = await removeTeamMember(memberId);
            if (!success) {
              Alert.alert('Error', message);
            }
          },
        },
      ]
    );
  };

  const renderRoleBadge = (role: UserRole) => {
    const roleOption = roleOptions.find(r => r.value === role);
    return (
      <View style={[styles.roleBadge, { backgroundColor: `${roleOption?.color}20` }]}>
        <Text style={[styles.roleText, { color: roleOption?.color }]}>
          {roleOption?.label || role}
        </Text>
      </View>
    );
  };

  const renderMember = ({ item: member }: { item: typeof members[0] }) => {
    const isExpanded = expandedMember === member.id;
    const canEditThisMember = canEdit && member.role !== 'owner';

    return (
      <View style={[styles.memberCard, { backgroundColor: colors.card }]}>
        <TouchableOpacity
          style={styles.memberHeader}
          onPress={() => setExpandedMember(isExpanded ? null : member.id)}
          activeOpacity={0.7}
        >
          <View style={styles.memberInfo}>
            <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
              <User size={20} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.memberName, { color: colors.text }]}>{member.user.name}</Text>
              <Text style={[styles.memberEmail, { color: colors.textSecondary }]}>{member.user.email}</Text>
            </View>
          </View>
          <View style={styles.memberActions}>
            {renderRoleBadge(member.role)}
            {canEditThisMember && (
              isExpanded ? (
                <ChevronUp size={20} color={colors.textSecondary} />
              ) : (
                <ChevronDown size={20} color={colors.textSecondary} />
              )
            )}
          </View>
        </TouchableOpacity>

        {isExpanded && canEditThisMember && (
          <View style={styles.expandedContent}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Change Role</Text>
            <View style={styles.roleOptions}>
              {roleOptions
                .filter(role => role.value !== 'owner' || member.role === 'owner')
                .map((role) => (
                  <TouchableOpacity
                    key={role.value}
                    style={[
                      styles.roleOption,
                      member.role === role.value && styles.roleOptionSelected,
                      { borderColor: colors.border }
                    ]}
                    onPress={() => handleRoleChange(member.userId, role.value)}
                  >
                    <Text style={[styles.roleOptionText, { color: colors.text }]}>
                      {role.label}
                    </Text>
                  </TouchableOpacity>
                ))}
            </View>

            <TouchableOpacity
              style={[styles.removeButton, { borderColor: colors.error }]}
              onPress={() => handleRemoveMember(member.id, member.user?.name || 'Member')}
            >
              <Text style={[styles.removeButtonText, { color: colors.error }]}>
                Remove from Team
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        renderItem={renderMember}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No team members found
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  listContent: {
    paddingBottom: 24,
  },
  memberCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 14,
    opacity: 0.7,
  },
  memberActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  expandedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  roleOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 8,
  },
  roleOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  roleOptionSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: '#10b981',
  },
  roleOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  removeButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  removeButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
});
