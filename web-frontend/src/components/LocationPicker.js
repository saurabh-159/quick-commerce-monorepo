'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const pinIcon = L.divIcon({
  className: '',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  html: '<span style="display:block;width:22px;height:22px;border-radius:9999px;background:#5332c9;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.45)"></span>',
});

export default function LocationPicker({ lat, lng, radiusKm, onChange, readOnly = false, className = 'h-80' }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    delete containerRef.current._leaflet_id;

    const start = [Number(lat), Number(lng)];
    const map = L.map(containerRef.current, { scrollWheelZoom: true }).setView(start, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    const marker = L.marker(start, { draggable: !readOnly, icon: pinIcon }).addTo(map);
    if (!readOnly) {
      marker.on('dragend', () => {
        const point = marker.getLatLng();
        onChangeRef.current?.(point.lat.toFixed(6), point.lng.toFixed(6));
      });

      map.on('click', (event) => {
        marker.setLatLng(event.latlng);
        onChangeRef.current?.(event.latlng.lat.toFixed(6), event.latlng.lng.toFixed(6));
      });
    }

    const radius = Number(radiusKm);
    const circle = L.circle(start, {
      radius: Number.isFinite(radius) && radius > 0 ? radius * 1000 : 0,
      color: '#5332c9',
      weight: 1,
      fillColor: '#5332c9',
      fillOpacity: 0.12,
    }).addTo(map);

    if (!readOnly) map.getContainer().style.cursor = 'crosshair';
    mapRef.current = map;
    markerRef.current = marker;
    circleRef.current = circle;
    setTimeout(() => map.invalidateSize(), 0);

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      circleRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    const circle = circleRef.current;
    if (!map || !marker || !circle) return;

    const nextLat = Number(lat);
    const nextLng = Number(lng);
    if (!Number.isFinite(nextLat) || !Number.isFinite(nextLng)) return;

    const next = L.latLng(nextLat, nextLng);
    if (!marker.getLatLng().equals(next)) {
      marker.setLatLng(next);
      map.panTo(next);
    }

    const radius = Number(radiusKm);
    circle.setLatLng(next);
    circle.setRadius(Number.isFinite(radius) && radius > 0 ? radius * 1000 : 0);
  }, [lat, lng, radiusKm]);

  return <div ref={containerRef} className={`store-location-map w-full rounded border border-gray-300 ${className}`} />;
}
