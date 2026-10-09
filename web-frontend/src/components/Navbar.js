'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { logout } from '@/utils/auth';

export default function Navbar() {
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  return (
    <nav className="bg-white shadow-md border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <span className="font-bold text-xl text-green-600">Quick-Commerce</span>
            <div className="hidden md:flex space-x-4">
              <Link href="/" className="text-gray-700 hover:text-green-600 px-3 py-2 rounded-md text-sm font-medium">
                Home
              </Link>
              <Link href="/cart" className="text-gray-700 hover:text-green-600 px-3 py-2 rounded-md text-sm font-medium">
                Cart
              </Link>
              <Link href="/orders" className="text-gray-700 hover:text-green-600 px-3 py-2 rounded-md text-sm font-medium">
                Orders
              </Link>
            </div>
          </div>
          <div className="flex items-center">
            <button
              onClick={handleLogout}
              className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-md text-sm font-medium hover:bg-red-100 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}     