import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    Platform,
    FlatList,
    Dimensions,
} from 'react-native';
import { X, Search, Building2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/providers/theme-provider';
import { getFontFamily } from '@/config/font-config';
import { BUSINESS_ICONS, LOGO_OPTIONS, LogoOption } from '@/constants/logos';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';

interface LogoPickerModalProps {
    visible: boolean;
    onClose: () => void;
    selectedLogoId: string;
    onSelect: (logoId: string) => void;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

export const LogoPickerModal = ({
    visible,
    onClose,
    selectedLogoId,
    onSelect,
}: LogoPickerModalProps) => {
    const { colors, isDark, deviceFont } = useTheme();
    const [searchQuery, setSearchQuery] = useState('');

    const filteredLogos = useMemo(() => {
        if (!searchQuery.trim()) return LOGO_OPTIONS;
        const query = searchQuery.toLowerCase();
        return LOGO_OPTIONS.filter(option =>
            option.label.toLowerCase().includes(query) ||
            option.icon.toLowerCase().includes(query)
        );
    }, [searchQuery]);

    const renderItem = ({ item }: { item: LogoOption }) => {
        const Icon = BUSINESS_ICONS[item.icon] || Building2;
        const isSelected = selectedLogoId === item.id;
        const activeColor = isDark ? item.darkColor : item.color;

        return (
            <TouchableOpacity
                onPress={() => onSelect(item.id)}
                activeOpacity={0.7}
                style={styles.gridItemContainer}
            >
                <View style={[
                    styles.iconWrapper,
                    {
                        backgroundColor: isSelected
                            ? (isDark ? item.darkColor + '30' : item.color + '15')
                            : (isDark ? '#334155' : '#f1f5f9'),
                        borderColor: isSelected ? activeColor : 'transparent',
                        borderWidth: isSelected ? 2 : 0,
                    }
                ]}>
                    <Icon
                        size={24}
                        color={isSelected ? activeColor : colors.textSecondary}
                    />
                </View>
                <Text
                    style={[
                        styles.iconLabel,
                        {
                            color: isSelected ? colors.text : colors.textSecondary,
                            fontWeight: isSelected ? '600' : '400'
                        }
                    ]}
                    numberOfLines={1}
                >
                    {item.label}
                </Text>
            </TouchableOpacity>
        );
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <View style={styles.overlay}>
                {/* Backdrop */}
                <TouchableOpacity
                    style={styles.backdrop}
                    activeOpacity={1}
                    onPress={onClose}
                >
                    <Animated.View
                        entering={FadeIn}
                        exiting={FadeOut}
                        style={[styles.backdropFill, { backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)' }]}
                    />
                </TouchableOpacity>

                {/* Modal Content */}
                <Animated.View
                    entering={SlideInDown.duration(100)}
                    exiting={SlideOutDown}
                    style={[
                        styles.modalContainer,
                        {
                            backgroundColor: isDark ? '#1e293b' : '#ffffff',
                            maxHeight: SCREEN_HEIGHT * 0.85
                        }
                    ]}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerTop}>
                            <View style={styles.dragIndicator} />
                        </View>

                        <View style={styles.headerContent}>
                            <View>
                                <Text style={[styles.title, { color: colors.text, fontFamily: getFontFamily(deviceFont) }]}>
                                    Choose Icon
                                </Text>
                                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                                    Select a symbol for your business
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={onClose}
                                style={[styles.closeButton, { backgroundColor: isDark ? '#334155' : '#f1f5f9' }]}
                            >
                                <X size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {/* Search Bar */}
                        <View style={styles.searchContainer}>
                            <View style={[
                                styles.searchBar,
                                {
                                    backgroundColor: isDark ? '#334155' : '#f8fafc',
                                    borderColor: colors.border
                                }
                            ]}>
                                <Search size={18} color={colors.textSecondary} />
                                <TextInput
                                    style={[styles.searchInput, { color: colors.text }]}
                                    placeholder="Search icons..."
                                    placeholderTextColor={colors.textSecondary}
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                />
                                {searchQuery.length > 0 && (
                                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                                        <X size={16} color={colors.textSecondary} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    </View>

                    {/* Grid */}
                    <FlatList
                        data={filteredLogos}
                        renderItem={renderItem}
                        keyExtractor={(item: LogoOption) => item.id}
                        numColumns={4}
                        contentContainerStyle={styles.listContent}
                        columnWrapperStyle={styles.columnWrapper}
                        showsVerticalScrollIndicator={false}
                        initialNumToRender={20}
                        maxToRenderPerBatch={20}
                        windowSize={10}
                        getItemLayout={(_: any, index: number) => ({
                            length: 90, // Approximate height of item
                            offset: 90 * Math.floor(index / 4),
                            index,
                        })}
                    />

                    {/* Footer Gradient overlay for smooth scroll visual */}
                    <LinearGradient
                        colors={[
                            isDark ? 'rgba(30, 41, 59, 0)' : 'rgba(255, 255, 255, 0)',
                            isDark ? '#1e293b' : '#ffffff'
                        ]}
                        style={styles.bottomGradient}
                        pointerEvents="none"
                    />
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    backdropFill: {
        flex: 1,
    },
    modalContainer: {
        borderRadius: 24,
        // Match create book modal style: centered card, not full-width bottom sheet
        width: '92%',
        maxWidth: 520,
        paddingBottom: Platform.OS === 'ios' ? 34 : 24,
        overflow: 'hidden',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 24,
    },
    header: {
        paddingHorizontal: 24,
        paddingBottom: 4,
    },
    headerTop: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    dragIndicator: {
        width: 40,
        height: 5,
        borderRadius: 3,
        backgroundColor: '#cbd5e1',
        opacity: 0.5,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchContainer: {
        marginBottom: 16,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        // Slightly larger search bar so it feels more prominent
        height: 56,
        borderRadius: 18,
        paddingHorizontal: 18,
        borderWidth: 1,
        gap: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        height: '100%',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    columnWrapper: {
        justifyContent: 'space-between',
        gap: 12,
    },
    gridItemContainer: {
        width: '23%', // approx 4 columns with gap
        alignItems: 'center',
        marginBottom: 16,
    },
    iconWrapper: {
        width: '100%',
        aspectRatio: 1,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    iconLabel: {
        fontSize: 11,
        textAlign: 'center',
        width: '100%',
    },
    bottomGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 40,
        zIndex: 10,
    },
});
