'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { getToken, getRole } from '@/utils/auth';
import { addGuestItem } from '@/utils/guestCart';
import { api } from '@/utils/api';
import { aiAssistant, aiOrderSupport } from '@/utils/ai';
import ImmersiveProductCard from '@/components/ImmersiveProductCard';

const CATEGORY_ART = {
  'dairy-breakfast':
    'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80',
  'fruits-vegetables':
    'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=600&q=80',
  'snacks-munchies':
    'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?auto=format&fit=crop&w=600&q=80',
  dairy:
    'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80',
  fruit:
    'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=600&q=80',
  vegetable:
    'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=600&q=80',
  snack:
    'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?auto=format&fit=crop&w=600&q=80',
};

const FALLBACK_ART = {
  category:
    'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80',
  store:
    'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=600&q=80',
  product:
    'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80',
};

const SUGGESTIONS = {
  assistant: [
    'Stores near me?',
    'What categories are available?',
    'Dairy & breakfast items',
    'Fruits & vegetables',
  ],
  order: ['Where is my order?', 'Refund policy', 'Cancel my order'],
};

function slugify(text = '') {
  return String(text)
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function resolveCardImage(card) {
  if (card?.image) return card.image;

  const type = (card?.type || 'category').toLowerCase();
  const titleSlug = slugify(card?.title || '');
  if (type === 'category') {
    if (CATEGORY_ART[titleSlug]) return CATEGORY_ART[titleSlug];
    const hit = Object.keys(CATEGORY_ART).find((key) => titleSlug.includes(key));
    if (hit) return CATEGORY_ART[hit];
  }
  return FALLBACK_ART[type] || FALLBACK_ART.category;
}

const LOCATION_CACHE_KEY = 'qc-help-coords';
const GEO_OPTIONS = {
  enableHighAccuracy: false,
  timeout: 60000,
  maximumAge: 5 * 60 * 1000,
};
const LOCATION_PROMPT_HINT =
  'Tap Allow location, then choose Allow on the browser prompt. You can type after location is on.';
const LOCATION_BLOCKED_HINT =
  'Location is blocked for this site. Open the lock icon in the address bar, set Location to Allow, then tap Try again.';
const LOCATION_GPS_HINT =
  'Location is allowed, but a position has not arrived yet. Tap Try again.';

function readCachedCoords() {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const parsed = JSON.parse(sessionStorage.getItem(LOCATION_CACHE_KEY) || 'null');
    if (Number.isFinite(parsed?.lat) && Number.isFinite(parsed?.lng)) {
      return { lat: parsed.lat, lng: parsed.lng };
    }
  } catch {
    /* ignore broken cache */
  }
  return null;
}

function writeCachedCoords(coords) {
  try {
    sessionStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(coords));
  } catch {
    /* private mode */
  }
}

function clearCachedCoords() {
  try {
    sessionStorage.removeItem(LOCATION_CACHE_KEY);
  } catch {
    /* ignore */
  }
}

function readGeoPermission() {
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) {
    return Promise.resolve(null);
  }
  return navigator.permissions
    .query({ name: 'geolocation' })
    .then((status) => status.state)
    .catch(() => null);
}

function locationBadgeLabel(status, hint) {
  if (status === 'ready') return 'Location on';
  if (status === 'pending') return 'Finding you…';
  if (status === 'denied') return 'Location blocked';
  if (hint === LOCATION_GPS_HINT) return 'Try again';
  return 'Allow location';
}

function locationActionLabel(status, hint) {
  if (status === 'pending') return 'Finding you…';
  if (status === 'denied' || hint === LOCATION_GPS_HINT) return 'Try again';
  return 'Allow location';
}

function pricePaiseFromCard(card) {
  if (card?.price_paise != null) return Number(card.price_paise) || 0;
  if (card?.sellingPricePaise != null) return Number(card.sellingPricePaise) || 0;
  const match = String(card?.meta || '').match(/₹\s*([\d.]+)/);
  if (match) return Math.round(parseFloat(match[1]) * 100);
  return 0;
}

