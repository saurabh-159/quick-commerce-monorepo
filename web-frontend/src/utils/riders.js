export const VEHICLES = [
  { value: 'bike', label: 'Bike' },
  { value: 'cycle', label: 'Cycle' },
  { value: 'ev', label: 'EV' },
];

export function vehicleLabel(value) {
  return VEHICLES.find((item) => item.value === value)?.label || 'Bike';
}

export function riderCoordinates(rider) {
  const [lng, lat] = rider?.rider?.currentLocation?.coordinates || [];
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude === 0 && longitude === 0) return null;
  return { lat: latitude, lng: longitude };
}
