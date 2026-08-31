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
import { GlassBackdrop } from '@/components/ui/glass-backdrop';
import { useTheme } from '@/providers/theme-provider';

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
    const { colors, isDark } = useTheme();

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
                <GlassBackdrop isDark={isDark} onPress={onClose} />

                <View
                    style={[
                        styles.modalContainer,
                        {
                            backgroundColor: colors.surfaceGlass,
                            borderColor: colors.borderGlass,
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

                    {/* Close Button */}
                    <TouchableOpacity
                        style={[
                            styles.closeButton,
                            {
                                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                            },
                        ]}
                        onPress={onClose}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <X size={18} color={colors.textSecondary} />
                    </TouchableOpacity>

                    {/* Icon */}
                    <View style={styles.iconWrapper}>
                        <LinearGradient
                            colors={['#10b981', '#059669']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.iconGradient}
                        >
                            <Briefcase size={32} color="#fff" strokeWidth={2.2} />
                        </LinearGradient>
                    </View>

                    {/* Header */}
                    <View style={styles.headerSection}>
                        <View style={styles.titleRow}>
                            <Text style={[styles.title, { color: colors.text }]}>
                                {isFirstBusiness ? 'Create Your Business' : 'Add New Business'}
                            </Text>
                        </View>
                        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                            {isFirstBusiness
                                ? 'Set up your workspace to start tracking income, expenses, and managing books with your team.'
                                : 'Create another business workspace to keep your ventures organized and separate.'}
                        </Text>
                    </View>

                    {/* Input Section */}
                    <View style={styles.inputSection}>
                        <Text style={[styles.inputLabel, { color: colors.text }]}>
                            Business Name
                        </Text>
                        <View
                            style={[
                                styles.inputContainer,
                                {
                                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
                                    borderColor: colors.borderGlass,
                                },
                            ]}
                        >
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                placeholder="e.g., Acme Studio, Bakery Co."
                                placeholderTextColor={colors.textSecondary}
                                value={businessName}
                                onChangeText={onBusinessNameChange}
                                autoCapitalize="words"
                                autoFocus
                                returnKeyType="done"
                                onSubmitEditing={handleSubmit}
                            />
                        </View>
                    </View>

                    {/* Action Button */}
                    <TouchableOpacity
                        style={[
                            styles.submitButton,
                            !businessName.trim() && styles.submitButtonDisabled,
                        ]}
                        onPress={handleSubmit}
                        disabled={!businessName.trim()}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={
                                businessName.trim()
                                    ? ['#10b981', '#059669']
                                    : isDark
                                    ? ['#334155', '#1e293b']
                                    : ['#cbd5e1', '#94a3b8']
                            }
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.submitGradient}
                        >
                            <Text style={styles.submitText}>
                                {isFirstBusiness ? 'Get Started' : 'Create Business'}
                            </Text>
                            <ChevronRight size={18} color="#fff" strokeWidth={2.5} />
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* Helper Text */}
                    {isFirstBusiness && (
                        <View style={styles.helperSection}>
                            <Sparkles size={14} color="#10b981" />
                            <Text style={[styles.helperText, { color: colors.textSecondary }]}>
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
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    modalContainer: {
        borderRadius: 24,
        borderWidth: 1,
        padding: 28,
        width: '90%',
        maxWidth: 440,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 20 },
                shadowOpacity: 0.3,
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
        fontFamily: 'SpaceGrotesk_700Bold',
        fontSize: 22,
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontFamily: 'SpaceGrotesk_400Regular',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        paddingHorizontal: 8,
    },
    inputSection: {
        marginBottom: 24,
    },
    inputLabel: {
        fontFamily: 'SpaceGrotesk_600SemiBold',
        fontSize: 13,
        marginBottom: 8,
        letterSpacing: 0.2,
    },
    inputContainer: {
        borderRadius: 14,
        borderWidth: 1,
        paddingHorizontal: 16,
        height: 52,
        justifyContent: 'center',
    },
    input: {
        fontFamily: 'SpaceGrotesk_500Medium',
        fontSize: 16,
        padding: 0,
    },
    submitButton: {
        borderRadius: 14,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#10b981',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.35,
                shadowRadius: 16,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    submitButtonDisabled: {
        opacity: 0.5,
        ...Platform.select({
            ios: {
                shadowOpacity: 0,
            },
            android: {
                elevation: 0,
            },
        }),
    },
    submitGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 24,
        gap: 8,
    },
    submitText: {
        fontFamily: 'SpaceGrotesk_700Bold',
        fontSize: 16,
        color: '#fff',
        letterSpacing: 0.3,
    },
    helperSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 16,
    },
    helperText: {
        fontFamily: 'SpaceGrotesk_400Regular',
        fontSize: 12,
        textAlign: 'center',
    },
});
