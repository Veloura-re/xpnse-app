// Test Firebase Configuration
// Run this with: node test-firebase.js

require('dotenv').config();

console.log('\n🔍 Testing Firebase Configuration...\n');

const envVars = {
  'EXPO_PUBLIC_FIREBASE_API_KEY': process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN': process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID': process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET': process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID': process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  'EXPO_PUBLIC_FIREBASE_APP_ID': process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

let missingCount = 0;
let allGood = true;

console.log('📋 Environment Variables:\n');

for (const [key, value] of Object.entries(envVars)) {
  if (!value || value === 'undefined') {
    console.log(`❌ ${key}: MISSING`);
    missingCount++;
    allGood = false;
  } else {
    // Show first 20 chars for security
    const displayValue = value.length > 20 ? value.substring(0, 20) + '...' : value;
    console.log(`✅ ${key}: ${displayValue}`);
  }
}

console.log('\n' + '='.repeat(60) + '\n');

if (allGood) {
  console.log('🎉 SUCCESS! All Firebase credentials are loaded.\n');
  console.log('📋 Next Steps:');
  console.log('1. Make sure Email/Password is enabled in Firebase Console:');
  console.log('   https://console.firebase.google.com/project/uabll-d1bdc/authentication/providers\n');
  console.log('2. Make sure Firestore rules allow writes:');
  console.log('   https://console.firebase.google.com/project/uabll-d1bdc/firestore/rules\n');
  console.log('3. Restart your dev server: npm run start:local\n');
  console.log('4. Try signing up in the app\n');
} else {
  console.log(`❌ PROBLEM! ${missingCount} variable(s) missing.\n`);
  console.log('📝 TO FIX:');
  console.log('1. Create/edit .env file in project root\n');
  console.log('2. Add these lines:\n');
  console.log('EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyCocACsn-KyGM29lVf39nl-9ATz6TLvkDw');
  console.log('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=uabll-d1bdc.firebaseapp.com');
  console.log('EXPO_PUBLIC_FIREBASE_PROJECT_ID=uabll-d1bdc');
  console.log('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=uabll-d1bdc.firebasestorage.app');
  console.log('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=366005569674');
  console.log('EXPO_PUBLIC_FIREBASE_APP_ID=1:366005569674:web:cc06e726e68c8aa39d8573\n');
  console.log('3. Save the file\n');
  console.log('4. Restart: npm start\n');
}

console.log('='.repeat(60) + '\n');
