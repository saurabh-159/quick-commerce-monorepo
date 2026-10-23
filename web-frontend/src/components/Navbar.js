'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getToken, getRole, logout } from '@/utils/auth';
import { guestItemCount } from '@/utils/guestCart';

export default function Navbar() {
  const [token, setToken] = useState(null);
  const [role, setRole] = useState(null);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const sync = () => {
      setToken(getToken());
      setRole(getRole());
      setCartCount(guestItemCount());
    };

    sync();
    window.addEventListener('qc-auth', sync);
    window.addEventListener('qc-guest-cart', sync);
    return () => {
      window.removeEventListener('qc-auth', sync);
      window.removeEventListener('qc-guest-cart', sync);
    };
  }, []);

  const handleLogout = () => {
    logout();
    window.location.assign('/');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-brand-border bg-brand-surface">
      <div className="home-wrap flex h-[72px] items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-base font-black text-white">
            Q
          </span>
          <span>
            <span className="block text-lg font-extrabold leading-none text-brand">quick</span>
            <span className="block text-[10px] font-semibold tracking-[0.14em] text-brand-muted-light">COMMERCE</span>
          </span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/help"
            className="whitespace-nowrap px-1.5 py-2 text-xs font-semibold text-brand-text sm:px-3 sm:text-sm"
          >
            Quick Shopping
          </Link>
          {token && role === 'customer' && (
            <Link href="/orders" className="hidden px-3 py-2 text-sm font-semibold text-brand-text sm:inline">
              Orders
            </Link>
          )}
          <Link
            href="/cart"
            className="relative whitespace-nowrap rounded-xl border border-brand-border px-2.5 py-2 text-sm font-bold text-brand-text sm:px-3"
          >
            Cart
            {cartCount > 0 && (
              <span className="ml-2 rounded-full bg-brand px-1.5 text-xs text-white">{cartCount}</span>
            )}
          </Link>
          {token ? (
            <button
              onClick={handleLogout}
              className="whitespace-nowrap rounded-xl px-2.5 py-2 text-sm font-semibold text-brand-muted sm:px-3"
            >
              Logout
            </button>
          ) : (
            <Link href="/login" className="whitespace-nowrap rounded-xl bg-brand px-3 py-2 text-sm font-bold text-white sm:px-4">
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
