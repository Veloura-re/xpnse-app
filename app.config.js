module.exports = ({ config }) => {
    const DEFAULT_CONFIG = {
        apiKey: "AIzaSyD65DFf80JpbowSZQu6w2a6FYGxZnSJSMk",
        authDomain: "cashiee.firebaseapp.com",
        projectId: "cashiee",
        storageBucket: "cashiee.firebasestorage.app",
        messagingSenderId: "572518473431",
        appId: "1:572518473431:android:342a9725a05b2fa48c5a92",
    };

    const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || DEFAULT_CONFIG.apiKey;
    const authDomain = process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN || DEFAULT_CONFIG.authDomain;
    const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || DEFAULT_CONFIG.projectId;
    const storageBucket = process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET || DEFAULT_CONFIG.storageBucket;
    const messagingSenderId = process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID || DEFAULT_CONFIG.messagingSenderId;
    const appId = process.env.EXPO_PUBLIC_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID || DEFAULT_CONFIG.appId;

    console.log('🔧 Loading App Config...');
    console.log('   - API Key present:', !!apiKey);
    console.log('   - Project ID present:', !!projectId);

    return {
        ...config,
        extra: {
            ...config.extra,
            firebaseApiKey: apiKey,
            firebaseAuthDomain: authDomain,
            firebaseProjectId: projectId,
            firebaseStorageBucket: storageBucket,
            firebaseMessagingSenderId: messagingSenderId,
            firebaseAppId: appId,
            firebaseDatabaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL || process.env.FIREBASE_DATABASE_URL,
            firebaseMeasurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || process.env.FIREBASE_MEASUREMENT_ID,
        },
    };
};
