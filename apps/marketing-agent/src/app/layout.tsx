import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Curex24 Marketing Agent',
  description: 'AI-powered marketing strategy and execution agent for curex24',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
