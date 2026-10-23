// src/app/(customer)/layout.js

'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getToken, getRole } from '@/utils/auth';
import Navbar from '@/components/Navbar';

export default function CustomerLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const token = getToken();
    const role = getRole();

    if (token && role === 'delivery_partner') {
      router.replace('/rider');
      return;
    }

    if ((pathname.startsWith('/orders') || pathname.startsWith('/order')) && (!token || role !== 'customer')) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    setAuthorized(true);
  }, [router, pathname]);

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-bg">
        <p className="text-brand-muted">Loading...</p>
      </div>
    );
  }

  const isWide = pathname === '/' || pathname.startsWith('/store');

  return (
    <div className="min-h-screen bg-brand-bg">
      {pathname === '/' && (
        <div className="overflow-hidden bg-brand-dark text-[11px] uppercase tracking-[0.22em] text-white">
          <div className="qc-marquee flex w-max py-2">
            {[0, 1].map((copy) => (
              <p key={copy} className="whitespace-nowrap px-4">
                Fresh groceries in minutes · Dairy, fruit, snacks · Delivered from a nearby store ·
              </p>
            ))}
          </div>
        </div>
      )}
      <Navbar />
      <main className={isWide ? '' : 'home-wrap mx-auto max-w-6xl py-6'}>{children}</main>
    </div>
  );
}