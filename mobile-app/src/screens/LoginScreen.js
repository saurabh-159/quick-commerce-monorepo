import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { login, register } from '../services/auth';

export default function LoginScreen({ navigation }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!phone || !password) {
      Alert.alert('Missing fields', 'Phone and password are required.');
      return;
    }

    setLoading(true);
    try {
      const result =
        mode === 'login'
          ? await login(phone.trim(), password)
          : await register({
              name: name.trim(),
              phone: phone.trim(),
              email: email.trim() || undefined,
              password
            });

      if (result.user.role === 'delivery_partner') {
        navigation.replace('RiderStack');
      } else if (result.user.role === 'customer') {
        navigation.replace('CustomerTabs');
      } else {
        Alert.alert('Admin?', 'Admin users should use the web dashboard.');
      }
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Login failed';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.brand}>QuickCommerce</Text>
        <Text style={styles.subtitle}>
          {mode === 'login' ? 'Sign in to continue' : 'Create a customer account'}
        </Text>

        {mode === 'register' && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Full name"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.input}
              placeholder="Email (optional)"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </>
        )}

        <TextInput
          style={styles.input}
          placeholder="Phone (10 digits)"
          keyboardType="phone-pad"
          maxLength={10}
          value={phone}
          onChangeText={setPhone}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity style={styles.button} onPress={onSubmit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{mode === 'login' ? 'Login' : 'Register'}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
          style={styles.switch}
        >
          <Text style={styles.switchText}>
            {mode === 'login' ? 'New here? Register' : 'Have an account? Login'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  brand: { fontSize: 28, fontWeight: '800', color: '#0f766e', marginBottom: 6 },
  subtitle: { color: '#64748b', marginBottom: 20 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12
  },
  button: {
    backgroundColor: '#0f766e',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  switch: { marginTop: 18, alignItems: 'center' },
  switchText: { color: '#0f766e', fontWeight: '600' }
});
