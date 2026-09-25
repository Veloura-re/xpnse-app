import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Mail, Check, X as XIcon, Building2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/providers/theme-provider';
import { useBusiness } from '@/providers/business-provider';
import { BackgroundDecor } from '@/components/ui/background-decor';
import { BusinessInvitation } from '@/types';

export default function InvitationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { invitations, acceptInvitation, declineInvitation } = useBusiness();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleAccept = async (id: string) => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (e) {}
    }
    setProcessingId(id);
    const result = await acceptInvitation(id);
    setProcessingId(null);

    if (result.success) {
      if (Platform.OS !== 'web') {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (e) {}
      }
      Alert.alert('Success', result.message, [
        { text: 'OK', onPress: () => router.push('/(tabs)') }
      ]);
    } else {
      Alert.alert('Error', result.message);
    }
  };

  const handleDecline = (id: string) => {
    Alert.alert(
      'Decline Invitation',
      'Are you sure you want to decline this invitation?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Decline', 
          style: 'destructive',
          onPress: async () => {
            setProcessingId(id);
            const result = await declineInvitation(id);
            setProcessingId(null);
            if (!result.success) {
              Alert.alert('Error', result.message);
            }
          }
        }
      ]
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconContainer, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.1)' : '#EEF2FF' }]}>
        <Mail size={48} color="#6366f1" />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No Pending Invitations</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        When someone invites you to join their team, it will appear here.
      </Text>
      <TouchableOpacity 
        style={[styles.emptyButton, { backgroundColor: colors.primary }]}
        onPress={() => router.back()}
        activeOpacity={0.8}
      >
        <Text style={styles.emptyButtonText}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <BackgroundDecor />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Invitations</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {invitations.length === 0 ? (
          <EmptyState />
        ) : (
          <View style={styles.list}>
            {invitations.map((invite: BusinessInvitation) => (
              <View 
                key={invite.id} 
                style={[
                  styles.card, 
                  { 
                    backgroundColor: isDark ? 'rgba(30, 30, 30, 0.6)' : 'rgba(255, 255, 255, 0.8)',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                  }
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.businessIconContainer, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : '#e0e7ff' }]}>
                    <Building2 size={24} color="#6366f1" />
                  </View>
                  <View style={styles.businessInfo}>
                    <Text style={[styles.businessName, { color: colors.text }]} numberOfLines={1}>
                      {invite.businessName}
                    </Text>
                    <Text style={[styles.inviterName, { color: colors.textSecondary }]} numberOfLines={1}>
                      Invited by {invite.invitedByUserName}
                    </Text>
                  </View>
                </View>
                
                <View style={[styles.roleContainer, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#d1fae5' }]}>
                  <Text style={[styles.roleText, { color: isDark ? '#34d399' : '#059669' }]}>
                    Role: {invite.role.charAt(0).toUpperCase() + invite.role.slice(1)}
                  </Text>
                </View>

                <View style={styles.actions}>
                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.declineBtn, { borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#fecaca', backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2' }]}
                    onPress={() => handleDecline(invite.id)}
                    disabled={processingId !== null}
                    activeOpacity={0.7}
                  >
                    <XIcon size={18} color="#ef4444" />
                    <Text style={[styles.actionText, { color: '#ef4444' }]}>Decline</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.acceptBtn, { backgroundColor: colors.primary }]}
                    onPress={() => handleAccept(invite.id)}
                    disabled={processingId !== null}
                    activeOpacity={0.8}
                  >
                    {processingId === invite.id ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <Check size={18} color="#ffffff" />
                        <Text style={[styles.actionText, { color: '#ffffff' }]}>Accept</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.1)',
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  content: {
    flexGrow: 1,
    padding: 20,
  },
  list: {
    gap: 16,
  },
  card: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  businessIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  businessInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk_700Bold',
    marginBottom: 4,
  },
  inviterName: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  roleContainer: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 24,
  },
  roleText: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 0.5,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  declineBtn: {
    borderWidth: 1,
  },
  acceptBtn: {
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  actionText: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontFamily: 'SpaceGrotesk_700Bold',
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk_400Regular',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    maxWidth: '80%',
  },
  emptyButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 100,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'SpaceGrotesk_700Bold',
  }
});
