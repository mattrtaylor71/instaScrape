import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Instagram Intelligence',
  description: 'Analyze Instagram profiles and posts with AI',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

