const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export async function api(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  // Agar localStorage mein token hai toh Authorization header lagao
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const config = {
    ...options,
    headers
  };

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, config);
    const body = await response.json();

    if (!response.ok || body.success === false) {
      throw new Error(body.message || 'Something went wrong');
    }

    // Poora body return karne ke bajaye sirf 'data' return karte hain
    return body.data;
  } catch (error) {
    throw error;
  }
}