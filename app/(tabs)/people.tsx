import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Users, Bell, FileText } from 'lucide-react-native';
import { router } from 'expo-router';
import { PartiesView } from '@/components/parties-view';
import { useBusiness } from '@/providers/business-provider';

// Temporarily import full team screen - will show its own header
import TeamScreen from './team';

type ViewMode = 'parties' | 'team';

export default function PeopleScreen() {
    const insets = useSafeAreaInsets();
    const { currentBusiness } = useBusiness();
    const [viewMode, setViewMode] = useState<ViewMode>('parties');

    // For Team view, render full screen without our header
    if (viewMode === 'team') {
        return <TeamScreen />;
    }

    // For Parties view, show our header with segmented control
    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View style={styles.headerTopLeft}>
                        <Users size={24} color="#10b981" />
                        <Text style={styles.title}>People</Text>
                    </View>
                    <View style={styles.headerActions}>
                        <TouchableOpacity
                            style={styles.iconButton}
                            onPress={() => router.push('/notes')}
                            activeOpacity={0.7}
                        >
                            <FileText size={18} color="#6b7280" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.iconButton}
                            onPress={() => router.push('/notifications')}
                            activeOpacity={0.7}
                        >
                            <Bell size={18} color="#6b7280" />
                        </TouchableOpacity>
                    </View>
                </View>
                <Text style={styles.subtitle}>{currentBusiness?.name}</Text>

                {/* Segmented Control */}
                <View style={styles.segmentedControl}>
                    <TouchableOpacity
                        style={[
                            styles.segment,
                            styles.segmentActive
                        ]}
                        onPress={() => setViewMode('parties')}
                        activeOpacity={0.7}
                    >
                        <Text style={[
                            styles.segmentText,
                            styles.segmentTextActive
                        ]}>
                            Parties
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.segment,
                        ]}
                        onPress={() => setViewMode('team')}
                        activeOpacity={0.7}
                    >
                        <Text style={[
                            styles.segmentText,
                        ]}>
                            Team
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Content */}
            <View style={styles.content}>
                <PartiesView />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    header: {
        backgroundColor: 'white',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    headerTopLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerActions: {
        flexDirection: 'row',
        gap: 10,
    },
    iconButton: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#f3f4f6',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    subtitle: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 16,
    },
    segmentedControl: {
        flexDirection: 'row',
        backgroundColor: '#f3f4f6',
        borderRadius: 10,
        padding: 4,
    },
    segment: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    segmentActive: {
        backgroundColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    segmentText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6b7280',
    },
    segmentTextActive: {
        color: '#10b981',
        fontWeight: '600',
    },
    content: {
        flex: 1,
    },
});
