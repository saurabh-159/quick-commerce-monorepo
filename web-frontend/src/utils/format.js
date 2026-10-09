export function formatRupees(paise) {
    if (typeof paise !== 'number') return '₹0.00';
    return `₹${(paise / 100).toFixed(2)}`;
  }
  
  export function statusLabel(status) {
    if (!status) return '';
    return status.replace(/_/g, ' ');
  }