// app/layout.tsx (aktualisiert)
import './globals.css';
import type { Metadata } from 'next';

import Navigation from '@/components/Navigation';

export const metadata: Metadata = {
  title: 'OCOSO Staking',
  description: 'OCOSO NFT Staking and Token Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <html lang="de">
      <body>
        <header className="main-header">
          <div className="container">
            <h1>OCOSO Staking</h1>
            <Navigation />
          </div>
        </header>
        <main className="container">
          {children}
        </main>
        <footer className="main-footer">
          <div className="container">
            <p>&copy; {new Date().getFullYear()} OCOSO.io - Alle Rechte vorbehalten</p>
          </div>
        </footer>
      </body>
    </html>
  );
}