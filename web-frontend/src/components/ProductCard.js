'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getToken, getRole } from '@/utils/auth';
import { addGuestItem } from '@/utils/guestCart';
import { api } from '@/utils/api';
import { formatPrice } from '@/utils/format';

export default function ProductCard({ product, storeId, storeName, layout = 'card' }) {
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);
  const image = product.image || product.images?.[0];
  const wide = layout === 'wide';
  const href = storeId ? `/store/${storeId}/product/${product.id || product._id}` : '';

  const handleAddToCart = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const role = getRole();

      if (!token || role !== 'customer') {
        addGuestItem({ storeId, storeName, product });
      } else {
        await api('/cart/items', {
          method: 'POST',
          body: JSON.stringify({
            productId: product.id || product._id,
            storeId,
            qty: 1
          })
        });
      }
      setAdded(true);
      setTimeout(() => setAdded(false), 1200);
    } catch (err) {
      alert(err.message || 'Failed to add item');
    } finally {
      setLoading(false);
    }
  };

  const info = (
    <>
      <p className={`uppercase tracking-[0.16em] text-brand-muted-light ${wide ? 'text-[11px]' : 'text-[9px] md:text-[11px]'}`}>
        {product.category?.name || 'Grocery'}
      </p>
      <h3 className={`mt-1.5 text-brand-text md:mt-2 ${wide ? 'font-sans text-3xl md:text-4xl' : 'line-clamp-2 min-h-[36px] text-xs font-medium md:min-h-[44px] md:text-base'}`}>
        {product.name}
      </h3>
      <p className={`mt-1.5 text-brand-muted md:mt-2 ${wide ? 'text-sm' : 'text-[11px] md:text-sm'}`}>
        <span className="md:hidden">{product.stock > 0 ? product.unit : 'Out of stock'}</span>
        <span className="hidden md:inline">
          {product.stock > 0 ? 'Ready to deliver' : 'Out of stock'} · {product.unit}
        </span>
      </p>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 md:mt-3">
        <span className={`font-semibold text-brand-text ${wide ? 'text-base' : 'text-sm md:text-base'}`}>
          {formatPrice(product.sellingPricePaise)}
        </span>
        {product.mrpPaise > product.sellingPricePaise && (
          <span className="text-[11px] text-brand-muted-light line-through md:text-sm">
            {formatPrice(product.mrpPaise)}
          </span>
        )}
        {product.discountPercent > 0 && (
          <span className="text-[11px] text-brand-text md:text-sm">{product.discountPercent}% off</span>
        )}
      </div>
    </>
  );

  const details = (
    <div className={wide ? 'flex flex-col justify-center p-6 md:p-10' : 'mt-2.5 flex flex-1 flex-col md:mt-4'}>
      {href ? <Link href={href}>{info}</Link> : info}
      <button
        type="button"
        onClick={handleAddToCart}
        disabled={loading || product.stock === 0}
        className={`rounded-full border border-brand-text font-semibold uppercase tracking-[0.14em] text-brand-text transition hover:bg-brand-text hover:text-white disabled:opacity-40 ${
          wide
            ? 'mt-5 w-fit px-5 py-2.5 text-xs'
            : 'mt-3 w-full px-3 py-2 text-[10px] md:mt-5 md:w-fit md:px-5 md:py-2.5 md:text-xs'
        }`}
      >
        {product.stock === 0 ? 'Out of stock' : loading ? 'Adding' : added ? 'Added' : 'Add'}
      </button>
    </div>
  );

  const photo = (
    <div
      className={`relative overflow-hidden bg-brand-soft ${
        wide
          ? 'min-h-[200px] md:min-h-[280px]'
          : 'aspect-square rounded-[16px] md:aspect-auto md:h-56 md:rounded-[22px] lg:h-60'
      }`}
    >
      {product.discountPercent > 0 && (
        <span className="absolute left-2 top-2 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-brand-text md:left-3 md:top-3 md:px-3 md:py-1 md:text-[11px]">
          {product.discountPercent}% off
        </span>
      )}
      {image ? (
        <img src={image} alt={product.name} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <span className="grid h-full place-items-center text-sm text-brand-muted-light">No image</span>
      )}
    </div>
  );

  const photoNode = href ? <Link href={href} className="block h-full">{photo}</Link> : photo;

  if (wide) {
    return (
      <article className="grid overflow-hidden rounded-[28px] bg-white md:grid-cols-2">
        {photoNode}
        {details}
      </article>
    );
  }

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-[18px] bg-white p-2 ring-1 ring-brand-border/70 md:rounded-none md:bg-transparent md:p-0 md:ring-0">
      {photoNode}
      {details}
    </article>
  );
}
