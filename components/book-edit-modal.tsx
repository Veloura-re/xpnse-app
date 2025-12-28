import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TextInput,
    TouchableOpacity,
    Switch,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Keyboard,
    TouchableWithoutFeedback,
    ScrollView,
    Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { X, Trash2, CreditCard, Tag, Copy, ArrowRight, Send } from 'lucide-react-native';
import { Book } from '@/types';
import { useBusiness } from '@/providers/business-provider';
import { useTheme } from '@/providers/theme-provider';
import { getFontFamily } from '@/config/font-config';

interface BookEditModalProps {
    visible: boolean;
    book: Book | null;
    onClose: () => void;
    onSave: (bookId: string | null, data: any) => void;
    onDelete: (bookId: string) => void;
}

const { width, height } = Dimensions.get('window');

export const BookEditModal = React.memo(function BookEditModal({ visible, book, onClose, onSave, onDelete }: BookEditModalProps) {
    const { businesses, currentBusiness, copyBook, moveBook } = useBusiness();
    const { deviceFont, colors, isDark } = useTheme();
    const [bookName, setBookName] = useState('');
    const [showPaymentMode, setShowPaymentMode] = useState(true);
    const [showCategory, setShowCategory] = useState(true);
    const [deleteConfirm, setDeleteConfirm] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showCopyModal, setShowCopyModal] = useState(false);
    const [showMoveModal, setShowMoveModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isCopying, setIsCopying] = useState(false);
    const [isMoving, setIsMoving] = useState(false);

    useEffect(() => {
        if (visible) {
            if (book) {
                setBookName(book.name);
                setShowPaymentMode(book.settings?.showPaymentMode ?? true);
                setShowCategory(book.settings?.showCategory ?? true);
            } else {
                setBookName('');
                setShowPaymentMode(true);
                setShowCategory(true);
            }
        }
    }, [visible, book]);

    const handleClose = () => {
        Keyboard.dismiss();
        onClose();
    };

    const handleSave = async () => {
        if (!bookName.trim()) {
            Alert.alert('Error', 'Please enter a book name');
            return;
        }

        const settings = {
            ...(book?.settings || {}),
            showPaymentMode,
            showCategory,
            showAttachments: book?.settings?.showAttachments ?? false,
        };

        try {
            setIsSaving(true);
            Keyboard.dismiss();
            await new Promise(resolve => setTimeout(resolve, 100));

            if (book) {
                await onSave(book.id, { name: bookName.trim(), settings });
            } else {
                await onSave(null, { name: bookName.trim(), settings });
            }
            handleClose();
        } catch (error) {
            console.error('Failed to save book:', error);
            Alert.alert('Error', 'Failed to save book');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = () => {
        setDeleteConfirm('');
        setShowDeleteModal(true);
    };

    const handleCopyBook = async (targetBusinessId: string) => {
        if (!book) return;
        try {
            setIsCopying(true);
            const result = await copyBook(book.id, targetBusinessId);
            if (result.success) {
                Alert.alert('Success', result.message);
                setShowCopyModal(false);
                onClose();
            } else {
                Alert.alert('Error', result.message);
            }
        } catch (error) {
            console.error('Failed to copy book:', error);
            Alert.alert('Error', 'Failed to copy book');
        } finally {
            setIsCopying(false);
        }
    };

    const handleMoveBook = async (targetBusinessId: string) => {
        if (!book) return;
        try {
            setIsMoving(true);
            const result = await moveBook(book.id, targetBusinessId);
            if (result.success) {
                Alert.alert('Success', result.message);
                setShowMoveModal(false);
                onClose();
            } else {
                Alert.alert('Error', result.message);
            }
        } catch (error) {
            console.error('Failed to move book:', error);
            Alert.alert('Error', 'Failed to move book');
        } finally {
            setIsMoving(false);
        }
    };

    const availableBusinesses = businesses.filter(b => b.id !== currentBusiness?.id);
    const bookNameForConfirm = book?.name || '';
    const canConfirmDelete = deleteConfirm.trim() === bookNameForConfirm.trim();

    // Theme Helpers
    const modalBackgroundColor = isDark ? 'rgba(10, 10, 10, 0.95)' : 'rgba(255, 255, 255, 0.95)';
    const textColor = isDark ? '#FFFFFF' : '#0F172A';
    const subTextColor = isDark ? '#A6A6A6' : '#64748B';
    const borderColor = isDark ? '#2C3333' : '#E2E8F0';
    const inputBg = isDark ? '#111111' : '#FFFFFF';
    const cardBg = isDark ? '#1B2020' : '#F8FAFC';

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleClose}
            statusBarTranslucent={true}
        >
            <View
                style={[styles.modalOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)' }]}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 20}
                    style={styles.keyboardView}
                    pointerEvents="box-none"
                >
                    <TouchableWithoutFeedback onPress={handleClose}>
                        <View style={StyleSheet.absoluteFill} />
                    </TouchableWithoutFeedback>

                    <Animated.View
                        entering={FadeInDown.duration(100)}
                        style={[
                            styles.popupContainer,
                            {
                                backgroundColor: isDark ? '#0A0A0A' : '#ffffff',
                                borderColor: isDark ? '#2C3333' : '#e2e8f0',
                                borderWidth: 1,
                            }
                        ]}
                    >
                        {/* Header */}
                        <View style={{ alignItems: 'center', padding: 24, paddingBottom: 16 }}>
                            <Text style={[styles.popupTitle, { fontFamily: 'AbrilFatface_400Regular', color: textColor, textAlign: 'center' }]}>
                                {book ? 'Edit Book' : 'Create Book'}
                            </Text>
                            <Text style={[styles.popupSubtitle, { color: subTextColor, textAlign: 'center' }]}>
                                {book ? 'Update your book settings' : 'Add a new ledger'}
                            </Text>
                        </View>

                        <ScrollView
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.popupContent}
                        >
                            {/* Book Name Input */}
                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: textColor }]}>Book Name</Text>
                                <TextInput
                                    style={[
                                        styles.textInput,
                                        {
                                            backgroundColor: inputBg,
                                            borderColor: borderColor,
                                            color: textColor
                                        }
                                    ]}
                                    value={bookName}
                                    onChangeText={setBookName}
                                    placeholder="e.g., Personal Finances"
                                    placeholderTextColor={subTextColor}
                                    autoFocus={!book}
                                    returnKeyType="done"
                                    onSubmitEditing={handleSave}
                                />
                            </View>

                            {/* Settings */}
                            <Text style={[styles.sectionTitle, { color: subTextColor }]}>DISPLAY OPTIONS</Text>
                            <View style={[styles.settingsContainer, { backgroundColor: cardBg, borderColor: borderColor }]}>
                                <TouchableOpacity
                                    style={styles.settingRow}
                                    onPress={() => setShowPaymentMode(!showPaymentMode)}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.iconBox, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#f0fdf4' }]}>
                                        <CreditCard size={20} color={isDark ? '#10b981' : colors.primary} />
                                    </View>
                                    <View style={styles.settingInfo}>
                                        <Text style={[styles.settingLabel, { color: textColor }]} numberOfLines={1}>Payment Mode</Text>
                                        <Text style={[styles.settingDescription, { color: subTextColor }]} numberOfLines={1}>Show payment icons</Text>
                                    </View>
                                    <Switch
                                        value={showPaymentMode}
                                        onValueChange={setShowPaymentMode}
                                        trackColor={{ false: isDark ? '#333' : '#e2e8f0', true: isDark ? '#21C98D' : '#3B82F6' }}
                                        thumbColor={"#FFFFFF"}
                                        ios_backgroundColor={isDark ? '#333' : '#e2e8f0'}
                                    />
                                </TouchableOpacity>

                                <View style={[styles.divider, { backgroundColor: borderColor }]} />

                                <TouchableOpacity
                                    style={styles.settingRow}
                                    onPress={() => setShowCategory(!showCategory)}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.iconBox, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#f0fdf4' }]}>
                                        <Tag size={20} color={isDark ? '#10b981' : colors.primary} />
                                    </View>
                                    <View style={styles.settingInfo}>
                                        <Text style={[styles.settingLabel, { color: textColor }]} numberOfLines={1}>Category</Text>
                                        <Text style={[styles.settingDescription, { color: subTextColor }]} numberOfLines={1}>Show category tags</Text>
                                    </View>
                                    <Switch
                                        value={showCategory}
                                        onValueChange={setShowCategory}
                                        trackColor={{ false: isDark ? '#333' : '#e2e8f0', true: isDark ? '#21C98D' : '#3B82F6' }}
                                        thumbColor={"#FFFFFF"}
                                        ios_backgroundColor={isDark ? '#333' : '#e2e8f0'}
                                    />
                                </TouchableOpacity>
                            </View>

                            {/* Action Buttons */}
                            <View style={styles.actionButtons}>
                                <TouchableOpacity
                                    style={styles.saveButtonWrapper}
                                    onPress={handleSave}
                                    disabled={!bookName.trim() || isSaving}
                                    activeOpacity={0.9}
                                >
                                    <LinearGradient
                                        colors={['#10b981', '#059669']}
                                        style={[styles.saveButton, (!bookName.trim() || isSaving) && styles.disabledButton]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                    >
                                        {isSaving ? (
                                            <ActivityIndicator color="#fff" size="small" />
                                        ) : (
                                            <>
                                                <Text style={styles.saveButtonText}>
                                                    {book ? 'Save Changes' : 'Create Book'}
                                                </Text>
                                                {!book && <ArrowRight size={20} color="#fff" />}
                                            </>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>

                            {book && (
                                <View style={styles.secondaryActions}>
                                    {availableBusinesses.length > 0 && (
                                        <>
                                            <TouchableOpacity
                                                style={[styles.secondaryButton, { backgroundColor: cardBg, borderColor: borderColor }]}
                                                onPress={() => setShowCopyModal(true)}
                                                disabled={isSaving}
                                            >
                                                <Copy size={18} color={subTextColor} />
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={[styles.secondaryButton, { backgroundColor: cardBg, borderColor: borderColor }]}
                                                onPress={() => setShowMoveModal(true)}
                                                disabled={isSaving}
                                            >
                                                <ArrowRight size={18} color={subTextColor} />
                                            </TouchableOpacity>
                                        </>
                                    )}

                                    <TouchableOpacity
                                        style={[styles.secondaryButton, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2', borderColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2', marginLeft: 'auto', flex: 1 }]}
                                        onPress={handleDelete}
                                        disabled={isSaving}
                                    >
                                        <Trash2 size={18} color="#EF4444" />
                                        <Text style={{ color: '#EF4444', fontSize: 13, fontWeight: '600' }}>Delete Book</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </ScrollView>
                    </Animated.View>
                </KeyboardAvoidingView>

                {/* Sub Modals - Embed them here directly to avoid fragment issues if any, or keep outside key view but inside Modal? No, these are independent Modals. */}
                {/* Delete Modal */}
                <Modal
                    visible={showDeleteModal}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowDeleteModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)' }]} />
                        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.confirmWrapper}>
                            <View style={[styles.confirmContent, { backgroundColor: isDark ? '#0A0A0A' : '#ffffff', borderColor: borderColor, borderWidth: 1 }]}>
                                <View style={[styles.deleteIconContainer, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                                    <Trash2 size={32} color="#EF4444" />
                                </View>
                                <Text style={[styles.confirmTitle, { color: textColor }]}>Delete "{bookNameForConfirm}"?</Text>
                                <Text style={[styles.confirmMessage, { color: subTextColor }]}>
                                    This action cannot be undone. All entries will be lost using the Delete feature.
                                </Text>
                                <TextInput
                                    style={[styles.confirmInput, { backgroundColor: inputBg, borderColor: borderColor, color: textColor }]}
                                    value={deleteConfirm}
                                    onChangeText={setDeleteConfirm}
                                    placeholder={`Type "${bookNameForConfirm}" to confirm`}
                                    placeholderTextColor={subTextColor}
                                    autoCapitalize="none"
                                />
                                <View style={styles.confirmButtons}>
                                    <TouchableOpacity
                                        style={[styles.confirmCancelButton, { backgroundColor: cardBg }]}
                                        onPress={() => setShowDeleteModal(false)}
                                    >
                                        <Text style={[styles.cancelButtonText, { color: subTextColor }]}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.confirmDeleteWrapper}
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
                                    >
                                        <LinearGradient
                                            colors={['#EF4444', '#DC2626']}
                                            style={[styles.confirmDeleteButton, (!canConfirmDelete || isDeleting) && styles.disabledButton]}
                                        >
                                            {isDeleting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.confirmDeleteText}>Delete Book</Text>}
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </KeyboardAvoidingView>
                    </View>
                </Modal>

                {/* Copy Modal */}
                <Modal
                    visible={showCopyModal}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowCopyModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)' }]} />
                        <View style={[styles.confirmContent, { backgroundColor: isDark ? '#0A0A0A' : '#ffffff', borderColor: borderColor, borderWidth: 1 }]}>
                            <View style={[styles.headerIconContainer, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#f0fdf4' }]}>
                                <Copy size={24} color={isDark ? '#10b981' : colors.primary} />
                            </View>
                            <Text style={[styles.confirmTitle, { fontFamily: 'AbrilFatface_400Regular', color: textColor }]}>Copy to Business</Text>
                            <Text style={[styles.confirmMessage, { color: subTextColor }]}>Select destination business.</Text>

                            <ScrollView style={styles.businessList} showsVerticalScrollIndicator={false}>
                                {availableBusinesses.map(business => (
                                    <TouchableOpacity
                                        key={business.id}
                                        style={[styles.businessItem, { backgroundColor: cardBg, borderColor: borderColor }]}
                                        onPress={() => handleCopyBook(business.id)}
                                        disabled={isCopying}
                                    >
                                        <View style={[styles.businessItemIcon, { backgroundColor: '#10b981' }]}>
                                            <Text style={styles.businessItemInitial}>{business.name.charAt(0).toUpperCase()}</Text>
                                        </View>
                                        <Text style={[styles.businessItemName, { color: textColor }]}>{business.name}</Text>
                                        {isCopying && <ActivityIndicator size="small" color="#10b981" />}
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            <TouchableOpacity style={[styles.confirmCancelButton, { backgroundColor: cardBg }]} onPress={() => setShowCopyModal(false)}>
                                <Text style={[styles.cancelButtonText, { color: subTextColor }]}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                {/* Move Modal */}
                <Modal
                    visible={showMoveModal}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowMoveModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)' }]} />
                        <View style={[styles.confirmContent, { backgroundColor: isDark ? '#0A0A0A' : '#ffffff', borderColor: borderColor, borderWidth: 1 }]}>
                            <View style={[styles.headerIconContainer, { backgroundColor: isDark ? 'rgba(14, 165, 233, 0.15)' : '#F0F9FF' }]}>
                                <ArrowRight size={24} color="#0EA5E9" />
                            </View>
                            <Text style={[styles.confirmTitle, { fontFamily: 'AbrilFatface_400Regular', color: textColor }]}>Move to Business</Text>
                            <Text style={[styles.confirmMessage, { color: subTextColor }]}>Select destination business.</Text>

                            <ScrollView style={styles.businessList} showsVerticalScrollIndicator={false}>
                                {availableBusinesses.map(business => (
                                    <TouchableOpacity
                                        key={business.id}
                                        style={[styles.businessItem, { backgroundColor: cardBg, borderColor: borderColor }]}
                                        onPress={() => handleMoveBook(business.id)}
                                        disabled={isMoving}
                                    >
                                        <View style={[styles.businessItemIcon, { backgroundColor: '#0EA5E9' }]}>
                                            <Text style={styles.businessItemInitial}>{business.name.charAt(0).toUpperCase()}</Text>
                                        </View>
                                        <Text style={[styles.businessItemName, { color: textColor }]}>{business.name}</Text>
                                        {isMoving && <ActivityIndicator size="small" color="#0EA5E9" />}
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            <TouchableOpacity style={[styles.confirmCancelButton, { backgroundColor: cardBg }]} onPress={() => setShowMoveModal(false)}>
                                <Text style={[styles.cancelButtonText, { color: subTextColor }]}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
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
        padding: 20,
    },
    popupContainer: {
        borderRadius: 32,
        width: '90%',
        maxWidth: 380,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.25,
        shadowRadius: 40,
        elevation: 20,
        overflow: 'hidden',
    },
    popupTitle: {
        fontSize: 26,
        marginBottom: 8,
    },
    popupSubtitle: {
        fontSize: 14,
        paddingHorizontal: 20,
        lineHeight: 20,
    },
    popupContent: {
        padding: 24,
        paddingTop: 8,
    },
    inputGroup: {
        marginBottom: 24,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 8,
        marginLeft: 4,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    textInput: {
        borderWidth: 1,
        borderRadius: 18,
        padding: 16,
        fontSize: 17,
        fontWeight: '500',
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 8,
        marginLeft: 4,
        textTransform: 'uppercase',
    },
    settingsContainer: {
        borderRadius: 20,
        borderWidth: 1,
        overflow: 'hidden',
        marginBottom: 28,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        paddingHorizontal: 16,
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    settingInfo: {
        flex: 1,
        marginRight: 12,
    },
    settingLabel: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    settingDescription: {
        fontSize: 13,
    },
    divider: {
        height: 1,
        marginLeft: 76,
    },
    actionButtons: {
        flexDirection: 'row',
        marginBottom: 24,
    },
    saveButtonWrapper: {
        flex: 1,
        borderRadius: 18,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 6,
    },
    saveButton: {
        flexDirection: 'row',
        paddingVertical: 18,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    saveButtonText: {
        fontSize: 17,
        fontWeight: '700',
        color: '#fff',
    },
    disabledButton: {
        opacity: 0.6,
    },
    secondaryActions: {
        flexDirection: 'row',
        gap: 10,
        alignItems: 'center',
    },
    secondaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: 48,
        height: 48,
        borderRadius: 16,
        borderWidth: 1,
        gap: 8,
    },
    secondaryButtonText: {
        fontSize: 13,
        fontWeight: '600',
    },
    // Leaving Sub Modal Styles as they are mostly fine, just ensuring keys don't break
    confirmWrapper: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        padding: 20,
    },
    confirmContent: {
        borderRadius: 28,
        padding: 28,
        width: '100%',
        maxWidth: 380,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.3,
        shadowRadius: 40,
        elevation: 20,
    },
    deleteIconContainer: {
        width: 70,
        height: 70,
        borderRadius: 35,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    headerIconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    confirmTitle: {
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 12,
        textAlign: 'center',
    },
    confirmMessage: {
        fontSize: 15,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    confirmInput: {
        width: '100%',
        borderWidth: 1,
        borderRadius: 14,
        padding: 16,
        fontSize: 16,
        marginBottom: 24,
        textAlign: 'center',
    },
    confirmButtons: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    confirmCancelButton: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    confirmDeleteWrapper: {
        flex: 1,
        borderRadius: 14,
        overflow: 'hidden',
    },
    confirmDeleteButton: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    confirmDeleteText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    businessList: {
        maxHeight: 280,
        width: '100%',
        marginBottom: 20,
    },
    businessItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 10,
        borderWidth: 1,
    },
    businessItemIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    businessItemInitial: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
    },
    businessItemName: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
    },
});
