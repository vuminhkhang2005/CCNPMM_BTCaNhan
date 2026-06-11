import { useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CartContext } from "../components/context/cart";
import { DeleteOutlined, MinusOutlined, PlusOutlined, ShoppingCartOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { Button, Popconfirm, Spin } from "antd";

const formatCurrency = (value) => new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
}).format(value);

const CartPage = () => {
  const navigate = useNavigate();
  const { cart, loading, updateCartItem, removeFromCart, clearCart } = useContext(CartContext);

  const handleQtyChange = async (item, change) => {
    const newQty = item.quantity + change;
    await updateCartItem(item, newQty);
  };

  const getSubtotal = () => {
    if (!cart.items) return 0;
    return cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  if (loading && (!cart.items || cart.items.length === 0)) {
    return (
      <div className="grid min-h-[calc(100vh-70px)] place-items-center">
        <Spin size="large" tip="Loading cart..." />
      </div>
    );
  }

  const hasItems = cart.items && cart.items.length > 0;

  return (
    <div className="mx-auto min-h-[calc(100vh-70px)] max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-black text-stone-950 flex items-center gap-2">
          <ShoppingCartOutlined /> Your Cart
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          Manage your selected products before completing checkout.
        </p>
      </div>

      {!hasItems ? (
        <div className="rounded-md border border-dashed border-stone-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-stone-50 text-stone-400">
            <ShoppingCartOutlined className="text-3xl" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-stone-900">Your cart is empty</h2>
          <p className="mt-2 text-sm text-stone-500">Go back to our shop to find the best running shoes for you!</p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800 transition"
          >
            <ArrowLeftOutlined /> Explore Products
          </Link>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          {/* List of items */}
          <div className="space-y-4">
            <div className="rounded-md border border-stone-200 bg-white shadow-sm overflow-hidden">
              <div className="divide-y divide-stone-100">
                {cart.items.map((item) => (
                  <div key={`${item.variantId || item.productId}-${item.color}-${item.size}`} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 hover:bg-stone-50/50 transition">
                    {/* Image */}
                    <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border border-stone-100 bg-stone-50">
                      <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                    </div>

                    {/* Product info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-bold text-stone-950 truncate">
                        <Link to={`/products/${item.slug}`} className="hover:text-emerald-700">
                          {item.name}
                        </Link>
                      </h3>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-stone-500">
                        <span>Color: <strong className="text-stone-700">{item.color}</strong></span>
                        <span>Size: <strong className="text-stone-700">{item.size}</strong></span>
                        {item.sku && <span>SKU: <strong className="text-stone-700">{item.sku}</strong></span>}
                      </div>
                      <div className="mt-2 text-sm font-black text-stone-950 sm:hidden">
                        {formatCurrency(item.price)}
                      </div>
                    </div>

                    {/* Quantity controls */}
                    <div className="flex items-center gap-2">
                      <div className="inline-flex overflow-hidden rounded-md border border-stone-200 bg-white">
                        <button
                          type="button"
                          onClick={() => handleQtyChange(item, -1)}
                          className="grid h-8 w-8 place-items-center text-stone-700 hover:bg-stone-100 transition disabled:opacity-40"
                          disabled={item.quantity <= 1}
                        >
                          <MinusOutlined className="text-xs" />
                        </button>
                        <span className="grid h-8 w-10 place-items-center text-xs font-black text-stone-950 border-x border-stone-200">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleQtyChange(item, 1)}
                          className="grid h-8 w-8 place-items-center text-stone-700 hover:bg-stone-100 transition"
                        >
                          <PlusOutlined className="text-xs" />
                        </button>
                      </div>
                    </div>

                    {/* Item Total Price */}
                    <div className="hidden sm:block text-right min-w-[120px]">
                      <p className="text-sm font-bold text-stone-950">{formatCurrency(item.price * item.quantity)}</p>
                      <p className="text-xs text-stone-400 font-semibold">Unit price: {formatCurrency(item.price)}</p>
                    </div>

                    {/* Delete action */}
                    <button
                      type="button"
                      onClick={() => removeFromCart(item)}
                      className="grid h-8 w-8 place-items-center rounded-md text-stone-400 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                    >
                      <DeleteOutlined />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700 hover:text-emerald-900"
              >
                <ArrowLeftOutlined /> Continue Shopping
              </Link>
              <Popconfirm
                title="Clear Cart"
                description="Are you sure you want to clear all items in your cart?"
                onConfirm={clearCart}
                okText="Clear"
                cancelText="Cancel"
              >
                <Button type="text" danger className="font-bold">
                  Clear All
                </Button>
              </Popconfirm>
            </div>
          </div>

          {/* Checkout summary */}
          <div className="rounded-md border border-stone-200 bg-white p-6 shadow-sm h-fit space-y-6">
            <h3 className="text-lg font-black text-stone-950 border-b border-stone-100 pb-3">Order Summary</h3>
            <div className="space-y-3 text-sm font-semibold">
              <div className="flex justify-between text-stone-500">
                <span>Subtotal</span>
                <span className="text-stone-950 font-bold">{formatCurrency(getSubtotal())}</span>
              </div>
              <div className="flex justify-between text-stone-500">
                <span>Shipping Fee</span>
                <span className="text-emerald-700 font-black">Free</span>
              </div>
              <div className="border-t border-stone-100 pt-4 flex justify-between text-base font-black text-stone-950">
                <span>Total</span>
                <span className="text-xl text-emerald-800">{formatCurrency(getSubtotal())}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate("/checkout")}
              className="w-full grid place-items-center rounded-md bg-emerald-700 py-3 text-sm font-black text-white hover:bg-emerald-800 transition shadow-sm cursor-pointer"
            >
              Proceed to Checkout
            </button>

            <div className="rounded bg-stone-50 p-4 text-xs font-semibold text-stone-500 leading-relaxed border border-stone-200">
              <p className="font-bold text-stone-700 mb-1">Shipping & Returns Policy:</p>
              <li>Free shipping nationwide for all orders.</li>
              <li>Free size exchange within 7 days of delivery.</li>
              <li>Direct cancellation available within 30 minutes.</li>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;
