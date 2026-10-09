import './globals.css';
import { SocketProvider } from '@/context/SocketContext';

export const metadata = {
  title: 'Quick Commerce',
  description: 'Customer store and admin dashboard'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SocketProvider>{children}</SocketProvider>
      </body>
    </html>
  );
}
