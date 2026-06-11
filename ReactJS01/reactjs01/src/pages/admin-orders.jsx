import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../components/context/auth";
import useLockedAsyncAction from "../hooks/useLockedAsyncAction";
import { getAdminOrdersApi, updateOrderStatusApi } from "../util/api";
import {
  CheckOutlined,
  CloseOutlined,
  DashboardOutlined,
  EyeOutlined,
  FormOutlined,
  ReloadOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { Button, Form, Input, Modal, Select, Space, Table, Tag, notification } from "antd";

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

const STATUS_OPTIONS = [
  { value: ORDER_STATUS.NEW, label: "1. New", tag: "default" },
  { value: ORDER_STATUS.CONFIRMED, label: "2. Confirmed", tag: "blue" },
  { value: ORDER_STATUS.PREPARING, label: "3. Preparing", tag: "processing" },
  { value: ORDER_STATUS.DELIVERING, label: "4. Delivering", tag: "cyan" },
  { value: ORDER_STATUS.DELIVERED, label: "5. Delivered", tag: "green" },
  { value: ORDER_STATUS.CANCELLED, label: "6. Cancelled", tag: "red" },
  { value: ORDER_STATUS.RETURN_PROCESSING, label: "7. Return processing", tag: "gold" },
  { value: ORDER_STATUS.RETURNED, label: "8. Returned", tag: "magenta" },
  { value: ORDER_STATUS.RECEIVED, label: "9. Received", tag: "geekblue" },
];

const STATUS_FLOW = {
  [ORDER_STATUS.NEW]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.PREPARING, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PREPARING]: [ORDER_STATUS.DELIVERING, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.DELIVERING]: [ORDER_STATUS.DELIVERED],
  [ORDER_STATUS.DELIVERED]: [],
  [ORDER_STATUS.CANCELLED]: [],
  [ORDER_STATUS.RETURN_PROCESSING]: [ORDER_STATUS.RETURNED],
  [ORDER_STATUS.RETURNED]: [],
  [ORDER_STATUS.RECEIVED]: [],
};

const CANCEL_ACTION_LABELS = {
  "approve-cancel": "Approve Cancellation",
  "reject-cancel": "Reject Cancellation",
};

const formatCurrency = (value) => new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
}).format(value);

const getStatusOption = (status) => STATUS_OPTIONS.find((item) => item.value === Number(status));

const getStatusName = (status) => getStatusOption(status)?.label || "Unknown";

const getStatusTagColor = (status) => getStatusOption(status)?.tag || "default";

const getAllowedStatusOptions = (status) => {
  const allowedStatuses = STATUS_FLOW[Number(status)] || [];
  return STATUS_OPTIONS.filter((option) => allowedStatuses.includes(option.value));
};

const getShortOrderId = (id = "") => id.substring(Math.max(id.length - 8, 0)).toUpperCase();

