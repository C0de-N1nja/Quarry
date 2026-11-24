import type { Metadata } from 'next';
import './globals.css';
import 'leaflet/dist/leaflet.css';
import { QuarryProvider } from '@/context/QuarryContext';

export const metadata: Metadata = {
  title: 'Quarry | Lead Intelligence & Pitch Studio',
  description: 'Reproducible local business client hunting and pitch studio architecture.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen quarry-grid-bg font-sans antialiased text-[#cfcfcf] selection:bg-emerald-500/20 selection:text-emerald-300">
        <QuarryProvider>
          {children}
        </QuarryProvider>
      </body>
    </html>
  );
}
