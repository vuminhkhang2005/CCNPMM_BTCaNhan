import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { AuthContext } from "./auth";
import { CartContext } from "./cart";
import { getCartApi, addToCartApi, updateCartItemApi, removeFromCartApi, clearCartApi } from "../../util/api";
import { notification } from "antd";

export const CartWrapper = ({ children }) => {
  const { auth } = useContext(AuthContext);
  const [cart, setCart] = useState({ items: [] });
  const [loading, setLoading] = useState(false);
  const mutationLocksRef = useRef(new Set());

  const runCartMutation = async (key, action) => {
    if (mutationLocksRef.current.has(key)) return false;

    mutationLocksRef.current.add(key);
    try {
      return await action();
    } finally {
      mutationLocksRef.current.delete(key);
    }
  };

  const fetchCart = useCallback(async () => {
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
  }, [auth.isAuthenticated]);

  useEffect(() => {
    void Promise.resolve().then(fetchCart);
  }, [fetchCart]);

  const addToCart = async (item) => {
    if (!auth.isAuthenticated) {
      notification.warning({
        message: "Login Required",
        description: "Please login to add products to your cart.",
      });
      return false;
    }

    return runCartMutation(`add:${item.variantId || item.productId}:${item.color}:${item.size}`, async () => {
      try {
        const res = await addToCartApi(item);
        if (res && res.EC === 0) {
          setCart(res.cart);
          notification.success({
            message: "Cart",
            description: `Successfully added ${item.quantity} x ${item.name} to cart!`,
          });
          return true;
        }
        notification.error({
          message: "Cart",
          description: res?.EM || "Could not add to cart.",
        });
        return false;
      } catch (error) {
        console.error(">>> Error adding to cart:", error);
        notification.error({
          message: "Cart",
          description: "System error occurred while adding to cart.",
        });
        return false;
      }
    });
  };

  const updateCartItem = async (item, quantity) => {
    return runCartMutation(`update:${item.variantId || item.productId}:${item.color}:${item.size}`, async () => {
      try {
        const res = await updateCartItemApi({
          productId: item.productId,
          variantId: item.variantId,
          color: item.color,
          size: item.size,
          quantity,
        });
        if (res && res.EC === 0) {
          setCart(res.cart);
          return true;
        }
        return false;
      } catch (error) {
        console.error(">>> Error updating cart item:", error);
        return false;
      }
    });
  };

  const removeFromCart = async (item) => {
    return runCartMutation(`remove:${item.variantId || item.productId}:${item.color}:${item.size}`, async () => {
      try {
        const res = await removeFromCartApi({
          productId: item.productId,
          variantId: item.variantId,
          color: item.color,
          size: item.size,
        });
        if (res && res.EC === 0) {
          setCart(res.cart);
          notification.success({
            message: "Cart",
            description: "Removed item from cart.",
          });
          return true;
        }
        return false;
      } catch (error) {
        console.error(">>> Error removing from cart:", error);
        return false;
      }
    });
  };

  const clearCart = async () => {
    return runCartMutation("clear", async () => {
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
    });
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
