export function formatRupees(paise) {
  const value = Number(paise || 0) / 100;
  return `₹${value.toFixed(2)}`;
}

export function nextRiderStatus(current) {
  const map = {
    assigned: 'accepted',
    accepted: 'packed',
    packed: 'picked_up',
    picked_up: 'on_the_way',
    on_the_way: 'delivered'
  };
  return map[current] || null;
}

export function statusLabel(status) {
  return String(status || '').replace(/_/g, ' ');
}
