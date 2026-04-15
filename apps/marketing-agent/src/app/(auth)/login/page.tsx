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
      const { data } = await api.post('/auth/marketing-login', { email, password });

      localStorage.setItem('marketing_token', data.token);
      localStorage.setItem('marketing_user', JSON.stringify({ email: data.user.email, role: data.user.role }));

      const secure = window.location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = `marketing_token=${data.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax${secure}`;

      router.push('/dashboard');
    } catch (err: unknown) {
      // ... error handling
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
      <button type="submit" disabled={loading}>Sign In</button>
    </form>
  );
}