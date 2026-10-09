const Cart = require('../models/Cart');
const Inventory = require('../models/Inventory');

const getCartByUser = async (userId) => {
  let cart = await Cart.findOne({ user: userId }).populate('items.product store');
  if (!cart) {
    return { items: [], itemTotalPaise: 0, store: null };
  }

  let itemTotalPaise = 0;
  const formattedItems = cart.items.map((item) => {
    const itemTotal = item.qty * item.pricePaiseSnapshot;
    itemTotalPaise += itemTotal;
    return {
      productId: item.product._id,
      name: item.product.name,
      unit: item.product.unit,
      images: item.product.images,
      qty: item.qty,
      pricePaise: item.pricePaiseSnapshot,
      totalPaise: itemTotal
    };
  });

  return {
    store: cart.store,
    items: formattedItems,
    itemTotalPaise,
    itemTotalRupees: itemTotalPaise / 100
  };
};

const addItemToCart = async (userId, productId, storeId, qty) => {
  // Check inventory stock and price
  const inventory = await Inventory.findOne({ store: storeId, product: productId });
  if (!inventory || inventory.stock < qty) {
    throw new Error('Requested quantity exceeds available stock');
  }

  let cart = await Cart.findOne({ user: userId });

  if (cart && cart.store.toString() !== storeId) {
    throw new Error('Clear cart or keep same store. Cart can only contain items from one store.');
  }

  if (!cart) {
    cart = new Cart({ user: userId, store: storeId, items: [] });
  }

  const existingItemIndex = cart.items.findIndex((item) => item.product.toString() === productId);

  if (existingItemIndex > -1) {
    const newQty = cart.items[existingItemIndex].qty + qty;
    if (inventory.stock < newQty) {
      throw new Error('Requested total quantity exceeds available stock');
    }
    cart.items[existingItemIndex].qty = newQty;
    cart.items[existingItemIndex].pricePaiseSnapshot = inventory.sellingPricePaise;
  } else {
    cart.items.push({
      product: productId,
      qty,
      pricePaiseSnapshot: inventory.sellingPricePaise
    });
  }

  await cart.save();
  return await getCartByUser(userId);
};

const updateCartItemQty = async (userId, productId, qty) => {
  const cart = await Cart.findOne({ user: userId });
  if (!cart) throw new Error('Cart not found');

  const itemIndex = cart.items.findIndex((item) => item.product.toString() === productId);
  if (itemIndex === -1) throw new Error('Item not found in cart');

  if (qty === 0) {
    cart.items.splice(itemIndex, 1);
  } else {
    const inventory = await Inventory.findOne({ store: cart.store, product: productId });
    if (!inventory || inventory.stock < qty) {
      throw new Error('Requested quantity exceeds available stock');
    }
    cart.items[itemIndex].qty = qty;
  }

  if (cart.items.length === 0) {
    await Cart.deleteOne({ user: userId });
    return { items: [], itemTotalPaise: 0, store: null };
  }

  await cart.save();
  return await getCartByUser(userId);
};

const clearCart = async (userId) => {
  await Cart.deleteOne({ user: userId });
  return { success: true };
};

module.exports = { getCartByUser, addItemToCart, updateCartItemQty, clearCart };