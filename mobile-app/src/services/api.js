import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Android emulator cannot reach host machine via localhost — use 10.0.2.2
const defaultHost = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

const API_URL =
  process.env.EXPO_PUBLIC_API_URL || `http://${defaultHost}:4000/api`;

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
          const newAccess = data?.data?.accessToken;
          if (newAccess) {
            await AsyncStorage.setItem('accessToken', newAccess);
            original.headers.Authorization = `Bearer ${newAccess}`;
            return api(original);
          }
        } catch {
          await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'role', 'user']);
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
export { API_URL };
