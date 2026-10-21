const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

async function aiFetch(path, body) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE_URL}/ai${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data.error || data.message || 'AI request failed';
    const error = new Error(message);
    error.status = response.status;
    error.details = data;
    throw error;
  }

  return data;
}

/** Semantic product search → { query, results: [{ product_id, name, category, score }] } */
export function aiSearch(query, limit = 5) {
  return aiFetch('/search', { query, limit });
}

/** Similar products → { seed_product_id, recommendations: [...] } */
export function aiRecommendations(productId, limit = 3) {
  return aiFetch('/recommendations', { product_id: productId, limit });
}

/** Shopping assistant (live catalog tools) → { query, context_used, answer, tools_used } */
export function aiAssistant(query, { lat, lng } = {}) {
  const body = { query };
  if (lat != null && lng != null) {
    body.lat = lat;
    body.lng = lng;
  }
  return aiFetch('/assistant', body);
}

/** Order support (login user) → { user_id, query, response } */
export function aiOrderSupport(query) {
  if (typeof window !== 'undefined' && !localStorage.getItem('token')) {
    return Promise.reject(new Error('Login required for order support'));
  }
  // user_id mat bhejo — backend JWT se lega
  return aiFetch('/order-support', { query });
}

/** Admin catalog copy → { title, description, tags } */
export function aiGenerateProductContent(productName, category) {
  if (typeof window !== 'undefined' && !localStorage.getItem('token')) {
    return Promise.reject(new Error('Admin login required'));
  }
  return aiFetch('/admin/generate-content', {
    product_name: productName,
    category,
  });
}
