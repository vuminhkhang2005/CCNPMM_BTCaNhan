import { useCallback, useContext, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CreditCardOutlined,
  EnvironmentOutlined,
  ExclamationCircleOutlined,
  HistoryOutlined,
  MailOutlined,
  PhoneOutlined,
  ShoppingOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Alert, Button, Empty, Input, Modal, Spin, Steps, Tag, notification } from "antd";
import { AuthContext } from "../components/context/auth";
import useLockedAsyncAction from "../hooks/useLockedAsyncAction";
import { cancelOrderApi, getOrderByIdApi, receiveOrderApi, requestReturnOrderApi } from "../util/api";

const ORDER_STATUS = {
  NEW: 1,
  CONFIRMED: 2,
  PREPARING: 3,
  DELIVERING: 4,
  DELIVERED: 5,
  CANCELLED: 6,
  RETURN_PROCESSING: 7,
  RETURNED: 8,
  RECEIVED: 9,
};

const STATUS_LABELS = {
  [ORDER_STATUS.NEW]: "New order",
  [ORDER_STATUS.CONFIRMED]: "Confirmed",
  [ORDER_STATUS.PREPARING]: "Preparing",
  [ORDER_STATUS.DELIVERING]: "Delivering",
  [ORDER_STATUS.DELIVERED]: "Delivered",
  [ORDER_STATUS.CANCELLED]: "Cancelled",
  [ORDER_STATUS.RETURN_PROCESSING]: "Return processing",
  [ORDER_STATUS.RETURNED]: "Returned",
  [ORDER_STATUS.RECEIVED]: "Received",
};

const STATUS_COLORS = {
  [ORDER_STATUS.NEW]: "blue",
  [ORDER_STATUS.CONFIRMED]: "cyan",
  [ORDER_STATUS.PREPARING]: "orange",
  [ORDER_STATUS.DELIVERING]: "purple",
  [ORDER_STATUS.DELIVERED]: "green",
  [ORDER_STATUS.CANCELLED]: "error",
  [ORDER_STATUS.RETURN_PROCESSING]: "gold",
  [ORDER_STATUS.RETURNED]: "magenta",
  [ORDER_STATUS.RECEIVED]: "success",
};

const formatCurrency = (value) => new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
}).format(value || 0);

const getShortOrderId = (id = "") => id.substring(Math.max(id.length - 8, 0)).toUpperCase();

const getStatusName = (status) => STATUS_LABELS[Number(status)] || "Unknown";

const getStepCurrent = (status) => {
  if (Number(status) === ORDER_STATUS.CANCELLED) return -1;
  if (Number(status) === ORDER_STATUS.RETURN_PROCESSING) return 5;
  if (Number(status) === ORDER_STATUS.RETURNED) return 6;
  if (Number(status) === ORDER_STATUS.RECEIVED) return 5;
  return Number(status) - 1;
};

const OrderStatusTag = ({ status, cancelRequested }) => {
  if (cancelRequested) return <Tag color="warning">Cancellation Requested</Tag>;
  return <Tag color={STATUS_COLORS[Number(status)] || "default"}>{getStatusName(status)}</Tag>;
};

const getTimelineSteps = (status) => {
  if ([ORDER_STATUS.RETURN_PROCESSING, ORDER_STATUS.RETURNED].includes(Number(status))) {
    return [
      { title: "New", description: "Order placed" },
      { title: "Confirmed", description: "Shop approved" },
      { title: "Preparing", description: "Packing" },
      { title: "Delivering", description: "On the way" },
      { title: "Delivered", description: "Delivered" },
      { title: "Return", description: "Processing" },
      { title: "Returned", description: "Completed" },
    ];
  }

  return [
    { title: "New", description: "Order placed" },
    { title: "Confirmed", description: "Shop approved" },
    { title: "Preparing", description: "Packing" },
    { title: "Delivering", description: "On the way" },
    { title: "Delivered", description: "Delivered" },
    { title: "Received", description: "Completed" },
  ];
};

const PriceRow = ({ label, value, tone = "default" }) => (
  <div className={`flex items-center justify-between gap-4 text-sm font-semibold ${
    tone === "discount" ? "text-emerald-700" : "text-stone-500"
  }`}>
    <span>{label}</span>
    <span className={tone === "total" ? "text-xl font-black text-emerald-800" : "font-bold text-stone-950"}>
      {tone === "discount" ? "-" : ""}{formatCurrency(value)}
    </span>
  </div>
);

