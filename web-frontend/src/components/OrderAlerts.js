'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/utils/api';
import { getRole } from '@/utils/auth';
import { useSocket } from '@/context/SocketContext';

const COPY = {
  pending: ['Order placed', 'We received your order.'],
  confirmed: ['Order confirmed', 'The shop has your order.'],
  assigned: ['Rider assigned', 'A rider near the shop is assigned to you.'],
  accepted: ['Rider accepted', 'Your rider accepted the order.'],
  packed: ['Order packed', 'Your items are packed at the shop.'],
  picked_up: ['Order picked up', 'The rider has left the shop with your order.'],
  on_the_way: ['On the way', 'Your rider is heading to your address.'],
  delivered: ['Order delivered', 'Your order has been delivered.'],
  cancelled: ['Order cancelled', 'This order was cancelled.'],
};

const formatRupees = (paise) => `₹${((paise || 0) / 100).toFixed(2)}`;

export default function OrderAlerts() {
  const socket = useSocket();
  const router = useRouter();
  const [alerts, setAlerts] = useState([]);
  const [canAsk, setCanAsk] = useState(false);
  const seen = useRef(new Map());

  useEffect(() => {
    if (getRole() !== 'customer') return;
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      setCanAsk(true);
    }
  }, []);

  useEffect(() => {
    if (!socket || getRole() !== 'customer') return;

    const pushAlert = async (payload) => {
      const status = payload.status || (payload.type === 'order:assigned' ? 'assigned' : '');
      const orderId = payload.orderId;
      if (!orderId || !status) return;

      const key = `${status}:${orderId}`;
      const now = Date.now();
      if (now - (seen.current.get(key) || 0) < 2500) return;
      seen.current.set(key, now);

      const [title, fallback] = COPY[status] || ['Order update', 'Your order status changed.'];
      let detail = {
        id: `${key}:${now}`,
        orderId: String(orderId),
        status,
        title,
        message: fallback,
        lines: [],
        sticky: status === 'delivered',
      };

      try {
        const order = await api(`/orders/${orderId}`);
        const riderName = order.rider?.name;
        detail = {
          ...detail,
          title: `${title} · #${order.orderNumber || String(orderId).slice(-6)}`,
          message: riderName && status !== 'cancelled' ? `${fallback} Rider: ${riderName}.` : fallback,
          lines: [
            order.store?.name && `Shop: ${order.store.name}`,
            order.addressSnapshot?.line1 && `Deliver to: ${order.addressSnapshot.line1}`,
            order.pricing?.grandTotal != null && `Total: ${formatRupees(order.pricing.grandTotal)}`,
          ].filter(Boolean),
        };
      } catch {
        // The socket event is still enough to show the status.
      }

      setAlerts((current) => [detail, ...current].slice(0, 4));

      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try {
          new Notification(detail.title, { body: [detail.message, ...detail.lines].join(' ') });
        } catch {
          // The in-app popup still shows when the browser blocks the system alert.
        }
      }

      if (!detail.sticky) {
        setTimeout(() => {
          setAlerts((current) => current.filter((item) => item.id !== detail.id));
        }, 8000);
      }
    };

    socket.on('order:status', pushAlert);
    socket.on('order:assigned', pushAlert);

    return () => {
      socket.off('order:status', pushAlert);
      socket.off('order:assigned', pushAlert);
    };
  }, [socket]);

  if (!alerts.length && !canAsk) return null;

  return (
    <div className="fixed top-4 right-4 z-[70] flex w-[min(100vw-2rem,22rem)] flex-col gap-3">
      {canAsk && (
        <button
          type="button"
          onClick={async () => {
            const result = await Notification.requestPermission();
            setCanAsk(result === 'default');
          }}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-xs font-medium text-gray-700 shadow"
        >
          Allow order alerts on this device
        </button>
      )}
      {alerts.map((alert) => (
        <div key={alert.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold text-gray-900">{alert.title}</p>
            <button
              type="button"
              onClick={() => setAlerts((current) => current.filter((item) => item.id !== alert.id))}
              className="text-xs text-gray-400 hover:text-gray-700"
            >
              Close
            </button>
          </div>
          <p className="mt-1 text-sm text-gray-700">{alert.message}</p>
          {alert.lines.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-gray-500">
              {alert.lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => router.push(`/order/${alert.orderId}`)}
            className="mt-3 text-xs font-semibold text-green-700 hover:underline"
          >
            View order
          </button>
        </div>
      ))}
    </div>
  );
}
