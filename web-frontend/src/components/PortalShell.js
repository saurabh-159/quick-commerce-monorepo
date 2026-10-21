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
        on ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'
      }`;
    }
    return `block px-3 py-2 rounded text-sm font-medium ${
      on ? 'bg-green-50 text-green-700' : 'text-gray-700 hover:bg-gray-50'
    }`;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="h-14 bg-white border-b border-gray-200 px-4 flex items-center gap-4">
        <Link href={homeHref} className="font-bold text-green-600 shrink-0">
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
        <aside className="w-52 bg-white border-r border-gray-200 p-3 shrink-0">
          <nav className="space-y-1">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className={linkClass(link.href, false)}>
                {link.name}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
