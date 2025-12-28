import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useFirebase } from './providers/firebase-provider';

export default function FirebaseTest() {
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('test123456');
  const { user, isLoading, signUp, signIn, signOut } = useFirebase();

  const handleSignUp = async () => {
    console.log('Testing Firebase Sign Up...');
    const result = await signUp(email, password, 'Test User');
    
    if (result.error) {
      console.error('Sign Up Error:', result.error);
      Alert.alert('Sign Up Failed', result.error.message);
    } else {
      console.log('Sign Up Success:', result.data);
      Alert.alert('Success', 'Account created successfully!');
    }
  };

  const handleSignIn = async () => {
    console.log('Testing Firebase Sign In...');
    const result = await signIn(email, password);
    
    if (result.error) {
      console.error('Sign In Error:', result.error);
      Alert.alert('Sign In Failed', result.error.message);
    } else {
      console.log('Sign In Success:', result.data);
      Alert.alert('Success', 'Signed in successfully!');
    }
  };

  const handleSignOut = async () => {
    console.log('Testing Firebase Sign Out...');
    const result = await signOut();
    
    if (result.error) {
      console.error('Sign Out Error:', result.error);
      Alert.alert('Sign Out Failed', result.error.message);
    } else {
      console.log('Sign Out Success');
      Alert.alert('Success', 'Signed out successfully!');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Firebase Test</Text>
      
      <Text style={styles.status}>
        Status: {isLoading ? 'Loading...' : user ? `Logged in as: ${user.email}` : 'Not logged in'}
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.button} onPress={handleSignUp}>
        <Text style={styles.buttonText}>Test Sign Up</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={handleSignIn}>
        <Text style={styles.buttonText}>Test Sign In</Text>
      </TouchableOpacity>

      {user && (
        <TouchableOpacity style={[styles.button, styles.signOutButton]} onPress={handleSignOut}>
          <Text style={styles.buttonText}>Test Sign Out</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  status: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  signOutButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
});