function ProductAssistantCard({ card, index }) {
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);
  const image = resolveCardImage(card);
  const storeId = card.store_id || card.storeId || '';
  const stock = card.stock != null ? Number(card.stock) : null;
  const outOfStock = stock != null && stock <= 0;
  const pricePaise = pricePaiseFromCard(card);
  const priceLabel =
    card.meta?.includes('₹')
      ? card.meta.split('·')[0].trim()
      : pricePaise
        ? `₹${Math.round(pricePaise / 100)}`
        : null;

  const tags = [];
  if (stock != null && stock > 0 && stock <= 12) tags.push(`${stock} left`);
  else if (stock != null && stock > 12) tags.push('In stock');
  if (card.unit) tags.push(card.unit);

  const handleAdd = async (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (!storeId || !card.id || loading || outOfStock) return;

    setLoading(true);
    try {
      const token = getToken();
      const role = getRole();
      const product = {
        id: card.id,
        name: card.title,
        unit: card.unit || '',
        sellingPricePaise: pricePaise,
        stock: stock != null ? stock : 99,
        image: card.image,
      };

      if (!token || role !== 'customer') {
        addGuestItem({
          storeId,
          storeName: card.store_name || card.storeName || '',
          product,
        });
      } else {
        await api('/cart/items', {
          method: 'POST',
          body: JSON.stringify({ productId: card.id, storeId, qty: 1 }),
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

  return (
    <div className="help-card" style={{ animationDelay: `${index * 70}ms` }}>
      <ImmersiveProductCard
        name={card.title}
        image={image}
        href={card.href || ''}
        priceLabel={priceLabel}
        description={card.subtitle || 'Fresh from a nearby store'}
        tags={tags.slice(0, 2)}
        onAdd={handleAdd}
        loading={loading}
        added={added}
        disabled={outOfStock || !storeId}
        className="min-h-[240px] sm:min-h-[280px]"
      />
    </div>
  );
}

function AssistantCard({ card, index }) {
  const type = (card.type || '').toLowerCase();
  if (type === 'product') {
    return <ProductAssistantCard card={card} index={index} />;
  }

  const image = resolveCardImage(card);
  const typeLabel = (card.type || 'item').replace(/_/g, ' ');

  return (
    <Link
      href={card.href}
      className="help-card group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_8px_24px_rgba(26,20,51,0.06)] ring-1 ring-brand-border transition duration-300 hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(83,50,201,0.16)] hover:ring-brand/40 md:flex-row"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="relative aspect-[5/4] w-full shrink-0 overflow-hidden bg-brand-soft md:aspect-auto md:h-[104px] md:w-[104px]">
        <img
          src={image}
          alt=""
          className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent md:bg-gradient-to-r md:from-transparent md:to-white/10" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center px-2.5 py-2.5 md:px-4 md:py-3">
        <p className="hidden text-[10px] font-semibold uppercase tracking-[0.18em] text-brand md:block">
          {typeLabel}
        </p>
        <p className="line-clamp-2 font-sans text-[13px] leading-snug text-brand-text md:mt-1 md:truncate md:text-xl md:leading-tight">
          {card.title}
        </p>
        {card.subtitle ? (
          <p className="mt-1 hidden truncate text-xs text-brand-muted md:block">{card.subtitle}</p>
        ) : null}
        <div className="mt-1.5 flex items-center justify-between gap-1 md:mt-2 md:gap-2">
          {card.meta ? (
            <p className="truncate text-[11px] font-semibold text-brand md:text-xs">{card.meta}</p>
          ) : card.subtitle ? (
            <p className="truncate text-[11px] text-brand-muted md:hidden">{card.subtitle}</p>
          ) : (
            <span />
          )}
          <span className="hidden shrink-0 text-xs font-medium text-brand-text transition group-hover:translate-x-0.5 md:inline">
            Open →
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function AiSupportChat({ title = 'Ask for help', mode = 'auto' }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [location, setLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('need-permission');
  const [locationHint, setLocationHint] = useState(LOCATION_PROMPT_HINT);
  const scrollerRef = useRef(null);
  const locationRef = useRef(null);
  const requestSerial = useRef(0);
  const askForLocationRef = useRef(() => {});

  const resolvedMode = (() => {
    if (mode === 'order' || mode === 'assistant') return mode;
    const token = getToken();
    const role = getRole();
    return token && role === 'customer' ? 'order' : 'assistant';
  })();

  const canChat = resolvedMode !== 'assistant' || locationStatus === 'ready';
  const locationMessage =
    locationStatus === 'pending'
      ? 'Finding your location…'
      : locationHint || LOCATION_PROMPT_HINT;

  const askForLocation = useCallback((attempt = 0, fromUser = false) => {
    const serial = ++requestSerial.current;

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationStatus('denied');
      setLocationHint('This browser cannot share location.');
      return;
    }

    if (fromUser && !locationRef.current) {
      setLocationStatus('pending');
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (requestSerial.current !== serial) return;
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        locationRef.current = coords;
        writeCachedCoords(coords);
        setLocation(coords);
        setLocationStatus('ready');
        setLocationHint('');
      },
      (err) => {
        void (async () => {
          if (requestSerial.current !== serial) return;
          const permission = await readGeoPermission();
          if (requestSerial.current !== serial) return;

          const blocked =
            permission === 'denied' ||
            (fromUser && err?.code === 1 && permission !== 'granted' && permission !== 'prompt');

          if (blocked) {
            locationRef.current = null;
            clearCachedCoords();
            setLocation(null);
            setLocationStatus('denied');
            setLocationHint(LOCATION_BLOCKED_HINT);
            return;
          }

          if (err?.code === 1) {
            if (locationRef.current) {
              setLocation(locationRef.current);
              setLocationStatus('ready');
              setLocationHint('');
            } else {
              setLocationStatus('need-permission');
              setLocationHint(LOCATION_PROMPT_HINT);
            }
            return;
          }

          if (locationRef.current) {
            setLocation(locationRef.current);
            setLocationStatus('ready');
            setLocationHint('');
            return;
          }

          if (permission === 'granted' && attempt < 2) {
            window.setTimeout(() => {
              if (requestSerial.current === serial) askForLocationRef.current(attempt + 1, fromUser);
            }, 1200);
            return;
          }

          setLocationStatus('need-permission');
          setLocationHint(permission === 'granted' ? LOCATION_GPS_HINT : LOCATION_PROMPT_HINT);
        })();
      },
      GEO_OPTIONS
    );
  }, []);

  useEffect(() => {
    askForLocationRef.current = askForLocation;
  }, [askForLocation]);

  useEffect(() => {
    if (resolvedMode !== 'assistant') return undefined;

    const cached = readCachedCoords();
    if (cached) {
      locationRef.current = cached;
      setLocation(cached);
      setLocationStatus('ready');
    }

    let permissionStatus = null;
    let cancelled = false;

    (async () => {
      const permission = await readGeoPermission();
      if (cancelled) return;

      if (permission === 'denied') {
        locationRef.current = null;
        clearCachedCoords();
        setLocation(null);
        setLocationStatus('denied');
        setLocationHint(LOCATION_BLOCKED_HINT);
        return;
      }

      if (permission === 'granted' || locationRef.current) {
        if (!locationRef.current) {
          setLocationStatus('pending');
          setLocationHint('');
        }
        askForLocationRef.current(0);
        return;
      }

      setLocationStatus('need-permission');
      setLocationHint(LOCATION_PROMPT_HINT);
      askForLocationRef.current(0);
    })();

    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((status) => {
          if (cancelled) return;
          permissionStatus = status;
          status.onchange = () => {
            if (status.state === 'denied') {
              locationRef.current = null;
              clearCachedCoords();
              setLocation(null);
              setLocationStatus('denied');
              setLocationHint(LOCATION_BLOCKED_HINT);
              return;
            }
            if (status.state === 'granted') {
              if (!locationRef.current) {
                setLocationStatus('pending');
                setLocationHint('');
              }
              askForLocationRef.current(0);
            }
          };
        })
        .catch(() => {});
    }

    return () => {
      cancelled = true;
      requestSerial.current += 1;
      if (permissionStatus) permissionStatus.onchange = null;
    };
  }, [resolvedMode]);

  const allowLocation = () => {
    setLocationHint('');
    if (!locationRef.current) setLocationStatus('pending');
    askForLocation(0, true);
  };

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (event, preset) => {
    if (event?.preventDefault) event.preventDefault();
    const query = (preset ?? input).trim();
    if (!query || loading) return;
    if (resolvedMode === 'assistant' && locationStatus !== 'ready') return;

    setError('');
    setLoading(true);
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: query }]);

    try {
      if (resolvedMode === 'order') {
        if (!getToken()) {
          throw new Error('Login required for order help');
        }
        const data = await aiOrderSupport(query);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: data?.response || data?.answer || 'No reply from support.',
            cards: [],
          },
        ]);
      } else {
        const data = await aiAssistant(query, {
          lat: location?.lat,
          lng: location?.lng,
        });
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: data?.answer || data?.response || 'No reply from assistant.',
            cards: Array.isArray(data?.cards) ? data.cards : [],
          },
        ]);
      }
    } catch (err) {
      setError(err.message || 'AI support failed');
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'Sorry — help is unavailable right now. Try again in a moment.',
          cards: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = SUGGESTIONS[resolvedMode] || SUGGESTIONS.assistant;

  return (
    <section className="help-shell relative overflow-hidden rounded-[28px] border border-brand-border bg-white shadow-[0_20px_50px_rgba(26,20,51,0.06)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top_left,_rgba(83,50,201,0.14),_transparent_55%),radial-gradient(ellipse_at_top_right,_rgba(241,249,90,0.35),_transparent_45%)]" />

      <div className="relative border-b border-brand-soft px-5 pb-5 pt-6 sm:px-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand">
              {resolvedMode === 'order' ? 'Order support' : 'Shopping help'}
            </p>
            <h2 className="mt-2 font-sans text-3xl tracking-tight text-brand-text sm:text-4xl">
              {title}
            </h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-brand-muted">
              {resolvedMode === 'order'
                ? 'Ask about delivery, refunds, or a recent order.'
                : 'Ask about nearby stores, categories, products, or shopping help.'}
            </p>
          </div>
          {resolvedMode === 'assistant' &&
            (locationStatus === 'ready' ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1.5 text-[11px] font-medium text-brand">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
                Location on
              </span>
            ) : (
              <button
                type="button"
                onClick={allowLocation}
                className="inline-flex items-center gap-2 rounded-full bg-brand px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-brand-dark"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
                {locationBadgeLabel(locationStatus, locationHint)}
              </button>
            ))}
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="help-scroll relative max-h-[28rem] space-y-4 overflow-y-auto px-5 py-5 sm:px-7"
      >
        {messages.length === 0 && (
          <div className="help-empty rounded-[22px] border border-dashed border-brand-border bg-brand-soft p-5">
            {canChat ? (
              <>
                <p className="font-sans text-xl text-brand-text">Start with a quick ask</p>
                <p className="mt-1 text-sm text-brand-muted">
                  {resolvedMode === 'order'
                    ? 'Try something about delivery status or refunds.'
                    : 'We’ll pull nearby stores and category cards with photos.'}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {suggestions.map((tip) => (
                    <button
                      key={tip}
                      type="button"
                      onClick={() => send(null, tip)}
                      className="rounded-full border border-brand-border bg-white px-3.5 py-2 text-left text-xs font-medium text-brand-text transition hover:border-brand hover:bg-brand-soft hover:text-brand"
                    >
                      {tip}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <p className="font-sans text-xl text-brand-text">Allow location to chat</p>
                <p className="mt-1 text-sm leading-6 text-brand-muted">{locationMessage}</p>
                <button
                  type="button"
                  onClick={allowLocation}
                  className="mt-4 inline-flex rounded-full bg-brand px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-dark"
                >
                  {locationActionLabel(locationStatus, locationHint)}
                </button>
              </>
            )}
          </div>
        )}

        {messages.map((msg, index) => (
          <div
            key={`${msg.role}-${index}`}
            className={`help-msg space-y-2.5 ${msg.role === 'user' ? 'help-msg-user' : 'help-msg-bot'}`}
          >
            <div
              className={`max-w-[92%] rounded-[20px] px-4 py-3 text-sm leading-6 whitespace-pre-wrap shadow-sm ${
                msg.role === 'user'
                  ? 'ml-auto bg-brand-text text-white'
                  : 'mr-auto bg-brand-bg text-brand-text'
              }`}
            >
              {msg.text}
            </div>

            {msg.role === 'assistant' && msg.cards?.length > 0 && (
              <div
                className={`mr-auto grid w-full gap-2.5 ${
                  msg.cards.some((c) => (c.type || '').toLowerCase() === 'product')
                    ? 'grid-cols-2 md:max-w-full'
                    : 'grid-cols-2 md:max-w-[92%] md:grid-cols-1'
                }`}
              >
                {msg.cards.map((card, cardIndex) => (
                  <AssistantCard
                    key={`${card.type}-${card.id}-${card.href}-${cardIndex}`}
                    card={card}
                    index={cardIndex}
                  />
                ))}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="help-msg-bot flex items-center gap-2 text-sm text-brand-muted">
            <span className="inline-flex gap-1 rounded-full bg-brand-bg px-3 py-2">
              <span className="help-dot h-1.5 w-1.5 rounded-full bg-brand-muted-light" />
              <span className="help-dot h-1.5 w-1.5 rounded-full bg-brand-muted-light" />
              <span className="help-dot h-1.5 w-1.5 rounded-full bg-brand-muted-light" />
            </span>
            Thinking…
          </div>
        )}
      </div>

      {error && (
        <p className="relative px-5 text-sm text-brand-warning sm:px-7">
          AI help unavailable. ({error})
        </p>
      )}

      <form
        onSubmit={send}
        className="relative border-t border-brand-soft bg-brand-soft/80 px-4 py-4 backdrop-blur sm:px-6"
      >
        {!canChat && messages.length > 0 && (
          <p className="mb-2 px-2 text-center text-xs leading-5 text-brand-muted">
            {locationMessage}
          </p>
        )}
        <div className="flex items-center gap-2 rounded-full border border-brand-border bg-white p-1.5 shadow-[0_8px_24px_rgba(26,20,51,0.04)] focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={canChat ? 'Type your question…' : 'Allow location to type'}
            disabled={loading || !canChat}
            className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-brand-text outline-none placeholder:text-brand-muted-light disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={loading || !canChat || !input.trim()}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-white transition hover:bg-brand-dark disabled:bg-brand-border disabled:opacity-70"
            aria-label="Send"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
              <path
                d="M5 12h12M13 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </form>
    </section>
  );
}
