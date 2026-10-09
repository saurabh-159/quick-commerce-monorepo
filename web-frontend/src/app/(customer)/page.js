'use client';
import { useState, useEffect } from 'react';
import { api } from '@/utils/api';
import ProductCard from '@/components/ProductCard';

export default function CustomerHomePage() {
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    const fetchNearbyStoreAndProducts = async (lat, lng) => {
      try {
        setLoading(true);
        // 1. Get nearby store based on lat, lng
        const storeData = await api(`/stores/nearby?lat=${lat}&lng=${lng}`);
        if (!storeData || !storeData.store) {
          setError('No active stores found near this location.');
          setLoading(false);
          return;
        }

        setStore(storeData.store);

        // 2. Get products for this store using storeId
        const productsData = await api(`/catalog/products?storeId=${storeData.store._id}`);
        setProducts(productsData || []);
      } sequential_err => {
        // handled in catch block
      } catch (err) {
        setError(err.message || 'Failed to load store or products');
      } finally {
        setLoading(false);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchNearbyStoreAndProducts(
            position.coords.latitude,
            position.coords.longitude
          );
        },
        (geoError) => {
          // Fallback to Delhi coordinates if permission denied
          setUsingFallback(true);
          fetchNearbyStoreAndProducts(28.6139, 77.2090);
        },
        { timeout: 10000 }
      );
    } else {
      // Geolocation not supported, fallback to Delhi
      setUsingFallback(true);
      fetchNearbyStoreAndProducts(28.6139, 77.2090);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-500 font-medium">Finding nearest store and products...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-md border border-red-200 text-red-700">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div>
      {usingFallback && (
        <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded">
          ⚠️ Location access denied or unavailable. Using default location (Delhi).
        </div>
      )}

      {store && (
        <div className="bg-white p-4 rounded-lg shadow mb-6 border">
          <h2 className="text-xl font-bold text-black">{store.name}</h2>
          <p className="text-gray-600 text-sm">{store.addressText}</p>
          <span className="inline-block mt-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
            Service Radius: {store.serviceRadiusKm} km
          </span>        </div>
      )}

      <h3 className="text-lg font-bold mb-4 text-black">Available Products</h3>
      {products.length === 0 ? (
        <p className="text-gray-500">No products available in this store currently.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product) => (
            <ProductCard key={product.id || product._id} product={product} storeId={store?._id} />
          ))}
        </div>
      )}
    </div>
  );
}