// src/utils/guestCart.js

const GUEST_CART_KEY = 'guestCart';

export function getGuestCart() {
  if (typeof window === 'undefined') return { items: [], storeId: null, storeName: null };
  try {
    const data = localStorage.getItem(GUEST_CART_KEY);
    return data ? JSON.parse(data) : { items: [], storeId: null, storeName: null };
  } catch {
    return { items: [], storeId: null, storeName: null };
  }
}

export function addGuestItem({ storeId, storeName, product }) {
  const cart = getGuestCart();

  if (cart.storeId && cart.storeId !== storeId) {
    throw new Error('Cart is for one store only. Clear cart first.');
  }

  const items = cart.items || [];
  const existingIndex = items.findIndex((i) => i.productId === (product.id || product._id));

  let newQty = 1;
  if (existingIndex > -1) {
    newQty = items[existingIndex].qty + 1;
    if (product.stock !== undefined && newQty > product.stock) {
      throw new Error('Cannot add more than available stock.');
    }
    items[existingIndex].qty = newQty;
  } else {
    if (product.stock !== undefined && product.stock < 1) {
      throw new Error('Product is out of stock.');
    }
    items.push({
      productId: product.id || product._id,
      name: product.name,
      unit: product.unit,
      qty: 1,
      pricePaise: product.sellingPricePaise,
      stock: product.stock || 99,
    });
  }

  const updatedCart = {
    storeId,
    storeName: storeName || cart.storeName || '',
    items,
  };

  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(updatedCart));
  window.dispatchEvent(new Event('qc-guest-cart'));
  return updatedCart;
}

export function setGuestQty(productId, qty) {
  const cart = getGuestCart();
  let items = cart.items || [];

  if (qty <= 0) {
    items = items.filter((i) => i.productId !== productId);
  } else {
    const item = items.find((i) => i.productId === productId);
    if (item) {
      item.qty = qty;
    }
  }

  if (items.length === 0) {
    clearGuestCart();
    return { items: [], storeId: null, storeName: null };
  }

  const updatedCart = {
    ...cart,
    items,
  };

  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(updatedCart));
  window.dispatchEvent(new Event('qc-guest-cart'));
  return updatedCart;
}

export function clearGuestCart() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(GUEST_CART_KEY);
  window.dispatchEvent(new Event('qc-guest-cart'));
}

export function guestItemCount() {
  const cart = getGuestCart();
  return (cart.items || []).reduce((sum, item) => sum + item.qty, 0);
}