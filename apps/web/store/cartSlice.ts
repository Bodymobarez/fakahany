import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ApiCart } from '@/lib/api';

export type CartLine = {
  id?: string;
  productId: string;
  slug?: string;
  name: string;
  unitPrice: number;
  quantity: number;
  imageUrl?: string | null;
};

type CartState = {
  cartId: string | null;
  items: CartLine[];
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  vatAmount: number;
  total: number;
  coupon: { code: string; type: string; value: number } | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
};

const initialState: CartState = {
  cartId: null,
  items: [],
  subtotal: 0,
  discountAmount: 0,
  deliveryFee: 0,
  vatAmount: 0,
  total: 0,
  coupon: null,
  status: 'idle',
};

function fromApi(cart: ApiCart): Omit<CartState, 'status'> {
  return {
    cartId: cart.id,
    items: cart.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      name: i.name,
      unitPrice: i.unitPrice,
      quantity: i.quantity,
      imageUrl: i.imageUrl,
    })),
    subtotal: cart.subtotal,
    discountAmount: cart.discountAmount,
    deliveryFee: cart.deliveryFee,
    vatAmount: cart.vatAmount,
    total: cart.total,
    coupon: cart.coupon ?? null,
  };
}

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    setCartFromApi: (state, action: PayloadAction<ApiCart>) => {
      Object.assign(state, fromApi(action.payload), { status: 'ready' as const });
    },
    setCartLoading: (state) => {
      state.status = 'loading';
    },
    setCartError: (state) => {
      state.status = 'error';
    },
    clearCart: (state) => {
      Object.assign(state, initialState, { status: 'ready' as const });
    },
    /** Optimistic local add when API is briefly unavailable */
    addItemLocal: (
      state,
      action: PayloadAction<Omit<CartLine, 'quantity'> & { quantity?: number }>,
    ) => {
      const qty = action.payload.quantity ?? 1;
      const existing = state.items.find((i) => i.productId === action.payload.productId);
      if (existing) existing.quantity += qty;
      else {
        state.items.push({
          productId: action.payload.productId,
          slug: action.payload.slug,
          name: action.payload.name,
          unitPrice: action.payload.unitPrice,
          quantity: qty,
          imageUrl: action.payload.imageUrl,
        });
      }
      state.subtotal = state.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
      state.total = state.subtotal;
    },
  },
});

export const {
  setCartFromApi,
  setCartLoading,
  setCartError,
  clearCart,
  addItemLocal,
} = cartSlice.actions;

/** @deprecated use addItemLocal or API helpers — kept for ProductCard compatibility */
export const addItem = addItemLocal;

export default cartSlice.reducer;

export const selectCartItems = (state: { cart: CartState }) => state.cart.items;
export const selectCartId = (state: { cart: CartState }) => state.cart.cartId;
export const selectCartCount = (state: { cart: CartState }) =>
  state.cart.items.reduce((sum, i) => sum + i.quantity, 0);
export const selectCartSubtotal = (state: { cart: CartState }) => state.cart.subtotal;
export const selectCartTotals = (state: { cart: CartState }) => ({
  subtotal: state.cart.subtotal,
  discountAmount: state.cart.discountAmount,
  deliveryFee: state.cart.deliveryFee,
  vatAmount: state.cart.vatAmount,
  total: state.cart.total,
});
export const selectCartCoupon = (state: { cart: CartState }) => state.cart.coupon;
