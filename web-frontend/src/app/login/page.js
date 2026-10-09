'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/utils/api';
import { saveSession } from '@/utils/auth';

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);

  // Form states
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let endpoint = isRegister ? '/auth/register' : '/auth/login';
      let payload = isRegister 
        ? { name, phone, password } 
        : { phone, password };

      // API call using Phase 1 helper
      const data = await api(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      // Session save karo (token, role, user)
      saveSession({
        accessToken: data.accessToken,
        user: data.user
      });

      // Role ke hisab se redirect karo
      if (data.user.role === 'admin') {
        router.replace('/admin');
      } else {
        router.replace('/');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-center mb-6 text-black">
          {isRegister ? 'Create Account' : 'Login to Quick-Commerce'}
        </h1>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Aarav Sharma"
                className="w-full mt-1 p-2 border rounded text-black"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">Phone Number (10 digits)</label>
            <input
              type="text"
              required
              maxLength={10}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="7777777777"
              className="w-full mt-1 p-2 border rounded text-black"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              className="w-full mt-1 p-2 border rounded text-black"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white p-3 rounded font-semibold hover:bg-green-700 transition"
          >
            {loading ? 'Please wait...' : (isRegister ? 'Register' : 'Login')}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-sm text-green-600 hover:underline"
          >
            {isRegister ? 'Already have an account? Login' : "Don't have an account? Register"}
          </button>
        </div>
      </div>
    </main>
  );
}