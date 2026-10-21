// src/utils/auth.js

export function saveSession(data) {
  if (data.accessToken) {
    localStorage.setItem('token', data.accessToken);
  }
  if (data.refreshToken) {
    localStorage.setItem('refreshToken', data.refreshToken);
  }
  if (data.user) {
    localStorage.setItem('user', JSON.stringify(data.user));
    if (data.user.role) {
      localStorage.setItem('role', data.user.role);
    }
  }
  // Socket reconnect ke liye event dispatch karo
  window.dispatchEvent(new Event('qc-auth'));
}

export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export function getRole() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('role');
}

export function getUser() {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch {
    return null;
  }
}

export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  localStorage.removeItem('role');
  // Logout par bhi socket disconnect event dispatch karo
  window.dispatchEvent(new Event('qc-auth'));
}