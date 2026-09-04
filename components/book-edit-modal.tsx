import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TextInput,
    TouchableOpacity,
    Pressable,
    Switch,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Keyboard,
    ScrollView,
    Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
    X,
    Trash2,
    CreditCard,
    Tag,
    Copy,
    Send,
    Check,
    Globe,
    ChevronRight,
    ChevronDown,
    SlidersHorizontal,
    BookOpen,
    AlertTriangle,
    ArrowRightLeft,
} from 'lucide-react-native';
import { Book } from '@/types';
import { useBusiness } from '@/providers/business-provider';
import { useTheme } from '@/providers/theme-provider';
import { CurrencyPickerModal } from '@/components/currency/currency-picker-modal';
import { GlassBackdrop } from '@/components/ui/glass-backdrop';
import * as Haptics from 'expo-haptics';

interface BookEditModalProps {
    visible: boolean;
    book: Book | null;
    onClose: () => void;
    onSave: (bookId: string | null, data: any) => void;
    onDelete: (bookId: string) => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const BookEditModal = React.memo(function BookEditModal({
    visible,
    book,
    onClose,
    onSave,
    onDelete,
}: BookEditModalProps) {
    const { businesses, currentBusiness, copyBook, moveBook } = useBusiness();
    const { deviceFont, colors, isDark } = useTheme();

    const [bookName, setBookName] = useState('');
    const [showPaymentMode, setShowPaymentMode] = useState(true);
    const [showCategory, setShowCategory] = useState(true);
    const [bookCurrency, setBookCurrency] = useState(currentBusiness?.currency || 'USD');
    const [currencyPickerVisible, setCurrencyPickerVisible] = useState(false);

    // Sub-modal states
    const [deleteConfirm, setDeleteConfirm] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showCopyModal, setShowCopyModal] = useState(false);
    const [showMoveModal, setShowMoveModal] = useState(false);
    const [showManagement, setShowManagement] = useState(false);

    // Loading states
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isCopying, setIsCopying] = useState(false);
    const [isMoving, setIsMoving] = useState(false);
    const [selectedTargetBusinessId, setSelectedTargetBusinessId] = useState<string | null>(null);

    // Focus states
    const [isNameFocused, setIsNameFocused] = useState(false);
    const [isDeleteInputFocused, setIsDeleteInputFocused] = useState(false);

    useEffect(() => {
        if (visible) {
            setSelectedTargetBusinessId(null);
            setShowManagement(false);
            if (book) {
                setBookName(book.name);
                setBookCurrency(book.currency || book.settings?.currency || currentBusiness?.currency || 'USD');
                setShowPaymentMode(book.settings?.showPaymentMode ?? true);
                setShowCategory(book.settings?.showCategory ?? true);
            } else {
                setBookName('');
                setBookCurrency(currentBusiness?.currency || 'USD');
                setShowPaymentMode(true);
                setShowCategory(true);
            }
        }
    }, [visible, book, currentBusiness]);

    const handleClose = () => {
        Keyboard.dismiss();
        onClose();
    };

