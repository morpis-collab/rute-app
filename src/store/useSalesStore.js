import { create } from 'zustand';
import useAppStore from './useAppStore';

const useSalesStore = create((set, get) => ({
  // Cart state for partner quick sales
  cart: [],
  paymentMethod: 'cash',

  // Add item to cart
  addToCart: (productId) => {
    const { products } = useAppStore.getState();
    const product = products.find(p => p.id === productId);
    if (!product) return;

    set((state) => {
      const existing = state.cart.find(item => item.productId === productId);
      if (existing) {
        return {
          cart: state.cart.map(item =>
            item.productId === productId
              ? { ...item, qty: item.qty + 1, subtotal: (item.qty + 1) * item.price }
              : item
          ),
        };
      }
      return {
        cart: [...state.cart, {
          productId,
          name: product.name,
          price: product.sellingPrice,
          qty: 1,
          subtotal: product.sellingPrice,
        }],
      };
    });
  },

  // Remove one qty from cart
  removeFromCart: (productId) => {
    set((state) => {
      const existing = state.cart.find(item => item.productId === productId);
      if (!existing) return state;
      if (existing.qty <= 1) {
        return { cart: state.cart.filter(item => item.productId !== productId) };
      }
      return {
        cart: state.cart.map(item =>
          item.productId === productId
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
