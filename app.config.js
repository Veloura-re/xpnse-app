module.exports = ({ config }) => {
    const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY;

    console.log('🔧 Loading App Config...');
    console.log('   - API Key present:', !!apiKey);
    console.log('   - Project ID present:', !!(process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID));

    if (!apiKey) {
        console.warn('⚠️  WARNING: Firebase API Key is missing in build environment!');
    }

    return {
        ...config,
        extra: {
            ...config.extra,
            // Firebase configuration - Read from environment variables at build time
            firebaseApiKey: apiKey,
            firebaseAuthDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN,
            firebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
            firebaseStorageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET,
            firebaseMessagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID,
            firebaseAppId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID,
        },
    };
};
