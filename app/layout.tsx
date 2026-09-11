import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppProvider } from '@/lib/context';

export const metadata: Metadata = {
  title: 'البكالوريا المصرية • Baccalaureate Dashboard',
  description: 'Minimalist OLED black productivity dashboard for Egyptian Baccalaureate (البكالوريا المصرية) students.',
};

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full bg-black">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="min-h-full flex flex-col bg-black text-neutral-100 antialiased selection:bg-white selection:text-black">
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
