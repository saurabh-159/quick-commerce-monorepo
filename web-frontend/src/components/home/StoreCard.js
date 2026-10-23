import Link from 'next/link';

export default function StoreCard({ store, showLocation = false }) {
  return (
    <Link href={`/store/${store.id}`} className="flex h-full flex-col overflow-hidden rounded-[24px] bg-white">
      <div className="relative h-44">
        <img src={store.image} alt="" className="h-full w-full object-cover" />
        <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-brand-text">
          {!store.isOpen ? 'Closed' : store.inRange ? `${store.etaMinutes} min` : 'View store'}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-sans text-2xl text-brand-text">{store.name}</h3>
        <p className="mt-2 text-sm text-brand-muted">{store.addressText}</p>
        <p className="mt-3 text-xs uppercase tracking-[0.14em] text-brand-muted-light">
          {store.distanceKm != null ? `${store.distanceKm} km away` : 'Location'}
          {store.inRange ? ' · Delivers to you' : ''}
        </p>
        {showLocation && (
          <p className="mt-2 text-sm text-brand-muted">
            {Number(store.lat).toFixed(4)}, {Number(store.lng).toFixed(4)} · {store.serviceRadiusKm} km radius
          </p>
        )}
      </div>
    </Link>
  );
}
