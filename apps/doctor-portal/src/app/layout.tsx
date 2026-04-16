import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Curex24 Doctor Portal',
  description: 'Curex24 Healthcare Platform — Doctor Consultation & Tracking Portal',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
