import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { UserRole } from '@/types';
import { useBusiness } from '@/providers/business-provider';
import { User, Trash2 } from 'lucide-react-native';
import { useTheme } from '@/providers/theme-provider';
import { RoleBadge } from '@/components/role-badge';

export default function TeamMemberList() {
  const { currentBusiness, currentUserRole, removeTeamMember } = useBusiness();
  const { colors, isDark } = useTheme();

  if (!currentBusiness) {
    return (
      <View style={styles.container}>
        <Text style={{ color: colors.textSecondary, fontFamily: 'SpaceGrotesk_500Medium' }}>
          No business selected
        </Text>
      </View>
    );
  }

  const canEdit = currentUserRole === 'owner';
  const members = currentBusiness.members || [];

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
              Alert.alert('Error', message || 'Failed to remove member');
            }
          },
        },
      ]
    );
  };

  const renderMember = ({ item: member }: { item: typeof members[0] }) => {
    const canEditThisMember = canEdit && member.role !== 'owner';

    return (
      <View
        style={[
          styles.memberCard,
          {
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
          }
        ]}
      >
        <View style={styles.memberHeader}>
          <View style={styles.memberInfo}>
            <View style={[styles.avatar, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#DCFCE7' }]}>
              <User size={20} color="#10B981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.memberName, { color: colors.text }]}>
                {member.user.name || member.user.displayName || member.user.email}
              </Text>
              <Text style={[styles.memberEmail, { color: colors.textSecondary }]}>
                {member.user.email}
              </Text>
            </View>
          </View>
          <View style={styles.memberActions}>
            <RoleBadge role={member.role} size="small" />
            {canEditThisMember && (
              <TouchableOpacity
                style={[
                  styles.removeActionBtn,
                  {
                    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEE2E2',
                    borderColor: isDark ? 'rgba(239, 68, 68, 0.25)' : '#FECACA',
                  }
                ]}
                onPress={() => handleRemoveMember(member.id, member.user?.name || member.user?.displayName || member.user?.email || 'Member')}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Trash2 size={15} color="#EF4444" />
              </TouchableOpacity>
            )}
          </View>
        </View>
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
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
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
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberName: {
    fontSize: 15,
    fontFamily: 'SpaceGrotesk_700Bold',
    marginBottom: 1,
  },
  memberEmail: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  memberActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  removeActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    fontFamily: 'SpaceGrotesk_500Medium',
  },
});
