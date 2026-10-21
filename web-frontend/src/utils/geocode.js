function uniqueParts(parts) {
  const seen = new Set();
  const values = [];

  parts.forEach((part) => {
    const value = String(part || '').trim();
    const key = value.toLowerCase();
    if (!value || seen.has(key)) return;
    seen.add(key);
    values.push(value);
  });

  return values;
}

function cityFrom(props, state) {
  if (props.city || props.town || props.village) {
    return props.city || props.town || props.village;
  }
  if (state === 'Delhi') return 'Delhi';
  return '';
}

async function photonLayer(lat, lng, layer) {
  const url = new URL('https://photon.komoot.io/reverse');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lng));
  url.searchParams.set('lang', 'en');
  url.searchParams.set('limit', '5');
  url.searchParams.set('layer', layer);

  const response = await fetch(url);
  if (!response.ok) return [];

  const data = await response.json();
  return (data.features || []).map((feature) => feature.properties || {});
}

async function lookupPhoton(lat, lng) {
  const [localities, streets] = await Promise.all([
    photonLayer(lat, lng, 'locality'),
    photonLayer(lat, lng, 'street'),
  ]);

  const area = localities[0] || {};
  const street = streets.find((item) => item.name && !/flyover|link/i.test(item.name)) || streets[0] || {};
  const state = area.state || street.state || '';
  const city = cityFrom(area, state) || cityFrom(street, state);
  const generic = new Set(['west', city.toLowerCase(), state.toLowerCase()].filter(Boolean));
  const locality = uniqueParts([area.name, area.district, area.county]).filter(
    (part) => !generic.has(part.toLowerCase())
  );

  return {
    line1: street.name || '',
    locality: locality.join(', '),
    city,
    state,
    pincode: String(area.postcode || street.postcode || '').replace(/\D/g, '').slice(0, 6),
  };
}

async function lookupNominatim(lat, lng) {
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lng));
  url.searchParams.set('addressdetails', '1');

  const response = await fetch(url, { headers: { 'Accept-Language': 'en' } });
  if (!response.ok) throw new Error('Could not look up this location');

  const data = await response.json();
  const place = data.address || {};
  const street = [place.house_number, place.road || place.pedestrian || place.footway].filter(Boolean).join(' ');
  const city = place.city || place.town || place.village || place.municipality || '';
  const state = place.state || '';
  const generic = new Set(['west', city.toLowerCase(), state.toLowerCase(), 'india'].filter(Boolean));
  const locality = uniqueParts([
    place.neighbourhood,
    place.suburb,
    place.quarter,
    place.residential,
    place.city_district,
    place.state_district,
  ]).filter((part) => !generic.has(part.toLowerCase()));

  return {
    line1: street,
    locality: locality.join(', '),
    city,
    state,
    pincode: String(place.postcode || '').replace(/\D/g, '').slice(0, 6),
  };
}

export async function lookupAddress(lat, lng) {
  try {
    const found = await lookupPhoton(lat, lng);
    if (found.line1 || found.locality || found.city || found.pincode) return found;
  } catch {
    // Photon can be unreachable. Nominatim still fills the form.
  }

  return lookupNominatim(lat, lng);
}
