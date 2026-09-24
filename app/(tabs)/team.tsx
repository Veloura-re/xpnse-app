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
import { Users, Search, Plus, X, Trash2, ChevronDown, User, Bell, FileText, Settings, Sun, Moon } from 'lucide-react-native';
import { useBusiness } from '@/providers/business-provider';
import { useAuth } from '@/providers/auth-provider';
import { UserRole } from '@/types';
import { RoleBadge } from '@/components/role-badge';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassBackdrop } from '@/components/ui/glass-backdrop';

import { getFontFamily } from '@/config/font-config';
import { useTheme } from '@/providers/theme-provider';
import InviteTeamMemberForm from '@/src/components/team/InviteTeamMemberForm';
import { router } from 'expo-router';
import { BackgroundDecor } from '@/components/ui/background-decor';
import * as Haptics from 'expo-haptics';

export default function TeamManagementScreen() {
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const { currentBusiness, getUserRole, inviteTeamMember, searchUserByEmail, updateTeamMemberRole, removeTeamMember, getTeamMembers } = useBusiness();
    const { deviceFont, colors, theme, isDark, setTheme } = useTheme();
    const userRole = getUserRole();

    // Search state
    const [searchQuery, setSearchQuery] = useState('');

    // Invite modal state
    const [showInviteModal, setShowInviteModal] = useState(false);

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

    // Leave / Remove confirmation modal state
    const [confirmModalVisible, setConfirmModalVisible] = useState(false);
    const [targetMember, setTargetMember] = useState<{ id: string; name: string; isSelf: boolean } | null>(null);
    const [confirmInput, setConfirmInput] = useState('');
    const [isExecutingAction, setIsExecutingAction] = useState(false);
    const [isInputFocused, setIsInputFocused] = useState(false);

    const handleOpenConfirmModal = (memberId: string, memberName: string) => {
        const currentUserId = user?.uid || user?.id;
        const isSelf = currentUserId === memberId;
        if (Platform.OS !== 'web') {
            try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } catch (e) {}
        }
        setTargetMember({ id: memberId, name: memberName, isSelf });
        setConfirmInput('');
        setConfirmModalVisible(true);
    };

    const handleConfirmLeaveOrRemove = async () => {
        if (!targetMember) return;
        const expectedWord = targetMember.isSelf ? 'LEAVE' : 'REMOVE';
        if (confirmInput.trim().toUpperCase() !== expectedWord) return;

        if (Platform.OS !== 'web') {
            try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            } catch (e) {}
        }

        try {
            setIsExecutingAction(true);
            const result = await removeTeamMember(targetMember.id);
            if (!result.success) {
                Alert.alert('Error', result.message || 'Failed to complete action');
            } else {
                if (Platform.OS !== 'web') {
                    try {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    } catch (e) {}
                }
                setConfirmModalVisible(false);
                if (targetMember.isSelf) {
                    router.replace('/(tabs)');
                }
            }
        } catch (error: any) {
            Alert.alert('Error', error?.message || 'Failed to complete action');
        } finally {
            setIsExecutingAction(false);
        }
    };

    const renderMember = ({ item }: { item: typeof members[0] }) => {
        const canRemove = userRole === 'owner' && item.role !== 'owner';
        const isCurrentUser = user?.uid === item.userId || user?.id === item.userId;
        const canLeave = isCurrentUser && item.role !== 'owner';

        return (
            <View style={[styles.memberCard, { backgroundColor: colors.cardGlass, borderColor: colors.borderGlass }]}>
                <View style={styles.memberHeader}>
                    <View style={styles.memberInfo}>
                        <View style={[styles.avatar, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#f0fdf4' }]}>
                            <User size={22} color={colors.primary} />
                        </View>
                        <View style={styles.memberDetails}>
                            <Text style={[styles.memberName, { color: colors.text, fontFamily: 'SpaceGrotesk_700Bold' }]}>
                                {item.user.name || item.user.displayName || item.user.email}
                            </Text>
                            <Text style={[styles.memberEmail, { color: colors.textSecondary, fontFamily: 'SpaceGrotesk_400Regular' }]}>
                                {item.user.email}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.memberActions}>
                        <RoleBadge role={item.role} size="small" />
                        {canRemove && (
                            <TouchableOpacity
                                style={[
                                    styles.actionDeleteBtn,
                                    {
                                        backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEE2E2',
                                        borderColor: isDark ? 'rgba(239, 68, 68, 0.25)' : '#FECACA',
                                    }
                                ]}
                                onPress={() => handleOpenConfirmModal(item.userId, item.user.name || item.user.displayName || item.user.email)}
                                activeOpacity={0.7}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <Trash2 size={15} color="#EF4444" />
                            </TouchableOpacity>
                        )}
                        {canLeave && (
                            <TouchableOpacity
                                style={[
                                    styles.leavePillBtn,
                                    {
                                        backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEE2E2',
                                        borderColor: isDark ? 'rgba(239, 68, 68, 0.25)' : '#FECACA',
                                    }
                                ]}
                                onPress={() => handleOpenConfirmModal(item.userId, item.user.name || item.user.displayName || item.user.email)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.leavePillBtnText}>
                                    Leave
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
        );
    };

    if (!currentBusiness) {
        return (
            <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
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
            <BackgroundDecor />
            {/* Header */}
            <View style={styles.headerContainer}>
                <View style={styles.headerTopRow}>
                    <Text style={[styles.appName, { color: colors.primary, fontFamily: 'SpaceGrotesk_700Bold' }]}>spndy</Text>
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

                        {(userRole === 'owner' || userRole === 'partner') && (
                            <TouchableOpacity
                                style={[styles.notificationButton, { backgroundColor: colors.surfaceGlass, borderColor: colors.borderGlass }]}
                                onPress={() => router.push('/business-settings')}
                                activeOpacity={0.7}
                            >
                                <Settings size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={[styles.notificationButton, { backgroundColor: colors.surfaceGlass, borderColor: colors.borderGlass }]}
                            onPress={() => router.push('/notes')}
                            activeOpacity={0.7}
                        >
                            <FileText size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>
                <Text style={[styles.headerTitle, { fontFamily: 'SpaceGrotesk_700Bold', color: colors.text }]}>Team</Text>
                <Text style={[styles.headerSubtitle, { color: colors.textSecondary, fontFamily: 'SpaceGrotesk_600SemiBold' }]}>
                    {currentBusiness.name} · {members.length} {members.length === 1 ? 'member' : 'members'}
                </Text>
            </View>

            <View style={{ flex: 1 }}>
                {/* Search Bar */}
                <View style={[styles.searchContainer, { backgroundColor: colors.surfaceGlass, borderColor: colors.borderGlass }]}>
                    <Search size={18} color={colors.textSecondary} />
                    <TextInput
                        style={[styles.searchInput, { color: colors.text, fontFamily: 'SpaceGrotesk_600SemiBold' }]}
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
                    removeClippedSubviews={Platform.OS === 'android'}
                    initialNumToRender={10}
                    maxToRenderPerBatch={10}
                    windowSize={5}
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
            </View>

            {/* Floating Action Button */}
            {(userRole === 'owner' || userRole === 'partner') && (
                <TouchableOpacity
                    style={[styles.fab, { bottom: insets.bottom + 110 }]}
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
                <View style={styles.modalOverlay}>
                    <GlassBackdrop isDark={isDark} onPress={() => setShowInviteModal(false)} />
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 20}
                        style={{ width: '100%', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                            <View style={{ width: '100%', maxWidth: 420, padding: 20 }}>
                                <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                                    <View
                                        style={[
                                            styles.inviteModalContent,
                                            {
                                                backgroundColor: colors.surfaceGlass,
                                                borderColor: colors.borderGlass,
                                                borderWidth: 1,
                                                borderRadius: 28,
                                                padding: 20,
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
                                        <View style={styles.modalHeader}>
                                            <View>
                                                <Text style={[styles.modalTitle, { color: colors.text, fontFamily: 'SpaceGrotesk_700Bold' }]}>
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
                                    </View>
                                </TouchableWithoutFeedback>
                            </View>
                        </TouchableWithoutFeedback>
                    </KeyboardAvoidingView>
                </View>
            </Modal>

            {/* Typed Leave / Remove Confirmation Modal */}
            <Modal
                visible={confirmModalVisible}
                transparent
                animationType={Platform.OS === 'web' ? 'none' : 'fade'}
                onRequestClose={() => setConfirmModalVisible(false)}
            >
                <View style={styles.confirmBackdrop}>
                    <GlassBackdrop isDark={isDark} onPress={() => setConfirmModalVisible(false)} />
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        style={{ width: '100%', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <TouchableWithoutFeedback>
                            <View
                                style={[
                                    styles.confirmCard,
                                    {
                                        backgroundColor: isDark ? '#141416' : '#FFFFFF',
                                        borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
                                    },
                                ]}
                            >
                                <View style={styles.confirmIconCircle}>
                                    <Trash2 size={24} color="#EF4444" />
                                </View>

                                <Text style={[styles.confirmTitle, { color: colors.text }]}>
                                    {targetMember?.isSelf ? 'Leave Team' : 'Remove Team Member'}
                                </Text>

                                <Text style={[styles.confirmSubtitle, { color: colors.textSecondary }]}>
                                    {targetMember?.isSelf
                                        ? `Are you sure you want to leave ${currentBusiness.name}? You will immediately lose access to all its books, transactions, and settings.`
                                        : `Are you sure you want to remove ${targetMember?.name} from ${currentBusiness.name}? They will lose access to all books, savings vaults, and records.`}
                                </Text>

                                <View style={styles.confirmInputSection}>
                                    <Text style={[styles.confirmInstructionText, { color: colors.textSecondary }]}>
                                        To confirm, please type{' '}
                                        <Text style={{ color: '#EF4444', fontFamily: 'SpaceGrotesk_700Bold', fontWeight: '700' }}>
                                            "{targetMember?.isSelf ? 'LEAVE' : 'REMOVE'}"
                                        </Text>{' '}
                                        below:
                                    </Text>
                                    <TextInput
                                        style={[
                                            styles.confirmTextInput,
                                            {
                                                backgroundColor: isDark
                                                    ? isInputFocused
                                                        ? 'rgba(239, 68, 68, 0.08)'
                                                        : '#1E1E22'
                                                    : isInputFocused
                                                    ? '#FEF2F2'
                                                    : '#F4F5F7',
                                                borderColor: isInputFocused
                                                    ? '#EF4444'
                                                    : isDark
                                                    ? 'rgba(255, 255, 255, 0.08)'
                                                    : 'rgba(0, 0, 0, 0.08)',
                                                color: colors.text,
                                            },
                                        ]}
                                        placeholder={`Type ${targetMember?.isSelf ? 'LEAVE' : 'REMOVE'}`}
                                        placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                                        value={confirmInput}
                                        onChangeText={setConfirmInput}
                                        onFocus={() => setIsInputFocused(true)}
                                        onBlur={() => setIsInputFocused(false)}
                                        autoCapitalize="characters"
                                        autoCorrect={false}
                                    />
                                </View>

                                <View style={styles.confirmBtnRow}>
                                    <TouchableOpacity
                                        style={[
                                            styles.confirmCancelBtn,
                                            {
                                                backgroundColor: isDark ? '#1E1E22' : '#F4F5F7',
                                                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
                                            },
                                        ]}
                                        onPress={() => setConfirmModalVisible(false)}
                                        disabled={isExecutingAction}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[styles.confirmCancelText, { color: colors.text }]}>Cancel</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[
                                            styles.confirmActionBtn,
                                            {
                                                opacity:
                                                    confirmInput.trim().toUpperCase() ===
                                                        (targetMember?.isSelf ? 'LEAVE' : 'REMOVE') && !isExecutingAction
                                                        ? 1
                                                        : 0.45,
                                            },
                                        ]}
                                        onPress={handleConfirmLeaveOrRemove}
                                        disabled={
                                            confirmInput.trim().toUpperCase() !==
                                                (targetMember?.isSelf ? 'LEAVE' : 'REMOVE') || isExecutingAction
                                        }
                                        activeOpacity={0.85}
                                    >
                                        {isExecutingAction ? (
                                            <ActivityIndicator size="small" color="#FFFFFF" />
                                        ) : (
                                            <Text style={styles.confirmActionText}>
                                                {targetMember?.isSelf ? 'Leave Team' : 'Remove Member'}
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
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
    confirmBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    confirmCard: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 24,
        borderWidth: 1.5,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.35,
        shadowRadius: 20,
        elevation: 8,
    },
    confirmIconCircle: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: 'rgba(239, 68, 68, 0.12)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
    },
    confirmTitle: {
        fontSize: 20,
        fontFamily: 'SpaceGrotesk_700Bold',
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 8,
    },
    confirmSubtitle: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 18,
        marginBottom: 18,
        maxWidth: 340,
    },
    confirmInputSection: {
        width: '100%',
        marginBottom: 20,
    },
    confirmInstructionText: {
        fontSize: 13,
        marginBottom: 8,
        textAlign: 'center',
    },
    confirmTextInput: {
        width: '100%',
        height: 48,
        borderRadius: 14,
        borderWidth: 1.5,
        paddingHorizontal: 14,
        fontSize: 15,
        fontFamily: 'SpaceGrotesk_700Bold',
        fontWeight: '700',
        textAlign: 'center',
        letterSpacing: 1,
    },
    confirmBtnRow: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    confirmCancelBtn: {
        flex: 1,
        height: 48,
        borderRadius: 14,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmCancelText: {
        fontSize: 14,
        fontFamily: 'SpaceGrotesk_700Bold',
        fontWeight: '700',
    },
    confirmActionBtn: {
        flex: 1.2,
        height: 48,
        borderRadius: 14,
        backgroundColor: '#EF4444',
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmActionText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontFamily: 'SpaceGrotesk_700Bold',
        fontWeight: '700',
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
        color: '#10b981',
        fontFamily: 'SpaceGrotesk_700Bold',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    headerTitle: {
        fontFamily: 'SpaceGrotesk_700Bold',
        fontSize: 32,
        color: '#0f172a',
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#64748b',
        fontFamily: 'SpaceGrotesk_600SemiBold',
        marginTop: 2,
        letterSpacing: -0.2,
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
        fontSize: 15,
        color: '#0f172a',
        marginLeft: 12,
        fontFamily: 'SpaceGrotesk_600SemiBold',
        letterSpacing: -0.2,
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
        color: '#0f172a',
        fontFamily: 'SpaceGrotesk_700Bold',
        letterSpacing: -0.2,
        marginBottom: 1,
    },
    memberEmail: {
        fontSize: 12,
        color: '#64748b',
        fontFamily: 'SpaceGrotesk_400Regular',
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
        fontSize: 13,
        color: '#64748b',
        marginBottom: 14,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        fontFamily: 'SpaceGrotesk_700Bold',
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
        color: '#64748b',
        fontFamily: 'SpaceGrotesk_600SemiBold',
    },
    roleOptionTextSelected: {
        color: '#10b981',
        fontFamily: 'SpaceGrotesk_700Bold',
    },
    actionDeleteBtn: {
        width: 32,
        height: 32,
        borderRadius: 9,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 10,
    },
    leavePillBtn: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        marginLeft: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    leavePillBtnText: {
        color: '#EF4444',
        fontSize: 11,
        fontFamily: 'SpaceGrotesk_700Bold',
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
        fontSize: 18,
        color: '#0f172a',
        fontFamily: 'SpaceGrotesk_700Bold',
        marginTop: 20,
        marginBottom: 6,
    },
    emptyDescription: {
        fontSize: 14,
        color: '#64748b',
        textAlign: 'center',
        lineHeight: 20,
        fontFamily: 'SpaceGrotesk_400Regular',
        paddingHorizontal: 20,
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 20,
        width: 60,
        height: 60,
        borderRadius: 30,
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
        fontFamily: 'SpaceGrotesk_700Bold',
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
        fontFamily: 'SpaceGrotesk_400Regular',
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
        fontFamily: 'SpaceGrotesk_500Medium',
    },
    inviteDescription: {
        fontSize: 16,
        color: '#64748b',
        marginBottom: 32,
        lineHeight: 24,
        fontFamily: 'SpaceGrotesk_400Regular',
    },
    formGroup: {
        marginBottom: 24,
    },
    label: {
        fontSize: 14,
        color: '#0f172a',
        marginBottom: 12,
        fontFamily: 'SpaceGrotesk_700Bold',
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
        fontFamily: 'SpaceGrotesk_500Medium',
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
        fontFamily: 'SpaceGrotesk_600SemiBold',
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
        color: '#0f172a',
        marginBottom: 4,
        fontFamily: 'SpaceGrotesk_700Bold',
    },
    userFoundEmail: {
        fontSize: 15,
        color: '#64748b',
        fontFamily: 'SpaceGrotesk_400Regular',
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
        fontFamily: 'SpaceGrotesk_600SemiBold',
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
        color: '#374151',
        fontFamily: 'SpaceGrotesk_600SemiBold',
    },
    roleCardLabelSelected: {
        color: '#10b981',
    },
    roleCardDescription: {
        fontSize: 14,
        color: '#64748b',
        marginLeft: 32,
        fontFamily: 'SpaceGrotesk_400Regular',
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
        fontFamily: 'SpaceGrotesk_600SemiBold',
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
        color: '#b91c1c',
        marginBottom: 8,
        fontFamily: 'SpaceGrotesk_700Bold',
    },
    userNotFoundText: {
        fontSize: 15,
        color: '#dc2626',
        textAlign: 'center',
        lineHeight: 22,
        fontFamily: 'SpaceGrotesk_400Regular',
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
        color: '#10b981',
        marginBottom: 8,
        fontFamily: 'SpaceGrotesk_700Bold',
    },
    inviteSentText: {
        fontSize: 16,
        color: '#047857',
        textAlign: 'center',
        fontFamily: 'SpaceGrotesk_400Regular',
    },
});
