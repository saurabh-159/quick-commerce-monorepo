import { Suspense } from 'react';
import './globals.css';
import { Poppins } from 'next/font/google';
import { SocketProvider } from '@/context/SocketContext';
import OrderAlerts from '@/components/OrderAlerts';
import NavigationProgress from '@/components/NavigationProgress';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata = {
  title: 'Quick Commerce',
  description: 'Customer store and admin dashboard'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={poppins.variable}>
      <body className="font-sans antialiased">
        <SocketProvider>
          <Suspense fallback={null}>
            <NavigationProgress />
          </Suspense>
          <OrderAlerts />
          {children}
        </SocketProvider>
      </body>
    </html>
  );
}
