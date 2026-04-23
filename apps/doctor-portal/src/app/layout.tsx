import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Curex24 Partner Portal',
  description: 'Curex24 Healthcare Platform — Doctor & Partner Consultation Portal',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">{children}</body>
    </html>
  );
}
