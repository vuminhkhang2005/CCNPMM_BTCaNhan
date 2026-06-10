import { useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../components/context/auth";
import { CartContext } from "../components/context/cart";
import useLockedAsyncAction from "../hooks/useLockedAsyncAction";
import { createOrderApi, getCouponsApi, getWalletApi, validateCouponApi } from "../util/api";
import { ArrowLeftOutlined, CheckCircleOutlined, CreditCardOutlined, DollarOutlined, GiftOutlined, HomeOutlined, MailOutlined, PhoneOutlined, UserOutlined, WalletOutlined } from "@ant-design/icons";
import { Alert, Button, Form, Input, Modal, Radio, Spin, Tag, notification } from "antd";

const formatCurrency = (value) => new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
}).format(value);

const CheckoutPage = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const { auth } = useContext(AuthContext);
  const { cart, clearCart } = useContext(CartContext);

  const [paymentMethod, setPaymentMethod] = useState("COD");
  const { loading: isSubmitting, run: runSubmitOrder } = useLockedAsyncAction();
  const { loading: couponLoading, run: runApplyCoupon } = useLockedAsyncAction();

  // Modals for mock payments
  const [momoModalVisible, setMomoModalVisible] = useState(false);
  const [vnpayModalVisible, setVnpayModalVisible] = useState(false);
  const [pendingOrderData, setPendingOrderData] = useState(null);
  const [coupons, setCoupons] = useState([]);
  const [wallet, setWallet] = useState({ points: 0, pointValue: 1000 });
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [pointsToUse, setPointsToUse] = useState(0);

  useEffect(() => {
    if (auth.isAuthenticated && auth.user) {
      form.setFieldsValue({
        name: auth.user.name || "",
        email: auth.user.email || "",
      });
    }
  }, [auth, form]);

  useEffect(() => {
    if (!auth.isAuthenticated) return;

    const fetchRewards = async () => {
      const [couponRes, walletRes] = await Promise.all([
        getCouponsApi(),
        getWalletApi(),
      ]);
      if (couponRes?.EC === 0) {
        setCoupons(couponRes.coupons || []);
      }
      if (walletRes?.EC === 0) {
        setWallet({
          points: Number(walletRes.points || 0),
          pointValue: Number(walletRes.pointValue || 1000),
        });
      }
    };

    fetchRewards();
  }, [auth.isAuthenticated]);

  const getSubtotal = () => {
    if (!cart.items) return 0;
    return cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const getPointsDiscount = () => {
    const safePoints = Math.min(Math.max(Number(pointsToUse) || 0, 0), wallet.points);
    const maxDiscount = Math.max(getSubtotal() - couponDiscount, 0);
    return Math.min(safePoints * wallet.pointValue, maxDiscount);
  };

  const getPayableTotal = () => Math.max(getSubtotal() - couponDiscount - getPointsDiscount(), 0);

  const handleApplyCoupon = async (code = couponCode) => {
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) {
      notification.warning({ message: "Coupon", description: "Please enter a coupon code." });
      return;
    }

    await runApplyCoupon(async () => {
      const res = await validateCouponApi({ code: normalizedCode, subtotal: getSubtotal() });
      if (res?.EC === 0) {
        setAppliedCoupon(res.coupon);
        setCouponCode(res.coupon.code);
        setCouponDiscount(Number(res.discount || 0));
        notification.success({ message: "Coupon applied", description: `${res.coupon.code} saved ${formatCurrency(res.discount)}` });
      } else {
        setAppliedCoupon(null);
        setCouponDiscount(0);
        notification.error({ message: "Coupon", description: res?.EM || "Coupon cannot be applied." });
      }
    });
  };

  const handlePointsChange = (event) => {
    const nextPoints = Math.min(Math.max(Number(event.target.value) || 0, 0), wallet.points);
    setPointsToUse(nextPoints);
  };

  const handlePlaceOrder = async (values) => {
    if (!cart.items || cart.items.length === 0) {
      notification.error({
        message: "Checkout",
        description: "Your cart is empty.",
      });
      return;
    }

    const orderData = {
      customerInfo: {
        name: values.name,
        phone: values.phone,
        address: values.address,
        email: values.email,
      },
      items: cart.items.map((item) => ({
        productId: item.productId,
        slug: item.slug,
        name: item.name,
        price: item.price,
        color: item.color,
        size: item.size,
        quantity: item.quantity,
        image: item.image,
      })),
      totalAmount: getPayableTotal(),
      couponCode: appliedCoupon?.code || "",
      pointsUsed: Number(pointsToUse) || 0,
      paymentMethod: paymentMethod,
      paymentStatus: "Pending", // Will be marked "Paid" if MoMo/VNPay succeeds
    };

    if (paymentMethod === "COD") {
      await submitOrderToBackend(orderData);
    } else if (paymentMethod === "MOMO") {
      setPendingOrderData(orderData);
      setMomoModalVisible(true);
    } else if (paymentMethod === "VNPAY") {
      setPendingOrderData(orderData);
      setVnpayModalVisible(true);
    }
  };

  const submitOrderToBackend = async (orderData) => {
    await runSubmitOrder(async () => {
      try {
        const res = await createOrderApi(orderData);
        if (res && res.EC === 0) {
          notification.success({
            message: "Order Placed Successfully",
            description: "Your order has been received and is being processed.",
          });
          await clearCart();
          navigate("/orders");
        } else {
          notification.error({
            message: "Order Failed",
            description: res?.EM || "An error occurred while creating your order.",
          });
        }
      } catch (error) {
        console.error(">>> Error creating order:", error);
        notification.error({
          message: "Order Submission Failed",
          description: "System error occurred while creating order.",
        });
      }
    });
  };

  const handleMomoSuccess = async () => {
    setMomoModalVisible(false);
    if (pendingOrderData) {
      const updatedOrder = {
        ...pendingOrderData,
        paymentStatus: "Paid",
      };
      await submitOrderToBackend(updatedOrder);
    }
  };

  const handleVnpaySuccess = async () => {
    setVnpayModalVisible(false);
    if (pendingOrderData) {
      const updatedOrder = {
        ...pendingOrderData,
        paymentStatus: "Paid",
      };
      await submitOrderToBackend(updatedOrder);
    }
  };

  if (!cart.items || cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <h2 className="text-2xl font-black text-stone-900">No products to checkout</h2>
        <Link to="/" className="mt-4 inline-flex items-center gap-2 rounded bg-emerald-700 px-4 py-2 font-bold text-white hover:bg-emerald-800">
          <ArrowLeftOutlined /> Go back home
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-[calc(100vh-70px)] max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link to="/cart" className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700 hover:text-emerald-950 mb-3">
          <ArrowLeftOutlined /> Back to cart
        </Link>
        <h1 className="text-3xl font-black text-stone-950">Checkout & Payment</h1>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        {/* Customer Information & Payment Methods */}
        <div className="space-y-6">
          <div className="rounded-md border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black text-stone-950 border-b border-stone-100 pb-3 mb-5">
              1. Shipping Information
            </h2>
            <Form form={form} layout="vertical" onFinish={handlePlaceOrder} requiredMark={false}>
              <div className="grid gap-x-4 sm:grid-cols-2">
                <Form.Item
                  name="name"
                  label={<span className="font-semibold text-stone-700">Full Name</span>}
                  rules={[{ required: true, message: "Please enter full name" }]}
                >
                  <Input prefix={<UserOutlined className="text-stone-400" />} placeholder="John Doe" className="h-11" />
                </Form.Item>

                <Form.Item
                  name="phone"
                  label={<span className="font-semibold text-stone-700">Phone Number</span>}
                  rules={[
                    { required: true, message: "Please enter phone number" },
                    { pattern: /^[0-9]{10}$/, message: "Phone number must be exactly 10 digits" },
                  ]}
                >
                  <Input prefix={<PhoneOutlined className="text-stone-400" />} placeholder="0912345678" className="h-11" />
                </Form.Item>
              </div>

              <Form.Item
                name="email"
                label={<span className="font-semibold text-stone-700">Email Address</span>}
                rules={[
                  { required: true, message: "Please enter email" },
                  { type: "email", message: "Invalid email address format" },
                ]}
              >
                <Input prefix={<MailOutlined className="text-stone-400" />} placeholder="example@gmail.com" className="h-11" />
              </Form.Item>

              <Form.Item
                name="address"
                label={<span className="font-semibold text-stone-700">Shipping Address</span>}
                rules={[{ required: true, message: "Please enter shipping address" }]}
              >
                <Input.TextArea prefix={<HomeOutlined className="text-stone-400" />} placeholder="House number, Street name, Ward, District, Province/City" rows={3} />
              </Form.Item>

              {/* Submit trigger in form */}
              <button type="submit" id="submit-order-btn" className="hidden" />
            </Form>
          </div>

          <div className="rounded-md border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black text-stone-950 border-b border-stone-100 pb-3 mb-5">
              2. Payment Method
            </h2>
            <Radio.Group onChange={(e) => setPaymentMethod(e.target.value)} value={paymentMethod} className="w-full">
              <div className="space-y-3">
                <label
                  className={`flex items-center justify-between p-4 rounded-md border cursor-pointer transition ${
                    paymentMethod === "COD" ? "border-emerald-700 bg-emerald-50/40" : "border-stone-200 hover:bg-stone-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Radio value="COD" />
                    <div>
                      <span className="block font-bold text-stone-900">COD (Cash on Delivery)</span>
                      <span className="block text-xs text-stone-500 font-semibold">Available nationwide</span>
                    </div>
                  </div>
                  <DollarOutlined className="text-xl text-stone-400" />
                </label>

                <label
                  className={`flex items-center justify-between p-4 rounded-md border cursor-pointer transition ${
                    paymentMethod === "MOMO" ? "border-emerald-700 bg-emerald-50/40" : "border-stone-200 hover:bg-stone-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Radio value="MOMO" />
                    <div>
                      <span className="block font-bold text-stone-900">MoMo Wallet</span>
                      <span className="block text-xs text-stone-500 font-semibold">Pay via MoMo E-Wallet (Simulate QR)</span>
                    </div>
                  </div>
                  <span className="h-6 w-6 rounded bg-[#a21c6e] text-[10px] font-black text-white grid place-items-center">MoMo</span>
                </label>

                <label
                  className={`flex items-center justify-between p-4 rounded-md border cursor-pointer transition ${
                    paymentMethod === "VNPAY" ? "border-emerald-700 bg-emerald-50/40" : "border-stone-200 hover:bg-stone-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Radio value="VNPAY" />
                    <div>
                      <span className="block font-bold text-stone-900">ATM Card / VNPay</span>
                      <span className="block text-xs text-stone-500 font-semibold">Pay via VNPay gateway (Simulate Banking)</span>
                    </div>
                  </div>
                  <CreditCardOutlined className="text-xl text-stone-400" />
                </label>
              </div>
            </Radio.Group>
          </div>
        </div>

        {/* Order review & submit */}
        <div className="space-y-6">
          <div className="rounded-md border border-stone-200 bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-lg font-black text-stone-950 border-b border-stone-100 pb-3">Your Order</h3>
            <div className="divide-y divide-stone-100 max-h-60 overflow-y-auto pr-1">
              {cart.items.map((item) => (
                <div key={`${item.productId}-${item.color}-${item.size}`} className="py-3 flex items-center gap-3">
                  <img src={item.image} alt={item.name} className="h-12 w-12 rounded border border-stone-100 object-cover bg-stone-50" />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-stone-950 truncate">{item.name}</h4>
                    <p className="text-xs text-stone-500 font-semibold">
                      Color: {item.color} | Size: {item.size} | Qty: {item.quantity}
                    </p>
                  </div>
                  <div className="text-sm font-bold text-stone-950">
                    {formatCurrency(item.price * item.quantity)}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-stone-100 pt-4 space-y-2 text-sm font-semibold">
              <div className="rounded-md border border-emerald-100 bg-emerald-50/40 p-3 space-y-3">
                <div className="flex items-center gap-2 text-sm font-black text-emerald-900">
                  <GiftOutlined />
                  <span>Coupon and reward points</span>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={couponCode}
                    onChange={(event) => setCouponCode(event.target.value)}
                    placeholder="RUN10, SHOE200, FREESHIP"
                    className="font-bold uppercase"
                  />
                  <Button loading={couponLoading} disabled={couponLoading} onClick={() => handleApplyCoupon()}>
                    Apply
                  </Button>
                </div>
                {coupons.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {coupons.slice(0, 4).map((coupon) => (
                      <button
                        type="button"
                        key={coupon.code}
                        disabled={couponLoading}
                        onClick={() => handleApplyCoupon(coupon.code)}
                        className="rounded border border-emerald-200 bg-white px-2 py-1 text-xs font-bold text-emerald-800 hover:border-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {coupon.code}
                      </button>
                    ))}
                  </div>
                )}
                {appliedCoupon && (
                  <Alert
                    type="success"
                    showIcon
                    message={`${appliedCoupon.code} applied`}
                    description={`Discount: ${formatCurrency(couponDiscount)}`}
                  />
                )}
                <div className="rounded border border-stone-200 bg-white p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 font-bold text-stone-800"><WalletOutlined /> Points wallet</span>
                    <Tag color="green">{wallet.points} points</Tag>
                  </div>
                  <Input
                    type="number"
                    min={0}
                    max={wallet.points}
                    value={pointsToUse}
                    onChange={handlePointsChange}
                    placeholder="Points to use"
                  />
                  <p className="mt-2 text-xs font-semibold text-stone-500">
                    1 point = {formatCurrency(wallet.pointValue)}. Discount: {formatCurrency(getPointsDiscount())}
                  </p>
                </div>
              </div>

              <div className="flex justify-between text-stone-500">
                <span>Subtotal</span>
                <span className="text-stone-950 font-bold">{formatCurrency(getSubtotal())}</span>
              </div>
              {couponDiscount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Coupon</span>
                  <span className="font-bold">-{formatCurrency(couponDiscount)}</span>
                </div>
              )}
              {getPointsDiscount() > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Reward points</span>
                  <span className="font-bold">-{formatCurrency(getPointsDiscount())}</span>
                </div>
              )}
              <div className="flex justify-between text-stone-500">
                <span>Shipping</span>
                <span className="text-emerald-700 font-bold">Free</span>
              </div>
              <div className="border-t border-stone-100 pt-3 flex justify-between text-base font-black text-stone-950">
                <span>Total Amount</span>
                <span className="text-lg text-emerald-800">{formatCurrency(getPayableTotal())}</span>
              </div>
            </div>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                const btn = document.getElementById("submit-order-btn");
                if (btn) btn.click();
              }}
              className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md text-sm font-black shadow transition flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed disabled:bg-stone-300"
            >
              {isSubmitting ? (
                <>
                  <Spin size="small" />
                  Processing...
                </>
              ) : (
                "Confirm Order"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* MOCK MOMO WALLET MODAL */}
      <Modal
        title={null}
        footer={null}
        open={momoModalVisible}
        onCancel={() => {
          if (!isSubmitting) setMomoModalVisible(false);
        }}
        width={400}
        centered
        className="overflow-hidden rounded-lg"
      >
        <div className="p-4 text-center space-y-5">
          <div className="mx-auto w-12 h-12 rounded-full bg-[#a21c6e] text-white font-black text-lg grid place-items-center mb-2">
            M
          </div>
          <div>
            <h3 className="text-lg font-black text-stone-900">Pay via MoMo Wallet</h3>
            <p className="text-xs text-stone-500 font-semibold mt-1">Scan the QR code below to complete simulation transaction</p>
          </div>

          <div className="mx-auto w-48 h-48 border border-stone-200 bg-white p-2 rounded-md shadow-inner grid place-items-center">
            {/* Renders a nice simulated QR Code */}
            <div className="text-center">
              <img
                src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=RunGearStorePaymentMomoSimulate"
                alt="MoMo QR code"
                className="w-36 h-36 mx-auto"
              />
              <p className="text-[10px] text-stone-400 font-black mt-2">RUNGEAR_STORE_MOCK_PAY</p>
            </div>
          </div>

          <div className="bg-stone-50 border border-stone-100 rounded-md p-3 text-sm font-bold text-stone-700">
            <div className="flex justify-between">
              <span>Recipient Merchant:</span>
              <span className="text-stone-900">RunGear Store</span>
            </div>
            <div className="flex justify-between mt-1">
              <span>Amount:</span>
              <span className="text-[#a21c6e]">{formatCurrency(getPayableTotal())}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleMomoSuccess}
            disabled={isSubmitting}
            className="w-full py-3 bg-[#a21c6e] hover:bg-[#861259] text-white rounded font-black text-sm flex items-center justify-center gap-2 transition cursor-pointer disabled:cursor-not-allowed disabled:bg-stone-300"
          >
            {isSubmitting ? <Spin size="small" /> : <CheckCircleOutlined />} Simulate Payment Success
          </button>
        </div>
      </Modal>

      {/* MOCK VNPAY PORTAL MODAL */}
      <Modal
        title={null}
        footer={null}
        open={vnpayModalVisible}
        onCancel={() => {
          if (!isSubmitting) setVnpayModalVisible(false);
        }}
        width={480}
        centered
        styles={{ body: { padding: 0 } }}
        className="overflow-hidden rounded-lg"
      >
        <div className="bg-[#005baa] text-white p-4 flex items-center justify-between">
          <span className="text-lg font-black tracking-wide">VNPAY PAYMENT PORTAL</span>
          <span className="text-xs bg-white/20 px-2 py-1 rounded">Simulated Session</span>
        </div>

        <div className="p-6 space-y-5">
          <div className="text-center">
            <p className="text-xs text-stone-500 font-bold uppercase">Payment Amount</p>
            <p className="text-2xl font-black text-[#005baa] mt-1">{formatCurrency(getPayableTotal())}</p>
          </div>

          <div className="rounded border border-stone-200 bg-stone-50/50 p-4 space-y-4">
            <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider">Simulated Bank Card Info</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Select Bank</label>
                <select className="w-full h-10 px-3 rounded border border-stone-300 bg-white text-sm font-semibold text-stone-700 outline-none">
                  <option>NCB (National Citizen Bank - Testing)</option>
                  <option>Vietcombank</option>
                  <option>Agribank</option>
                  <option>Techcombank</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">ATM Card Number</label>
                <input
                  type="text"
                  disabled
                  value="9704 1985 2623 0019"
                  className="w-full h-10 px-3 rounded border border-stone-200 bg-stone-100 text-sm font-bold text-stone-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">Cardholder Name</label>
                  <input
                    type="text"
                    disabled
                    value="NGUYEN VAN A"
                    className="w-full h-10 px-3 rounded border border-stone-200 bg-stone-100 text-sm font-bold text-stone-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">Issue Date</label>
                  <input
                    type="text"
                    disabled
                    value="07/15"
                    className="w-full h-10 px-3 rounded border border-stone-200 bg-stone-100 text-sm font-bold text-stone-700"
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleVnpaySuccess}
            disabled={isSubmitting}
            className="w-full py-3 bg-[#005baa] hover:bg-[#004785] text-white rounded font-black text-sm flex items-center justify-center gap-2 transition cursor-pointer disabled:cursor-not-allowed disabled:bg-stone-300"
          >
            {isSubmitting ? <Spin size="small" /> : <CheckCircleOutlined />} Simulate Payment Confirmation
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default CheckoutPage;
