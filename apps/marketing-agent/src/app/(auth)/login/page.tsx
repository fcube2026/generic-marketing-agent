'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '../auth.module';

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
      await login({ email, password });
      router.push('/dashboard');
    } catch (err: unknown) {
      let message: string;
      const axiosError = err as {
        response?: { status?: number; data?: { message?: string; error?: string } };
        request?: unknown;
      };

      if (axiosError?.response?.status === 401) {
        message = 'Invalid credentials.';
      } else if (axiosError?.response?.data?.message || axiosError?.response?.data?.error) {
        message =
          axiosError.response!.data!.message ||
          axiosError.response!.data!.error ||
          'Login failed. Please try again.';
      } else if (axiosError?.response?.status) {
        message = 'Server error. Please try again later.';
      } else if (axiosError?.request) {
        message = 'Unable to reach the server. Please check your network or contact support.';
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
          <h1 className="text-3xl font-extrabold text-primary">Marketing Agent</h1>
          <p className="text-gray-500 mt-1">AI-powered marketing for any brand</p>
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
              placeholder="marketing@example.com"
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
          Marketing Agent © {new Date().getFullYear()} — Plan, create, and ship marketing — faster.
        </p>
      </div>
    </div>
  );
}