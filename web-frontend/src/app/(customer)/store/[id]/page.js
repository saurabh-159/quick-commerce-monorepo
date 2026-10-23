import { Suspense } from 'react';
import StorePage from '@/components/store/StorePage';

export default function Page() {
  return (
    <Suspense fallback={<div className="home-wrap py-16 text-sm text-brand-muted">Loading store...</div>}>
      <StorePage />
    </Suspense>
  );
}
