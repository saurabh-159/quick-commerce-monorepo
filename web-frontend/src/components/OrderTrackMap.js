'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

function labeledPin(color, label, place) {
  const dot = `<span style="width:16px;height:16px;border-radius:9999px;background:${color};border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.45);flex:none"></span>`;
  const text = `<span style="background:#fff;color:#111;font-size:11px;line-height:1;font-weight:700;padding:3px 6px;border-radius:9999px;box-shadow:0 1px 3px rgba(0,0,0,.28);white-space:nowrap">${label}</span>`;
  const layout = {
    top: { html: `${text}${dot}`, style: 'flex-direction:column;align-items:center', anchor: [8, 28] },
    bottom: { html: `${dot}${text}`, style: 'flex-direction:column;align-items:center', anchor: [8, 8] },
    right: { html: `${dot}${text}`, style: 'flex-direction:row;align-items:center', anchor: [8, 8] },
  }[place];

  return L.divIcon({
    className: '',
    iconSize: [16, 16],
    iconAnchor: layout.anchor,
    html: `<span style="display:flex;gap:4px;width:max-content;${layout.style}">${layout.html}</span>`,
  });
}

const homeIcon = labeledPin('#2563eb', 'You', 'bottom');
const storeIcon = labeledPin('#5332c9', 'Shop', 'top');
const riderIcon = labeledPin('#ea580c', 'Rider', 'right');

export default function OrderTrackMap({ home, store, rider }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const homeRef = useRef(null);
  const storeRef = useRef(null);
  const riderRef = useRef(null);
  const fittedCountRef = useRef(0);
  const [mapReady, setMapReady] = useState(0);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    delete containerRef.current._leaflet_id;

    const start = home || store || rider || { lat: 28.6139, lng: 77.209 };
    const map = L.map(containerRef.current, { scrollWheelZoom: true }).setView([start.lat, start.lng], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    mapRef.current = map;
    setMapReady((value) => value + 1);
    setTimeout(() => map.invalidateSize(), 0);

    return () => {
      map.remove();
      mapRef.current = null;
      homeRef.current = null;
      storeRef.current = null;
      riderRef.current = null;
      fittedCountRef.current = 0;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const place = (ref, point, icon) => {
      if (!point) {
        if (ref.current) {
          ref.current.remove();
          ref.current = null;
        }
        return;
      }
      const latLng = L.latLng(point.lat, point.lng);
      if (!ref.current) ref.current = L.marker(latLng, { icon }).addTo(map);
      else ref.current.setLatLng(latLng);
    };

    place(homeRef, home, homeIcon);
    place(storeRef, store, storeIcon);
    place(riderRef, rider, riderIcon);

    const points = [home, store, rider].filter(Boolean).map((point) => [point.lat, point.lng]);
    if (points.length !== fittedCountRef.current) {
      fittedCountRef.current = points.length;
      map.invalidateSize();
      if (points.length === 1) map.setView(points[0], 15);
      else if (points.length > 1) map.fitBounds(points, { padding: [48, 48] });
    }
  }, [home, store, rider, mapReady]);

  return <div ref={containerRef} className="store-location-map h-80 w-full rounded border border-gray-300" />;
}