    const handleSave = async () => {
        if (!bookName.trim()) {
            Alert.alert('Required Field', 'Please enter a name for this book.');
            return;
        }

        const settings = {
            ...(book?.settings || {}),
            currency: bookCurrency,
            showPaymentMode,
            showCategory,
            showAttachments: book?.settings?.showAttachments ?? false,
        };

        try {
            setIsSaving(true);
            Keyboard.dismiss();
            await new Promise((resolve) => setTimeout(resolve, 80));

            if (book) {
                await onSave(book.id, { name: bookName.trim(), currency: bookCurrency, settings });
            } else {
                await onSave(null, { name: bookName.trim(), currency: bookCurrency, settings });
            }

            if (Platform.OS !== 'web') {
                try {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                } catch (e) {}
            }
            handleClose();
        } catch (error: any) {
            console.error('Failed to save book:', error);
            Alert.alert('Error Saving Book', error?.message || 'Failed to save book settings.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = () => {
        setDeleteConfirm('');
        setShowDeleteModal(true);
    };

    const handleMoveBook = async () => {
        if (!book || !selectedTargetBusinessId) return;
        try {
            setIsMoving(true);
            const result = await moveBook(book.id, selectedTargetBusinessId);
            if (result.success) {
                if (Platform.OS !== 'web') {
                    try {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    } catch (e) {}
                }
                Alert.alert('Success', result.message);
                setShowMoveModal(false);
                onClose();
            } else {
                Alert.alert('Error', result.message);
            }
        } catch (error: any) {
            console.error('Failed to move book:', error);
            Alert.alert('Error Moving Book', error?.message || 'Failed to move book.');
        } finally {
            setIsMoving(false);
        }
    };

    const handleCopyBook = async () => {
        if (!book || !selectedTargetBusinessId) return;
        try {
            setIsCopying(true);
            const result = await copyBook(book.id, selectedTargetBusinessId);
            if (result.success) {
                if (Platform.OS !== 'web') {
                    try {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    } catch (e) {}
                }
                Alert.alert('Success', result.message);
                setShowCopyModal(false);
                onClose();
            } else {
                Alert.alert('Error', result.message);
            }
        } catch (error: any) {
            console.error('Failed to copy book:', error);
            Alert.alert('Error Copying Book', error?.message || 'Failed to copy book.');
        } finally {
            setIsCopying(false);
        }
    };

    const availableBusinesses = businesses.filter((b) => b.id !== currentBusiness?.id);
    const bookNameForConfirm = book?.name || '';
    const canConfirmDelete = deleteConfirm.trim() === bookNameForConfirm.trim();

    // Theme Color Tokens
    const modalBg = isDark ? '#141416' : '#FFFFFF';
    const cardBorder = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)';
    const inputBg = isDark ? '#202024' : '#F5F3EF';
    const textColor = colors.text;
    const subTextColor = colors.textSecondary;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleClose}
            statusBarTranslucent={true}
        >
            <View style={styles.modalOverlay}>
                <GlassBackdrop isDark={isDark} onPress={handleClose} />
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.keyboardView}
                    pointerEvents="box-none"
                >
                    <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

                    <Animated.View
                        entering={FadeInDown.duration(80)}
                        style={[
                            styles.popupContainer,
                            {
                                backgroundColor: modalBg,
                                borderColor: cardBorder,
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
                                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.9)',
                                zIndex: 10,
                            }}
                        />

                        {/* Modal Header */}
                        <View style={styles.modalHeader}>
                            <View style={styles.headerLeft}>
                                <View
                                    style={[
                                        styles.headerIconBox,
                                        {
                                            backgroundColor: isDark
                                                ? 'rgba(16, 185, 129, 0.18)'
                                                : 'rgba(16, 185, 129, 0.12)',
                                        },
                                    ]}
                                >
                                    <BookOpen size={20} color={colors.primary} />
                                </View>
                                <View>
                                    <Text
                                        style={[
                                            styles.headerTitle,
                                            { color: textColor, fontFamily: 'SpaceGrotesk_700Bold' },
                                        ]}
                                    >
                                        {book ? 'Edit Book' : 'Create Book'}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.headerSubtitle,
                                            { color: subTextColor, fontFamily: 'SpaceGrotesk_400Regular' },
                                        ]}
                                    >
                                        {book ? 'Customize ledger preferences & rules' : 'Set up a new ledger for transactions'}
                                    </Text>
                                </View>
                            </View>

                            <TouchableOpacity
                                onPress={handleClose}
                                style={[
                                    styles.closeButton,
                                    { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' },
                                ]}
                                activeOpacity={0.7}
                            >
                                <X size={18} color={textColor} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.popupScrollContent}
                        >
                            {/* Hero Book Profile Section */}
                            <View style={styles.section}>
                                <Text style={[styles.sectionLabel, { color: subTextColor, fontFamily: 'SpaceGrotesk_700Bold' }]}>
                                    BOOK NAME
                                </Text>
                                <View
                                    style={[
                                        styles.inputWrapper,
                                        {
                                            backgroundColor: isNameFocused
                                                ? isDark ? 'rgba(16, 185, 129, 0.08)' : '#F0FDF4'
                                                : inputBg,
                                            borderColor: isNameFocused ? colors.primary : cardBorder,
                                        },
                                    ]}
                                >
                                    <BookOpen
                                        size={18}
                                        color={isNameFocused ? colors.primary : subTextColor}
                                        style={{ marginRight: 10 }}
                                    />
                                    <TextInput
                                        style={[
                                            styles.textInputField,
                                            {
                                                color: textColor,
                                                fontFamily: 'SpaceGrotesk_700Bold',
                                            },
                                        ]}
                                        value={bookName}
                                        onChangeText={setBookName}
                                        onFocus={() => setIsNameFocused(true)}
                                        onBlur={() => setIsNameFocused(false)}
                                        placeholder="e.g. Personal Expenses, Project Alpha"
                                        placeholderTextColor={subTextColor}
                                        autoFocus={!book}
                                        returnKeyType="done"
                                        onSubmitEditing={handleSave}
                                    />
                                </View>
                            </View>

                            {/* Book Currency Card */}
                            <View style={styles.section}>
                                <Text style={[styles.sectionLabel, { color: subTextColor, fontFamily: 'SpaceGrotesk_700Bold' }]}>
                                    PRIMARY CURRENCY
                                </Text>
                                <TouchableOpacity
                                    style={[
                                        styles.currencyCard,
                                        {
                                            backgroundColor: inputBg,
                                            borderColor: cardBorder,
                                        },
                                    ]}
                                    onPress={() => setCurrencyPickerVisible(true)}
                                    activeOpacity={0.75}
                                >
                                    <View style={styles.currencyCardLeft}>
                                        <View
                                            style={[
                                                styles.currencyIconBox,
                                                {
                                                    backgroundColor: isDark
                                                        ? 'rgba(16, 185, 129, 0.18)'
                                                        : 'rgba(16, 185, 129, 0.12)',
                                                },
                                            ]}
                                        >
                                            <Globe size={18} color={colors.primary} />
                                        </View>
                                        <View>
                                            <Text
                                                style={[
                                                    styles.currencyCodeText,
                                                    { color: textColor, fontFamily: 'SpaceGrotesk_700Bold' },
                                                ]}
                                            >
                                                {bookCurrency}
                                            </Text>
                                            <Text
                                                style={[
                                                    styles.currencySubText,
                                                    { color: subTextColor, fontFamily: 'SpaceGrotesk_400Regular' },
                                                ]}
                                            >
                                                Ledger default denomination
                                            </Text>
                                        </View>
                                    </View>

                                    <View
                                        style={[
                                            styles.currencyChangeBadge,
                                            {
                                                backgroundColor: isDark
                                                    ? 'rgba(16, 185, 129, 0.12)'
                                                    : '#ECFDF5',
                                                borderColor: colors.primary,
                                            },
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.currencyChangeText,
                                                { color: colors.primary, fontFamily: 'SpaceGrotesk_700Bold' },
                                            ]}
                                        >
                                            Change
                                        </Text>
                                        <ChevronRight size={14} color={colors.primary} />
                                    </View>
                                </TouchableOpacity>
                            </View>

                            {/* Display & Tracking Preferences */}
                            <View style={styles.section}>
                                <Text style={[styles.sectionLabel, { color: subTextColor, fontFamily: 'SpaceGrotesk_700Bold' }]}>
                                    ENTRY FIELDS & TRACKING
                                </Text>

                                <View style={[styles.preferencesCard, { backgroundColor: inputBg, borderColor: cardBorder }]}>
                                    {/* Payment Mode Setting */}
                                    <TouchableOpacity
                                        style={styles.preferenceRow}
                                        onPress={() => setShowPaymentMode(!showPaymentMode)}
                                        activeOpacity={0.7}
                                    >
                                        <View
                                            style={[
                                                styles.preferenceIconBox,
                                                {
                                                    backgroundColor: isDark
                                                        ? 'rgba(16, 185, 129, 0.18)'
                                                        : 'rgba(16, 185, 129, 0.12)',
                                                },
                                            ]}
                                        >
                                            <CreditCard size={18} color={colors.primary} />
                                        </View>
                                        <View style={styles.preferenceTextCol}>
                                            <Text
                                                style={[
                                                    styles.preferenceTitle,
                                                    { color: textColor, fontFamily: 'SpaceGrotesk_700Bold' },
                                                ]}
                                            >
                                                Payment Method
                                            </Text>
                                            <Text
                                                style={[
                                                    styles.preferenceSubtitle,
                                                    { color: subTextColor, fontFamily: 'SpaceGrotesk_400Regular' },
                                                ]}
                                            >
                                                Track Cash, Card, Bank, or UPI methods
                                            </Text>
                                        </View>
                                        <Switch
                                            value={showPaymentMode}
                                            onValueChange={setShowPaymentMode}
                                            trackColor={{ false: '#3e3e3e', true: colors.primary }}
                                            thumbColor="#FFFFFF"
                                        />
                                    </TouchableOpacity>

                                    <View style={[styles.preferenceDivider, { backgroundColor: cardBorder }]} />

                                    {/* Category Setting */}
                                    <TouchableOpacity
                                        style={styles.preferenceRow}
                                        onPress={() => setShowCategory(!showCategory)}
                                        activeOpacity={0.7}
                                    >
                                        <View
                                            style={[
                                                styles.preferenceIconBox,
                                                {
                                                    backgroundColor: isDark
                                                        ? 'rgba(16, 185, 129, 0.18)'
                                                        : 'rgba(16, 185, 129, 0.12)',
                                                },
                                            ]}
                                        >
                                            <Tag size={18} color={colors.primary} />
                                        </View>
                                        <View style={styles.preferenceTextCol}>
                                            <Text
                                                style={[
                                                    styles.preferenceTitle,
                                                    { color: textColor, fontFamily: 'SpaceGrotesk_700Bold' },
                                                ]}
                                            >
                                                Category Tagging
                                            </Text>
                                            <Text
                                                style={[
                                                    styles.preferenceSubtitle,
                                                    { color: subTextColor, fontFamily: 'SpaceGrotesk_400Regular' },
                                                ]}
                                            >
                                                Group expenses by Food, Rent, Salary, etc.
                                            </Text>
                                        </View>
                                        <Switch
                                            value={showCategory}
                                            onValueChange={setShowCategory}
                                            trackColor={{ false: '#3e3e3e', true: colors.primary }}
                                            thumbColor="#FFFFFF"
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Primary Save Button */}
                            <TouchableOpacity
                                style={[
                                    styles.primarySaveBtn,
                                    {
                                        backgroundColor: colors.primary,
                                        opacity: !bookName.trim() || isSaving ? 0.6 : 1,
                                    },
                                ]}
                                onPress={handleSave}
                                disabled={!bookName.trim() || isSaving}
                                activeOpacity={0.85}
                            >
                                {isSaving ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <>
                                        <Check size={18} color="#FFFFFF" style={{ marginRight: 6 }} strokeWidth={2.5} />
                                        <Text
                                            style={[
                                                styles.primarySaveBtnText,
                                                { fontFamily: 'SpaceGrotesk_700Bold' },
                                            ]}
                                        >
                                            {book ? 'Save Book Changes' : 'Create Book'}
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>

                            {/* Book Management & Operations Section */}
                            {book && (
                                <View style={styles.managementSection}>
                                    <TouchableOpacity
                                        style={[
                                            styles.managementToggleCard,
                                            {
                                                backgroundColor: inputBg,
                                                borderColor: showManagement ? colors.primary : cardBorder,
                                            },
                                        ]}
                                        onPress={() => {
                                            if (Platform.OS !== 'web') {
                                                try {
                                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                } catch (e) {}
                                            }
                                            setShowManagement(!showManagement);
                                        }}
                                        activeOpacity={0.75}
                                    >
                                        <View style={styles.managementToggleLeft}>
                                            <View
                                                style={[
                                                    styles.managementToggleIcon,
                                                    {
                                                        backgroundColor: isDark
                                                            ? 'rgba(16, 185, 129, 0.18)'
                                                            : 'rgba(16, 185, 129, 0.12)',
                                                    },
                                                ]}
                                            >
                                                <SlidersHorizontal size={18} color={colors.primary} />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text
                                                    style={[
                                                        styles.managementToggleTitle,
                                                        { color: textColor, fontFamily: 'SpaceGrotesk_700Bold' },
                                                    ]}
                                                >
                                                    Book Management & Operations
                                                </Text>
                                                <Text
                                                    style={[
                                                        styles.managementToggleSubtitle,
                                                        { color: subTextColor, fontFamily: 'SpaceGrotesk_400Regular' },
                                                    ]}
                                                >
                                                    {showManagement ? 'Tap to hide operations' : 'Duplicate, transfer, or delete this book'}
                                                </Text>
                                            </View>
                                        </View>
                                        <ChevronDown
                                            size={18}
                                            color={showManagement ? colors.primary : subTextColor}
                                            style={{ transform: [{ rotate: showManagement ? '180deg' : '0deg' }] }}
                                        />
                                    </TouchableOpacity>

                                    {showManagement && (
                                        <Animated.View
                                            entering={FadeInDown.duration(160)}
                                            style={styles.managementOptionsList}
                                        >
                                            {/* Copy Book Option */}
                                            {availableBusinesses.length > 0 && (
                                                <TouchableOpacity
                                                    style={[
                                                        styles.managementOptionRow,
                                                        {
                                                            backgroundColor: inputBg,
                                                            borderColor: cardBorder,
                                                        },
                                                    ]}
                                                    onPress={() => setShowCopyModal(true)}
                                                    activeOpacity={0.75}
                                                >
                                                    <View
                                                        style={[
                                                            styles.managementOptionIconBox,
                                                            {
                                                                backgroundColor: isDark
                                                                    ? 'rgba(16, 185, 129, 0.18)'
                                                                    : 'rgba(16, 185, 129, 0.12)',
                                                            },
                                                        ]}
                                                    >
                                                        <Copy size={18} color={colors.primary} />
                                                    </View>
                                                    <View style={{ flex: 1 }}>
                                                        <Text
                                                            style={[
                                                                styles.managementOptionTitle,
                                                                { color: textColor, fontFamily: 'SpaceGrotesk_700Bold' },
                                                            ]}
                                                        >
                                                            Duplicate Book
                                                        </Text>
                                                        <Text
                                                            style={[
                                                                styles.managementOptionSubtitle,
                                                                { color: subTextColor, fontFamily: 'SpaceGrotesk_400Regular' },
                                                            ]}
                                                        >
                                                            Copy ledger & all records to another business
                                                        </Text>
                                                    </View>
                                                    <ChevronRight size={16} color={subTextColor} />
                                                </TouchableOpacity>
                                            )}

                                            {/* Move Book Option */}
                                            {availableBusinesses.length > 0 && (
                                                <TouchableOpacity
                                                    style={[
                                                        styles.managementOptionRow,
                                                        {
                                                            backgroundColor: inputBg,
                                                            borderColor: cardBorder,
                                                        },
                                                    ]}
                                                    onPress={() => setShowMoveModal(true)}
                                                    activeOpacity={0.75}
                                                >
                                                    <View
                                                        style={[
                                                            styles.managementOptionIconBox,
                                                            {
                                                                backgroundColor: isDark
                                                                    ? 'rgba(14, 165, 233, 0.18)'
                                                                    : 'rgba(14, 165, 233, 0.12)',
                                                            },
                                                        ]}
                                                    >
                                                        <ArrowRightLeft size={18} color="#0EA5E9" />
                                                    </View>
                                                    <View style={{ flex: 1 }}>
                                                        <Text
                                                            style={[
                                                                styles.managementOptionTitle,
                                                                { color: textColor, fontFamily: 'SpaceGrotesk_700Bold' },
                                                            ]}
                                                        >
                                                            Transfer Book
                                                        </Text>
                                                        <Text
                                                            style={[
                                                                styles.managementOptionSubtitle,
                                                                { color: subTextColor, fontFamily: 'SpaceGrotesk_400Regular' },
                                                            ]}
                                                        >
                                                            Move ledger permanently to another business
                                                        </Text>
                                                    </View>
                                                    <ChevronRight size={16} color={subTextColor} />
                                                </TouchableOpacity>
                                            )}

                                            {/* Delete Book Danger Card */}
                                            <TouchableOpacity
                                                style={[
                                                    styles.managementOptionRow,
                                                    {
                                                        backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2',
                                                        borderColor: isDark ? 'rgba(239, 68, 68, 0.25)' : '#FECACA',
                                                    },
                                                ]}
                                                onPress={handleDelete}
                                                activeOpacity={0.75}
                                            >
                                                <View
                                                    style={[
                                                        styles.managementOptionIconBox,
                                                        {
                                                            backgroundColor: isDark
                                                                ? 'rgba(239, 68, 68, 0.2)'
                                                                : 'rgba(239, 68, 68, 0.15)',
                                                        },
                                                    ]}
                                                >
                                                    <Trash2 size={18} color="#EF4444" />
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text
                                                        style={[
                                                            styles.managementOptionTitle,
                                                            { color: '#EF4444', fontFamily: 'SpaceGrotesk_700Bold' },
                                                        ]}
                                                    >
                                                        Delete Ledger
                                                    </Text>
                                                    <Text
                                                        style={[
                                                            styles.managementOptionSubtitle,
                                                            { color: subTextColor, fontFamily: 'SpaceGrotesk_400Regular' },
                                                        ]}
                                                    >
                                                        Permanently erase this book and all entries
                                                    </Text>
                                                </View>
                                                <ChevronRight size={16} color="#EF4444" />
                                            </TouchableOpacity>
                                        </Animated.View>
                                    )}
                                </View>
                            )}
                        </ScrollView>
                    </Animated.View>
                </KeyboardAvoidingView>

                {/* Sub Modal: Delete Confirmation */}
                <Modal
                    visible={showDeleteModal}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowDeleteModal(false)}
                >
                    <View style={styles.subModalOverlay}>
                        <GlassBackdrop isDark={isDark} onPress={() => setShowDeleteModal(false)} />
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                            style={styles.subModalCenter}
                        >
                            <View
                                style={[
                                    styles.subModalCard,
                                    {
                                        backgroundColor: modalBg,
                                        borderColor: cardBorder,
                                    },
                                ]}
                            >
                                <View style={[styles.subModalIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
                                    <AlertTriangle size={30} color="#EF4444" />
                                </View>
                                <Text style={[styles.subModalTitle, { color: textColor, fontFamily: 'SpaceGrotesk_700Bold' }]}>
                                    Delete "{bookNameForConfirm}"?
                                </Text>
                                <Text style={[styles.subModalSubtitle, { color: subTextColor, fontFamily: 'SpaceGrotesk_400Regular' }]}>
                                    This action is irreversible. All recorded transactions inside this book will be permanently deleted.
                                </Text>

                                <View
                                    style={[
                                        styles.deleteConfirmInputBox,
                                        {
                                            backgroundColor: isDeleteInputFocused
                                                ? isDark ? 'rgba(239, 68, 68, 0.08)' : '#FEF2F2'
                                                : inputBg,
                                            borderColor: isDeleteInputFocused ? '#EF4444' : cardBorder,
                                        },
                                    ]}
                                >
                                    <TextInput
                                        style={[
                                            styles.deleteConfirmInput,
                                            { color: textColor, fontFamily: 'SpaceGrotesk_700Bold' },
                                        ]}
                                        value={deleteConfirm}
                                        onChangeText={setDeleteConfirm}
                                        onFocus={() => setIsDeleteInputFocused(true)}
                                        onBlur={() => setIsDeleteInputFocused(false)}
                                        placeholder={`Type "${bookNameForConfirm}"`}
                                        placeholderTextColor={subTextColor}
                                        autoCapitalize="none"
                                    />
                                </View>

                                <View style={styles.subModalButtonRow}>
                                    <TouchableOpacity
                                        style={[styles.subModalCancelBtn, { backgroundColor: inputBg, borderColor: cardBorder }]}
                                        onPress={() => setShowDeleteModal(false)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[styles.subModalCancelBtnText, { color: textColor, fontFamily: 'SpaceGrotesk_700Bold' }]}>
                                            Cancel
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[
                                            styles.subModalDeleteBtn,
                                            {
                                                backgroundColor: '#EF4444',
                                                opacity: !canConfirmDelete || isDeleting ? 0.6 : 1,
                                            },
                                        ]}
                                        disabled={!canConfirmDelete || isDeleting}
                                        onPress={async () => {
                                            if (book) {
                                                try {
                                                    setIsDeleting(true);
                                                    await onDelete(book.id);
                                                    setShowDeleteModal(false);
                                                    onClose();
                                                } catch (error) {
                                                    Alert.alert('Error', 'Failed to delete book');
                                                } finally {
                                                    setIsDeleting(false);
                                                }
                                            }
                                        }}
                                        activeOpacity={0.85}
                                    >
                                        {isDeleting ? (
                                            <ActivityIndicator color="#fff" size="small" />
                                        ) : (
                                            <Text style={[styles.subModalDeleteBtnText, { fontFamily: 'SpaceGrotesk_700Bold' }]}>
                                                Delete Book
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </KeyboardAvoidingView>
                    </View>
                </Modal>

                {/* Sub Modal: Copy Book */}
                <Modal
                    visible={showCopyModal}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowCopyModal(false)}
                >
                    <View style={styles.subModalOverlay}>
                        <GlassBackdrop isDark={isDark} onPress={() => setShowCopyModal(false)} />
                        <View style={styles.subModalCenter}>
                            <View
                                style={[
                                    styles.subModalCard,
                                    {
                                        backgroundColor: modalBg,
                                        borderColor: cardBorder,
                                    },
                                ]}
                            >
                                <View style={[styles.subModalIconBox, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.18)' : 'rgba(16, 185, 129, 0.12)' }]}>
                                    <Copy size={28} color={colors.primary} />
                                </View>
                                <Text style={[styles.subModalTitle, { color: textColor, fontFamily: 'SpaceGrotesk_700Bold' }]}>
                                    Duplicate to Business
                                </Text>
                                <Text style={[styles.subModalSubtitle, { color: subTextColor, fontFamily: 'SpaceGrotesk_400Regular' }]}>
                                    Choose the destination business where this ledger will be duplicated.
                                </Text>

                                <ScrollView style={styles.businessListScroll} showsVerticalScrollIndicator={false}>
                                    {availableBusinesses.map((business) => {
                                        const isSelected = selectedTargetBusinessId === business.id;
                                        return (
                                            <TouchableOpacity
                                                key={business.id}
                                                style={[
                                                    styles.businessChoiceItem,
                                                    {
                                                        backgroundColor: inputBg,
                                                        borderColor: isSelected ? colors.primary : cardBorder,
                                                        borderWidth: isSelected ? 1.5 : 1,
                                                    },
                                                ]}
                                                onPress={() => setSelectedTargetBusinessId(business.id)}
                                                disabled={isCopying}
                                                activeOpacity={0.75}
                                            >
                                                <View style={[styles.businessChoiceAvatar, { backgroundColor: colors.primary }]}>
                                                    <Text style={[styles.businessChoiceAvatarText, { fontFamily: 'SpaceGrotesk_700Bold' }]}>
                                                        {business.name.charAt(0).toUpperCase()}
                                                    </Text>
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={[styles.businessChoiceName, { color: textColor, fontFamily: 'SpaceGrotesk_700Bold' }]}>
                                                        {business.name}
                                                    </Text>
                                                    <Text style={[styles.businessChoiceMeta, { color: subTextColor, fontFamily: 'SpaceGrotesk_400Regular' }]}>
                                                        {business.members?.length || 1} Members
                                                    </Text>
                                                </View>
                                                {isSelected && <Check size={18} color={colors.primary} strokeWidth={2.5} />}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>

                                <View style={styles.subModalButtonRow}>
                                    <TouchableOpacity
                                        style={[styles.subModalCancelBtn, { backgroundColor: inputBg, borderColor: cardBorder }]}
                                        onPress={() => setShowCopyModal(false)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[styles.subModalCancelBtnText, { color: textColor, fontFamily: 'SpaceGrotesk_700Bold' }]}>
                                            Cancel
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[
                                            styles.subModalPrimaryBtn,
                                            {
                                                backgroundColor: colors.primary,
                                                opacity: !selectedTargetBusinessId || isCopying ? 0.6 : 1,
                                            },
                                        ]}
                                        onPress={handleCopyBook}
                                        disabled={!selectedTargetBusinessId || isCopying}
                                        activeOpacity={0.85}
                                    >
                                        {isCopying ? (
                                            <ActivityIndicator size="small" color="#fff" />
                                        ) : (
                                            <Text style={[styles.subModalPrimaryBtnText, { fontFamily: 'SpaceGrotesk_700Bold' }]}>
                                                Confirm Duplicate
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* Sub Modal: Move Book */}
                <Modal
                    visible={showMoveModal}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowMoveModal(false)}
                >
                    <View style={styles.subModalOverlay}>
                        <GlassBackdrop isDark={isDark} onPress={() => setShowMoveModal(false)} />
                        <View style={styles.subModalCenter}>
                            <View
                                style={[
                                    styles.subModalCard,
                                    {
                                        backgroundColor: modalBg,
                                        borderColor: cardBorder,
                                    },
                                ]}
                            >
                                <View style={[styles.subModalIconBox, { backgroundColor: 'rgba(14, 165, 233, 0.15)' }]}>
                                    <Send size={28} color="#0EA5E9" />
                                </View>
                                <Text style={[styles.subModalTitle, { color: textColor, fontFamily: 'SpaceGrotesk_700Bold' }]}>
                                    Transfer to Business
                                </Text>
                                <Text style={[styles.subModalSubtitle, { color: subTextColor, fontFamily: 'SpaceGrotesk_400Regular' }]}>
                                    This book and all its records will be permanently transferred.
                                </Text>

                                <ScrollView style={styles.businessListScroll} showsVerticalScrollIndicator={false}>
                                    {availableBusinesses.map((business) => {
                                        const isSelected = selectedTargetBusinessId === business.id;
                                        return (
                                            <TouchableOpacity
                                                key={business.id}
                                                style={[
                                                    styles.businessChoiceItem,
                                                    {
                                                        backgroundColor: inputBg,
                                                        borderColor: isSelected ? '#0EA5E9' : cardBorder,
                                                        borderWidth: isSelected ? 1.5 : 1,
                                                    },
                                                ]}
                                                onPress={() => setSelectedTargetBusinessId(business.id)}
                                                disabled={isMoving}
                                                activeOpacity={0.75}
                                            >
                                                <View style={[styles.businessChoiceAvatar, { backgroundColor: '#0EA5E9' }]}>
                                                    <Text style={[styles.businessChoiceAvatarText, { fontFamily: 'SpaceGrotesk_700Bold' }]}>
                                                        {business.name.charAt(0).toUpperCase()}
                                                    </Text>
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={[styles.businessChoiceName, { color: textColor, fontFamily: 'SpaceGrotesk_700Bold' }]}>
                                                        {business.name}
                                                    </Text>
                                                    <Text style={[styles.businessChoiceMeta, { color: subTextColor, fontFamily: 'SpaceGrotesk_400Regular' }]}>
                                                        {business.members?.length || 1} Members
                                                    </Text>
                                                </View>
                                                {isSelected && <Check size={18} color="#0EA5E9" strokeWidth={2.5} />}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>

                                <View style={styles.subModalButtonRow}>
                                    <TouchableOpacity
                                        style={[styles.subModalCancelBtn, { backgroundColor: inputBg, borderColor: cardBorder }]}
                                        onPress={() => setShowMoveModal(false)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[styles.subModalCancelBtnText, { color: textColor, fontFamily: 'SpaceGrotesk_700Bold' }]}>
                                            Cancel
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[
                                            styles.subModalPrimaryBtn,
                                            {
                                                backgroundColor: '#0EA5E9',
                                                opacity: !selectedTargetBusinessId || isMoving ? 0.6 : 1,
                                            },
                                        ]}
                                        onPress={handleMoveBook}
                                        disabled={!selectedTargetBusinessId || isMoving}
                                        activeOpacity={0.85}
                                    >
                                        {isMoving ? (
                                            <ActivityIndicator size="small" color="#fff" />
                                        ) : (
                                            <Text style={[styles.subModalPrimaryBtnText, { fontFamily: 'SpaceGrotesk_700Bold' }]}>
                                                Confirm Transfer
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* Book Currency Picker Modal */}
                <CurrencyPickerModal
                    visible={currencyPickerVisible}
                    onClose={() => setCurrencyPickerVisible(false)}
                    selectedCurrency={bookCurrency}
                    onSelect={(code) => setBookCurrency(code)}
                    title="Select Book Currency"
                    subtitle="Set primary currency for this ledger"
                />
            </View>
        </Modal>
    );
});

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    keyboardView: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
    },
    popupContainer: {
        borderRadius: 28,
        width: SCREEN_WIDTH > 500 ? 440 : '92%',
        maxWidth: 440,
        maxHeight: SCREEN_HEIGHT * 0.88,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.35,
        shadowRadius: 35,
        elevation: 20,
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 22,
        paddingTop: 22,
        paddingBottom: 16,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 10,
    },
    headerIconBox: {
        width: 42,
        height: 42,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    headerTitle: {
        fontSize: 18,
    },
    headerSubtitle: {
        fontSize: 12,
        marginTop: 2,
    },
    closeButton: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
    },
    popupScrollContent: {
        paddingHorizontal: 22,
        paddingBottom: 24,
        gap: 16,
    },
    section: {
        gap: 8,
    },
    sectionLabel: {
        fontSize: 10,
        letterSpacing: 0.8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        borderWidth: 1.5,
        paddingHorizontal: 16,
        height: 52,
    },
    textInputField: {
        flex: 1,
        fontSize: 16,
        padding: 0,
    },
    currencyCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 16,
        borderWidth: 1,
    },
    currencyCardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    currencyIconBox: {
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    currencyCodeText: {
        fontSize: 16,
    },
    currencySubText: {
        fontSize: 11,
        marginTop: 2,
    },
    currencyChangeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        borderWidth: 1,
    },
    currencyChangeText: {
        fontSize: 12,
    },
    preferencesCard: {
        borderRadius: 18,
        borderWidth: 1,
        overflow: 'hidden',
    },
    preferenceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    preferenceIconBox: {
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    preferenceTextCol: {
        flex: 1,
        marginRight: 12,
    },
    preferenceTitle: {
        fontSize: 14,
        marginBottom: 2,
    },
    preferenceSubtitle: {
        fontSize: 12,
    },
    preferenceDivider: {
        height: 1,
        marginLeft: 66,
    },
    primarySaveBtn: {
        height: 52,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 4,
    },
    primarySaveBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
    },
    managementSection: {
        marginTop: 4,
    },
    managementToggleCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    managementToggleLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
        marginRight: 10,
    },
    managementToggleIcon: {
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    managementToggleTitle: {
        fontSize: 14,
        marginBottom: 2,
    },
    managementToggleSubtitle: {
        fontSize: 12,
    },
    managementOptionsList: {
        marginTop: 10,
        gap: 8,
    },
    managementOptionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
        gap: 12,
    },
    managementOptionIconBox: {
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    managementOptionTitle: {
        fontSize: 14,
        marginBottom: 2,
    },
    managementOptionSubtitle: {
        fontSize: 12,
    },
    // Sub-Modals
    subModalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    subModalCenter: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    subModalCard: {
        borderRadius: 26,
        padding: 24,
        width: '100%',
        maxWidth: 380,
        alignItems: 'center',
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.35,
        shadowRadius: 35,
        elevation: 20,
    },
    subModalIconBox: {
        width: 60,
        height: 60,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    subModalTitle: {
        fontSize: 18,
        marginBottom: 8,
        textAlign: 'center',
    },
    subModalSubtitle: {
        fontSize: 13,
        textAlign: 'center',
        marginBottom: 18,
        lineHeight: 18,
    },
    deleteConfirmInputBox: {
        width: '100%',
        borderWidth: 1.5,
        borderRadius: 14,
        paddingHorizontal: 16,
        height: 48,
        justifyContent: 'center',
        marginBottom: 20,
    },
    deleteConfirmInput: {
        fontSize: 14,
        textAlign: 'center',
        padding: 0,
    },
    subModalButtonRow: {
        flexDirection: 'row',
        gap: 10,
        width: '100%',
    },
    subModalCancelBtn: {
        flex: 1,
        height: 48,
        borderRadius: 14,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    subModalCancelBtnText: {
        fontSize: 14,
    },
    subModalDeleteBtn: {
        flex: 1.2,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    subModalDeleteBtnText: {
        fontSize: 14,
        color: '#FFFFFF',
    },
    subModalPrimaryBtn: {
        flex: 1.4,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    subModalPrimaryBtnText: {
        fontSize: 14,
        color: '#FFFFFF',
    },
    businessListScroll: {
        maxHeight: 240,
        width: '100%',
        marginBottom: 18,
    },
    businessChoiceItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 14,
        marginBottom: 8,
        gap: 12,
    },
    businessChoiceAvatar: {
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    businessChoiceAvatarText: {
        color: '#FFFFFF',
        fontSize: 16,
    },
    businessChoiceName: {
        fontSize: 14,
        marginBottom: 2,
    },
    businessChoiceMeta: {
        fontSize: 12,
    },
});
