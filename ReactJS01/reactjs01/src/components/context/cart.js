import { createContext } from "react";

export const CartContext = createContext({
  cart: { items: [] },
  cartCount: 0,
  loading: false,
  fetchCart: () => {},
  addToCart: () => {},
  updateCartItem: () => {},
  removeFromCart: () => {},
  clearCart: () => {},
});
