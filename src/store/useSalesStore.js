import { create } from 'zustand';
import useAppStore from './useAppStore';
import { findBestPromotionForProduct } from '../utils/promotions';

const useSalesStore = create((set, get) => ({
  // Cart state for partner quick sales
  cart: [],
  paymentMethod: 'cash',

  // Add item to cart
  addToCart: (productId, businessDate) => {
    const { products, promotions } = useAppStore.getState();
    const product = products.find((p) => String(p.id) === String(productId));
    if (!product) return;
    const promoMatch = findBestPromotionForProduct(product, promotions, businessDate);
    const normalPrice = Number(product.sellingPrice || product.price || 0);
    const price = Number(promoMatch?.pricing.promoPrice ?? normalPrice);
    const discountAmount = Number(promoMatch?.pricing.discountAmount || 0);
    const promotion = promoMatch?.promotion || null;

    set((state) => {
      const existing = state.cart.find((item) => String(item.productId) === String(productId));
      if (existing) {
        return {
          cart: state.cart.map(item =>
            String(item.productId) === String(productId)
              ? { ...item, qty: item.qty + 1, subtotal: (item.qty + 1) * item.price }
              : item
          ),
        };
      }
      return {
        cart: [...state.cart, {
          productId,
          name: product.name,
          price,
          normalPrice,
          discountAmount,
          promoId: promotion?.id || null,
          promoName: promotion?.name || null,
          qty: 1,
          subtotal: price,
        }],
      };
    });
  },

  // Remove one qty from cart
  removeFromCart: (productId) => {
    set((state) => {
      const existing = state.cart.find((item) => String(item.productId) === String(productId));
      if (!existing) return state;
      if (existing.qty <= 1) {
        return { cart: state.cart.filter((item) => String(item.productId) !== String(productId)) };
      }
      return {
        cart: state.cart.map(item =>
          String(item.productId) === String(productId)
            ? { ...item, qty: item.qty - 1, subtotal: (item.qty - 1) * item.price }
            : item
        ),
      };
    });
  },

  // Clear cart
  clearCart: () => set({ cart: [], paymentMethod: 'cash' }),

  // Set payment method
  setPaymentMethod: (method) => set({ paymentMethod: method }),

  // Get cart total
  getCartTotal: () => {
    return get().cart.reduce((sum, item) => sum + item.subtotal, 0);
  },

  // Get total items count
  getCartCount: () => {
    return get().cart.reduce((sum, item) => sum + item.qty, 0);
  },

  // Confirm transaction
  confirmTransaction: async (date) => {
    const { cart, paymentMethod } = get();
    if (cart.length === 0) return false;

    try {
      await useAppStore.getState().recordSale({
        items: cart.map(item => ({
          productId: item.productId,
          name: item.name,
          qty: item.qty,
          price: item.price,
          subtotal: item.subtotal,
          normalPrice: item.normalPrice,
          discountAmount: item.discountAmount,
          promoId: item.promoId,
          promoName: item.promoName,
        })),
        total: get().getCartTotal(),
        paymentMethod,
        user: 'Partner',
        date: date ? `${date}T12:00:00.000Z` : undefined,
      });

      set({ cart: [], paymentMethod: 'cash' });
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  },
}));

export default useSalesStore;
