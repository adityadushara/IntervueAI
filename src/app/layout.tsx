import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Suspense } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import AppShell from '@/components/AppShell';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'IntervueAI - AI Voice Technical Interviews',
  description: 'AI-powered technical voice interview platform for hiring teams and engineering managers.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-screen bg-[#fcfcfd] text-zinc-900 antialiased font-sans selection:bg-zinc-900 selection:text-white">
        <AuthProvider>
          <Suspense fallback={<div className="min-h-screen bg-[#fcfcfd]" />}>
            <AppShell>{children}</AppShell>
          </Suspense>
        </AuthProvider>
      </body>
    </html>
  );
}
