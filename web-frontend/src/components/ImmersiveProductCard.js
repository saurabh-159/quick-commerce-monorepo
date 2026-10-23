'use client';

import Link from 'next/link';

/**
 * Mobile-first product card matching the immersive overlay reference.
 * Image fills the card; title, price pill, tags and Add sit on a bottom gradient.
 */
export default function ImmersiveProductCard({
  name,
  image,
  href = '',
  priceLabel,
  description,
  discountPercent,
  tags = [],
  onAdd,
  loading = false,
  added = false,
  disabled = false,
  className = '',
}) {
  const title = (
    <h3 className="line-clamp-2 min-w-0 flex-1 font-sans text-[15px] font-semibold leading-tight text-white drop-shadow-sm sm:text-base">
      {name}
    </h3>
  );

  return (
    <article
      className={`group relative flex min-h-[260px] flex-col overflow-hidden rounded-[22px] shadow-[0_12px_28px_rgba(26,20,51,0.14)] sm:min-h-[300px] ${className}`}
    >
      <div className="absolute inset-0 bg-brand-soft">
        {image ? (
          <img
            src={image}
            alt=""
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <span className="grid h-full place-items-center text-sm text-brand-muted-light">No image</span>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/5" />
      </div>

      {discountPercent > 0 ? (
        <span className="absolute right-2.5 top-2.5 z-10 rounded-full bg-black/40 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
          {discountPercent}% off
        </span>
      ) : null}

      <div className="relative z-10 mt-auto flex flex-col p-3 pb-3.5 sm:p-3.5">
        <div className="flex items-start justify-between gap-2">
          {href ? <Link href={href} className="min-w-0 flex-1">{title}</Link> : title}
          {priceLabel ? (
            <span className="shrink-0 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
              {priceLabel}
            </span>
          ) : null}
        </div>

        {description ? (
          <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-white/85">
            {description}
          </p>
        ) : null}

        {tags.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        <button
          type="button"
          onClick={onAdd}
          disabled={disabled || loading}
          className="mt-3 w-full rounded-full bg-white py-2.5 text-xs font-semibold text-brand-text transition hover:bg-white/90 disabled:opacity-45"
        >
          {disabled ? 'Out of stock' : loading ? 'Adding…' : added ? 'Added' : 'Add to cart'}
        </button>
      </div>
    </article>
  );
}
