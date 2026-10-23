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
      <p className="text-[11px] uppercase tracking-[0.16em] text-brand-muted-light">
        {product.category?.name || 'Grocery'}
      </p>
      <h3 className={`mt-2 text-brand-text ${wide ? 'font-sans text-3xl md:text-4xl' : 'line-clamp-2 min-h-[44px] text-sm font-medium md:text-base'}`}>
        {product.name}
      </h3>
      <p className="mt-2 text-sm text-brand-muted">
        {product.stock > 0 ? 'Ready to deliver' : 'Out of stock'} · {product.unit}
      </p>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-base font-semibold text-brand-text">{formatPrice(product.sellingPricePaise)}</span>
        {product.mrpPaise > product.sellingPricePaise && (
          <span className="text-sm text-brand-muted-light line-through">{formatPrice(product.mrpPaise)}</span>
        )}
        {product.discountPercent > 0 && (
          <span className="text-sm text-brand-text">{product.discountPercent}% off</span>
        )}
      </div>
    </>
  );

  const details = (
    <div className={wide ? 'flex flex-col justify-center p-6 md:p-10' : 'mt-4'}>
      {href ? <Link href={href}>{info}</Link> : info}
      <button
        type="button"
        onClick={handleAddToCart}
        disabled={loading || product.stock === 0}
        className="mt-5 w-fit rounded-full border border-brand-text px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-brand-text transition hover:bg-brand-text hover:text-white disabled:opacity-40"
      >
        {product.stock === 0 ? 'Out of stock' : loading ? 'Adding' : added ? 'Added' : 'Add'}
      </button>
    </div>
  );

  const photo = (
    <div className={`relative overflow-hidden bg-brand-soft ${wide ? 'min-h-[200px] md:min-h-[280px]' : 'h-48 rounded-[22px] sm:h-52 md:h-56 lg:h-60'}`}>
      {product.discountPercent > 0 && (
        <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-brand-text">
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
    <article className="flex h-full flex-col">
      {photoNode}
      {details}
    </article>
  );
}
