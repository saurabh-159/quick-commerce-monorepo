'use client';

import { formatRupees } from '@/utils/format';

export default function CartItem({ item, onUpdateQty }) {
  const image = item.images?.[0] || item.image;
  const idLabel = item.productId
    ? `#${String(item.productId).replace(/[^a-zA-Z0-9]/g, '').slice(-14)}`
    : '';
  const detailParts = [];
  if (item.unit) detailParts.push(`Unit: ${item.unit}`);

  return (
    <div className="relative border-b border-gray-200 py-5">
      {/* Mobile */}
      <div className="sm:hidden">
        <div className="flex gap-3 pr-8">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-gray-100">
            {image ? (
              <img src={image} alt={item.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">
                No image
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-bold text-brand-text">{item.name}</h3>
            {idLabel ? <p className="mt-0.5 text-xs text-gray-400">{idLabel}</p> : null}
            {detailParts.length > 0 ? (
              <p className="mt-1 text-xs text-gray-400">{detailParts.join(' // ')}</p>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-brand-text">{formatRupees(item.pricePaise)}</p>
          <div className="flex items-center gap-3 text-brand-text">
            <button
              type="button"
              aria-label="Decrease quantity"
              onClick={() => onUpdateQty(item.productId, item.qty - 1)}
              className="flex h-8 w-8 items-center justify-center text-lg leading-none text-gray-500"
            >
              −
            </button>
            <span className="min-w-[1.25rem] text-center text-sm font-medium tabular-nums">{item.qty}</span>
            <button
              type="button"
              aria-label="Increase quantity"
              onClick={() => onUpdateQty(item.productId, item.qty + 1)}
              className="flex h-8 w-8 items-center justify-center text-lg leading-none text-gray-500"
            >
              +
            </button>
          </div>
          <p className="text-sm font-bold text-brand-text">{formatRupees(item.totalPaise)}</p>
        </div>

        <button
          type="button"
          aria-label={`Remove ${item.name}`}
          onClick={() => onUpdateQty(item.productId, 0)}
          className="absolute right-0 top-5 flex h-8 w-8 items-center justify-center text-gray-400"
        >
          <svg viewBox="0 0 14 14" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M1 1l12 12M13 1L1 13" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Desktop */}
      <div className="hidden grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_auto_minmax(0,0.9fr)_auto] items-center gap-4 sm:grid">
        <div className="flex min-w-0 gap-4">
          <div className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-md bg-gray-100">
            {image ? (
              <img src={image} alt={item.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">
                No image
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold text-brand-text">{item.name}</h3>
            {idLabel ? <p className="mt-0.5 text-xs text-gray-400">{idLabel}</p> : null}
            {detailParts.length > 0 ? (
              <p className="mt-1 text-sm text-gray-400">{detailParts.join(' // ')}</p>
            ) : null}
          </div>
        </div>

        <p className="text-right text-base font-bold text-brand-text">{formatRupees(item.pricePaise)}</p>

        <div className="flex items-center justify-center gap-3 text-brand-text">
          <button
            type="button"
            aria-label="Decrease quantity"
            onClick={() => onUpdateQty(item.productId, item.qty - 1)}
            className="flex h-7 w-7 items-center justify-center text-lg leading-none text-gray-500 transition hover:text-brand-text"
          >
            −
          </button>
          <span className="min-w-[1.25rem] text-center text-sm font-medium tabular-nums">{item.qty}</span>
          <button
            type="button"
            aria-label="Increase quantity"
            onClick={() => onUpdateQty(item.productId, item.qty + 1)}
            className="flex h-7 w-7 items-center justify-center text-lg leading-none text-gray-500 transition hover:text-brand-text"
          >
            +
          </button>
        </div>

        <p className="text-right text-base font-bold text-brand-text">{formatRupees(item.totalPaise)}</p>

        <button
          type="button"
          aria-label={`Remove ${item.name}`}
          onClick={() => onUpdateQty(item.productId, 0)}
          className="flex h-8 w-8 items-center justify-center justify-self-end text-gray-400 transition hover:text-brand-text"
        >
          <svg viewBox="0 0 14 14" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M1 1l12 12M13 1L1 13" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
