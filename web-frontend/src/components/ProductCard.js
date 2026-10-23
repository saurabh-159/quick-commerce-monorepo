'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getToken, getRole } from '@/utils/auth';
import { addGuestItem } from '@/utils/guestCart';
import { api } from '@/utils/api';
import { formatPrice } from '@/utils/format';
import ImmersiveProductCard from '@/components/ImmersiveProductCard';

export default function ProductCard({ product, storeId, storeName, layout = 'card' }) {
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);
  const image = product.image || product.images?.[0];
  const wide = layout === 'wide';
  const href = storeId ? `/store/${storeId}/product/${product.id || product._id}` : '';
  const outOfStock = product.stock === 0;

  const handleAddToCart = async (event) => {
    if (event?.preventDefault) event.preventDefault();
    if (event?.stopPropagation) event.stopPropagation();
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
            qty: 1,
          }),
        });
        window.dispatchEvent(new Event('qc-cart'));
      }
      setAdded(true);
      setTimeout(() => setAdded(false), 1200);
    } catch (err) {
      alert(err.message || 'Failed to add item');
    } finally {
      setLoading(false);
    }
  };

  const tags = [];
  if (product.discountPercent > 0) tags.push('Deal');
  if (product.stock > 0 && product.stock <= 12) tags.push(`${product.stock} left`);
  else if (product.stock > 12) tags.push('In stock');
  if (product.category?.name) tags.push(product.category.name);

  const description =
    product.description ||
    (product.unit ? `${product.unit} · Ready to deliver` : 'Ready to deliver');

  const immersive = (
    <ImmersiveProductCard
      name={product.name}
      image={image}
      href={href}
      priceLabel={formatPrice(product.sellingPricePaise)}
      description={description}
      discountPercent={product.discountPercent}
      tags={tags.slice(0, 2)}
      onAdd={handleAddToCart}
      loading={loading}
      added={added}
      disabled={outOfStock}
    />
  );

  const info = (
    <>
      <p className="text-[11px] uppercase tracking-[0.16em] text-brand-muted-light">
        {product.category?.name || 'Grocery'}
      </p>
      <h3
        className={`mt-2 text-brand-text ${
          wide
            ? 'font-sans text-3xl md:text-4xl'
            : 'line-clamp-2 min-h-[44px] text-sm font-medium md:text-base'
        }`}
      >
        {product.name}
      </h3>
      <p className="mt-2 text-sm text-brand-muted">
        {product.stock > 0 ? 'Ready to deliver' : 'Out of stock'} · {product.unit}
      </p>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-base font-semibold text-brand-text">
          {formatPrice(product.sellingPricePaise)}
        </span>
        {product.mrpPaise > product.sellingPricePaise && (
          <span className="text-sm text-brand-muted-light line-through">
            {formatPrice(product.mrpPaise)}
          </span>
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
        disabled={loading || outOfStock}
        className="mt-5 w-fit rounded-full border border-brand-text px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-brand-text transition hover:bg-brand-text hover:text-white disabled:opacity-40"
      >
        {outOfStock ? 'Out of stock' : loading ? 'Adding' : added ? 'Added' : 'Add'}
      </button>
    </div>
  );

  const photo = (
    <div
      className={`relative overflow-hidden bg-brand-soft ${
        wide ? 'min-h-[200px] md:min-h-[280px]' : 'h-56 rounded-[22px] lg:h-60'
      }`}
    >
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

  const photoNode = href ? (
    <Link href={href} className="block h-full">
      {photo}
    </Link>
  ) : (
    photo
  );

  if (wide) {
    return (
      <>
        <div className="md:hidden">{immersive}</div>
        <article className="hidden overflow-hidden rounded-[28px] bg-white md:grid md:grid-cols-2">
          {photoNode}
          {details}
        </article>
      </>
    );
  }

  return (
    <>
      {/* Mobile: immersive reference card */}
      <div className="md:hidden">{immersive}</div>
      {/* Desktop: existing layout */}
      <article className="hidden h-full flex-col md:flex">
        {photoNode}
        {details}
      </article>
    </>
  );
}
