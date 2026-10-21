'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, getRole } from '@/utils/auth';
import PortalShell from '@/components/PortalShell';

const links = [
  { name: 'Dashboard', href: '/admin' },
  { name: 'Stores', href: '/admin/stores' },
  { name: 'Categories', href: '/admin/categories' },
  { name: 'Products', href: '/admin/products' },
  { name: 'Inventory', href: '/admin/inventory' },
  { name: 'Riders', href: '/admin/riders' },
  { name: 'Orders', href: '/admin/orders' },
];

export default function AdminLayout({ children }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const token = getToken();
    const role = getRole();

    if (!token || role !== 'admin') {
      router.replace('/login');
      return;
    }

    setAuthorized(true);
  }, [router]);

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading admin...</p>
      </div>
    );
  }

  return (
    <PortalShell title="Admin" homeHref="/admin" links={links}>
      {children}
    </PortalShell>
  );
}
