'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/utils/api';
import { aiSearch } from '@/utils/ai';
import CategoryRail from '@/components/home/CategoryRail';
import HeroCarousel from '@/components/home/HeroCarousel';
import NearbyStores from '@/components/home/NearbyStores';
import AllStores from '@/components/home/AllStores';
import ProductSection from '@/components/home/ProductSection';
import AiSearchResults from '@/components/home/AiSearchResults';

const FALLBACK = { lat: 28.6139, lng: 77.209 };

const TRUST = [
  ['Fast delivery', 'From the nearest open store'],
  ['Live stock', 'Prices come from that store'],
  ['Secure checkout', 'Pay when you place the order'],
  ['Simple cart', 'Review items before you order']
];

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const category = searchParams.get('category') || '';
  const query = searchParams.get('q') || '';

  const [coords, setCoords] = useState(FALLBACK);
  const [usedFallback, setUsedFallback] = useState(false);
  const [ready, setReady] = useState(false);
  const [home, setHome] = useState(null);
  const [search, setSearch] = useState(query);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [aiResults, setAiResults] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  useEffect(() => {
    let ignore = false;

    async function locate() {
      if (!navigator.geolocation) {
        if (!ignore) {
          setUsedFallback(true);
          setReady(true);
        }
        return;
      }

      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        if (!ignore) {
          setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        }
      } catch {
        if (!ignore) setUsedFallback(true);
      } finally {
        if (!ignore) setReady(true);
      }
    }

    locate();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    setSearch(query);
  }, [query]);

  useEffect(() => {
    if (!ready) return undefined;
    const nextQuery = search.trim();
    if (nextQuery === query) return undefined;

    const handle = setTimeout(() => {
      const next = new URLSearchParams();
      if (category) next.set('category', category);
      if (nextQuery) next.set('q', nextQuery);
      const upcoming = next.toString();
      router.replace(upcoming ? `/?${upcoming}` : '/');
    }, 350);

    return () => clearTimeout(handle);
  }, [search, query, category, ready, router]);

  useEffect(() => {
    if (!ready) return undefined;
    let ignore = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({
          lat: String(coords.lat),
          lng: String(coords.lng)
        });
        if (category) params.set('category', category);
        if (query) params.set('q', query);
        const data = await api(`/home?${params.toString()}`);
        if (!ignore) setHome(data);
      } catch (err) {
        if (!ignore) setError(err.message || 'Could not load the store');
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [ready, coords.lat, coords.lng, category, query]);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setAiResults([]);
      setAiError('');
      setAiLoading(false);
      return undefined;
    }

    let ignore = false;
    setAiLoading(true);
    setAiError('');

    const handle = setTimeout(() => {
      aiSearch(q, 6)
        .then((data) => {
          if (!ignore) setAiResults(data?.results || []);
        })
        .catch((err) => {
          if (!ignore) {
            setAiResults([]);
            setAiError(err.message || 'AI search failed');
          }
        })
        .finally(() => {
          if (!ignore) setAiLoading(false);
        });
    }, 400);

    return () => {
      ignore = true;
      clearTimeout(handle);
    };
  }, [query]);

  const counts = Object.fromEntries(
    (home?.sections || []).map((section) => [section.categorySlug, section.productCount])
  );
  const showIntro = home?.serviceable && !category && !query;

  return (
    <div className="min-h-screen bg-[#f6f3ee] pb-16 text-[#161616]">
      <div className="home-wrap pt-8 md:pt-10">
        <div className="grid items-end gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#8a837b]">
              {home?.location?.label || 'Delivering to'}
            </p>
            <h1 className="mt-3 max-w-3xl font-serif text-4xl leading-none md:text-6xl">
              {home?.hero?.title || 'Groceries in minutes'}
            </h1>
            <p className="mt-4 max-w-xl text-sm text-[#6f6a64] md:text-base">
              {home?.store?.name || 'Finding a nearby store'}
              {home?.location?.address ? ` · ${home.location.address}` : ''}
              {home?.store?.isOpen ? ` · ${home.hero.subtitle}` : ''}
            </p>
          </div>
          <form onSubmit={(event) => event.preventDefault()}>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={home?.hero?.searchPlaceholder || 'Search for milk, bread, snacks'}
              className="w-full rounded-full border border-[#e4ddd4] bg-white px-5 py-4 text-sm outline-none ring-[#161616] focus:ring-2"
            />
          </form>
        </div>

        {usedFallback && (
          <p className="mt-6 rounded-2xl bg-[#fff6e8] px-4 py-3 text-sm text-[#8a5a12]">
            Location was not available, so we are showing the Delhi delivery area.
          </p>
        )}
        {error && (
          <p className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}

        {loading && !home && (
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-80 animate-pulse rounded-[28px] bg-[#efeae4]" />
            ))}
          </div>
        )}

        {home && !home.serviceable && (
          <div className="mt-10 rounded-[28px] bg-white px-6 py-16 text-center">
            <h2 className="font-serif text-3xl">{home.hero.title}</h2>
            <p className="mt-3 text-sm text-[#6f6a64]">{home.message}</p>
          </div>
        )}

        {(showIntro || (home && !home.serviceable)) && Boolean(home?.nearbyStores?.length || home?.stores?.length) && (
          <div className="mt-12 space-y-16">
            <NearbyStores stores={home.nearbyStores} />
            <AllStores stores={home.stores} />
          </div>
        )}

        {home?.serviceable && (
          <div className="mt-10 space-y-16">
            {showIntro && <HeroCarousel banners={home.banners} eyebrow={home.hero.subtitle} />}
            {query ? (
              <AiSearchResults
                query={query}
                results={aiResults}
                loading={aiLoading}
                error={aiError}
                storeId={home?.store?.id}
              />
            ) : null}
            <CategoryRail categories={home.categories} activeSlug={category} counts={counts} />
            {showIntro && <Promo banners={home.banners} hero={home.hero} store={home.store} />}
            {home.sections.length === 0 ? (
              <div className="rounded-[28px] bg-white px-6 py-16 text-center text-sm text-[#6f6a64]">
                No products found.
              </div>
            ) : (
              home.sections.map((section, index) => (
                <ProductSection
                  key={section.id}
                  section={section}
                  store={home.store}
                  eyebrow={index === 0 ? 'Handpicked' : 'In this aisle'}
                />
              ))
            )}
            {showIntro && <TrustRow />}
          </div>
        )}
      </div>
    </div>
  );
}

