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

interface BusinessMenuModalProps {
    visible: boolean;
    onClose: () => void;
    userRole: string | null;
    onCreateBook: () => void;
}

export const BusinessMenuModal = ({
    visible,
    onClose,
    userRole,
    onCreateBook,
}: BusinessMenuModalProps) => {
    const insets = useSafeAreaInsets();

    if (!visible) return null;

    const handleNavigation = (path: any) => {
        onClose();
        router.push(path);
    };

    const menuGroups = [
        {
            title: 'Business',
            icon: <Briefcase size={16} color="#64748b" />,
            items: [
                {
                    label: 'Switch Business',
                    icon: <ArrowUpDown size={20} color="#10b981" />,
                    iconBg: '#f0fdf4',
                    onPress: () => handleNavigation('/business-switcher'),
                },
                {
                    label: 'Business Settings',
                    icon: <SlidersHorizontal size={20} color="#059669" />,
                    iconBg: '#f0fdf4',
                    onPress: () => handleNavigation('/settings'),
                },
            ],
        },
        {
            title: 'Books',
            icon: <BookOpen size={16} color="#64748b" />,
            items: [
                (userRole === 'owner' || userRole === 'partner') ? {
                    label: 'Create New Book',
                    icon: <Plus size={20} color="#10b981" />,
                    iconBg: '#ecfdf5',
                    onPress: () => {
                        onClose();
                        onCreateBook();
                    },
                } : null,
            ].filter(Boolean),
        },
        {
            title: 'Quick Access',
            icon: <Zap size={16} color="#64748b" />,
            items: [
                {
                    label: 'Analytics',
                    icon: <Calendar size={20} color="#f59e0b" />,
                    iconBg: '#fffbeb',
                    onPress: () => handleNavigation('/activity'),
                },
                {
                    label: 'Team Members',
                    icon: <Users size={20} color="#ec4899" />,
                    iconBg: '#fdf2f8',
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
                <TouchableWithoutFeedback onPress={onClose}>
                    <View style={styles.backdrop} />
                </TouchableWithoutFeedback>

                <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.handleContainer}>
                        <View style={styles.handle} />
                    </View>

                    <View style={styles.header}>
                        <Text style={styles.title}>Menu</Text>
                        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                            <X size={20} color="#64748b" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        {menuGroups.map((group, index) => (
                            group.items.length > 0 && (
                                <View key={group.title} style={styles.group}>
                                    <View style={styles.groupHeader}>
                                        {group.icon}
                                        <Text style={styles.groupTitle}>{group.title}</Text>
                                    </View>
                                    <View style={styles.card}>
                                        {group.items.map((item: any, i) => (
                                            <React.Fragment key={item.label}>
                                                {i > 0 && <View style={styles.divider} />}
                                                <TouchableOpacity
                                                    style={styles.item}
                                                    onPress={item.onPress}
                                                    activeOpacity={0.7}
                                                >
                                                    <View style={[styles.iconContainer, { backgroundColor: item.iconBg }]}>
                                                        {item.icon}
                                                    </View>
                                                    <Text style={styles.itemLabel}>{item.label}</Text>
                                                    <ChevronRight size={16} color="#cbd5e1" />
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
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    sheet: {
        backgroundColor: '#f8fafc',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '85%',
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12 },
            android: { elevation: 8 },
            web: { boxShadow: '0px -4px 24px rgba(0, 0, 0, 0.1)' },
        }),
    },
    handleContainer: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: '#cbd5e1',
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
        fontSize: 24,
        fontWeight: '800',
        color: '#0f172a',
        letterSpacing: -0.5,
    },
    closeButton: {
        padding: 8,
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
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
        fontSize: 13,
        fontWeight: '700',
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#e2e8f0',
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
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: '#1e293b',
    },
    divider: {
        height: 1,
        backgroundColor: '#f1f5f9',
        marginLeft: 72,
    },
});
