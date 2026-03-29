import type { Metadata } from 'next';
import { Barlow, Oswald } from 'next/font/google';
import './globals.css';
import { nl } from '@/lib/i18n/nl';
import { GoldgettersShell } from '@/components/goldgetters/layout/shell';
import { GoldgettersHeader } from '@/components/goldgetters/site/header';
import { GoldgettersFooter } from '@/components/goldgetters/site/footer';

const sans = Barlow({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const display = Oswald({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: nl.frontend.metadata.title,
  description: nl.frontend.metadata.description,
  icons: {
    icon: [{ url: '/icon.png', sizes: 'any', type: 'image/png' }],
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl-BE" suppressHydrationWarning>
      <head>
        <script
          // Prevent theme flash on first paint
          dangerouslySetInnerHTML={{
            __html: `(() => { try { const ls = localStorage.getItem('theme'); const m = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches; const dark = ls ? ls === 'dark' : m; const root = document.documentElement; dark ? root.classList.add('dark') : root.classList.remove('dark'); } catch (_) {} })();`,
          }}
        />
      </head>
      <body className={`${sans.variable} ${display.variable} antialiased`}>
        <GoldgettersShell>
          <GoldgettersHeader />
          <main>{children}</main>
          <GoldgettersFooter />
        </GoldgettersShell>
      </body>
    </html>
  );
}
