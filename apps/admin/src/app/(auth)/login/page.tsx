'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await api.post('/auth/admin-login', {
        email,
        password,
      });

      // Store token in localStorage for API requests
      localStorage.setItem('admin_token', data.token);
      localStorage.setItem(
        'admin_user',
        JSON.stringify({ email: data.user.email, role: data.user.role }),
      );

      // Store token in cookie for middleware route protection
      const secure = window.location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = `admin_token=${data.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax${secure}`;

      router.push('/dashboard');
    } catch (err: any) {
      let message: string;
      if (err?.response?.data) {
        message =
          err.response.data.message ||
          err.response.data.error ||
          'Invalid credentials.';
      } else if (err?.request) {
        const targetUrl = api.defaults.baseURL || '(unknown)';
        message =
          `Unable to reach the server at ${targetUrl}. Please check that the API is running and CORS is configured.`;
      } else {
        message = 'Login failed. Please try again.';
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-blue-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-primary">Curex24</h1>
          <p className="text-gray-500 mt-1">Admin Panel</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-lg p-8 space-y-5">
          <h2 className="text-xl font-bold text-gray-800">Sign In</h2>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
              placeholder="admin@curex24.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-dark text-white py-3 rounded-lg font-semibold transition disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Curex24 © {new Date().getFullYear()} — Healthcare, anytime. Anywhere.
        </p>
      </div>
    </div>
  );
}
