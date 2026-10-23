'use client';
import { statusLabel } from '@/utils/format';

export default function StatusBadge({ status }) {
  const getBadgeColor = (st) => {
    switch (st) {
      case 'confirmed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'assigned': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'picked_up': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'on_the_way': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'delivered': return 'bg-brand-soft text-brand-dark border-brand';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${getBadgeColor(status)}`}>
      {statusLabel(status || 'pending')}
    </span>
  );
}