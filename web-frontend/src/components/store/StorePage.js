'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { api } from '@/utils/api';
import ProductSection from '@/components/home/ProductSection';

const FALLBACK = { lat: 28.6139, lng: 77.209 };

export default function StorePage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const category = searchParams.get('category') || '';
  const [page, setPage] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      setError('');
      let lat = FALLBACK.lat;
      let lng = FALLBACK.lng;
      if (navigator.geolocation) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000 });
          });
          lat = position.coords.latitude;
          lng = position.coords.longitude;
        } catch {
          lat = FALLBACK.lat;
          lng = FALLBACK.lng;
        }
      }

      try {
        const params = new URLSearchParams({ lat: String(lat), lng: String(lng) });
        if (category) params.set('category', category);
        const data = await api(`/stores/${id}/catalog?${params.toString()}`);
        if (!ignore) setPage(data);
      } catch (err) {
        if (!ignore) setError(err.message || 'Could not load this store');
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    if (id) load();
    return () => {
      ignore = true;
    };
  }, [id, category]);

  const store = page?.store;

  return (
    <div className="home-wrap py-6 text-brand-text md:py-8">
      <Link href="/" className="text-sm text-brand-muted">← Home</Link>

      {loading && <div className="mt-6 h-48 animate-pulse rounded-[24px] bg-brand-soft md:h-56" />}
      {error && <p className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {store && (
        <div className="mt-5 space-y-8 md:space-y-10">
          <header className="grid overflow-hidden rounded-[24px] bg-white md:h-[240px] md:grid-cols-[0.95fr_1.05fr]">
            <img src={store.image} alt="" className="h-44 w-full object-cover md:h-full" />
            <div className="flex flex-col justify-center p-5 md:px-8 md:py-6">
              <p className="text-[11px] uppercase tracking-[0.22em] text-brand-muted-light">
                {store.isOpen ? 'Open now' : 'Closed'}
                {store.inRange ? ` · ${store.etaMinutes} min` : ''}
              </p>
              <h1 className="mt-2 font-sans text-3xl leading-tight md:text-4xl">{store.name}</h1>
              <p className="mt-2 text-sm text-brand-muted line-clamp-2">{store.addressText}</p>
              {store.distanceKm != null && (
                <p className="mt-1.5 text-sm text-brand-muted">
                  {store.distanceKm} km from you · {Number(store.lat).toFixed(4)}, {Number(store.lng).toFixed(4)}
                </p>
              )}
              <a
                href={`https://www.google.com/maps?q=${store.lat},${store.lng}`}
                target="_blank"
                rel="noreferrer"
                className="mt-4 w-fit rounded-full border border-brand-text px-4 py-2 text-sm font-medium"
              >
                Open location
              </a>
            </div>
          </header>

          {page.categories?.length > 0 && (
            <div className="flex gap-3 overflow-x-auto pb-1">
              <Link
                href={`/store/${store.id}`}
                className={`shrink-0 rounded-full px-4 py-2 text-sm ${category ? 'bg-white text-brand-text' : 'bg-brand-text text-white'}`}
              >
                All
              </Link>
              {page.categories.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm ${category === item.slug ? 'bg-brand-text text-white' : 'bg-white text-brand-text'}`}
                >
                  {item.name} · {item.productCount}
                </Link>
              ))}
            </div>
          )}

          {page.sections?.length ? (
            page.sections.map((section) => (
              <ProductSection
                key={section.id}
                section={section}
                store={store}
                eyebrow="In this store"
                categoryBase={`/store/${store.id}`}
              />
            ))
          ) : (
            <p className="rounded-[28px] bg-white px-6 py-12 text-center text-sm text-brand-muted">
              {page.message || 'No products in this store.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
