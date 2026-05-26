import { useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../components/context/auth";
import { CartContext } from "../components/context/cart.context";
import { createOrderApi } from "../util/api";
import { CreditCardOutlined, DollarOutlined, PhoneOutlined, UserOutlined, HomeOutlined, MailOutlined, CheckCircleOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { Form, Input, Radio, Modal, notification, Spin } from "antd";

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modals for mock payments
  const [momoModalVisible, setMomoModalVisible] = useState(false);
  const [vnpayModalVisible, setVnpayModalVisible] = useState(false);
  const [pendingOrderData, setPendingOrderData] = useState(null);

  useEffect(() => {
    if (auth.isAuthenticated && auth.user) {
      form.setFieldsValue({
        name: auth.user.name || "",
        email: auth.user.email || "",
      });
    }
  }, [auth, form]);

  const getSubtotal = () => {
    if (!cart.items) return 0;
    return cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const handlePlaceOrder = async (values) => {
    if (!cart.items || cart.items.length === 0) {
      notification.error({
        message: "Thanh toán",
        description: "Giỏ hàng của bạn đang trống.",
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
      totalAmount: getSubtotal(),
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
    setIsSubmitting(true);
    try {
      const res = await createOrderApi(orderData);
      if (res && res.EC === 0) {
        notification.success({
          message: "Đặt hàng thành công",
          description: "Đơn hàng của bạn đã được tiếp nhận và xử lý.",
        });
        await clearCart();
        navigate("/orders");
      } else {
        notification.error({
          message: "Lỗi đặt hàng",
          description: res?.EM || "Có lỗi xảy ra khi tạo đơn hàng.",
        });
      }
    } catch (error) {
      console.error(">>> Error creating order:", error);
      notification.error({
        message: "Đặt hàng thất bại",
        description: "Lỗi hệ thống khi tạo đơn hàng.",
      });
    } finally {
      setIsSubmitting(false);
    }
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
        <h2 className="text-2xl font-black text-stone-900">Không có sản phẩm nào để thanh toán</h2>
        <Link to="/" className="mt-4 inline-flex items-center gap-2 rounded bg-emerald-700 px-4 py-2 font-bold text-white hover:bg-emerald-800">
          <ArrowLeftOutlined /> Quay về trang chủ
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-[calc(100vh-70px)] max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link to="/cart" className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700 hover:text-emerald-950 mb-3">
          <ArrowLeftOutlined /> Quay lại giỏ hàng
        </Link>
        <h1 className="text-3xl font-black text-stone-950">Đặt hàng & Thanh toán</h1>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        {/* Customer Information & Payment Methods */}
        <div className="space-y-6">
          <div className="rounded-md border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black text-stone-950 border-b border-stone-100 pb-3 mb-5">
              1. Thông tin giao hàng
            </h2>
            <Form form={form} layout="vertical" onFinish={handlePlaceOrder} requiredMark={false}>
              <div className="grid gap-x-4 sm:grid-cols-2">
                <Form.Item
                  name="name"
                  label={<span className="font-semibold text-stone-700">Họ và tên</span>}
                  rules={[{ required: true, message: "Vui lòng nhập họ tên" }]}
                >
                  <Input prefix={<UserOutlined className="text-stone-400" />} placeholder="Nguyễn Văn A" className="h-11" />
                </Form.Item>

                <Form.Item
                  name="phone"
                  label={<span className="font-semibold text-stone-700">Số điện thoại</span>}
                  rules={[
                    { required: true, message: "Vui lòng nhập số điện thoại" },
                    { pattern: /^[0-9]{10}$/, message: "Số điện thoại phải gồm 10 chữ số" },
                  ]}
                >
                  <Input prefix={<PhoneOutlined className="text-stone-400" />} placeholder="0912345678" className="h-11" />
                </Form.Item>
              </div>

              <Form.Item
                name="email"
                label={<span className="font-semibold text-stone-700">Địa chỉ email</span>}
                rules={[
                  { required: true, message: "Vui lòng nhập email" },
                  { type: "email", message: "Email không đúng định dạng" },
                ]}
              >
                <Input prefix={<MailOutlined className="text-stone-400" />} placeholder="example@gmail.com" className="h-11" />
              </Form.Item>

              <Form.Item
                name="address"
                label={<span className="font-semibold text-stone-700">Địa chỉ nhận hàng</span>}
                rules={[{ required: true, message: "Vui lòng nhập địa chỉ nhận hàng" }]}
              >
                <Input.TextArea prefix={<HomeOutlined className="text-stone-400" />} placeholder="Số nhà, Tên đường, Phường/Xã, Quận/Huyện, Tỉnh/Thành phố" rows={3} />
              </Form.Item>

              {/* Submit trigger in form */}
              <button type="submit" id="submit-order-btn" className="hidden" />
            </Form>
          </div>

          <div className="rounded-md border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black text-stone-950 border-b border-stone-100 pb-3 mb-5">
              2. Phương thức thanh toán
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
                      <span className="block font-bold text-stone-900">COD (Thanh toán khi nhận hàng)</span>
                      <span className="block text-xs text-stone-500 font-semibold">Bắt buộc và khả dụng toàn quốc</span>
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
                      <span className="block font-bold text-stone-900">Ví MoMo</span>
                      <span className="block text-xs text-stone-500 font-semibold">Thanh toán qua ví điện tử MoMo (Simulate QR)</span>
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
                      <span className="block font-bold text-stone-900">Thẻ ATM / VNPay</span>
                      <span className="block text-xs text-stone-500 font-semibold">Thanh toán cổng VNPAY (Simulate Banking)</span>
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
            <h3 className="text-lg font-black text-stone-950 border-b border-stone-100 pb-3">Đơn hàng của bạn</h3>
            <div className="divide-y divide-stone-100 max-h-60 overflow-y-auto pr-1">
              {cart.items.map((item) => (
                <div key={`${item.productId}-${item.color}-${item.size}`} className="py-3 flex items-center gap-3">
                  <img src={item.image} alt={item.name} className="h-12 w-12 rounded border border-stone-100 object-cover bg-stone-50" />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-stone-950 truncate">{item.name}</h4>
                    <p className="text-xs text-stone-500 font-semibold">
                      Màu: {item.color} | Size: {item.size} | SL: {item.quantity}
                    </p>
                  </div>
                  <div className="text-sm font-bold text-stone-950">
                    {formatCurrency(item.price * item.quantity)}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-stone-100 pt-4 space-y-2 text-sm font-semibold">
              <div className="flex justify-between text-stone-500">
                <span>Tạm tính</span>
                <span className="text-stone-950 font-bold">{formatCurrency(getSubtotal())}</span>
              </div>
              <div className="flex justify-between text-stone-500">
                <span>Vận chuyển</span>
                <span className="text-emerald-700 font-bold">Miễn phí</span>
              </div>
              <div className="border-t border-stone-100 pt-3 flex justify-between text-base font-black text-stone-950">
                <span>Tổng số tiền</span>
                <span className="text-lg text-emerald-800">{formatCurrency(getSubtotal())}</span>
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
                  Đang xử lý...
                </>
              ) : (
                "Xác nhận đặt hàng"
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
        onCancel={() => setMomoModalVisible(false)}
        width={400}
        centered
        className="overflow-hidden rounded-lg"
      >
        <div className="p-4 text-center space-y-5">
          <div className="mx-auto w-12 h-12 rounded-full bg-[#a21c6e] text-white font-black text-lg grid place-items-center mb-2">
            M
          </div>
          <div>
            <h3 className="text-lg font-black text-stone-900">Thanh toán qua ví MoMo</h3>
            <p className="text-xs text-stone-500 font-semibold mt-1">Quét mã QR sau để hoàn tất giao dịch mô phỏng</p>
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
              <span>Đơn vị nhận:</span>
              <span className="text-stone-900">RunGear Store</span>
            </div>
            <div className="flex justify-between mt-1">
              <span>Số tiền:</span>
              <span className="text-[#a21c6e]">{formatCurrency(getSubtotal())}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleMomoSuccess}
            className="w-full py-3 bg-[#a21c6e] hover:bg-[#861259] text-white rounded font-black text-sm flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <CheckCircleOutlined /> Giả lập Thanh toán thành công
          </button>
        </div>
      </Modal>

      {/* MOCK VNPAY PORTAL MODAL */}
      <Modal
        title={null}
        footer={null}
        open={vnpayModalVisible}
        onCancel={() => setVnpayModalVisible(false)}
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
            <p className="text-xs text-stone-500 font-bold uppercase">Số tiền thanh toán</p>
            <p className="text-2xl font-black text-[#005baa] mt-1">{formatCurrency(getSubtotal())}</p>
          </div>

          <div className="rounded border border-stone-200 bg-stone-50/50 p-4 space-y-4">
            <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider">Thông tin thẻ ngân hàng giả lập</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Chọn Ngân hàng</label>
                <select className="w-full h-10 px-3 rounded border border-stone-300 bg-white text-sm font-semibold text-stone-700 outline-none">
                  <option>NCB (Ngân hàng Quốc Dân - Thử nghiệm)</option>
                  <option>Vietcombank</option>
                  <option>Agribank</option>
                  <option>Techcombank</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Số thẻ ATM</label>
                <input
                  type="text"
                  disabled
                  value="9704 1985 2623 0019"
                  className="w-full h-10 px-3 rounded border border-stone-200 bg-stone-100 text-sm font-bold text-stone-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">Tên chủ thẻ</label>
                  <input
                    type="text"
                    disabled
                    value="NGUYEN VAN A"
                    className="w-full h-10 px-3 rounded border border-stone-200 bg-stone-100 text-sm font-bold text-stone-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">Ngày phát hành</label>
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
            className="w-full py-3 bg-[#005baa] hover:bg-[#004785] text-white rounded font-black text-sm flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <CheckCircleOutlined /> Giả lập Xác nhận thanh toán
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default CheckoutPage;
