import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getOrdersApi, cancelOrderApi, requestReturnOrderApi, receiveOrderApi } from "../util/api";
import useLockedAsyncAction from "../hooks/useLockedAsyncAction";
import { CalendarOutlined, HistoryOutlined, ShoppingOutlined, ClockCircleOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { Steps, Alert, Tag, Modal, Input, Button, Spin, Empty, notification } from "antd";

const formatCurrency = (value) => new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
}).format(value);

const OrderStatusTag = ({ status, cancelRequested }) => {
  if (cancelRequested) {
    return <Tag color="warning">Cancellation Requested</Tag>;
  }

  switch (status) {
    case 1:
      return <Tag color="blue">New Order</Tag>;
    case 2:
      return <Tag color="cyan">Confirmed</Tag>;
    case 3:
      return <Tag color="orange">Preparing</Tag>;
    case 4:
      return <Tag color="purple">Delivering</Tag>;
    case 5:
      return <Tag color="green">Delivered</Tag>;
    case 6:
      return <Tag color="error">Cancelled</Tag>;
    case 7:
      return <Tag color="gold">Return Processing</Tag>;
    case 8:
      return <Tag color="magenta">Returned</Tag>;
    case 9:
      return <Tag color="success">Received</Tag>;
    default:
      return <Tag color="default">Unknown</Tag>;
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
      Direct Cancel: {minutes}m {seconds}s
    </span>
  );
};

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [returnModalVisible, setReturnModalVisible] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [now, setNow] = useState(0);
  const { loading: submittingCancel, run: runConfirmCancel } = useLockedAsyncAction();
  const { loading: submittingReturn, run: runConfirmReturn } = useLockedAsyncAction();
  const { loading: submittingReceipt, run: runConfirmReceipt } = useLockedAsyncAction();

  const fetchOrders = useCallback(async (selectFirst = false) => {
    setLoading(true);
    try {
      const res = await getOrdersApi();
      if (res && res.EC === 0) {
        const nextOrders = res.orders || [];
        setOrders(nextOrders);
        setSelectedOrder((currentOrder) => {
          if (selectFirst && nextOrders.length > 0) return nextOrders[0];
          if (!currentOrder) return currentOrder;
          return nextOrders.find((order) => order._id === currentOrder._id) || currentOrder;
        });
      }
    } catch (error) {
      console.error(">>> Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => fetchOrders(true));
  }, [fetchOrders]);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const timeout = setTimeout(tick, 0);
    const interval = setInterval(tick, 1000);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);

  const handleCancelRequest = () => {
    setCancelReason("");
    setCancelModalVisible(true);
  };

  const handleConfirmCancel = async () => {
    if (!selectedOrder) return;
    await runConfirmCancel(async () => {
      try {
        const res = await cancelOrderApi(selectedOrder._id, cancelReason);
        if (res && res.EC === 0) {
          notification.success({
            message: "Cancel Order",
            description: res.EM || "Your order status has been updated to cancelled.",
          });
          setCancelModalVisible(false);
          await fetchOrders();
        } else {
          notification.error({
            message: "Cancellation Failed",
            description: res?.EM || "Could not cancel order.",
          });
        }
      } catch (error) {
        console.error(">>> Error cancelling order:", error);
        notification.error({
          message: "System Error",
          description: "Could not cancel order at this moment.",
        });
      }
    });
  };

  const handleReturnRequest = () => {
    setReturnReason("");
    setReturnModalVisible(true);
  };

  const handleConfirmReturn = async () => {
    if (!selectedOrder) return;
    await runConfirmReturn(async () => {
      try {
        const res = await requestReturnOrderApi(selectedOrder._id, returnReason);
        if (res && res.EC === 0) {
          notification.success({
            message: "Return Request",
            description: res.EM || "Return request has been sent to the shop.",
          });
          setReturnModalVisible(false);
          await fetchOrders();
        } else {
          notification.error({
            message: "Return Request Failed",
            description: res?.EM || "Could not send return request.",
          });
        }
      } catch (error) {
        console.error(">>> Error requesting return:", error);
        notification.error({
          message: "System Error",
          description: "Could not send return request at this moment.",
        });
      }
    });
  };

  const handleConfirmReceipt = () => {
    if (!selectedOrder) return;
    Modal.confirm({
      title: "Confirm Receipt",
      icon: <ExclamationCircleOutlined />,
      content: "Have you successfully received your order items? Once confirmed, you will not be able to request a return for this order.",
      okText: "Yes, Received",
      cancelText: "Cancel",
      okButtonProps: { className: "bg-emerald-700 hover:bg-emerald-800 border-none text-white font-bold" },
      onOk: () => runConfirmReceipt(async () => {
        try {
          const res = await receiveOrderApi(selectedOrder._id);
          if (res && res.EC === 0) {
            notification.success({
              message: "Confirm Receipt",
              description: "Order receipt confirmed successfully!",
            });
            await fetchOrders();
          } else {
            notification.error({
              message: "Confirmation Failed",
              description: res?.EM || "Could not confirm order receipt.",
            });
          }
        } catch (err) {
          console.error(">>> Error confirming receipt:", err);
          notification.error({
            message: "System Error",
            description: "Failed to confirm receipt at this time.",
          });
        }
      })
    });
  };

  const isCancelableDirectly = (order) => {
    if (!order) return false;
    const isNewOrConfirmed = order.status === 1 || order.status === 2;
    if (!isNewOrConfirmed) return false;
    if (!now) return false;
    const createdTime = new Date(order.createdAt).getTime();
    const thirtyMinsMs = 30 * 60 * 1000;
    return now - createdTime < thirtyMinsMs;
  };

  const getStepCurrent = (status) => {
    if (status === 6) return -1; // Cancelled
    if (status === 7) return 5;
    if (status === 8) return 6;
    if (status === 9) return 5;
    return status - 1;
  };

  return (
    <div className="mx-auto min-h-[calc(100vh-70px)] max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-black text-stone-950 flex items-center gap-2">
          <HistoryOutlined /> Order Tracking
        </h1>
        <p className="mt-1 text-sm text-stone-500">View your purchase history and track your order journey in real-time.</p>
      </div>

      {loading && orders.length === 0 ? (
        <div className="grid min-h-60 place-items-center">
          <Spin size="large" />
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-md border border-dashed border-stone-200 bg-white p-12 text-center shadow-sm">
          <Empty description="You haven't placed any orders yet" />
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
          {/* Left panel - Order List */}
          <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
            <h3 className="text-sm font-bold uppercase tracking-wider text-stone-500 px-1">Recent Orders ({orders.length})</h3>
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
                      ID: {order._id.substring(order._id.length - 8).toUpperCase()}
                    </span>
                    <OrderStatusTag status={order.status} cancelRequested={order.cancelRequested} />
                  </div>

                  <div className="text-xs font-semibold text-stone-500 flex items-center gap-2">
                    <CalendarOutlined />
                    {new Date(order.createdAt).toLocaleString("en-US")}
                  </div>

                  <div className="flex justify-between items-end w-full border-t border-stone-100 pt-3">
                    <span className="text-xs text-stone-400 font-semibold">{order.items.length} item(s)</span>
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
                      ORDER ID: {selectedOrder._id.toUpperCase()}
                    </h2>
                    <p className="text-xs font-bold text-stone-400 mt-1 flex items-center gap-2">
                      <CalendarOutlined /> Order Date: {new Date(selectedOrder.createdAt).toLocaleString("en-US")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {isCancelableDirectly(selectedOrder) && (
                      <CancelCountdown
                        createdAt={selectedOrder.createdAt}
                        onTimeout={() => {
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
                    message="Cancellation request pending approval"
                    description="We have sent a cancellation request to the shop since the order is being prepared. Staff will review and confirm shortly."
                    type="warning"
                    showIcon
                    icon={<ExclamationCircleOutlined />}
                  />
                )}

                {/* Status Stepper */}
                {selectedOrder.status === 6 ? (
                  <Alert
                    message="Order Cancelled"
                    description={`Cancellation reason: ${selectedOrder.cancelReason || "Unknown"}`}
                    type="error"
                    showIcon
                  />
                ) : (
                  <div className="py-6 border-b border-stone-100">
                    <Steps
                      current={getStepCurrent(selectedOrder.status)}
                      size="small"
                      items={(selectedOrder.status === 7 || selectedOrder.status === 8
                        ? [
                            { title: "New", description: "Placed successfully" },
                            { title: "Confirmed", description: "Order approved" },
                            { title: "Preparing", description: "Shop packing" },
                            { title: "Delivering", description: "Shipper delivering" },
                            { title: "Delivered", description: "Delivered successfully" },
                            { title: "Return Processing", description: "Shop processing request" },
                            { title: "Returned", description: "Order returned" },
                          ]
                        : [
                            { title: "New", description: "Placed successfully" },
                            { title: "Confirmed", description: "Order approved" },
                            { title: "Preparing", description: "Shop packing" },
                            { title: "Delivering", description: "Shipper delivering" },
                            { title: "Delivered", description: "Delivered successfully" },
                            { title: "Received", description: "Receipt confirmed" },
                          ]
                      ).map((step, idx) => ({
                        title: (
                          <span className="inline-flex items-baseline gap-x-1.5 flex-wrap leading-tight">
                            <span className={`font-bold ${getStepCurrent(selectedOrder.status) === idx ? "text-stone-900" : "text-stone-600"}`}>
                              {step.title}
                            </span>
                            <span className="text-stone-400 font-normal text-[11px]">— {step.description}</span>
                          </span>
                        )
                      }))}
                    />
                  </div>
                )}

                {/* Customer Details */}
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-stone-500">Shipping Information</h3>
                    <div className="text-sm text-stone-800 space-y-1.5 font-semibold bg-stone-50 p-4 rounded border border-stone-200">
                      <p>Recipient: <span className="text-stone-950 font-bold">{selectedOrder.customerInfo.name}</span></p>
                      <p>Phone: <span className="text-stone-950 font-bold">{selectedOrder.customerInfo.phone}</span></p>
                      <p>Email: <span className="text-stone-950 font-bold">{selectedOrder.customerInfo.email}</span></p>
                      <p>Address: <span className="text-stone-950 font-bold">{selectedOrder.customerInfo.address}</span></p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-stone-500">Payment Details</h3>
                    <div className="text-sm text-stone-800 space-y-1.5 font-semibold bg-stone-50 p-4 rounded border border-stone-200">
                      <p>Method: <span className="text-stone-950 font-bold">{selectedOrder.paymentMethod}</span></p>
                      <p>Status:{" "}
                        <span className={selectedOrder.paymentStatus === "Paid" ? "text-emerald-700 font-bold" : "text-amber-700 font-bold"}>
                          {selectedOrder.paymentStatus === "Paid" ? "Paid" : "Pending"}
                        </span>
                      </p>
                      <p>Total: <span className="text-emerald-800 font-extrabold text-base">{formatCurrency(selectedOrder.totalAmount)}</span></p>
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-stone-500">Product List</h3>
                  <div className="divide-y divide-stone-100 rounded border border-stone-200 px-4 bg-stone-50/20">
                    {selectedOrder.items.map((item) => (
                      <div key={`${item.productId}-${item.color}-${item.size}`} className="py-3.5 flex items-center gap-4">
                        <img src={item.image} alt={item.name} className="h-12 w-12 rounded object-cover border border-stone-100 bg-stone-50" />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-stone-950 truncate">{item.name}</h4>
                          <p className="text-xs text-stone-500 font-semibold mt-1">
                            Color: {item.color} | Size: {item.size} | Qty: {item.quantity}
                          </p>
                          {Number(selectedOrder.status) === 9 && (
                            <Link to={`/products/${item.slug}`} className="mt-1 inline-flex text-xs font-bold text-emerald-700 hover:text-emerald-950">
                              Review purchased product
                            </Link>
                          )}
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
                      Cancel Order
                    </Button>
                  ) : selectedOrder.status === 3 && !selectedOrder.cancelRequested ? (
                    <Button type="primary" danger size="large" onClick={handleCancelRequest} className="font-bold">
                      Submit Cancellation Request
                    </Button>
                  ) : selectedOrder.status === 6 ? (
                    <span className="text-sm font-semibold text-rose-600">Order has been cancelled</span>
                  ) : selectedOrder.status === 5 ? (
                    <div className="flex gap-3">
                      <Button
                        type="primary"
                        size="large"
                        onClick={handleConfirmReceipt}
                        loading={submittingReceipt}
                        disabled={submittingReceipt}
                        className="font-bold !bg-emerald-700 hover:!bg-emerald-800 border-none text-white animate-pulse"
                      >
                        Confirm Receipt
                      </Button>
                      <Button type="primary" danger size="large" onClick={handleReturnRequest} className="font-bold">
                        Request Return
                      </Button>
                    </div>
                  ) : selectedOrder.status === 9 ? (
                    <span className="text-sm font-semibold text-emerald-700">Receipt confirmed. Thank you!</span>
                  ) : selectedOrder.status === 7 ? (
                    <Button disabled className="font-bold">
                      Processing return request...
                    </Button>
                  ) : selectedOrder.status === 8 ? (
                    <span className="text-sm font-semibold text-fuchsia-700">Order has been returned</span>
                  ) : selectedOrder.cancelRequested ? (
                    <Button disabled className="font-bold">
                      Processing cancellation request...
                    </Button>
                  ) : (
                    <span className="text-sm font-semibold text-stone-400">
                      Cannot cancel order (30-minute window passed or order is delivering)
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-stone-400">
                <ShoppingOutlined className="text-4xl block mb-2" />
                <p className="font-semibold text-sm">Please select an order to track shipment journey.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CANCELLATION DIALOG */}
      <Modal
        title="Order Cancellation"
        open={cancelModalVisible}
        onCancel={() => setCancelModalVisible(false)}
        footer={[
          <Button key="back" onClick={() => setCancelModalVisible(false)}>
            Close
          </Button>,
          <Button key="submit" type="primary" danger loading={submittingCancel} onClick={handleConfirmCancel}>
            Confirm Cancel
          </Button>,
        ]}
      >
        <div className="space-y-4 py-2">
          <p className="text-sm text-stone-600 font-semibold">
            {selectedOrder && selectedOrder.status === 3
              ? "The shop is preparing your order. Please provide a reason to submit a cancellation request to the shop."
              : "You are cancelling the order directly. Please state the cancellation reason."}
          </p>
          <Input.TextArea
            placeholder="Enter cancellation reason (optional)..."
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={4}
          />
        </div>
      </Modal>

      {/* RETURN DIALOG */}
      <Modal
        title="Return Request"
        open={returnModalVisible}
        onCancel={() => setReturnModalVisible(false)}
        footer={[
          <Button key="back" onClick={() => setReturnModalVisible(false)}>
            Close
          </Button>,
          <Button key="submit" type="primary" loading={submittingReturn} onClick={handleConfirmReturn}>
            Submit Return
          </Button>,
        ]}
      >
        <div className="space-y-4 py-2">
          <p className="text-sm font-semibold text-stone-600">
            Order delivered successfully. Please enter a reason for the shop to process your return request.
          </p>
          <Input.TextArea
            placeholder="Enter return reason..."
            value={returnReason}
            onChange={(event) => setReturnReason(event.target.value)}
            rows={4}
          />
        </div>
      </Modal>
    </div>
  );
};

export default OrdersPage;
