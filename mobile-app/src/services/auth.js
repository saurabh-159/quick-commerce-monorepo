import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

export async function login(phone, password) {
  const { data } = await api.post('/auth/login', { phone, password });
  const payload = data.data;
  await AsyncStorage.setItem('accessToken', payload.accessToken);
  await AsyncStorage.setItem('refreshToken', payload.refreshToken);
  await AsyncStorage.setItem('role', payload.user.role);
  await AsyncStorage.setItem('user', JSON.stringify(payload.user));
  return payload;
}

export async function register({ name, phone, email, password }) {
  const { data } = await api.post('/auth/register', { name, phone, email, password });
  const payload = data.data;
  await AsyncStorage.setItem('accessToken', payload.accessToken);
  await AsyncStorage.setItem('refreshToken', payload.refreshToken);
  await AsyncStorage.setItem('role', payload.user.role);
  await AsyncStorage.setItem('user', JSON.stringify(payload.user));
  return payload;
}

export async function logout() {
  await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'role', 'user']);
}

export async function getStoredSession() {
  const [accessToken, role, userRaw] = await AsyncStorage.multiGet([
    'accessToken',
    'role',
    'user'
  ]);
  return {
    accessToken: accessToken[1],
    role: role[1],
    user: userRaw[1] ? JSON.parse(userRaw[1]) : null
  };
}

export async function getAccessToken() {
  return AsyncStorage.getItem('accessToken');
}
