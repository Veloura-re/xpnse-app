import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { auth, db, firebaseInitialized, firebaseError } from '@/config/firebase';

export default function FirebaseDebugScreen() {
    const envVars = {
        apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    };

    const allVarsPresent = Object.values(envVars).every(v => v && v !== 'undefined');

    return (
        <ScrollView style={styles.container}>
            <View style={styles.section}>
                <Text style={styles.title}>🔥 Firebase Configuration Debug</Text>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Firebase Initialization Status</Text>
                    <StatusItem
                        label="Initialized"
                        value={firebaseInitialized ? '✅ Yes' : '❌ No'}
                        isGood={firebaseInitialized}
                    />
                    <StatusItem
                        label="Auth Object"
                        value={auth ? '✅ Present' : '❌ Null'}
                        isGood={!!auth}
                    />
                    <StatusItem
                        label="Firestore Object"
                        value={db ? '✅ Present' : '❌ Null'}
                        isGood={!!db}
                    />
                    {firebaseError && (
                        <View style={styles.errorBox}>
                            <Text style={styles.errorText}>Error: {firebaseError.message}</Text>
                        </View>
                    )}
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Environment Variables</Text>
                    <StatusItem
                        label="All Variables Present"
                        value={allVarsPresent ? '✅ Yes' : '❌ No'}
                        isGood={allVarsPresent}
                    />
                    <EnvVarItem label="API Key" value={envVars.apiKey} />
                    <EnvVarItem label="Auth Domain" value={envVars.authDomain} />
                    <EnvVarItem label="Project ID" value={envVars.projectId} />
                    <EnvVarItem label="Storage Bucket" value={envVars.storageBucket} />
                    <EnvVarItem label="Messaging Sender ID" value={envVars.messagingSenderId} />
                    <EnvVarItem label="App ID" value={envVars.appId} />
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Expected Values</Text>
                    <Text style={styles.infoText}>API Key: AIzaSyD65DFf80JpbowSZQu6w2a6FYGxZnSJSMk</Text>
                    <Text style={styles.infoText}>Auth Domain: cashiee.firebaseapp.com</Text>
                    <Text style={styles.infoText}>Project ID: cashiee</Text>
                    <Text style={styles.infoText}>Storage Bucket: cashiee.firebasestorage.app</Text>
                    <Text style={styles.infoText}>Messaging Sender ID: 572518473431</Text>
                    <Text style={styles.infoText}>App ID: 1:572518473431:android:342a9725a05b2fa48c5a92</Text>
                </View>

                {!firebaseInitialized && (
                    <View style={styles.fixCard}>
                        <Text style={styles.fixTitle}>🔧 How to Fix</Text>
                        <Text style={styles.fixText}>1. Stop the development server (Ctrl+C)</Text>
                        <Text style={styles.fixText}>2. Verify .env file has all variables</Text>
                        <Text style={styles.fixText}>3. Run: npx expo start --clear</Text>
                        <Text style={styles.fixText}>4. Refresh this page</Text>
                    </View>
                )}
            </View>
        </ScrollView>
    );
}

function StatusItem({ label, value, isGood }: { label: string; value: string; isGood: boolean }) {
    return (
        <View style={styles.statusRow}>
            <Text style={styles.label}>{label}:</Text>
            <Text style={[styles.value, isGood ? styles.good : styles.bad]}>{value}</Text>
        </View>
    );
}

function EnvVarItem({ label, value }: { label: string; value?: string }) {
    const isPresent = value && value !== 'undefined';
    const displayValue = isPresent ? `✅ ${value?.substring(0, 30)}...` : '❌ Missing';

    return (
        <View style={styles.statusRow}>
            <Text style={styles.label}>{label}:</Text>
            <Text style={[styles.value, isPresent ? styles.good : styles.bad]}>{displayValue}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    section: {
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 12,
        color: '#333',
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    label: {
        fontSize: 14,
        color: '#666',
        flex: 1,
    },
    value: {
        fontSize: 14,
        fontWeight: '500',
        flex: 2,
    },
    good: {
        color: '#22c55e',
    },
    bad: {
        color: '#ef4444',
    },
    errorBox: {
        backgroundColor: '#fee2e2',
        padding: 12,
        borderRadius: 8,
        marginTop: 12,
    },
    errorText: {
        color: '#dc2626',
        fontSize: 12,
    },
    infoText: {
        fontSize: 12,
        color: '#666',
        marginBottom: 4,
        fontFamily: 'monospace',
    },
    fixCard: {
        backgroundColor: '#fef3c7',
        borderRadius: 12,
        padding: 16,
        borderWidth: 2,
        borderColor: '#fbbf24',
    },
    fixTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
        color: '#92400e',
    },
    fixText: {
        fontSize: 14,
        color: '#78350f',
        marginBottom: 6,
    },
});
