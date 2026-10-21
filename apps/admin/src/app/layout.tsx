import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SC5 Admin Portal | Quản lý câu hỏi & Học viên',
  description: 'Trang quản trị nội bộ: quản lý tài khoản, soft-ban, upload đề thi, chỉnh sửa câu hỏi.',
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
      </head>
      <body className="min-h-screen bg-base-100 text-base-content antialiased">
        {children}
      </body>
    </html>
  );
}
