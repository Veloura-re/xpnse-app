import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    Platform,
    TouchableWithoutFeedback,
} from 'react-native';
import {
    X,
    ArrowUpDown,
    SlidersHorizontal,
    Plus,
    Calendar,
    Users,
    ChevronRight,
    Briefcase,
    BookOpen,
    Zap,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassBackdrop } from '@/components/ui/glass-backdrop';
import { useTheme } from '@/providers/theme-provider';

interface BusinessMenuModalProps {
    visible: boolean;
    onClose: () => void;
    userRole: string | null;
    currentSort: string;
    onSortChange: (sort: any) => void;
    onFilterPress: () => void;
    onCreateBookPress: () => void;
}

export const BusinessMenuModal = ({
    visible,
    onClose,
    userRole,
    currentSort,
    onSortChange,
    onFilterPress,
    onCreateBookPress,
}: BusinessMenuModalProps) => {
    const insets = useSafeAreaInsets();
    const { colors, isDark } = useTheme();
    const isOwner = userRole === 'owner';

    const handleNavigation = (path: string) => {
        onClose();
        setTimeout(() => {
            router.push(path as any);
        }, 100);
    };

    const menuGroups = [
        {
            title: 'Book Actions',
            icon: <BookOpen size={16} color={colors.primary} />,
            items: [
                {
                    label: 'Create New Book',
                    icon: <Plus size={20} color={colors.primary} />,
                    iconBg: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5',
                    onPress: () => {
                        onClose();
                        onCreateBookPress();
                    },
                },
                {
                    label: 'Filter & Sort Books',
                    icon: <SlidersHorizontal size={20} color="#3b82f6" />,
                    iconBg: isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff',
                    onPress: () => {
                        onClose();
                        onFilterPress();
                    },
                },
            ],
        },
        {
            title: 'Management',
            icon: <Briefcase size={16} color="#8b5cf6" />,
            items: [
                {
                    label: 'Recurring Transactions',
                    icon: <Calendar size={20} color="#8b5cf6" />,
                    iconBg: isDark ? 'rgba(139, 92, 246, 0.15)' : '#f5f3ff',
                    onPress: () => handleNavigation('/recurring'),
                },
                {
                    label: 'Team Members',
                    icon: <Users size={20} color="#ec4899" />,
                    iconBg: isDark ? 'rgba(236, 72, 153, 0.15)' : '#fdf2f8',
                    onPress: () => handleNavigation('/team'),
                },
            ],
        },
    ];

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <GlassBackdrop isDark={isDark} onPress={onClose} />

                <View
                    style={[
                        styles.sheet,
                        {
                            backgroundColor: colors.surfaceGlass,
                            borderColor: colors.borderGlass,
                            paddingBottom: insets.bottom + 20,
                        },
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

                    <View style={styles.handleContainer}>
                        <View style={[styles.handle, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.2)' : '#cbd5e1' }]} />
                    </View>

                    <View style={styles.header}>
                        <Text style={[styles.title, { color: colors.text }]}>Menu</Text>
                        <TouchableOpacity
                            style={[
                                styles.closeButton,
                                {
                                    backgroundColor: colors.surfaceGlass,
                                    borderColor: colors.borderGlass,
                                },
                            ]}
                            onPress={onClose}
                        >
                            <X size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        {menuGroups.map((group, index) => (
                            group.items.length > 0 && (
                                <View key={group.title} style={styles.group}>
                                    <View style={styles.groupHeader}>
                                        {group.icon}
                                        <Text style={[styles.groupTitle, { color: colors.textSecondary }]}>{group.title}</Text>
                                    </View>
                                    <View
                                        style={[
                                            styles.card,
                                            {
                                                backgroundColor: colors.cardGlass,
                                                borderColor: colors.borderGlass,
                                            },
                                        ]}
                                    >
                                        {group.items.map((item: any, i) => (
                                            <React.Fragment key={item.label}>
                                                {i > 0 && (
                                                    <View
                                                        style={[
                                                            styles.divider,
                                                            { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9' },
                                                        ]}
                                                    />
                                                )}
                                                <TouchableOpacity
                                                    style={styles.item}
                                                    onPress={item.onPress}
                                                    activeOpacity={0.7}
                                                >
                                                    <View
                                                        style={[
                                                            styles.iconContainer,
                                                            { backgroundColor: item.iconBg },
                                                        ]}
                                                    >
                                                        {item.icon}
                                                    </View>
                                                    <Text style={[styles.itemLabel, { color: colors.text }]}>
                                                        {item.label}
                                                    </Text>
                                                    <ChevronRight size={18} color={colors.textSecondary} />
                                                </TouchableOpacity>
                                            </React.Fragment>
                                        ))}
                                    </View>
                                </View>
                            )
                        ))}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    sheet: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        borderWidth: 1,
        borderBottomWidth: 0,
        maxHeight: '85%',
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -8 },
                shadowOpacity: 0.25,
                shadowRadius: 20,
            },
            android: {
                elevation: 24,
            },
            web: { boxShadow: '0px -4px 24px rgba(0, 0, 0, 0.15)' },
        }),
    },
    handleContainer: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingBottom: 20,
    },
    title: {
        fontFamily: 'SpaceGrotesk_700Bold',
        fontSize: 22,
        letterSpacing: -0.5,
    },
    closeButton: {
        padding: 8,
        borderRadius: 12,
        borderWidth: 1,
    },
    content: {
        paddingHorizontal: 24,
    },
    group: {
        marginBottom: 24,
    },
    groupHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
        paddingLeft: 4,
    },
    groupTitle: {
        fontFamily: 'SpaceGrotesk_700Bold',
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    card: {
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 16,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    itemLabel: {
        fontFamily: 'SpaceGrotesk_600SemiBold',
        flex: 1,
        fontSize: 15,
    },
    divider: {
        height: 1,
        marginLeft: 72,
    },
});
