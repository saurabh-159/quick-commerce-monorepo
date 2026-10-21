'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/utils/api';
import { formatPrice } from '@/utils/format';
import { getToken, getRole } from '@/utils/auth';
import { addGuestItem } from '@/utils/guestCart';
import ProductCard from '@/components/ProductCard';

import { aiRecommendations } from '@/utils/ai';
import AiRecommendations from '@/components/AiRecommendations';

const FALLBACK = { lat: 28.6139, lng: 77.209 };

export default function ProductDetail() {
  const { id, productId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [aiItems, setAiItems] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [activeImage, setActiveImage] = useState('');

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
        const body = await api(`/stores/${id}/products/${productId}?${params.toString()}`);
        if (!ignore) {
          setData(body);
          setActiveImage(body.product.image || body.product.images?.[0] || '');
        }
      } catch (err) {
        if (!ignore) setError(err.message || 'Could not load this product');
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    if (id && productId) load();
    return () => {
      ignore = true;
    };
  }, [id, productId]);

  useEffect(() => {
    if (!productId) return undefined;

    let ignore = false;
    setAiLoading(true);
    setAiError('');
    setAiItems([]);

    aiRecommendations(productId, 4)
      .then((data) => {
        if (!ignore) setAiItems(data?.recommendations || []);
      })
      .catch((err) => {
        if (!ignore) {
          setAiItems([]);
          setAiError(err.message || 'AI recommendations failed');
        }
      })
      .finally(() => {
        if (!ignore) setAiLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [productId]);

  const addToCart = async () => {
    if (!data) return;
    setAdding(true);
    try {
      const token = getToken();
      const role = getRole();
      if (!token || role !== 'customer') {
        addGuestItem({ storeId: data.store.id, storeName: data.store.name, product: data.product });
      } else {
        await api('/cart/items', {
          method: 'POST',
          body: JSON.stringify({ productId: data.product.id, storeId: data.store.id, qty: 1 })
        });
      }
      setAdded(true);
    } catch (err) {
      alert(err.message || 'Failed to add item');
    } finally {
      setAdding(false);
    }
  };

  if (loading) return <div className="home-wrap py-16 text-sm text-[#6f6a64]">Loading product...</div>;
  if (error) return <div className="home-wrap py-16 text-sm text-red-700">{error}</div>;
  if (!data) return null;

  const { store, product, related } = data;
  const images = product.images?.length ? product.images : [product.image].filter(Boolean);

  return (
    <div className="home-wrap py-8 text-[#161616]">
      <p className="text-sm text-[#6f6a64]">
        <Link href="/">Home</Link>
        <span> / </span>
        <Link href={`/store/${store.id}`}>{store.name}</Link>
        {product.category?.name && (
          <>
            <span> / </span>
            <Link href={`/store/${store.id}?category=${product.category.slug}`}>{product.category.name}</Link>
          </>
        )}
      </p>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <div>
          <div className="overflow-hidden rounded-[28px] bg-[#efeae4]">
            {activeImage ? (
              <img src={activeImage} alt={product.name} className="aspect-square w-full object-cover" />
            ) : (
              <div className="grid aspect-square place-items-center text-sm text-[#8a837b]">No image</div>
            )}
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-3">
              {images.map((src) => (
                <button key={src} type="button" onClick={() => setActiveImage(src)} className="h-20 w-20 overflow-hidden rounded-2xl">
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:py-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#8a837b]">{product.brand || product.category?.name}</p>
          <h1 className="mt-3 font-serif text-4xl md:text-5xl">{product.name}</h1>
          <p className="mt-4 text-sm text-[#6f6a64]">
            {product.unit} · {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
            {store.distanceKm != null ? ` · ${store.distanceKm} km · ${store.etaMinutes} min` : ''}
          </p>
          <div className="mt-5 flex items-baseline gap-3">
            <span className="text-2xl font-semibold">{formatPrice(product.sellingPricePaise)}</span>
            {product.mrpPaise > product.sellingPricePaise && (
              <span className="text-[#a39d96] line-through">{formatPrice(product.mrpPaise)}</span>
            )}
            {product.discountPercent > 0 && <span>{product.discountPercent}% off</span>}
          </div>
          {product.description && <p className="mt-6 max-w-xl text-sm leading-6 text-[#6f6a64]">{product.description}</p>}
          {product.highlights?.length > 0 && (
            <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-[#6f6a64]">
              {product.highlights.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={addToCart}
            disabled={adding || product.stock === 0}
            className="mt-8 rounded-full bg-[#161616] px-6 py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            {product.stock === 0 ? 'Out of stock' : adding ? 'Adding' : added ? 'Added to cart' : 'Add to cart'}
          </button>
          <p className="mt-4 text-sm text-[#6f6a64]">From {store.name} · {store.addressText}</p>
        </div>
      </div>

      <AiRecommendations
        storeId={store.id}
        items={aiItems}
        loading={aiLoading}
        error={aiError}
      />

      {related?.length > 0 && (
        <section className="mt-16">
          <h2 className="font-serif text-3xl">More in {product.category?.name || 'this store'}</h2>
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} storeId={store.id} storeName={store.name} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
