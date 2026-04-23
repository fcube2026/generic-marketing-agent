import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('marketing_token')?.value;

  if (!token) {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
