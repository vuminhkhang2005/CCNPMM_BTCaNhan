import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../components/context/auth";
import { getOrdersApi, cancelOrderApi } from "../util/api";
import { CalendarOutlined, CarOutlined, CreditCardOutlined, HistoryOutlined, ShoppingOutlined, ClockCircleOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { Steps, Alert, Tag, Modal, Input, Button, Spin, Empty, notification } from "antd";

const formatCurrency = (value) => new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
}).format(value);

const OrderStatusTag = ({ status, cancelRequested }) => {
  if (cancelRequested) {
    return <Tag color="warning">Yêu cầu hủy đơn</Tag>;
  }

  switch (status) {
    case 1:
      return <Tag color="blue">Đơn hàng mới</Tag>;
    case 2:
      return <Tag color="cyan">Đã xác nhận</Tag>;
    case 3:
      return <Tag color="orange">Đang chuẩn bị</Tag>;
    case 4:
      return <Tag color="purple">Đang giao hàng</Tag>;
    case 5:
      return <Tag color="green">Đã giao thành công</Tag>;
    case 6:
      return <Tag color="error">Đã hủy</Tag>;
    default:
      return <Tag color="default">Không xác định</Tag>;
  }
};

const CancelCountdown = ({ createdAt, onTimeout }) => {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const createdTime = new Date(createdAt).getTime();
      const thirtyMinsMs = 30 * 60 * 1000;
      const diff = Math.max(0, thirtyMinsMs - (Date.now() - createdTime));
      setTimeLeft(diff);

      if (diff <= 0) {
        onTimeout();
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [createdAt, onTimeout]);

  if (timeLeft <= 0) return null;

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/10">
      <ClockCircleOutlined />
      Hủy trực tiếp: {minutes}p {seconds}s
    </span>
  );
};

