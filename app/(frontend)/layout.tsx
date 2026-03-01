import type { Metadata } from 'next';
import { Barlow, Oswald } from 'next/font/google';
import './globals.css';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';

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
  title: 'ZVC Goldgetters - Zaalvoetbalclub',
  description:
    'Officiële website van ZVC Goldgetters. Volg ons nieuws, bekijk wedstrijden, ontdek onze ploeg en statistieken van de Goldgetters zaalvoetbalclub.',
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
      <body
        className={`${sans.variable} ${display.variable} antialiased flex flex-col min-h-screen`}
      >
        <SiteHeader />
        <main className="mx-auto w-full max-w-5xl px-4 flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
