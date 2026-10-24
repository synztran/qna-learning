import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PwaRegistration } from '@/components/PwaRegistration';
import { NavigationOverlay } from '@/components/NavigationOverlay';

export const runtime = 'nodejs';

export const metadata: Metadata = {
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  title: 'QNA Learning | Ôn tập trắc nghiệm',
  description: 'Nền tảng ôn tập trắc nghiệm thông minh, tối ưu trải nghiệm học tập trên thiết bị di động.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'QnA Learning',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FDFBF7' },
    { media: '(prefers-color-scheme: dark)', color: '#141E19' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" data-theme="light" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Quicksand:wght@500;600;700&family=Be+Vietnam+Pro:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var saved = localStorage.getItem('qna-theme');
                var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                var theme = saved || (prefersDark ? 'dark' : 'light');
                document.documentElement.setAttribute('data-theme', theme);
                if (theme === 'dark') document.documentElement.classList.add('dark');
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-base-100 text-base-content antialiased select-none sm:select-auto">
        {children}
        <NavigationOverlay />
        <PwaRegistration />
      </body>
    </html>
  );
}