const InfoLine = ({ icon, label, value }) => (
  <div className="flex gap-3 rounded-md border border-stone-200 bg-stone-50 p-3">
    <span className="mt-0.5 text-stone-400">{icon}</span>
    <div className="min-w-0">
      <p className="text-xs font-bold uppercase text-stone-400">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-stone-900">{value || "N/A"}</p>
    </div>
  </div>
);

const OrderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(0);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const { loading: submittingCancel, run: runCancel } = useLockedAsyncAction();
  const { loading: submittingReturn, run: runReturn } = useLockedAsyncAction();
  const { loading: submittingReceive, run: runReceive } = useLockedAsyncAction();

  const isAdmin = auth.user?.role === "ADMIN";
  const backPath = isAdmin ? "/admin/orders" : "/orders";

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getOrderByIdApi(id);
      if (res?.EC === 0) {
        setOrder(res.order);
      } else {
        setOrder(null);
        setError(res?.EM || "Order not found");
      }
    } catch (requestError) {
      setOrder(null);
      setError(requestError?.message || "Could not load order detail");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void Promise.resolve().then(fetchOrder);
  }, [fetchOrder]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const isCancelableDirectly = (targetOrder) => {
    if (!targetOrder || isAdmin) return false;
    if (!now) return false;
    if (![ORDER_STATUS.NEW, ORDER_STATUS.CONFIRMED].includes(Number(targetOrder.status))) return false;
    return now - new Date(targetOrder.createdAt).getTime() < 30 * 60 * 1000;
  };

  const getCancelTimeLeft = () => {
    if (!order || !isCancelableDirectly(order)) return "";
    const leftMs = Math.max(0, 30 * 60 * 1000 - (now - new Date(order.createdAt).getTime()));
    const minutes = Math.floor(leftMs / 60000);
    const seconds = Math.floor((leftMs % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const handleCancelOrder = async () => {
    if (!order) return;
    await runCancel(async () => {
      const res = await cancelOrderApi(order._id, cancelReason);
      if (res?.EC === 0) {
        notification.success({ message: "Cancel order", description: res.EM || "Order updated." });
        setCancelModalOpen(false);
        setCancelReason("");
        await fetchOrder();
      } else {
        notification.error({ message: "Cancel order", description: res?.EM || "Could not cancel order." });
      }
    });
  };

  const handleReturnOrder = async () => {
    if (!order) return;
    await runReturn(async () => {
      const res = await requestReturnOrderApi(order._id, returnReason);
      if (res?.EC === 0) {
        notification.success({ message: "Return request", description: res.EM || "Return request sent." });
        setReturnModalOpen(false);
        setReturnReason("");
        await fetchOrder();
      } else {
        notification.error({ message: "Return request", description: res?.EM || "Could not submit return request." });
      }
    });
  };

  const handleReceiveOrder = () => {
    if (!order) return;
    Modal.confirm({
      title: "Confirm receipt",
      icon: <ExclamationCircleOutlined />,
      content: "Confirm that you have received this order?",
      okText: "Yes, received",
      cancelText: "Cancel",
      onOk: () => runReceive(async () => {
        const res = await receiveOrderApi(order._id);
        if (res?.EC === 0) {
          notification.success({ message: "Order received", description: "Receipt confirmed successfully." });
          await fetchOrder();
        } else {
          notification.error({ message: "Order received", description: res?.EM || "Could not confirm receipt." });
        }
      }),
    });
  };

  if (loading && !order) {
    return <div className="grid min-h-[calc(100vh-70px)] place-items-center"><Spin size="large" /></div>;
  }

  if (error || !order) {
    return (
      <div className="mx-auto min-h-[calc(100vh-70px)] max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-md border border-stone-200 bg-white p-10 text-center">
          <Empty description={error || "Order not found"} />
          <Button className="mt-5 font-bold" onClick={() => navigate(backPath)}>
            Back to orders
          </Button>
        </div>
      </div>
    );
  }

  const items = order.items || [];
  const discountAmount = Number(order.discountAmount || 0);
  const timelineSteps = getTimelineSteps(order.status);
  const cancelTimeLeft = getCancelTimeLeft();

  return (
    <div className="min-h-[calc(100vh-70px)] bg-[#f7f7f4] pb-12">
      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <Link to={backPath} className="inline-flex items-center gap-2 text-sm font-bold text-stone-700 hover:text-emerald-700">
            <ArrowLeftOutlined /> Back to orders
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            {cancelTimeLeft && (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">
                <ClockCircleOutlined /> Cancel window: {cancelTimeLeft}
              </span>
            )}
            <OrderStatusTag status={order.status} cancelRequested={order.cancelRequested} />
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-md border border-stone-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-stone-100 pb-5">
            <div>
              <p className="text-sm font-bold uppercase text-emerald-700">Order Detail</p>
              <h1 className="mt-2 text-3xl font-black text-stone-950">#{getShortOrderId(order._id)}</h1>
              <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-stone-500">
                <CalendarOutlined /> {new Date(order.createdAt).toLocaleString("vi-VN")}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold uppercase text-stone-400">Total amount</p>
              <p className="mt-1 text-3xl font-black text-emerald-800">{formatCurrency(order.totalAmount)}</p>
            </div>
          </div>

          {order.cancelRequested && (
            <Alert
              className="mt-5"
              type="warning"
              showIcon
              message="Cancellation request pending"
              description={order.cancelReason || "The shop is reviewing this cancellation request."}
            />
          )}

          {Number(order.status) === ORDER_STATUS.CANCELLED && (
            <Alert
              className="mt-5"
              type="error"
              showIcon
              message="Order cancelled"
              description={order.cancelReason || "This order has been cancelled."}
            />
          )}

          <div className="mt-6">
            <Steps
              current={getStepCurrent(order.status)}
              size="small"
              items={timelineSteps.map((step) => ({
                title: <span className="font-bold text-stone-800">{step.title}</span>,
                description: <span className="text-xs font-semibold text-stone-400">{step.description}</span>,
              }))}
            />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-6">
            <div className="rounded-md border border-stone-200 bg-white p-5">
              <div className="mb-4 flex items-center justify-between gap-3 border-b border-stone-100 pb-4">
                <h2 className="text-xl font-black text-stone-950">Items</h2>
                <Tag>{items.length} item(s)</Tag>
              </div>

              <div className="divide-y divide-stone-100">
                {items.map((item) => (
                  <article key={`${item.variantId || item.productId}-${item.color}-${item.size}`} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                    <Link to={`/products/${item.slug}`} className="h-20 w-20 shrink-0 overflow-hidden rounded-md border border-stone-200 bg-stone-50">
                      <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link to={`/products/${item.slug}`} className="block truncate text-base font-black text-stone-950 hover:text-emerald-700">
                        {item.name}
                      </Link>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-stone-500">
                        <span>Color: <strong className="text-stone-800">{item.color}</strong></span>
                        <span>Size: <strong className="text-stone-800">{item.size}</strong></span>
                        {item.sku && <span>SKU: <strong className="text-stone-800">{item.sku}</strong></span>}
                      </div>
                      <div className="mt-3 grid gap-2 text-sm font-semibold text-stone-500 sm:grid-cols-3">
                        <span>Unit: <strong className="text-stone-950">{formatCurrency(item.price)}</strong></span>
                        <span>Qty: <strong className="text-stone-950">{item.quantity}</strong></span>
                        <span>Line total: <strong className="text-stone-950">{formatCurrency(item.price * item.quantity)}</strong></span>
                      </div>
                      {Number(order.status) === ORDER_STATUS.RECEIVED && (
                        <Link to={`/products/${item.slug}`} className="mt-2 inline-flex text-xs font-bold text-emerald-700 hover:text-emerald-950">
                          Review purchased product
                        </Link>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="rounded-md border border-stone-200 bg-white p-5">
              <h2 className="mb-4 text-xl font-black text-stone-950">Status History</h2>
              {order.statusHistory?.length ? (
                <div className="space-y-3">
                  {[...order.statusHistory].reverse().map((historyItem, index) => (
                    <div key={`${historyItem.action}-${historyItem.createdAt}-${index}`} className="rounded-md border border-stone-200 bg-stone-50 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm font-black text-stone-950">{historyItem.action}</p>
                        <p className="text-xs font-semibold text-stone-400">{new Date(historyItem.createdAt).toLocaleString("vi-VN")}</p>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-stone-600">
                        {historyItem.fromStatus ? `${getStatusName(historyItem.fromStatus)} -> ` : ""}
                        {historyItem.toStatus ? getStatusName(historyItem.toStatus) : getStatusName(order.status)}
                      </p>
                      {historyItem.note && <p className="mt-1 text-sm text-stone-500">{historyItem.note}</p>}
                      {historyItem.actorEmail && <p className="mt-1 text-xs font-semibold text-stone-400">By {historyItem.actorEmail}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <Empty description="No status history" />
              )}
            </div>
          </div>

          <aside className="space-y-6 lg:self-start">
            <div className="rounded-md border border-stone-200 bg-white p-5">
              <h2 className="mb-4 text-xl font-black text-stone-950">Customer</h2>
              <div className="space-y-3">
                <InfoLine icon={<UserOutlined />} label="Recipient" value={order.customerInfo?.name} />
                <InfoLine icon={<PhoneOutlined />} label="Phone" value={order.customerInfo?.phone} />
                <InfoLine icon={<MailOutlined />} label="Email" value={order.customerInfo?.email} />
                <InfoLine icon={<EnvironmentOutlined />} label="Address" value={order.customerInfo?.address} />
              </div>
            </div>

            <div className="rounded-md border border-stone-200 bg-white p-5">
              <h2 className="mb-4 text-xl font-black text-stone-950">Payment</h2>
              <div className="mb-4 rounded-md border border-stone-200 bg-stone-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 text-sm font-bold text-stone-700"><CreditCardOutlined /> {order.paymentMethod}</span>
                  <Tag color={order.paymentStatus === "Paid" ? "green" : "orange"}>{order.paymentStatus}</Tag>
                </div>
              </div>
              <div className="space-y-3 border-t border-stone-100 pt-4">
                <PriceRow label="Subtotal" value={order.subtotalAmount} />
                {order.couponDiscount > 0 && <PriceRow label={`Coupon ${order.couponCode || ""}`} value={order.couponDiscount} tone="discount" />}
                {order.pointsDiscount > 0 && <PriceRow label={`Reward points (${order.pointsUsed || 0})`} value={order.pointsDiscount} tone="discount" />}
                {discountAmount > 0 && <PriceRow label="Total discount" value={discountAmount} tone="discount" />}
                <div className="border-t border-stone-100 pt-3">
                  <PriceRow label="Total" value={order.totalAmount} tone="total" />
                </div>
              </div>
            </div>

            {!isAdmin && (
              <div className="rounded-md border border-stone-200 bg-white p-5">
                <h2 className="mb-4 text-xl font-black text-stone-950">Actions</h2>
                <div className="space-y-3">
                  {isCancelableDirectly(order) && (
                    <Button danger block size="large" loading={submittingCancel} onClick={() => setCancelModalOpen(true)} className="font-bold">
                      Cancel order
                    </Button>
                  )}
                  {Number(order.status) === ORDER_STATUS.PREPARING && !order.cancelRequested && (
                    <Button danger block size="large" loading={submittingCancel} onClick={() => setCancelModalOpen(true)} className="font-bold">
                      Submit cancellation request
                    </Button>
                  )}
                  {Number(order.status) === ORDER_STATUS.DELIVERED && (
                    <>
                      <Button type="primary" block size="large" loading={submittingReceive} icon={<CheckCircleOutlined />} onClick={handleReceiveOrder} className="font-bold">
                        Confirm receipt
                      </Button>
                      <Button danger block size="large" loading={submittingReturn} onClick={() => setReturnModalOpen(true)} className="font-bold">
                        Request return
                      </Button>
                    </>
                  )}
                  {![ORDER_STATUS.NEW, ORDER_STATUS.CONFIRMED, ORDER_STATUS.PREPARING, ORDER_STATUS.DELIVERED].includes(Number(order.status)) && (
                    <Alert type="info" showIcon message="No action available for this order status." />
                  )}
                </div>
              </div>
            )}
          </aside>
        </section>
      </main>

      <Modal
        title={Number(order.status) === ORDER_STATUS.PREPARING ? "Submit cancellation request" : "Cancel order"}
        open={cancelModalOpen}
        onCancel={() => setCancelModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setCancelModalOpen(false)}>Close</Button>,
          <Button key="submit" type="primary" danger loading={submittingCancel} onClick={handleCancelOrder}>Submit</Button>,
        ]}
      >
        <Input.TextArea
          rows={4}
          value={cancelReason}
          onChange={(event) => setCancelReason(event.target.value)}
          placeholder="Enter cancellation reason..."
        />
      </Modal>

      <Modal
        title="Request return"
        open={returnModalOpen}
        onCancel={() => setReturnModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setReturnModalOpen(false)}>Close</Button>,
          <Button key="submit" type="primary" loading={submittingReturn} onClick={handleReturnOrder}>Submit</Button>,
        ]}
      >
        <Input.TextArea
          rows={4}
          value={returnReason}
          onChange={(event) => setReturnReason(event.target.value)}
          placeholder="Enter return reason..."
        />
      </Modal>
    </div>
  );
};

export default OrderDetailPage;