const OrdersPage = () => {
  const { auth } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [submittingCancel, setSubmittingCancel] = useState(false);

  const fetchOrders = async (selectFirst = false) => {
    setLoading(true);
    try {
      const res = await getOrdersApi();
      if (res && res.EC === 0) {
        setOrders(res.orders);
        if (selectFirst && res.orders.length > 0) {
          setSelectedOrder(res.orders[0]);
        } else if (selectedOrder) {
          // Keep the current selection updated
          const updated = res.orders.find((o) => o._id === selectedOrder._id);
          if (updated) setSelectedOrder(updated);
        }
      }
    } catch (error) {
      console.error(">>> Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(true);
  }, []);

  const handleCancelRequest = () => {
    setCancelReason("");
    setCancelModalVisible(true);
  };

  const handleConfirmCancel = async () => {
    if (!selectedOrder) return;
    setSubmittingCancel(true);
    try {
      const res = await cancelOrderApi(selectedOrder._id, cancelReason);
      if (res && res.EC === 0) {
        notification.success({
          message: "Hủy đơn hàng",
          description: res.EM || "Đơn hàng của bạn đã cập nhật trạng thái hủy.",
        });
        setCancelModalVisible(false);
        await fetchOrders();
      } else {
        notification.error({
          message: "Lỗi hủy đơn",
          description: res?.EM || "Không thể hủy đơn hàng.",
        });
      }
    } catch (error) {
      console.error(">>> Error cancelling order:", error);
      notification.error({
        message: "Lỗi hệ thống",
        description: "Không thể hủy đơn hàng vào lúc này.",
      });
    } finally {
      setSubmittingCancel(false);
    }
  };

  const isCancelableDirectly = (order) => {
    if (!order) return false;
    const isNewOrConfirmed = order.status === 1 || order.status === 2;
    if (!isNewOrConfirmed) return false;
    const createdTime = new Date(order.createdAt).getTime();
    const thirtyMinsMs = 30 * 60 * 1000;
    return Date.now() - createdTime < thirtyMinsMs;
  };

  const getStepCurrent = (status) => {
    // Stepper mapping (1: New, 2: Confirmed, 3: Preparing, 4: Delivering, 5: Delivered)
    if (status === 6) return -1; // Cancelled
    return status - 1;
  };

  return (
    <div className="mx-auto min-h-[calc(100vh-70px)] max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-black text-stone-950 flex items-center gap-2">
          <HistoryOutlined /> Theo dõi đơn hàng
        </h1>
        <p className="mt-1 text-sm text-stone-500">Xem lịch sử mua hàng và cập nhật hành trình đơn hàng thời gian thực.</p>
      </div>

      {loading && orders.length === 0 ? (
        <div className="grid min-h-60 place-items-center">
          <Spin size="large" />
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-md border border-dashed border-stone-200 bg-white p-12 text-center shadow-sm">
          <Empty description="Bạn chưa đặt đơn hàng nào" />
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
          {/* Left panel - Order List */}
          <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
            <h3 className="text-sm font-bold uppercase tracking-wider text-stone-500 px-1">Đơn đặt gần đây ({orders.length})</h3>
            <div className="space-y-3">
              {orders.map((order) => (
                <button
                  key={order._id}
                  type="button"
                  onClick={() => setSelectedOrder(order)}
                  className={`w-full text-left p-4 rounded-md border transition cursor-pointer flex flex-col gap-3 shadow-sm ${
                    selectedOrder && selectedOrder._id === order._id
                      ? "border-emerald-700 bg-emerald-50/20 ring-1 ring-emerald-700/30"
                      : "border-stone-200 bg-white hover:bg-stone-50"
                  }`}
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="font-black text-stone-950 text-sm">
                      MÃ: {order._id.substring(order._id.length - 8).toUpperCase()}
                    </span>
                    <OrderStatusTag status={order.status} cancelRequested={order.cancelRequested} />
                  </div>

                  <div className="text-xs font-semibold text-stone-500 flex items-center gap-2">
                    <CalendarOutlined />
                    {new Date(order.createdAt).toLocaleString("vi-VN")}
                  </div>

                  <div className="flex justify-between items-end w-full border-t border-stone-100 pt-3">
                    <span className="text-xs text-stone-400 font-semibold">{order.items.length} sản phẩm</span>
                    <span className="text-sm font-black text-emerald-800">{formatCurrency(order.totalAmount)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right panel - Tracking Workspace */}
          <div className="bg-white rounded-md border border-stone-200 p-6 shadow-sm min-h-60 h-fit space-y-6">
            {selectedOrder ? (
              <>
                <div className="flex flex-wrap justify-between items-start gap-4 border-b border-stone-100 pb-4">
                  <div>
                    <h2 className="text-xl font-black text-stone-950">
                      MÃ ĐƠN: {selectedOrder._id.toUpperCase()}
                    </h2>
                    <p className="text-xs font-bold text-stone-400 mt-1 flex items-center gap-2">
                      <CalendarOutlined /> Ngày đặt: {new Date(selectedOrder.createdAt).toLocaleString("vi-VN")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {isCancelableDirectly(selectedOrder) && (
                      <CancelCountdown
                        createdAt={selectedOrder.createdAt}
                        onTimeout={() => {
                          // Refresh current orders to disable timer or update UI
                          fetchOrders();
                        }}
                      />
                    )}
                    <OrderStatusTag status={selectedOrder.status} cancelRequested={selectedOrder.cancelRequested} />
                  </div>
                </div>

                {/* Cancel warning if request is pending */}
                {selectedOrder.cancelRequested && (
                  <Alert
                    message="Yêu cầu hủy đơn đang chờ xử lý"
                    description="Chúng tôi đã gửi yêu cầu hủy đơn hàng đến shop do shop đang chuẩn bị hàng. Nhân viên sẽ xem xét và xác nhận sớm."
                    type="warning"
                    showIcon
                    icon={<ExclamationCircleOutlined />}
                  />
                )}

                {/* Status Stepper */}
                {selectedOrder.status === 6 ? (
                  <Alert
                    message="Đơn hàng đã hủy"
                    description={`Lý do hủy đơn: ${selectedOrder.cancelReason || "Không xác định"}`}
                    type="error"
                    showIcon
                  />
                ) : (
                  <div className="py-6 border-b border-stone-100">
                    <Steps
                      current={getStepCurrent(selectedOrder.status)}
                      size="small"
                      items={[
                        { title: "Đơn mới", description: "Vừa đặt thành công" },
                        { title: "Xác nhận", description: "Đã duyệt đơn hàng" },
                        { title: "Chuẩn bị hàng", description: "Shop đang đóng gói" },
                        { title: "Đang giao", description: "Shipper đang giao" },
                        { title: "Đã giao", description: "Giao hàng thành công" },
                      ]}
                    />
                  </div>
                )}

                {/* Customer Details */}
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-stone-500">Thông tin giao nhận</h3>
                    <div className="text-sm text-stone-800 space-y-1.5 font-semibold bg-stone-50 p-4 rounded border border-stone-200">
                      <p>Người nhận: <span className="text-stone-950 font-bold">{selectedOrder.customerInfo.name}</span></p>
                      <p>Điện thoại: <span className="text-stone-950 font-bold">{selectedOrder.customerInfo.phone}</span></p>
                      <p>Email: <span className="text-stone-950 font-bold">{selectedOrder.customerInfo.email}</span></p>
                      <p>Địa chỉ: <span className="text-stone-950 font-bold">{selectedOrder.customerInfo.address}</span></p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-stone-500">Thanh toán</h3>
                    <div className="text-sm text-stone-800 space-y-1.5 font-semibold bg-stone-50 p-4 rounded border border-stone-200">
                      <p>Phương thức: <span className="text-stone-950 font-bold">{selectedOrder.paymentMethod}</span></p>
                      <p>Trạng thái:{" "}
                        <span className={selectedOrder.paymentStatus === "Paid" ? "text-emerald-700 font-bold" : "text-amber-700 font-bold"}>
                          {selectedOrder.paymentStatus === "Paid" ? "Đã thanh toán" : "Chờ thanh toán"}
                        </span>
                      </p>
                      <p>Tổng tiền: <span className="text-emerald-800 font-extrabold text-base">{formatCurrency(selectedOrder.totalAmount)}</span></p>
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-stone-500">Danh sách sản phẩm</h3>
                  <div className="divide-y divide-stone-100 rounded border border-stone-200 px-4 bg-stone-50/20">
                    {selectedOrder.items.map((item) => (
                      <div key={`${item.productId}-${item.color}-${item.size}`} className="py-3.5 flex items-center gap-4">
                        <img src={item.image} alt={item.name} className="h-12 w-12 rounded object-cover border border-stone-100 bg-stone-50" />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-stone-950 truncate">{item.name}</h4>
                          <p className="text-xs text-stone-500 font-semibold mt-1">
                            Màu sắc: {item.color} | Kích thước: {item.size} | Số lượng: {item.quantity}
                          </p>
                        </div>
                        <div className="text-sm font-bold text-stone-950">
                          {formatCurrency(item.price * item.quantity)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cancel controls button */}
                <div className="flex justify-end pt-3">
                  {isCancelableDirectly(selectedOrder) ? (
                    <Button type="primary" danger size="large" onClick={handleCancelRequest} className="font-bold">
                      Hủy đơn hàng
                    </Button>
                  ) : selectedOrder.status === 3 && !selectedOrder.cancelRequested ? (
                    <Button type="primary" danger size="large" onClick={handleCancelRequest} className="font-bold">
                      Gửi Yêu cầu hủy đơn cho shop
                    </Button>
                  ) : selectedOrder.status === 6 ? (
                    <span className="text-sm font-semibold text-rose-600">Đơn hàng đã được hủy</span>
                  ) : selectedOrder.status === 5 ? (
                    <span className="text-sm font-semibold text-emerald-700">Đơn hàng đã được giao nhận thành công</span>
                  ) : selectedOrder.cancelRequested ? (
                    <Button disabled className="font-bold">
                      Đang xử lý yêu cầu hủy...
                    </Button>
                  ) : (
                    <span className="text-sm font-semibold text-stone-400">
                      Không thể hủy đơn (Quá thời hạn 30 phút hoặc đơn đang được giao)
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-stone-400">
                <ShoppingOutlined className="text-4xl block mb-2" />
                <p className="font-semibold text-sm">Vui lòng chọn một đơn hàng để xem hành trình vận chuyển.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CANCELLATION DIALOG */}
      <Modal
        title="Lý do hủy đơn hàng"
        open={cancelModalVisible}
        onCancel={() => setCancelModalVisible(false)}
        footer={[
          <Button key="back" onClick={() => setCancelModalVisible(false)}>
            Hủy
          </Button>,
          <Button key="submit" type="primary" danger loading={submittingCancel} onClick={handleConfirmCancel}>
            Xác nhận hủy đơn
          </Button>,
        ]}
      >
        <div className="space-y-4 py-2">
          <p className="text-sm text-stone-600 font-semibold">
            {selectedOrder && selectedOrder.status === 3
              ? "Shop đang chuẩn bị hàng cho bạn. Hãy cung cấp lý do hủy để gửi yêu cầu đến shop xem xét."
              : "Bạn đang hủy đơn hàng trực tiếp. Vui lòng cho biết lý do hủy đơn."}
          </p>
          <Input.TextArea
            placeholder="Nhập lý do hủy đơn hàng (không bắt buộc)..."
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={4}
          />
        </div>
      </Modal>
    </div>
  );
};

export default OrdersPage;
