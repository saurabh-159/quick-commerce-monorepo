import { Suspense } from 'react';
import StorePage from '@/components/store/StorePage';

export default function Page() {
  return (
    <Suspense fallback={<div className="home-wrap py-16 text-sm text-[#6f6a64]">Loading store...</div>}>
      <StorePage />
    </Suspense>
  );
}
