'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { logout } from '@/utils/auth';

export default function AdminSidebar() {
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen p-4 flex flex-col justify-between">
      <div>
        <h1 className="text-xl font-bold mb-8 text-green-400">Admin Panel</h1>
        <nav className="space-y-2">
          <Link href="/admin" className="block px-4 py-2 rounded hover:bg-gray-800 text-sm font-medium">
            Dashboard
          </Link>
          <Link href="/admin/stores" className="block px-4 py-2 rounded hover:bg-gray-800 text-sm font-medium">
            Stores
          </Link>
          <Link href="/admin/products" className="block px-4 py-2 rounded hover:bg-gray-800 text-sm font-medium">
            Products
          </Link>
          <Link href="/admin/inventory" className="block px-4 py-2 rounded hover:bg-gray-800 text-sm font-medium">
            Inventory
          </Link>
          <Link href="/admin/orders" className="block px-4 py-2 rounded hover:bg-gray-800 text-sm font-medium">
            Orders
          </Link>
        </nav>
      </div>

      <button
        onClick={handleLogout}
        className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded text-sm font-medium transition"
      >
        Logout
      </button>
    </aside>
  );
}