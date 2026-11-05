import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Suspense } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'IntervueAI - AI Recruitment & Interview Platform',
  description: 'AI-powered technical recruitment interview platform for hiring teams and engineering managers.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900 antialiased font-sans">
        <Suspense fallback={<header className="h-16 border-b border-slate-200 bg-white" />}>
          <Navbar />
        </Suspense>
        <main className="flex-1 flex flex-col">{children}</main>
        <Suspense fallback={<footer className="h-16 border-t border-slate-200 bg-white" />}>
          <Footer />
        </Suspense>
      </body>
    </html>
  );
}