function Promo({ banners, hero, store }) {
  const cards = (banners || []).slice(0, 2);
  if (cards.length < 2) return null;

  return (
    <section className="grid gap-5 lg:grid-cols-2">
      {cards.map((banner, index) => (
        <Link
          key={banner.id}
          href={banner.href}
          className="relative min-h-[360px] overflow-hidden rounded-[28px]"
        >
          <img src={banner.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="relative flex min-h-[360px] flex-col justify-end p-8 text-white">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/75">
              {index === 0 ? 'Live now' : 'Shop the aisle'}
            </p>
            <h3 className="mt-2 font-serif text-4xl">{banner.title}</h3>
            <p className="mt-2 text-sm text-white/85">
              {index === 0 ? `${hero.subtitle} · ${store.name}` : banner.subtitle}
            </p>
            <span className="mt-6 w-fit rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#161616]">
              Explore
            </span>
          </div>
        </Link>
      ))}
    </section>
  );
}

function TrustRow() {
  return (
    <section className="grid gap-4 border-t border-[#e4ddd4] pt-10 sm:grid-cols-2 xl:grid-cols-4">
      {TRUST.map(([title, text]) => (
        <div key={title}>
          <p className="font-medium">{title}</p>
          <p className="mt-1 text-sm text-[#6f6a64]">{text}</p>
        </div>
      ))}
    </section>
  );
}