const AdminOrdersPage = () => {
  const { auth } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelAction, setCancelAction] = useState("");
  const [statusForm] = Form.useForm();
  const [cancelForm] = Form.useForm();
  const { loading: submitting, run: runSubmit } = useLockedAsyncAction();

  const selectedStatusOptions = useMemo(
    () => getAllowedStatusOptions(selectedOrder?.status),
    [selectedOrder],
  );

  const fetchAllOrders = useCallback(async () => {
    setLoading(true);
    setUnauthorized(false);
    try {
      const res = await getAdminOrdersApi();
      if (res && res.EC === 0) {
        setOrders(res.orders || []);
      } else if (res?.requiredRoles || res?.EM?.includes("permission")) {
        setUnauthorized(true);
      } else {
        notification.error({
          message: "Could not load orders",
          description: res?.EM || "Please try again later.",
        });
      }
    } catch (error) {
      console.error(">>> Error fetching admin orders:", error);
      if (error?.response?.status === 403) {
        setUnauthorized(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(fetchAllOrders);
  }, [fetchAllOrders]);

  const openStatusModal = (order) => {
    const allowedOptions = getAllowedStatusOptions(order.status);
    setSelectedOrder(order);
    statusForm.resetFields();
    statusForm.setFieldsValue({
      status: allowedOptions[0]?.value,
      note: "",
    });
    setStatusModalOpen(true);
  };

  const closeStatusModal = () => {
    setStatusModalOpen(false);
    setSelectedOrder(null);
    statusForm.resetFields();
  };

  const openCancelModal = (order, action) => {
    setSelectedOrder(order);
    setCancelAction(action);
    cancelForm.resetFields();
    setCancelModalOpen(true);
  };

  const closeCancelModal = () => {
    setCancelModalOpen(false);
    setSelectedOrder(null);
    setCancelAction("");
    cancelForm.resetFields();
  };

  const handleStatusSubmit = async (values) => {
    if (!selectedOrder) return;

    await runSubmit(async () => {
      try {
        const res = await updateOrderStatusApi(selectedOrder._id, {
          action: "update-status",
          status: Number(values.status),
          note: values.note,
        });

        if (res && res.EC === 0) {
          notification.success({
            message: "Status Update Submitted",
            description: `Order has transitioned to ${getStatusName(values.status)}.`,
          });
          closeStatusModal();
          await fetchAllOrders();
        } else {
          notification.error({
            message: "Update Failed",
            description: res?.EM || "Could not update order status.",
          });
        }
      } catch (error) {
        console.error(">>> Error updating status:", error);
        notification.error({
          message: "Update Failed",
          description: "Could not update order status at this moment.",
        });
      }
    });
  };

  const handleCancelSubmit = async (values) => {
    if (!selectedOrder || !cancelAction) return;

    await runSubmit(async () => {
      try {
        const res = await updateOrderStatusApi(selectedOrder._id, {
          action: cancelAction,
          note: values.note,
        });

        if (res && res.EC === 0) {
          notification.success({
            message: "Cancellation Request Resolved",
            description: cancelAction === "approve-cancel"
              ? "Cancellation request has been approved."
              : "Cancellation request has been rejected.",
          });
          closeCancelModal();
          await fetchAllOrders();
        } else {
          notification.error({
            message: "Resolution Failed",
            description: res?.EM || "Could not resolve cancellation request.",
          });
        }
      } catch (error) {
        console.error(">>> Error resolving cancel request:", error);
        notification.error({
          message: "Resolution Failed",
          description: "Could not resolve cancellation request at this moment.",
        });
      }
    });
  };

  const columns = [
    {
      title: "Order ID",
      dataIndex: "_id",
      key: "id",
      render: (text) => <strong className="text-stone-900">{getShortOrderId(text)}</strong>,
    },
    {
      title: "Customer",
      dataIndex: "customerInfo",
      key: "customer",
      render: (info = {}) => (
        <div className="text-xs space-y-0.5">
          <p className="font-bold text-stone-950">{info.name}</p>
          <p className="text-stone-500 font-semibold">{info.phone}</p>
          <p className="max-w-[150px] truncate text-stone-400 font-medium" title={info.address}>{info.address}</p>
        </div>
      ),
    },
    {
      title: "Total",
      dataIndex: "totalAmount",
      key: "totalAmount",
      render: (amount) => <span className="font-extrabold text-emerald-800">{formatCurrency(amount)}</span>,
    },
    {
      title: "Payment",
      key: "payment",
      render: (_, record) => (
        <div className="text-xs font-semibold">
          <p className="text-stone-700">{record.paymentMethod}</p>
          <Tag color={record.paymentStatus === "Paid" ? "green" : "orange"} className="mt-1 origin-left scale-90">
            {record.paymentStatus === "Paid" ? "Paid" : "Pending"}
          </Tag>
        </div>
      ),
    },
    {
      title: "Status",
      key: "status",
      render: (_, record) => {
        const allowedOptions = getAllowedStatusOptions(record.status);

        if (record.cancelRequested) {
          return (
            <div className="space-y-2">
              <Tag color="warning" className="font-bold">Cancellation Requested</Tag>
              <div className="max-w-[220px] rounded border border-amber-200/70 bg-amber-50 p-2 text-[11px] text-stone-700">
                Reason: <strong>{record.cancelReason || "Customer did not specify a reason"}</strong>
              </div>
              <Space size="small" wrap>
                <Button
                  type="primary"
                  danger
                  size="small"
                  icon={<CheckOutlined />}
                  onClick={() => openCancelModal(record, "approve-cancel")}
                  className="font-bold"
                >
                  Approve
                </Button>
                <Button
                  size="small"
                  icon={<CloseOutlined />}
                  onClick={() => openCancelModal(record, "reject-cancel")}
                  className="font-bold"
                >
                  Reject
                </Button>
              </Space>
            </div>
          );
        }

        return (
          <div className="space-y-2">
            <Tag color={getStatusTagColor(record.status)} className="font-bold">
              {getStatusName(record.status)}
            </Tag>
            {record.status === ORDER_STATUS.RETURN_PROCESSING && (
              <div className="max-w-[220px] rounded border border-yellow-200 bg-yellow-50 p-2 text-[11px] text-stone-700">
                Return Reason: <strong>{record.returnReason || "Customer did not specify a reason"}</strong>
              </div>
            )}
            <Button
              size="small"
              icon={<FormOutlined />}
              disabled={allowedOptions.length === 0}
              onClick={() => openStatusModal(record)}
              className="font-bold"
            >
              Update
            </Button>
          </div>
        );
      },
    },
    {
      title: "Order Date",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date) => <span className="text-xs font-semibold text-stone-500">{new Date(date).toLocaleString("en-US")}</span>,
    },
    {
      title: "Detail",
      key: "detail",
      render: (_, record) => (
        <Link
          to={`/orders/${record._id}`}
          className="inline-flex items-center gap-1 rounded-md border border-stone-300 px-3 py-1.5 text-xs font-bold text-stone-700 hover:border-emerald-600 hover:text-emerald-700"
        >
          <EyeOutlined /> View
        </Link>
      ),
    },
  ];

  if (unauthorized) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-md border border-red-200 bg-red-50 p-8 text-center shadow-sm space-y-4">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-red-100 text-red-600">
            <WarningOutlined className="text-xl" />
          </div>
          <h2 className="text-2xl font-black text-red-950">Access Denied</h2>
          <p className="mx-auto max-w-xl text-sm font-semibold leading-relaxed text-red-700">
            Account <code className="font-bold text-red-900">{auth.user.email}</code> does not have ADMIN permission to manage orders.
          </p>
          <Button type="primary" danger onClick={fetchAllOrders} className="font-bold">
            Try Reloading
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-[calc(100vh-70px)] max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-black text-stone-950">
            <DashboardOutlined /> Order Management
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Manage order life-cycles and handle customer cancellation requests.
          </p>
        </div>
        <Button icon={<ReloadOutlined />} onClick={fetchAllOrders} type="dashed" className="font-bold">
          Refresh
        </Button>
      </div>

      <div className="overflow-hidden rounded-md border border-stone-200 bg-white shadow-sm">
        <Table
          dataSource={orders}
          columns={columns}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 8 }}
          className="admin-orders-table"
        />
      </div>

      <Modal
        title="Update Order Status"
        open={statusModalOpen}
        okText="Submit Update"
        cancelText="Close"
        confirmLoading={submitting}
        onOk={() => statusForm.submit()}
        onCancel={closeStatusModal}
        destroyOnHidden
      >
        <Form form={statusForm} layout="vertical" onFinish={handleStatusSubmit}>
          <div className="mb-4 rounded-md border border-stone-200 bg-stone-50 p-3 text-sm">
            <p className="font-bold text-stone-950">Order #{getShortOrderId(selectedOrder?._id)}</p>
            <p className="mt-1 text-stone-600">
              Current: <Tag color={getStatusTagColor(selectedOrder?.status)}>{getStatusName(selectedOrder?.status)}</Tag>
            </p>
          </div>

          <Form.Item
            name="status"
            label="Next Step"
            rules={[{ required: true, message: "Please select the next status" }]}
          >
            <Select
              placeholder="Select next status"
              options={selectedStatusOptions.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="note"
            label="Processing Note"
            rules={[
              { required: true, message: "Please enter a processing note" },
              { min: 8, message: "Note must be at least 8 characters" },
            ]}
          >
            <Input.TextArea
              rows={4}
              maxLength={250}
              showCount
              placeholder="Enter reason, shipping tracking number, or internal processing details"
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={CANCEL_ACTION_LABELS[cancelAction] || "Process Cancellation Request"}
        open={cancelModalOpen}
        okText="Submit Decision"
        cancelText="Close"
        confirmLoading={submitting}
        onOk={() => cancelForm.submit()}
        onCancel={closeCancelModal}
        destroyOnHidden
      >
        <Form form={cancelForm} layout="vertical" onFinish={handleCancelSubmit}>
          <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-stone-700">
            <p className="font-bold text-stone-950">Order #{getShortOrderId(selectedOrder?._id)}</p>
            <p className="mt-1">
              Customer reason: <strong>{selectedOrder?.cancelReason || "Customer did not specify a reason"}</strong>
            </p>
          </div>

          <Form.Item
            name="note"
            label="Decision Note"
            rules={[
              { required: true, message: "Please enter a decision note" },
              { min: 8, message: "Note must be at least 8 characters" },
            ]}
          >
            <Input.TextArea
              rows={4}
              maxLength={250}
              showCount
              placeholder="Enter reason to approve or reject cancellation"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminOrdersPage;
