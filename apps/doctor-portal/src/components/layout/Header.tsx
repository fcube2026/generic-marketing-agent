'use client';

import { useRouter } from 'next/navigation';

export default function Header() {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('provider_token');
    localStorage.removeItem('provider_user');
    document.cookie = 'provider_token=; path=/; max-age=0; SameSite=Lax';
    router.push('/login');
  };

  return (
    <header
      className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6"
      data-testid="header"
    >
      <h2 className="text-lg font-semibold text-gray-800">Doctor Portal</h2>
      <div className="flex items-center gap-4">
        <button
          onClick={handleLogout}
          data-testid="logout-button"
          className="text-sm text-red-500 hover:text-red-700 font-medium transition"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
