import { io } from 'socket.io-client';
import { Platform } from 'react-native';
import { getAccessToken } from './auth';

const defaultHost = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
const SOCKET_URL =
  process.env.EXPO_PUBLIC_SOCKET_URL || `http://${defaultHost}:5000`;

let socket = null;

export async function connectSocket() {
  const token = await getAccessToken();
  if (!token) return null;

  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket']
  });

  socket.on('connect', () => {
    console.log('Socket connected', socket.id);
  });

  socket.on('connect_error', (err) => {
    console.log('Socket error', err.message);
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function joinOrderRoom(orderId) {
  if (socket && orderId) {
    socket.emit('join:order', { orderId });
  }
}
