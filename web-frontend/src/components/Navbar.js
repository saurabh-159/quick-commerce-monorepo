'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getToken, getRole, logout } from '@/utils/auth';
import { guestItemCount } from '@/utils/guestCart';
import { api } from '@/utils/api';

function CartIcon({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path
        d="M7 7h13l-1.4 8.2a2 2 0 0 1-2 1.8H9.2a2 2 0 0 1-2-1.6L5.2 4H3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9.5" cy="19.5" r="1.2" fill="currentColor" />
      <circle cx="17" cy="19.5" r="1.2" fill="currentColor" />
    </svg>
  );
}

export default function Navbar() {
  const [token, setToken] = useState(null);
  const [role, setRole] = useState(null);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    let ignore = false;

    const sync = async () => {
      const nextToken = getToken();
      const nextRole = getRole();
      setToken(nextToken);
      setRole(nextRole);

      if (nextToken && nextRole === 'customer') {
        try {
          const cart = await api('/cart');
          if (ignore) return;
          const count = (cart?.items || []).reduce((sum, item) => sum + (item.qty || 0), 0);
          setCartCount(count);
          return;
        } catch {
          if (ignore) return;
          setCartCount(guestItemCount());
          return;
        }
      }

      if (!ignore) setCartCount(guestItemCount());
    };

    sync();
    window.addEventListener('qc-auth', sync);
    window.addEventListener('qc-guest-cart', sync);
    window.addEventListener('qc-cart', sync);
    return () => {
      ignore = true;
      window.removeEventListener('qc-auth', sync);
      window.removeEventListener('qc-guest-cart', sync);
      window.removeEventListener('qc-cart', sync);
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
            aria-label={cartCount > 0 ? `Cart, ${cartCount} items` : 'Cart'}
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-brand-border text-brand-text transition hover:bg-brand-soft"
          >
            <CartIcon />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[10px] font-bold leading-none text-white">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
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
