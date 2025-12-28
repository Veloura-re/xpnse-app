import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    Modal,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    TouchableWithoutFeedback,
    Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Users, Search, Plus, X, Trash2, ChevronDown, User, Bell, FileText } from 'lucide-react-native';
import { useBusiness } from '@/providers/business-provider';
import { useAuth } from '@/providers/auth-provider';
import { UserRole } from '@/types';
import { RoleBadge } from '@/components/role-badge';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import { getFontFamily } from '@/config/font-config';
import { useTheme } from '@/providers/theme-provider';
import InviteTeamMemberForm from '@/src/components/team/InviteTeamMemberForm';
import { router } from 'expo-router';

export default function TeamManagementScreen() {
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const { currentBusiness, getUserRole, inviteTeamMember, searchUserByEmail, updateTeamMemberRole, removeTeamMember, getTeamMembers } = useBusiness();
    const { deviceFont, colors, theme, isDark } = useTheme();
    const userRole = getUserRole();

    // Search state
    const [searchQuery, setSearchQuery] = useState('');

    // Invite modal state
    const [showInviteModal, setShowInviteModal] = useState(false);

    // Expanded member for role editing
    const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);

    const members = getTeamMembers();

    const filteredMembers = useMemo(() => {
        if (!searchQuery.trim()) return members;
        const query = searchQuery.toLowerCase();
        return members.filter(member =>
            member.user.name?.toLowerCase().includes(query) ||
            member.user.email?.toLowerCase().includes(query) ||
            member.user.displayName?.toLowerCase().includes(query)
        );
    }, [members, searchQuery]);



    const handleChangeRole = async (memberId: string, newRole: UserRole) => {
        const { success, message } = await updateTeamMemberRole(memberId, newRole);
        if (!success) {
            Alert.alert('Error', message);
        } else {
            setExpandedMemberId(null);
        }
    };

    const handleRemoveMember = (memberId: string, memberName: string) => {
        const isSelf = user?.uid === memberId;
        const title = isSelf ? 'Leave Team' : 'Remove Team Member';
        const message = isSelf
            ? 'Are you sure you want to leave this team?'
            : `Are you sure you want to remove ${memberName} from the team?`;
        const actionText = isSelf ? 'Leave' : 'Remove';


        Alert.alert(
            title,
            message,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: actionText,
                    style: 'destructive',
                    onPress: async () => {
                        const result = await removeTeamMember(memberId);
                        if (!result.success) {
                            Alert.alert('Error', result.message || 'Failed to remove member');
                        }
                    },
                },
            ]
        );
    };

    const renderMember = ({ item }: { item: typeof members[0] }) => {
        const isExpanded = expandedMemberId === item.id;
        const canEdit = userRole === 'owner' && item.role !== 'owner';
        const isCurrentUser = user?.uid === item.userId;
        const canLeave = isCurrentUser && item.role !== 'owner';

        return (
            <View style={[styles.memberCard, { backgroundColor: colors.card, borderColor: colors.border }, isExpanded && [styles.memberCardExpanded, { borderColor: colors.primary }]]}>
                <TouchableOpacity
                    style={styles.memberHeader}
                    onPress={() => (canEdit || canLeave) && setExpandedMemberId(isExpanded ? null : item.id)}
                    activeOpacity={(canEdit || canLeave) ? 0.7 : 1}
                >
                    <View style={styles.memberInfo}>
                        <View style={[styles.avatar, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#f0fdf4' }]}>
                            <User size={24} color={colors.primary} />
                        </View>
                        <View style={styles.memberDetails}>
                            <Text style={[styles.memberName, { color: colors.text }]}>{item.user.name || item.user.displayName}</Text>
                            <Text style={[styles.memberEmail, { color: colors.textSecondary }]}>{item.user.email}</Text>
                        </View>
                    </View>
                    <View style={styles.memberActions}>
                        <RoleBadge role={item.role} size="small" />
                        {(canEdit || canLeave) && (
                            <ChevronDown
                                size={20}
                                color="#9ca3af"
                                style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }], marginLeft: 8 }}
                            />
                        )}
                    </View>
                </TouchableOpacity>

                {isExpanded && canEdit && (
                    <View style={[styles.expandedContent, { backgroundColor: theme === 'dark' ? '#1a1a1a' : '#f8fafc', borderTopColor: colors.border }]}>
                        <Text style={[styles.expandedTitle, { color: colors.textSecondary }]}>Change Role</Text>
                        <View style={styles.roleOptions}>
                            {(['partner', 'viewer'] as UserRole[]).map((role) => (
                                <TouchableOpacity
                                    key={role}
                                    style={[
                                        styles.roleOption,
                                        { backgroundColor: colors.surface, borderColor: colors.border },
                                        item.role === role && [styles.roleOptionSelected, { backgroundColor: theme === 'dark' ? 'rgba(33, 201, 141, 0.1)' : '#eff6ff', borderColor: colors.primary }],
                                    ]}
                                    onPress={() => handleChangeRole(item.userId, role)}
                                >
                                    <Text style={[
                                        styles.roleOptionText,
                                        { color: colors.textSecondary },
                                        item.role === role && [styles.roleOptionTextSelected, { color: colors.primary }],
                                    ]}>
                                        {role === 'partner' ? 'Partner' : 'Viewer'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity
                            style={styles.removeButton}
                            onPress={() => handleRemoveMember(item.userId, item.user.name || item.user.email)}
                        >
                            <Trash2 size={16} color="#ef4444" />
                            <Text style={styles.removeButtonText}>Remove from Team</Text>
                        </TouchableOpacity>
                    </View>
                )}
                {isExpanded && canLeave && !canEdit && (
                    <View style={styles.expandedContent}>
                        <TouchableOpacity
                            style={styles.removeButton}
                            onPress={() => handleRemoveMember(item.userId, item.user.name || item.user.email)}
                        >
                            <Trash2 size={16} color="#ef4444" />
                            <Text style={styles.removeButtonText}>Leave Team</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    if (!currentBusiness) {
        return (
            <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
                {/* Decorative Circles */}
                <View style={[styles.circle1, { backgroundColor: isDark ? 'rgba(33, 201, 141, 0.05)' : 'rgba(16, 185, 129, 0.1)' }]} />
                <View style={[styles.circle2, { backgroundColor: isDark ? 'rgba(33, 201, 141, 0.03)' : 'rgba(16, 185, 129, 0.08)' }]} />
                <View style={styles.emptyContainer}>
                    <Users size={64} color={colors.textSecondary} />
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>No Business Selected</Text>
                    <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
                        Please select a business to manage team members
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
            {/* Decorative Circles */}
            <View style={[styles.circle1, { backgroundColor: isDark ? 'rgba(33, 201, 141, 0.05)' : 'rgba(16, 185, 129, 0.1)' }]} />
            <View style={[styles.circle2, { backgroundColor: isDark ? 'rgba(33, 201, 141, 0.03)' : 'rgba(16, 185, 129, 0.08)' }]} />

            {/* Header */}
            <Animated.View entering={FadeIn.delay(100).duration(200)} style={styles.headerContainer}>
                <View style={styles.headerTopRow}>
                    <Text style={[styles.appName, { color: colors.primary }]}>Collaboration</Text>
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
                <Text style={[styles.headerTitle, { fontFamily: getFontFamily(deviceFont), color: colors.text }]}>Team</Text>
                <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                    {currentBusiness.name} · {members.length} {members.length === 1 ? 'member' : 'members'}
                </Text>
            </Animated.View>

            <Animated.View entering={FadeIn.delay(200).duration(200)} style={{ flex: 1 }}>
                {/* Search Bar */}
                <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Search size={20} color={colors.textSecondary} />
                    <TextInput
                        style={[styles.searchInput, { color: colors.text }]}
                        placeholder="Search team members..."
                        placeholderTextColor={colors.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <X size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Team Members List */}
                <FlatList
                    data={filteredMembers}
                    renderItem={renderMember}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContainer}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={[styles.emptyTitle, { color: colors.text }]}>
                                {searchQuery ? 'No members found' : 'No team members yet'}
                            </Text>
                            <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
                                {searchQuery
                                    ? `No members match "${searchQuery}"`
                                    : 'Invite team members to collaborate on this business'}
                            </Text>
                        </View>
                    }
                />
            </Animated.View>

            {/* Floating Action Button */}
            {(userRole === 'owner' || userRole === 'partner') && (
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => setShowInviteModal(true)}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={['#10b981', '#059669']}
                        style={styles.fabGradient}
                    />
                    <Plus size={24} color="white" style={{ zIndex: 1 }} />
                </TouchableOpacity>
            )}

            {/* Invite Modal - Compact Design */}
            <Modal
                visible={showInviteModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowInviteModal(false)}
                statusBarTranslucent={true}
            >
                <View style={[styles.modalOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.4)' }]}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 20}
                        style={{ width: '100%', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                            <View style={{ width: '100%', maxWidth: 420, padding: 20 }}>
                                <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                                    <Animated.View
                                        entering={FadeIn.duration(200)}
                                        style={[
                                            styles.inviteModalContent,
                                            {
                                                backgroundColor: isDark ? '#0A0A0A' : '#ffffff',
                                                borderColor: isDark ? '#2C3333' : '#e2e8f0',
                                                borderWidth: 1,
                                                padding: 16,
                                            }
                                        ]}
                                    >
                                        <View style={styles.modalHeader}>
                                            <View>
                                                <Text style={[styles.modalTitle, { color: colors.text, fontFamily: getFontFamily(deviceFont) }]}>
                                                    Invite Member
                                                </Text>
                                                <View style={[styles.headerUnderline, { backgroundColor: colors.primary }]} />
                                            </View>
                                            <TouchableOpacity
                                                onPress={() => setShowInviteModal(false)}
                                                style={[styles.closeButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }]}
                                            >
                                                <X size={20} color={colors.textSecondary} />
                                            </TouchableOpacity>
                                        </View>

                                        <ScrollView
                                            contentContainerStyle={{ paddingVertical: 8 }}
                                            keyboardShouldPersistTaps="handled"
                                            showsVerticalScrollIndicator={false}
                                        >
                                            <InviteTeamMemberForm
                                                onSuccess={() => setShowInviteModal(false)}
                                            />
                                        </ScrollView>
                                    </Animated.View>
                                </TouchableWithoutFeedback>
                            </View>
                        </TouchableWithoutFeedback>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
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
        backgroundColor: 'rgba(5, 150, 105, 0.08)',
    },
    headerContainer: {
        paddingHorizontal: 24,
        paddingTop: 20,
        marginBottom: 24,
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
        color: '#10b981',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginBottom: 8,
    },
    headerTitle: {
        fontFamily: 'AbrilFatface_400Regular',
        fontSize: 36,
        color: '#0f172a',
        marginBottom: 8,
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#64748b',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        marginHorizontal: 16,
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 44,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#0f172a',
        marginLeft: 12,
    },
    listContainer: {
        paddingHorizontal: 16,
        paddingBottom: 100,
    },
    memberCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
        overflow: 'hidden',
    },
    memberCardExpanded: {
        borderColor: '#10b981',
    },
    memberHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 10,
    },
    memberInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    memberDetails: {
        flex: 1,
    },
    memberName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: 1,
    },
    memberEmail: {
        fontSize: 12,
        color: '#64748b',
    },
    memberActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    expandedContent: {
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        padding: 20,
        backgroundColor: '#f8fafc',
    },
    expandedTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#64748b',
        marginBottom: 16,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    roleOptions: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    roleOption: {
        flex: 1,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    roleOptionSelected: {
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderColor: '#10b981',
        borderWidth: 2,
    },
    roleOptionText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#64748b',
    },
    roleOptionTextSelected: {
        color: '#10b981',
        fontWeight: '700',
    },
    removeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: 'rgba(239, 68, 68, 0.08)',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.2)',
        gap: 10,
    },
    removeButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#ef4444',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#0f172a',
        marginTop: 24,
        marginBottom: 8,
    },
    emptyDescription: {
        fontSize: 16,
        color: '#64748b',
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: 20,
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 20,
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    fabGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 30,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    inviteModalContent: {
        borderRadius: 24,
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.4,
        shadowRadius: 30,
        elevation: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    headerUnderline: {
        height: 3,
        width: 40,
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
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(16, 185, 129, 0.05)',
        padding: 16,
        borderRadius: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.2)',
    },
    infoIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    infoText: {
        flex: 1,
        fontSize: 14,
        color: '#059669',
        lineHeight: 20,
    },
    emailInputRow: {
        flexDirection: 'row',
        gap: 12,
    },
    emailInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: '#0f172a',
        backgroundColor: '#f8fafc',
    },
    inviteDescription: {
        fontSize: 16,
        color: '#64748b',
        marginBottom: 32,
        lineHeight: 24,
    },
    formGroup: {
        marginBottom: 24,
    },
    label: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: 12,
    },
    input: {
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: '#0f172a',
        backgroundColor: '#f8fafc',
    },
    searchButtonWrapper: {
        borderRadius: 12,
        overflow: 'hidden',
        width: 52,
        height: 52,
    },
    searchButton: {
        width: 52,
        height: 52,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
    userFoundCard: {
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.2)',
    },
    userFoundHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    userAvatar: {
        width: 56,
        height: 56,
        borderRadius: 18,
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    userFoundName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: 4,
    },
    userFoundEmail: {
        fontSize: 15,
        color: '#64748b',
    },
    userFoundBadge: {
        backgroundColor: '#10b981',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    userFoundBadgeText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
    },
    roleOptionsContainer: {
        gap: 12,
    },
    roleCard: {
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 16,
        padding: 16,
        backgroundColor: '#fff',
    },
    roleCardSelected: {
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 2,
    },
    roleCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    roleCardIcon: {
        fontSize: 20,
        marginRight: 12,
    },
    radioCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#d1d5db',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    radioSelected: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#10b981',
    },
    checkCircle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#10b981',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 'auto',
    },
    roleCardLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
    },
    roleCardLabelSelected: {
        color: '#10b981',
    },
    roleCardDescription: {
        fontSize: 14,
        color: '#64748b',
        marginLeft: 32,
    },
    sendInviteButtonWrapper: {
        borderRadius: 12,
        overflow: 'hidden',
        marginTop: 8,
    },
    sendInviteButton: {
        flexDirection: 'row',
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendInviteButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    userNotFoundCard: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.2)',
    },
    userNotFoundIcon: {
        fontSize: 40,
        marginBottom: 16,
    },
    userNotFoundTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#b91c1c',
        marginBottom: 8,
    },
    userNotFoundText: {
        fontSize: 15,
        color: '#dc2626',
        textAlign: 'center',
        lineHeight: 22,
    },
    inviteSentCard: {
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderRadius: 20,
        padding: 40,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.2)',
    },
    inviteSentIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    inviteSentIcon: {
        fontSize: 48,
    },
    inviteSentTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#10b981',
        marginBottom: 8,
    },
    inviteSentText: {
        fontSize: 16,
        color: '#047857',
        textAlign: 'center',
    },
});
