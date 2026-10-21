'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getToken, getRole } from '@/utils/auth';
import { aiAssistant, aiOrderSupport } from '@/utils/ai';

function requestUserLocation() {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 }
    );
  });
}

export default function AiSupportChat({ title = 'Ask for help', mode = 'auto' }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [location, setLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('pending');

  const resolvedMode = (() => {
    if (mode === 'order' || mode === 'assistant') return mode;
    const token = getToken();
    const role = getRole();
    return token && role === 'customer' ? 'order' : 'assistant';
  })();

  useEffect(() => {
    if (resolvedMode !== 'assistant') return;
    let cancelled = false;
    (async () => {
      const coords = await requestUserLocation();
      if (cancelled) return;
      if (coords) {
        setLocation(coords);
        setLocationStatus('ready');
      } else {
        setLocationStatus('denied');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resolvedMode]);

  const send = async (event) => {
    event.preventDefault();
    const query = input.trim();
    if (!query || loading) return;

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

  return (
    <section className="rounded-[28px] border border-[#e4ddd4] bg-white p-6">
      <p className="text-[11px] uppercase tracking-[0.2em] text-[#8a837b]">
        {resolvedMode === 'order' ? 'Order support' : 'Shopping help'}
      </p>
      <h2 className="mt-2 font-serif text-3xl text-[#161616]">{title}</h2>
      <p className="mt-2 text-sm text-[#6f6a64]">
        {resolvedMode === 'order'
          ? 'Ask about delivery, refunds, or a recent order.'
          : 'Ask about nearby stores, categories, products, or shopping help.'}
      </p>
      {resolvedMode === 'assistant' && (
        <p className="mt-1 text-xs text-[#8a837b]">
          {locationStatus === 'ready' && 'Location on — nearby store answers use your area.'}
          {locationStatus === 'denied' &&
            'Location off — enable it for “stores near me” answers.'}
          {locationStatus === 'pending' && 'Getting your location…'}
        </p>
      )}

      <div className="mt-6 max-h-80 space-y-3 overflow-y-auto">
        {messages.length === 0 && (
          <p className="text-sm text-[#6f6a64]">
            {resolvedMode === 'order'
              ? 'Try: “Where is my order?” or “What is the refund policy?”'
              : 'Try: “How many stores are near me?” or “What categories are in this store?”'}
          </p>
        )}
        {messages.map((msg, index) => (
          <div key={`${msg.role}-${index}`} className="space-y-2">
            <div
              className={`rounded-2xl px-4 py-3 text-sm leading-6 whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'ml-8 bg-[#161616] text-white'
                  : 'mr-8 bg-[#f6f3ee] text-[#161616]'
              }`}
            >
              {msg.text}
            </div>

            {msg.role === 'assistant' && msg.cards?.length > 0 && (
              <div className="mr-8 space-y-2">
                {msg.cards.map((card) => (
                  <Link
                    key={`${card.type}-${card.id}-${card.href}`}
                    href={card.href}
                    className="block rounded-2xl border border-[#e4ddd4] bg-white px-4 py-3 transition hover:border-[#0c831f]"
                  >
                    <p className="text-[10px] uppercase tracking-[0.16em] text-[#8a837b]">
                      {card.type}
                    </p>
                    <p className="mt-1 font-medium text-[#161616]">{card.title}</p>
                    {card.subtitle ? (
                      <p className="mt-0.5 text-xs text-[#6f6a64]">{card.subtitle}</p>
                    ) : null}
                    {card.meta ? (
                      <p className="mt-1 text-xs font-medium text-[#0c831f]">{card.meta}</p>
                    ) : null}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
        {loading && <p className="text-sm text-[#6f6a64]">Thinking…</p>}
      </div>

      {error && (
        <p className="mt-3 text-sm text-[#8a5a12]">AI help unavailable. ({error})</p>
      )}

      <form onSubmit={send} className="mt-4 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your question…"
          disabled={loading}
          className="min-w-0 flex-1 rounded-full border border-[#e4ddd4] bg-[#f6f3ee] px-4 py-3 text-sm text-[#161616] outline-none focus:border-[#0c831f]"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-full bg-[#161616] px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </section>
  );
}
