import { createContext, useContext, useEffect, useState } from "react";
import { AuthContext } from "./auth";
import { getCartApi, addToCartApi, updateCartItemApi, removeFromCartApi, clearCartApi } from "../../util/api";
import { notification } from "antd";

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

export const CartWrapper = ({ children }) => {
  const { auth } = useContext(AuthContext);
  const [cart, setCart] = useState({ items: [] });
  const [loading, setLoading] = useState(false);

  const fetchCart = async () => {
    if (!auth.isAuthenticated) {
      setCart({ items: [] });
      return;
    }
    setLoading(true);
    try {
      const res = await getCartApi();
      if (res && res.EC === 0) {
        setCart(res.cart);
      }
    } catch (error) {
      console.error(">>> Error fetching cart:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, [auth.isAuthenticated]);

  const addToCart = async (item) => {
    if (!auth.isAuthenticated) {
      notification.warning({
        message: "Login Required",
        description: "Please login to add products to your cart.",
      });
      return false;
    }

    try {
      const res = await addToCartApi(item);
      if (res && res.EC === 0) {
        setCart(res.cart);
        notification.success({
          message: "Giỏ hàng",
          description: `Đã thêm ${item.quantity} x ${item.name} vào giỏ hàng thành công!`,
        });
        return true;
      } else {
        notification.error({
          message: "Giỏ hàng",
          description: res?.EM || "Không thể thêm vào giỏ hàng.",
        });
        return false;
      }
    } catch (error) {
      console.error(">>> Error adding to cart:", error);
      notification.error({
        message: "Giỏ hàng",
        description: "Lỗi hệ thống khi thêm vào giỏ hàng.",
      });
      return false;
    }
  };

  const updateCartItem = async (productId, color, size, quantity) => {
    try {
      const res = await updateCartItemApi({ productId, color, size, quantity });
      if (res && res.EC === 0) {
        setCart(res.cart);
        return true;
      }
      return false;
    } catch (error) {
      console.error(">>> Error updating cart item:", error);
      return false;
    }
  };

  const removeFromCart = async (productId, color, size) => {
    try {
      const res = await removeFromCartApi({ productId, color, size });
      if (res && res.EC === 0) {
        setCart(res.cart);
        notification.success({
          message: "Giỏ hàng",
          description: "Đã xóa sản phẩm khỏi giỏ hàng.",
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error(">>> Error removing from cart:", error);
      return false;
    }
  };

  const clearCart = async () => {
    try {
      const res = await clearCartApi();
      if (res && res.EC === 0) {
        setCart(res.cart);
        return true;
      }
      return false;
    } catch (error) {
      console.error(">>> Error clearing cart:", error);
      return false;
    }
  };

  const cartCount = cart.items ? cart.items.reduce((sum, item) => sum + item.quantity, 0) : 0;

  return (
    <CartContext.Provider
      value={{
        cart,
        cartCount,
        loading,
        fetchCart,
        addToCart,
        updateCartItem,
        removeFromCart,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
