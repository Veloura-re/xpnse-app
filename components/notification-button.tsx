import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Bell } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useNotifications } from '@/providers/notification-provider';

export function NotificationButton() {
    const router = useRouter();
    const { unreadCount } = useNotifications();

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={() => router.push('/notifications')}
            activeOpacity={0.7}
        >
            <Bell size={24} color="#0f172a" />
            {unreadCount > 0 && (
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 8,
        marginRight: 8,
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: '#ef4444',
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: '#fff',
        paddingHorizontal: 2,
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
        lineHeight: 12,
    },
});
