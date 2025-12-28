import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { X, Briefcase, Sparkles, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface CreateBusinessModalProps {
    visible: boolean;
    onClose: () => void;
    businessName: string;
    onBusinessNameChange: (name: string) => void;
    onSubmit: () => void | Promise<void>;
    isFirstBusiness?: boolean;
}

export const CreateBusinessModal = ({
    visible,
    onClose,
    businessName,
    onBusinessNameChange,
    onSubmit,
    isFirstBusiness = false,
}: CreateBusinessModalProps) => {
    const handleSubmit = async () => {
        if (businessName.trim()) {
            await onSubmit();
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.modalOverlay}
            >
                <TouchableOpacity
                    style={styles.modalBackdrop}
                    activeOpacity={1}
                    onPress={onClose}
                />

                <View style={styles.modalContainer}>
                    {/* Close Button */}
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={onClose}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <X size={20} color="#64748b" />
                    </TouchableOpacity>

                    {/* Gradient Header Icon */}
                    <View style={styles.iconWrapper}>
                        <LinearGradient
                            colors={['#10b981', '#059669']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.iconGradient}
                        >
                            <Briefcase size={32} color="#fff" strokeWidth={2.5} />
                        </LinearGradient>
                    </View>

                    {/* Title & Description */}
                    <View style={styles.headerSection}>
                        <View style={styles.titleRow}>
                            <Text style={styles.title}>
                                {isFirstBusiness ? '✨ Create Your First Business' : 'Create New Business'}
                            </Text>
                        </View>
                        <Text style={styles.subtitle}>
                            {isFirstBusiness
                                ? "Let's get started! Give your business a name and we'll help you track finances effortlessly."
                                : 'Add a new business to your workspace and start tracking its finances.'}
                        </Text>
                    </View>

                    {/* Input Field */}
                    <View style={styles.inputSection}>
                        <Text style={styles.inputLabel}>Business Name</Text>
                        <View style={styles.inputWrapper}>
                            <View style={styles.inputIcon}>
                                <Briefcase size={18} color="#64748b" />
                            </View>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g., My Coffee Shop, Bakery Co."
                                placeholderTextColor="#94a3b8"
                                value={businessName}
                                onChangeText={onBusinessNameChange}
                                autoFocus
                                returnKeyType="done"
                                onSubmitEditing={handleSubmit}
                            />
                        </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionsSection}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={onClose}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.createButton,
                                !businessName.trim() && styles.createButtonDisabled,
                            ]}
                            onPress={handleSubmit}
                            disabled={!businessName.trim()}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={businessName.trim() ? ['#10b981', '#059669'] : ['#e2e8f0', '#e2e8f0']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.createButtonGradient}
                            >
                                <Text style={[
                                    styles.createButtonText,
                                    !businessName.trim() && styles.createButtonTextDisabled
                                ]}>
                                    Create Business
                                </Text>
                                <ChevronRight
                                    size={18}
                                    color={businessName.trim() ? '#fff' : '#94a3b8'}
                                    strokeWidth={2.5}
                                />
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                    {/* Helper Text */}
                    {isFirstBusiness && (
                        <View style={styles.helperSection}>
                            <Sparkles size={14} color="#10b981" />
                            <Text style={styles.helperText}>
                                You can add team members and customize settings later
                            </Text>
                        </View>
                    )}
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    modalContainer: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 28,
        width: '90%',
        maxWidth: 440,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 20 },
                shadowOpacity: 0.25,
                shadowRadius: 25,
            },
            android: {
                elevation: 24,
            },
            web: {
                boxShadow: '0px 20px 60px rgba(0, 0, 0, 0.3)',
            },
        }),
    },
    closeButton: {
        position: 'absolute',
        top: 20,
        right: 20,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    iconWrapper: {
        alignItems: 'center',
        marginBottom: 20,
    },
    iconGradient: {
        width: 72,
        height: 72,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#10b981',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.3,
                shadowRadius: 16,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    headerSection: {
        marginBottom: 28,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#0f172a',
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 15,
        color: '#64748b',
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: 8,
    },
    inputSection: {
        marginBottom: 24,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#475569',
        marginBottom: 10,
        marginLeft: 4,
    },
    inputWrapper: {
        position: 'relative',
        flexDirection: 'row',
        alignItems: 'center',
    },
    inputIcon: {
        position: 'absolute',
        left: 16,
        zIndex: 1,
    },
    input: {
        flex: 1,
        backgroundColor: '#f8fafc',
        borderWidth: 2,
        borderColor: '#e2e8f0',
        borderRadius: 14,
        paddingLeft: 48,
        paddingRight: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: '#0f172a',
        fontWeight: '500',
    },
    actionsSection: {
        flexDirection: 'row',
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#475569',
    },
    createButton: {
        flex: 2,
        borderRadius: 14,
        overflow: 'hidden',
    },
    createButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        gap: 8,
    },
    createButtonDisabled: {
        opacity: 1,
    },
    createButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
    createButtonTextDisabled: {
        color: '#94a3b8',
    },
    helperSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        gap: 8,
    },
    helperText: {
        fontSize: 13,
        color: '#10b981',
        fontWeight: '500',
    },
});
