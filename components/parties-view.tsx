import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    Modal,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from 'react-native';
import { useBusiness } from '@/providers/business-provider';
import { useTheme } from '@/providers/theme-provider';
import { Party } from '@/types';
import { Plus, Search, X, Users, User, Building2, Phone, Mail } from 'lucide-react-native';

export function PartiesView() {
    const { parties, createParty, updateParty, deleteParty } = useBusiness();
    const { colors } = useTheme();

    const styles = useMemo(() => StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: 'white',
        },
        searchContainer: {
            padding: 20,
            paddingBottom: 0,
        },
        searchWrapper: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#f3f4f6',
            borderRadius: 12,
            paddingHorizontal: 16,
            height: 48,
        },
        searchInput: {
            flex: 1,
            marginLeft: 10,
            fontSize: 16,
            color: '#111827',
        },
        listContent: {
            padding: 20,
            paddingBottom: 100,
        },
        card: {
            backgroundColor: 'white',
            borderRadius: 12,
            padding: 16,
            marginBottom: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 2,
        },
        cardHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
        },
        avatarContainer: {
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: '#f0fdf4',
            justifyContent: 'center',
            alignItems: 'center',
        },
        cardInfo: {
            flex: 1,
        },
        cardName: {
            fontSize: 16,
            fontWeight: '600',
            color: '#1f2937',
        },
        cardType: {
            fontSize: 12,
            marginTop: 2,
            fontWeight: '500',
        },
        customerType: {
            color: colors.primary,
        },
        vendorType: {
            color: '#059669',
        },
        contactInfo: {
            marginTop: 12,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: '#f3f4f6',
            gap: 8,
        },
        contactRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
        },
        contactText: {
            fontSize: 13,
            color: '#6b7280',
        },
        emptyState: {
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: 60,
        },
        emptyText: {
            fontSize: 18,
            fontWeight: '600',
            color: '#374151',
            marginTop: 16,
        },
        emptySubtext: {
            fontSize: 14,
            color: '#6b7280',
            marginTop: 8,
        },
        fab: {
            position: 'absolute',
            bottom: 24,
            right: 24,
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: colors.primary,
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
        },
        modalOverlay: {
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'flex-end',
        },
        modalContent: {
            backgroundColor: 'white',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 24,
            maxHeight: '90%',
        },
        modalHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24,
        },
        modalTitle: {
            fontSize: 20,
            fontWeight: '700',
            color: '#111827',
        },
        form: {
            gap: 16,
        },
        typeSelector: {
            flexDirection: 'row',
            backgroundColor: '#f3f4f6',
            padding: 4,
            borderRadius: 8,
            marginBottom: 8,
        },
        typeOption: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 8,
            gap: 8,
            borderRadius: 6,
        },
        typeOptionActive: {
            backgroundColor: 'white',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1,
        },
        typeText: {
            fontSize: 14,
            fontWeight: '500',
            color: '#6b7280',
        },
        typeTextActive: {
            color: '#1f2937',
            fontWeight: '600',
        },
        inputGroup: {
            gap: 6,
        },
        label: {
            fontSize: 14,
            fontWeight: '500',
            color: '#374151',
        },
        input: {
            borderWidth: 1,
            borderColor: '#e5e7eb',
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
            fontSize: 16,
            color: '#1f2937',
        },
        modalActions: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            marginTop: 8,
        },
        cancelButton: {
            flex: 1,
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 8,
            backgroundColor: '#f3f4f6',
            alignItems: 'center',
        },
        cancelButtonText: {
            fontSize: 16,
            fontWeight: '600',
            color: '#4b5563',
        },
        saveButton: {
            flex: 1,
            paddingVertical: 12,
            paddingHorizontal: 24,
            borderRadius: 8,
            backgroundColor: colors.primary,
            alignItems: 'center',
        },
        saveButtonText: {
            fontSize: 16,
            fontWeight: '600',
            color: 'white',
        },
    }), [colors]);

    const [searchQuery, setSearchQuery] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [editingParty, setEditingParty] = useState<Party | null>(null);

    // Form State
    const [name, setName] = useState('');
    const [type, setType] = useState<'customer' | 'vendor'>('customer');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');

    const filteredParties = useMemo(() => {
        if (!searchQuery.trim()) return parties;
        const query = searchQuery.toLowerCase();
        return parties.filter(p =>
            p.name.toLowerCase().includes(query) ||
            p.email?.toLowerCase().includes(query) ||
            p.phone?.includes(query)
        );
    }, [parties, searchQuery]);

    const handleOpenModal = (party?: Party) => {
        if (party) {
            setEditingParty(party);
            setName(party.name);
            setType(party.type);
            setEmail(party.email || '');
            setPhone(party.phone || '');
        } else {
            setEditingParty(null);
            setName('');
            setType('customer');
            setEmail('');
            setPhone('');
        }
        setModalVisible(true);
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Name is required');
            return;
        }

        try {
            if (editingParty) {
                await updateParty(editingParty.id, { name, type, email, phone });
            } else {
                await createParty(name, type, email, phone);
            }
            setModalVisible(false);
        } catch (error) {
            Alert.alert('Error', 'Failed to save party');
        }
    };

    const handleDelete = (party: Party) => {
        Alert.alert(
            'Delete Party',
            `Are you sure you want to delete ${party.name}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteParty(party.id);
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete party');
                        }
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }: { item: Party }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => handleOpenModal(item)}
            activeOpacity={0.7}
        >
            <View style={styles.cardHeader}>
                <View style={styles.avatarContainer}>
                    {item.type === 'customer' ? (
                        <User size={20} color={colors.primary} />
                    ) : (
                        <Building2 size={20} color="#059669" />
                    )}
                </View>
                <View style={styles.cardInfo}>
                    <Text style={styles.cardName}>{item.name}</Text>
                    <Text style={[styles.cardType, item.type === 'vendor' ? styles.vendorType : styles.customerType]}>
                        {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                    </Text>
                </View>
            </View>

            {(item.email || item.phone) && (
                <View style={styles.contactInfo}>
                    {item.email && (
                        <View style={styles.contactRow}>
                            <Mail size={14} color="#6b7280" />
                            <Text style={styles.contactText}>{item.email}</Text>
                        </View>
                    )}
                    {item.phone && (
                        <View style={styles.contactRow}>
                            <Phone size={14} color="#6b7280" />
                            <Text style={styles.contactText}>{item.phone}</Text>
                        </View>
                    )}
                </View>
            )}
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.searchContainer}>
                <View style={styles.searchWrapper}>
                    <Search size={20} color="#9ca3af" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search customers & vendors..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholderTextColor="#9ca3af"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <X size={18} color="#9ca3af" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <FlatList
                data={filteredParties}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Users size={48} color="#d1d5db" />
                        <Text style={styles.emptyText}>No parties found</Text>
                        <Text style={styles.emptySubtext}>Add customers or vendors to track transactions</Text>
                    </View>
                }
            />

            <TouchableOpacity
                style={styles.fab}
                onPress={() => handleOpenModal()}
                activeOpacity={0.8}
            >
                <Plus size={24} color="white" />
            </TouchableOpacity>

            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {editingParty ? 'Edit Party' : 'New Party'}
                            </Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <X size={24} color="#6b7280" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.form}>
                            <View style={styles.typeSelector}>
                                <TouchableOpacity
                                    style={[styles.typeOption, type === 'customer' && styles.typeOptionActive]}
                                    onPress={() => setType('customer')}
                                >
                                    <User size={16} color={type === 'customer' ? colors.primary : '#6b7280'} />
                                    <Text style={[styles.typeText, type === 'customer' && styles.typeTextActive]}>Customer</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.typeOption, type === 'vendor' && styles.typeOptionActive]}
                                    onPress={() => setType('vendor')}
                                >
                                    <Building2 size={16} color={type === 'vendor' ? colors.primary : '#6b7280'} />
                                    <Text style={[styles.typeText, type === 'vendor' && styles.typeTextActive]}>Vendor</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Name</Text>
                                <TextInput
                                    style={styles.input}
                                    value={name}
                                    onChangeText={setName}
                                    placeholder="e.g. John Doe or Acme Corp"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Email (Optional)</Text>
                                <TextInput
                                    style={styles.input}
                                    value={email}
                                    onChangeText={setEmail}
                                    placeholder="email@example.com"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Phone (Optional)</Text>
                                <TextInput
                                    style={styles.input}
                                    value={phone}
                                    onChangeText={setPhone}
                                    placeholder="+1 234 567 8900"
                                    keyboardType="phone-pad"
                                />
                            </View>

                            <View style={styles.modalActions}>
                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    onPress={() => setModalVisible(false)}
                                >
                                    <Text style={styles.cancelButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.saveButton}
                                    onPress={handleSave}
                                >
                                    <Text style={styles.saveButtonText}>Save</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}
