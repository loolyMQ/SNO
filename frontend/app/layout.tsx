import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Карта науки',
  description: 'Система визуализации научных связей',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
