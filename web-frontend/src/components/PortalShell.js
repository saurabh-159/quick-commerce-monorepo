'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout } from '@/utils/auth';

function activeLink(pathname, href, homeHref) {
  if (href === homeHref) return pathname === href;
  return pathname.startsWith(href);
}

export default function PortalShell({ title, homeHref, links, children }) {
  const pathname = usePathname();

  const handleLogout = () => {
    logout();
    window.location.assign('/login');
  };

  const linkClass = (href, bar) => {
    const on = activeLink(pathname, href, homeHref);
    if (bar) {
      return `px-3 py-1.5 rounded text-sm font-medium whitespace-nowrap ${
        on ? 'bg-brand text-white' : 'text-brand-muted hover:bg-brand-soft'
      }`;
    }
    return `block px-3 py-2 rounded text-sm font-medium ${
      on ? 'bg-brand-soft text-brand-dark' : 'text-brand-text hover:bg-brand-soft'
    }`;
  };

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col">
      <header className="h-14 bg-brand-surface border-b border-brand-border px-4 flex items-center gap-4">
        <Link href={homeHref} className="font-bold text-brand shrink-0">
          {title}
        </Link>
        <nav className="flex items-center gap-1 overflow-x-auto flex-1">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={linkClass(link.href, true)}>
              {link.name}
            </Link>
          ))}
        </nav>
        <button onClick={handleLogout} className="text-sm font-medium text-red-600 shrink-0">
          Logout
        </button>
      </header>

      <div className="flex flex-1">
        <aside className="w-52 bg-brand-surface border-r border-brand-border p-3 shrink-0">
          <nav className="space-y-1">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className={linkClass(link.href, false)}>
                {link.name}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="flex-1 p-6 overflow-y-auto text-brand-text">{children}</main>
      </div>
    </div>
  );
}
