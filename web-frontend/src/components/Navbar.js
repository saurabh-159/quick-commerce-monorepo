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
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-white">
      <div className="home-wrap flex h-[72px] items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#0c831f] text-base font-black text-white">
            Q
          </span>
          <span>
            <span className="block text-lg font-extrabold leading-none text-[#0c831f]">quick</span>
            <span className="block text-[10px] font-semibold tracking-[0.14em] text-gray-400">COMMERCE</span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Link href="/help" className="hidden px-3 py-2 text-sm font-semibold text-gray-700 sm:inline">
            Help
          </Link>
          {token && role === 'customer' && (
            <Link href="/orders" className="hidden px-3 py-2 text-sm font-semibold text-gray-700 sm:inline">
              Orders
            </Link>
          )}
          <Link
            href="/cart"
            className="relative rounded-xl border border-gray-200 px-3 py-2 text-sm font-bold text-gray-800"
          >
            Cart
            {cartCount > 0 && (
              <span className="ml-2 rounded-full bg-[#0c831f] px-1.5 text-xs text-white">{cartCount}</span>
            )}
          </Link>
          {token ? (
            <button
              onClick={handleLogout}
              className="rounded-xl px-3 py-2 text-sm font-semibold text-gray-600"
            >
              Logout
            </button>
          ) : (
            <Link href="/login" className="rounded-xl bg-[#0c831f] px-4 py-2 text-sm font-bold text-white">
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
