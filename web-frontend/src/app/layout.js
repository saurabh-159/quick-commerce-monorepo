import './globals.css';
import { Poppins } from 'next/font/google';
import { SocketProvider } from '@/context/SocketContext';
import OrderAlerts from '@/components/OrderAlerts';

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
          <OrderAlerts />
          {children}
        </SocketProvider>
      </body>
    </html>
  );
}
