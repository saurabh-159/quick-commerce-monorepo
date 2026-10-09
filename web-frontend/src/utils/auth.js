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
    } catch (e) {
      return null;
    }
  }
  
  export function saveSession({ accessToken, user }) {
    if (typeof window === 'undefined') return;
    localStorage.setItem('token', accessToken);
    localStorage.setItem('role', user.role);
    localStorage.setItem('user', JSON.stringify(user));
  }
  
  export function logout() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('user');
  }