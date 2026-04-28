'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await api.post('/auth/send-otp', { phone });
      // In staging/dev, the API returns the OTP in the response — auto-fill it
      if (data.otp) {
        setOtp(data.otp);
      }
      setStep('otp');
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Failed to send OTP. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await api.post('/auth/verify-otp', { phone, otp, role: 'PROVIDER' });

      if (data.user.role !== 'PROVIDER') {
        setError('Access denied. This portal is for registered doctors only.');
        return;
      }

      localStorage.setItem('provider_token', data.token);
      localStorage.setItem(
        'provider_user',
        JSON.stringify({ phone: data.user.phone, role: data.user.role }),
      );

      const secure = window.location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = `provider_token=${data.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax${secure}`;

      router.push('/dashboard');
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Invalid OTP. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-primary">Curex24</h1>
          <p className="text-gray-500 mt-1">Doctor Portal</p>
        </div>

        <form
          onSubmit={step === 'phone' ? handleSendOtp : handleVerifyOtp}
          className="bg-white rounded-2xl shadow-lg p-8 space-y-5"
          data-testid="login-form"
        >
          <h2 className="text-xl font-bold text-gray-800">
            {step === 'phone' ? 'Sign In' : 'Verify OTP'}
          </h2>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          {step === 'phone' ? (
            <div>
              <label htmlFor="doctor-phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                id="doctor-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                placeholder="+91 98765 43210"
              />
            </div>
          ) : (
            <div>
              <label htmlFor="doctor-otp" className="block text-sm font-medium text-gray-700 mb-1">
                Enter OTP sent to {phone}
              </label>
              <input
                id="doctor-otp"
                type="text"
                inputMode="numeric"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                maxLength={6}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition text-center text-2xl tracking-widest"
                placeholder="● ● ● ● ● ●"
              />
              <button
                type="button"
                onClick={() => {
                  setStep('phone');
                  setOtp('');
                  setError('');
                }}
                className="text-sm text-primary hover:underline mt-2"
              >
                ← Change number
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            data-testid="login-submit"
            className="w-full bg-primary hover:bg-primary-dark text-white py-3 rounded-lg font-semibold transition disabled:opacity-60"
          >
            {loading
              ? step === 'phone'
                ? 'Sending OTP…'
                : 'Verifying…'
              : step === 'phone'
                ? 'Send OTP'
                : 'Verify & Sign In'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Curex24 © {new Date().getFullYear()} — Healthcare, anytime. Anywhere.
        </p>
      </div>
    </div>
  );
}
