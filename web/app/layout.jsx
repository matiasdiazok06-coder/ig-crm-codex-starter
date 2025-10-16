import './globals.css';
import { Inter } from 'next/font/google';
import HelpButton from '../components/HelpButton.jsx';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }) {
  return (
    <html lang="es" className="dark">
      <body className={`${inter.className} relative min-h-screen bg-night text-zinc-100`}> 
        <div className="min-h-screen bg-gradient-to-br from-night via-[#12121a] to-[#1a1020]">{children}</div>
        <HelpButton />
      </body>
    </html>
  );
}
