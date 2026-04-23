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

  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotError, setForgotError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/admin-login', { email, password });
      localStorage.setItem('admin_token', data.token);
      localStorage.setItem('admin_user', JSON.stringify({ email: data.user.email, role: data.user.role }));
      const secure = window.location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = `admin_token=${data.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax${secure}`;
      router.push('/dashboard');
    } catch (err: any) {
      let message: string;
      if (err?.response?.data) {
        message = err.response.data.message || err.response.data.error || 'Invalid credentials.';
      } else if (err?.request) {
        message = `Unable to reach the server at ${api.defaults.baseURL || '(unknown)'}. Please check that the API is running.`;
      } else {
        message = 'Login failed. Please try again.';
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotMessage('');
    setForgotLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email: forgotEmail });
      setForgotMessage(data.message);
    } catch (err: any) {
      setForgotError(err?.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  if (showForgot) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-blue-50">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-primary">Curex24</h1>
            <p className="text-gray-500 mt-1">Admin Panel</p>
          </div>
          <form onSubmit={handleForgotPassword} className="bg-white rounded-2xl shadow-lg p-8 space-y-5">
            <h2 className="text-xl font-bold text-gray-800">Reset Password</h2>
            <p className="text-sm text-gray-500">Enter your Curex24 company email. We&apos;ll send a reset link.</p>
            {forgotError && (
              <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-200">{forgotError}</div>
            )}
            {forgotMessage ? (
              <div className="bg-green-50 text-green-700 text-sm px-4 py-3 rounded-lg border border-green-200">{forgotMessage}</div>
            ) : (
              <div>
                <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-700 mb-1">Work Email</label>
                <input
                  id="forgot-email"
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                  placeholder="you@curex24.com"
                />
              </div>
            )}
            {!forgotMessage && (
              <button type="submit" disabled={forgotLoading} className="w-full bg-primary hover:bg-primary-dark text-white py-3 rounded-lg font-semibold transition disabled:opacity-60">
                {forgotLoading ? 'Sending...' : 'Send Reset Link'}
              </button>
            )}
            <button type="button" onClick={() => { setShowForgot(false); setForgotMessage(''); setForgotError(''); }} className="w-full text-sm text-gray-500 hover:text-gray-700 transition">
              Back to Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-blue-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-primary">Curex24</h1>
          <p className="text-gray-500 mt-1">Admin Panel</p>
        </div>
        <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-lg p-8 space-y-5" data-testid="login-form">
          <h2 className="text-xl font-bold text-gray-800">Sign In</h2>
          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-200">{error}</div>
          )}
          <div>
            <label htmlFor="admin-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
              placeholder="you@curex24.com"
            />
          </div>
          <div>
            <label htmlFor="admin-password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
              placeholder="password"
            />
            <div className="text-right mt-1">
              <button type="button" onClick={() => { setShowForgot(true); setForgotEmail(email); }} className="text-xs text-primary hover:underline">
                Forgot password?
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading} data-testid="login-submit" className="w-full bg-primary hover:bg-primary-dark text-white py-3 rounded-lg font-semibold transition disabled:opacity-60">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p className="text-center text-xs text-gray-400 mt-6">Curex24 &copy; {new Date().getFullYear()} &mdash; Healthcare, anytime. Anywhere.</p>
      </div>
    </div>
  );
}