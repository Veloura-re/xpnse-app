import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Modal,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    FlatList,
    Alert,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useBusiness } from '@/providers/business-provider';
import { useTheme } from '@/providers/theme-provider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Building2, ChevronLeft, Edit3, Save, X, Check, Search, ArrowRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { getFontFamily } from '@/config/font-config';
import { LOGO_OPTIONS, BUSINESS_ICONS } from '@/constants/logos';

export default function BusinessSettingsScreen() {
    const { currentBusiness, updateBusiness, updateBusinessLogo, getUserRole, hasPermission } = useBusiness();
    const { colors, deviceFont, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const userRole = getUserRole();

    const [isEditing, setIsEditing] = useState(false);
    const [businessName, setBusinessName] = useState(currentBusiness?.name || '');
    const [selectedLogoId, setSelectedLogoId] = useState(() => {
        const currentLogo = LOGO_OPTIONS.find(l => l.icon === currentBusiness?.icon && l.color === currentBusiness?.color);
        return currentLogo?.id || '1';
    });
    const [showLogoPicker, setShowLogoPicker] = useState(false);
    const [logoSearchQuery, setLogoSearchQuery] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const searchInputRef = useRef<TextInput>(null);

    const canEdit = hasPermission('partner');

    if (!currentBusiness) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No business selected</Text>
                </View>
            </View>
        );
    }

    const handleSave = async () => {
        if (!canEdit) {
            Alert.alert('Permission Denied', 'You need partner or owner permissions to edit business settings');
            return;
        }

        try {
            setIsSaving(true);
            const selectedLogo = LOGO_OPTIONS.find(l => l.id === selectedLogoId);

            if (selectedLogo && (selectedLogo.icon !== currentBusiness.icon || selectedLogo.color !== currentBusiness.color)) {
                await updateBusinessLogo(selectedLogo.icon, isDark ? selectedLogo.darkColor : selectedLogo.color);
            }

            if (businessName.trim() && businessName !== currentBusiness.name) {
                await updateBusiness({ name: businessName.trim() });
            }

            setIsEditing(false);
            Alert.alert('Success', 'Business settings updated successfully');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to update business settings');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setBusinessName(currentBusiness?.name || '');
        const currentLogo = LOGO_OPTIONS.find(l => l.icon === currentBusiness?.icon);
        setSelectedLogoId(currentLogo?.id || '1');
        setIsEditing(false);
    };

    const currentIcon = currentBusiness.icon && BUSINESS_ICONS[currentBusiness.icon] ? BUSINESS_ICONS[currentBusiness.icon] : Building2;
    const selectedLogo = LOGO_OPTIONS.find(l => l.id === selectedLogoId);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Decorative Circles */}
            <View style={[styles.circle1, { backgroundColor: isDark ? 'rgba(33, 201, 141, 0.05)' : 'rgba(16, 185, 129, 0.1)' }]} />
            <View style={[styles.circle2, { backgroundColor: isDark ? 'rgba(33, 201, 141, 0.03)' : 'rgba(16, 185, 129, 0.08)' }]} />

            <ScrollView
                style={styles.scrollContainer}
                contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40, paddingHorizontal: 20 }}
                showsVerticalScrollIndicator={false}
            >
                <View>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9' }]}>
                            <ChevronLeft size={24} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={[styles.appName, { color: colors.primary }]}>SETTINGS</Text>
                        <Text style={[styles.headerTitle, { fontFamily: getFontFamily(deviceFont), color: colors.text }]}>Business</Text>
                        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Manage your business details</Text>
                    </View>

                    {/* Business Info Card */}
                    <View style={[styles.card, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.9)', borderColor: colors.border }]}>
                        <View style={styles.cardHeader}>
                            <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>BUSINESS LOGO</Text>
                            {canEdit && !isEditing && (
                                <TouchableOpacity onPress={() => setIsEditing(true)} style={[styles.editButton, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#f0fdf4' }]}>
                                    <Edit3 size={16} color={colors.primary} />
                                    <Text style={[styles.editButtonText, { color: colors.primary }]}>Edit</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <TouchableOpacity
                            disabled={!isEditing}
                            onPress={() => isEditing && setShowLogoPicker(true)}
                            activeOpacity={isEditing ? 0.7 : 1}
                            style={[
                                styles.logoContainer,
                                {
                                    backgroundColor: isDark ? '#1C1C1E' : '#F8FAFC',
                                    borderColor: isEditing ? colors.primary : colors.border,
                                    borderWidth: isEditing ? 2 : 1,
                                }
                            ]}
                        >
                            <View style={[
                                styles.logoIcon,
                                {
                                    backgroundColor: isEditing
                                        ? (selectedLogo ? (isDark ? selectedLogo.darkColor + '20' : selectedLogo.color + '10') : (isDark ? '#2C3333' : '#f1f5f9'))
                                        : (isDark ? (currentBusiness.color || colors.primary) + '20' : (currentBusiness.color || colors.primary) + '10'),
                                    borderColor: isEditing
                                        ? (selectedLogo ? (isDark ? selectedLogo.darkColor : selectedLogo.color) : colors.border)
                                        : (currentBusiness.color || colors.primary),
                                }
                            ]}>
                                {React.createElement(
                                    isEditing && selectedLogo ? (BUSINESS_ICONS[selectedLogo.icon] || Building2) : currentIcon,
                                    {
                                        size: 32,
                                        color: isEditing
                                            ? (selectedLogo ? (isDark ? selectedLogo.darkColor : selectedLogo.color) : colors.textSecondary)
                                            : (currentBusiness.color || colors.primary)
                                    }
                                )}
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>
                                    {isEditing && selectedLogo ? selectedLogo.label : (LOGO_OPTIONS.find(l => l.icon === currentBusiness.icon)?.label || 'Store')}
                                </Text>
                                {isEditing && (
                                    <Text style={{ fontSize: 14, color: colors.primary, fontWeight: '500', marginTop: 2 }}>
                                        Tap to change icon
                                    </Text>
                                )}
                            </View>
                            {isEditing && <ArrowRight size={20} color={colors.textSecondary} />}
                        </TouchableOpacity>

                        <View style={[styles.divider, { backgroundColor: colors.border }]} />

                        <Text style={[styles.cardTitle, { color: colors.textSecondary, marginTop: 16 }]}>BUSINESS NAME</Text>
                        <TextInput
                            style={[
                                styles.input,
                                {
                                    backgroundColor: isDark ? '#1C1C1E' : '#F8FAFC',
                                    borderColor: isEditing ? colors.primary : colors.border,
                                    color: colors.text,
                                    borderWidth: isEditing ? 2 : 1,
                                }
                            ]}
                            value={businessName}
                            onChangeText={setBusinessName}
                            editable={isEditing && canEdit}
                            placeholder="Business Name"
                            placeholderTextColor={colors.textSecondary}
                        />

                        <View style={[styles.divider, { backgroundColor: colors.border }]} />

                        <Text style={[styles.cardTitle, { color: colors.textSecondary, marginTop: 16 }]}>CURRENCY</Text>
                        <View style={[styles.input, { backgroundColor: isDark ? '#1C1C1E' : '#F8FAFC', borderColor: colors.border, justifyContent: 'center' }]}>
                            <Text style={[styles.inputText, { color: colors.textSecondary }]}>{currentBusiness.currency || 'USD'}</Text>
                        </View>
                        <Text style={[styles.helperText, { color: colors.textSecondary }]}>Currency cannot be changed after creation</Text>

                        {isEditing && (
                            <View style={styles.buttonContainer}>
                                <TouchableOpacity
                                    style={[styles.cancelButton, { backgroundColor: isDark ? '#1C1C1E' : '#F1F5F9' }]}
                                    onPress={handleCancel}
                                    disabled={isSaving}
                                >
                                    <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={{ flex: 1 }}
                                    disabled={isSaving || (!businessName.trim())}
                                    onPress={handleSave}
                                >
                                    <LinearGradient
                                        colors={[colors.primary, '#059669']}
                                        style={[styles.saveButtonGradient, { opacity: isSaving || !businessName.trim() ? 0.5 : 1 }]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                    >
                                        {isSaving ? (
                                            <ActivityIndicator color="#fff" />
                                        ) : (
                                            <>
                                                <Save size={18} color="#fff" style={{ marginRight: 8 }} />
                                                <Text style={styles.saveButtonText}>Save Changes</Text>
                                            </>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* Logo Picker Modal */}
            <Modal visible={showLogoPicker} transparent animationType="fade" onRequestClose={() => setShowLogoPicker(false)} statusBarTranslucent={true}>
                <View style={[styles.modalOverlay, { justifyContent: 'flex-end', backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)' }]}>
                    <View style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end' }]} pointerEvents="box-none">
                        <View style={[styles.modalContent, {
                            height: '85%',
                            maxHeight: '85%',
                            padding: 0,
                            backgroundColor: isDark ? '#0A0A0A' : colors.card,
                            borderColor: isDark ? '#2C3333' : colors.border,
                            borderTopLeftRadius: 32,
                            borderTopRightRadius: 32,
                            borderBottomLeftRadius: 0,
                            borderBottomRightRadius: 0,
                            overflow: 'hidden',
                            borderWidth: 1,
                        }]}>
                            {/* Header with pill */}
                            <View style={{ alignItems: 'center', paddingTop: 16, paddingBottom: 8 }}>
                                <View style={{ width: 48, height: 5, borderRadius: 3, backgroundColor: isDark ? '#333' : '#e2e8f0' }} />
                            </View>

                            {/* Title Row */}
                            <View style={{ alignItems: 'center', paddingHorizontal: 24, paddingBottom: 24 }}>
                                <View style={{ alignItems: 'center' }}>
                                    <Text style={{ fontFamily: getFontFamily(deviceFont), fontSize: 28, color: colors.text, textAlign: 'center' }}>Choose Logo</Text>
                                    <Text style={{ fontSize: 15, color: colors.textSecondary, marginTop: 4, textAlign: 'center' }}>Select an icon for your business</Text>
                                </View>
                            </View>

                            {/* Selected Preview Card */}
                            <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
                                <View style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    padding: 16,
                                    borderRadius: 24,
                                    backgroundColor: isDark ? '#151515' : '#f8fafc',
                                    borderWidth: 1,
                                    borderColor: isDark ? '#222' : '#e2e8f0',
                                    gap: 16,
                                }}>
                                    {selectedLogo && (() => {
                                        const Icon = BUSINESS_ICONS[selectedLogo.icon] || Building2;
                                        const iconColor = isDark ? selectedLogo.darkColor : selectedLogo.color;
                                        const bgColor = isDark ? selectedLogo.darkColor + '15' : selectedLogo.color + '10';

                                        return (
                                            <>
                                                <View style={{
                                                    width: 56,
                                                    height: 56,
                                                    borderRadius: 18,
                                                    backgroundColor: bgColor,
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    borderWidth: 1,
                                                    borderColor: isDark ? iconColor + '40' : iconColor + '20',
                                                }}>
                                                    <Icon size={28} color={iconColor} />
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '700', letterSpacing: 0.5, marginBottom: 2 }}>SELECTED ICON</Text>
                                                    <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>{selectedLogo.label}</Text>
                                                </View>
                                                <View style={{
                                                    width: 24,
                                                    height: 24,
                                                    borderRadius: 12,
                                                    backgroundColor: colors.primary,
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }}>
                                                    <Check size={14} color="#fff" strokeWidth={3} />
                                                </View>
                                            </>
                                        );
                                    })()}
                                </View>
                            </View>

                            {/* Search Bar */}
                            <View style={{ paddingHorizontal: 24, marginBottom: 16, width: '100%' }}>
                                <View style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    backgroundColor: isDark ? '#1C1C1E' : '#F8FAFC',
                                    borderColor: isDark ? '#333' : '#e2e8f0',
                                    borderWidth: 1,
                                    height: 52,
                                    borderRadius: 16,
                                    paddingHorizontal: 16,
                                    width: '100%',
                                }}>
                                    <Search size={20} color={colors.textSecondary} />
                                    <TextInput
                                        ref={searchInputRef}
                                        style={{
                                            flex: 1,
                                            marginLeft: 12,
                                            fontSize: 16,
                                            color: colors.text,
                                            height: '100%',
                                        }}
                                        placeholder="Search icons..."
                                        placeholderTextColor={colors.textSecondary}
                                        value={logoSearchQuery}
                                        onChangeText={setLogoSearchQuery}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                    />
                                    {logoSearchQuery.length > 0 && (
                                        <TouchableOpacity
                                            onPress={() => setLogoSearchQuery('')}
                                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                        >
                                            <X size={18} color={colors.textSecondary} />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>

                            {/* Logo Grid */}
                            <View style={{ flex: 1, width: '100%' }}>
                                <FlatList
                                    key="logo-picker-grid-settings"
                                    data={LOGO_OPTIONS.filter(l => l.label.toLowerCase().includes(logoSearchQuery.toLowerCase()))}
                                    numColumns={4}
                                    showsVerticalScrollIndicator={false}
                                    contentContainerStyle={{
                                        gap: 16,
                                        paddingHorizontal: 24,
                                        paddingBottom: 120
                                    }}
                                    columnWrapperStyle={{ gap: 12, justifyContent: 'space-between' }}
                                    keyExtractor={(item) => item.id}
                                    renderItem={({ item }) => {
                                        const Icon = BUSINESS_ICONS[item.icon] || Building2;
                                        const isSelected = selectedLogoId === item.id;

                                        return (
                                            <TouchableOpacity
                                                onPress={() => setSelectedLogoId(item.id)}
                                                activeOpacity={0.7}
                                                style={{
                                                    alignItems: 'center',
                                                    width: '21%',
                                                    marginBottom: 4
                                                }}
                                            >
                                                <View style={{
                                                    width: '100%',
                                                    aspectRatio: 1,
                                                    borderRadius: 20,
                                                    backgroundColor: isSelected
                                                        ? (isDark ? item.darkColor + '25' : item.color + '15')
                                                        : (isDark ? '#1C1C1E' : '#f8fafc'),
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    borderWidth: isSelected ? 2 : 1,
                                                    borderColor: isSelected
                                                        ? (isDark ? item.darkColor : item.color)
                                                        : (isDark ? '#2C2C2E' : '#f1f5f9'),
                                                    marginBottom: 8,
                                                }}>
                                                    <Icon
                                                        size={24}
                                                        color={isSelected
                                                            ? (isDark ? item.darkColor : item.color)
                                                            : (isDark ? '#666' : '#94a3b8')}
                                                    />
                                                </View>
                                                <Text style={{
                                                    fontSize: 11,
                                                    color: isSelected ? colors.text : colors.textSecondary,
                                                    textAlign: 'center',
                                                    fontWeight: isSelected ? '600' : '500'
                                                }} numberOfLines={1}>
                                                    {item.label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    }}
                                />
                            </View>

                            {/* Select Button - Fixed at bottom */}
                            <View style={{
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                padding: 24,
                                paddingBottom: 36,
                            }}>
                                <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(10,10,10,0.95)' : 'rgba(255,255,255,0.95)' }]} />
                                <View style={{
                                    height: 1,
                                    backgroundColor: isDark ? '#2C2C2E' : '#e2e8f0',
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0
                                }} />

                                <TouchableOpacity
                                    style={{ borderRadius: 16, overflow: 'hidden' }}
                                    onPress={() => setShowLogoPicker(false)}
                                    activeOpacity={0.9}
                                >
                                    <LinearGradient
                                        colors={[colors.primary, '#059669']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={{ padding: 18, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                                    >
                                        <Text style={{ fontSize: 17, fontWeight: '700', color: '#fff' }}>Select Logo</Text>
                                        <Check size={20} color="#fff" strokeWidth={2.5} />
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    circle1: {
        position: 'absolute',
        top: -50,
        right: -50,
        width: 200,
        height: 200,
        borderRadius: 100,
    },
    circle2: {
        position: 'absolute',
        bottom: -100,
        left: -50,
        width: 300,
        height: 300,
        borderRadius: 150,
    },
    scrollContainer: {
        flex: 1,
    },
    header: {
        marginBottom: 24,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    appName: {
        fontSize: 14,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginBottom: 8,
    },
    headerTitle: {
        fontSize: 36,
        marginBottom: 8,
    },
    headerSubtitle: {
        fontSize: 16,
    },
    card: {
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    editButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        gap: 16,
    },
    logoIcon: {
        width: 56,
        height: 56,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
    },
    divider: {
        height: 1,
        marginVertical: 24,
    },
    input: {
        borderRadius: 18,
        padding: 18,
        fontSize: 17,
        fontWeight: '500',
        borderWidth: 1,
        marginTop: 8,
    },
    inputText: {
        fontSize: 17,
        fontWeight: '500',
    },
    helperText: {
        fontSize: 13,
        marginTop: 8,
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 24,
    },
    cancelButton: {
        flex: 1,
        borderRadius: 18,
        paddingVertical: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    saveButtonGradient: {
        borderRadius: 18,
        paddingVertical: 18,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
    },
    modalContent: {
        width: '100%',
    },
});
