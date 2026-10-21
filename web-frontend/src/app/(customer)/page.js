import { Suspense } from 'react';
import HomePage from '@/components/home/HomePage';

export default function CustomerHome() {
  return (
    <Suspense fallback={<div className="px-4 py-12 text-center text-sm text-gray-500">Loading store...</div>}>
      <HomePage />
    </Suspense>
  );
}
