'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, getRole } from '@/utils/auth';
import PortalShell from '@/components/PortalShell';

const links = [
  { name: 'Dashboard', href: '/rider' },
  { name: 'Assignments', href: '/rider/assignments' },
];

export default function RiderLayout({ children }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const token = getToken();
    const role = getRole();

    if (!token || role !== 'delivery_partner') {
      router.replace('/login');
      return;
    }

    setAuthorized(true);
  }, [router]);

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading rider...</p>
      </div>
    );
  }

  return (
    <PortalShell title="Rider" homeHref="/rider" links={links}>
      {children}
    </PortalShell>
  );
}
