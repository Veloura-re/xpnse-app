import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert,
    ScrollView,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useBusiness } from '@/providers/business-provider';
import { useTheme } from '@/providers/theme-provider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Save, Check } from 'lucide-react-native';

import { useFonts, AbrilFatface_400Regular } from '@expo-google-fonts/abril-fatface';
import { getFontFamily } from '@/config/font-config';

export default function NotesScreen() {
    const { currentBusiness, updateBusiness } = useBusiness();
    const { deviceFont, colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [notes, setNotes] = useState(currentBusiness?.notes || '');
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    useEffect(() => {
        setNotes(currentBusiness?.notes || '');
        setHasChanges(false);
        setIsSaved(false);
    }, [currentBusiness?.notes]);

    const handleSave = async () => {
        if (!currentBusiness || !hasChanges) return;

        try {
            setIsSaving(true);
            await updateBusiness({ notes: notes.trim() });
            setHasChanges(false);
            setIsSaved(true);
        } catch (error) {
            Alert.alert('Error', 'Failed to save notes');
        } finally {
            setIsSaving(false);
        }
    };

    const handleNotesChange = (text: string) => {
        setNotes(text);
        const changed = text.trim() !== (currentBusiness?.notes || '').trim();
        setHasChanges(changed);
        if (changed) {
            setIsSaved(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 20}
        >
            <Stack.Screen options={{ headerShown: false }} />
            {/* Decorative Circles */}
            <View style={[styles.circle1, { backgroundColor: isDark ? 'rgba(33, 201, 141, 0.05)' : 'rgba(16, 185, 129, 0.1)' }]} />
            <View style={[styles.circle2, { backgroundColor: isDark ? 'rgba(33, 201, 141, 0.03)' : 'rgba(16, 185, 129, 0.08)' }]} />

            {/* Header */}
            <View
                style={styles.headerContainer}
            >
                <View style={styles.headerTop}>
                    <TouchableOpacity
                        style={[styles.backButton, { backgroundColor: colors.card }]}
                        onPress={() => router.back()}
                    >
                        <ChevronLeft size={24} color={colors.text} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.saveButton,
                            { backgroundColor: colors.primary },
                            (!hasChanges && !isSaved) && [styles.saveButtonDisabled, { backgroundColor: colors.card }],
                            isSaved && [styles.saveButtonSuccess, { backgroundColor: isDark ? 'rgba(33, 201, 141, 0.15)' : '#dcfce7' }]
                        ]}
                        onPress={handleSave}
                        disabled={!hasChanges || isSaving}
                        activeOpacity={0.8}
                    >
                        {isSaving ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : isSaved ? (
                            <>
                                <Check size={16} color={colors.primary} />
                                <Text style={[styles.saveButtonTextSuccess, { color: colors.primary }]}>Saved</Text>
                            </>
                        ) : (
                            <>
                                <Save size={16} color={hasChanges ? '#fff' : colors.textSecondary} />
                                <Text style={[styles.saveButtonText, !hasChanges && [styles.saveButtonTextDisabled, { color: colors.textSecondary }]]}>
                                    Save
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
                <Text style={[styles.appName, { color: colors.primary }]}>Workspace</Text>
                <Text style={[styles.headerTitle, { fontFamily: getFontFamily(deviceFont), color: colors.text }]}>Business Notes</Text>
            </View>

            {/* Content */}
            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.contentContainer}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View style={[styles.noteCard, { backgroundColor: colors.card, borderColor: colors.border }]}>


                    <TextInput
                        style={[styles.noteInput, { color: colors.text }]}
                        placeholder="Write your business notes here..."
                        placeholderTextColor={colors.textSecondary}
                        multiline
                        value={notes}
                        onChangeText={handleNotesChange}
                        textAlignVertical="top"
                        autoFocus
                    />
                </View>

                <View style={styles.footer}>
                    <Text style={[styles.hint, { color: colors.textSecondary }]}>
                        Private • Visible only to owners
                    </Text>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        overflow: 'hidden',
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
        backgroundColor: 'rgba(16, 185, 129, 0.08)',
    },
    headerContainer: {
        paddingHorizontal: 24,
        paddingBottom: 20,
        paddingTop: 10,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        justifyContent: 'center',
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
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#10b981', // Emerald primary
        borderRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    saveButtonDisabled: {
        backgroundColor: '#f1f5f9',
        shadowOpacity: 0,
        elevation: 0,
    },
    saveButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#fff',
    },
    saveButtonTextDisabled: {
        color: '#94a3b8',
    },
    saveButtonSuccess: {
        backgroundColor: '#dcfce7',
        shadowOpacity: 0,
        elevation: 0,
    },
    saveButtonTextSuccess: {
        fontSize: 14,
        fontWeight: '700',
        color: '#15803d',
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    noteCard: {
        backgroundColor: '#fefce8', // Very light yellow paper look
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        padding: 24,
        minHeight: 500,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 4,
    },

    noteInput: {
        fontSize: 17,
        color: '#422006',
        lineHeight: 28,
        minHeight: 400,
        textAlignVertical: 'top',
        fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    },
    footer: {
        marginTop: 20,
        alignItems: 'center',
    },
    hint: {
        fontSize: 13,
        color: '#94a3b8',
        fontWeight: '500',
    },
});
