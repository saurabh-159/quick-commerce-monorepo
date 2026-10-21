const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

let refreshPromise = null;

function refreshAccessToken() {
  if (typeof window === 'undefined') return Promise.resolve(null);

  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return Promise.resolve(null);

  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok || body.success === false || !body.data?.accessToken) {
          return null;
        }
        localStorage.setItem('token', body.data.accessToken);
        window.dispatchEvent(new Event('qc-auth'));
        return body.data.accessToken;
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

export async function api(path, options = {}) {
  const { _retried, ...fetchOptions } = options;
  const headers = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers || {}),
  };

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...fetchOptions,
      headers,
    });
    const body = await response.json();

    if (
      response.status === 401 &&
      body.message === 'Not authorized, token failed' &&
      !_retried
    ) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        return api(path, { ...options, _retried: true });
      }
    }

    if (!response.ok || body.success === false) {
      const error = new Error(body.message || 'Something went wrong');
      error.details = body.details || null;
      error.status = response.status;
      throw error;
    }

    return body.data;
  } catch (error) {
    throw error;
  }
}
