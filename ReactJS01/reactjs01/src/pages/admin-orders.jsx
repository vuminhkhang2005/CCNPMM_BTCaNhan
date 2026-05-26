import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../components/context/auth";
import { getOrdersApi, updateOrderStatusApi } from "../util/api";
import { DashboardOutlined, CheckOutlined, CloseOutlined, CarOutlined, GiftOutlined, UserOutlined, WarningOutlined } from "@ant-design/icons";
import { Table, Button, Select, Space, Tag, Modal, notification, Spin, Alert } from "antd";

const formatCurrency = (value) => new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
}).format(value);

const AdminOrdersPage = () => {
  const { auth } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);

  const fetchAllOrders = async () => {
    setLoading(true);
    setUnauthorized(false);
    try {
      const res = await getOrdersApi({ all: true });
      if (res && res.EC === 0) {
        setOrders(res.orders);
      } else if (res && res.status === 403 || res?.EM?.includes("Only administrators")) {
        setUnauthorized(true);
      }
    } catch (error) {
      console.error(">>> Error fetching admin orders:", error);
      if (error?.response?.status === 403) {
        setUnauthorized(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllOrders();
  }, []);

  const handleUpdateStatus = async (orderId, status) => {
    try {
      const res = await updateOrderStatusApi(orderId, { status: Number(status) });
      if (res && res.EC === 0) {
        notification.success({
          message: "Cập nhật đơn hàng",
          description: `Đã chuyển đơn hàng sang trạng thái ${getStatusName(Number(status))}`,
        });
        await fetchAllOrders();
      } else {
        notification.error({
          message: "Lỗi cập nhật",
          description: res?.EM || "Không thể cập nhật trạng thái.",
        });
      }
    } catch (error) {
      console.error(">>> Error updating status:", error);
    }
  };

  const handleCancelRequestAction = async (orderId, action) => {
    try {
      const res = await updateOrderStatusApi(orderId, { action });
      if (res && res.EC === 0) {
        notification.success({
          message: "Yêu cầu hủy đơn",
          description: action === "approve-cancel" ? "Đã chấp nhận hủy đơn." : "Đã từ chối hủy đơn.",
        });
        await fetchAllOrders();
      } else {
        notification.error({
          message: "Lỗi cập nhật",
          description: res?.EM || "Không thể thực hiện hành động này.",
        });
      }
    } catch (error) {
      console.error(">>> Error resolving cancel request:", error);
    }
  };

  const getStatusName = (status) => {
    switch (status) {
      case 1: return "Đơn hàng mới";
      case 2: return "Đã xác nhận";
      case 3: return "Chuẩn bị hàng";
      case 4: return "Đang giao hàng";
      case 5: return "Đã giao thành công";
      case 6: return "Đã hủy";
      default: return "Không xác định";
    }
  };

  const columns = [
    {
      title: "Mã Đơn",
      dataIndex: "_id",
      key: "id",
      render: (text) => <strong className="text-stone-900">{text.substring(text.length - 8).toUpperCase()}</strong>,
    },
    {
      title: "Khách Hàng",
      dataIndex: "customerInfo",
      key: "customer",
      render: (info) => (
        <div className="text-xs space-y-0.5">
          <p className="font-bold text-stone-950">{info.name}</p>
          <p className="text-stone-500 font-semibold">{info.phone}</p>
          <p className="text-stone-400 font-medium truncate max-w-[150px]" title={info.address}>{info.address}</p>
        </div>
      ),
    },
    {
      title: "Tổng Tiền",
      dataIndex: "totalAmount",
      key: "totalAmount",
      render: (amount) => <span className="font-extrabold text-emerald-800">{formatCurrency(amount)}</span>,
    },
    {
      title: "Phương Thức",
      key: "payment",
      render: (_, record) => (
        <div className="text-xs font-semibold">
          <p className="text-stone-700">{record.paymentMethod}</p>
          <Tag color={record.paymentStatus === "Paid" ? "green" : "orange"} className="mt-1 scale-90 origin-left">
            {record.paymentStatus === "Paid" ? "Đã thanh toán" : "Chờ thanh toán"}
          </Tag>
        </div>
      ),
    },
    {
      title: "Trạng Thái",
      key: "status",
      render: (_, record) => {
        if (record.cancelRequested) {
          return (
            <div className="space-y-1.5">
              <Tag color="warning" className="font-bold">Yêu cầu hủy đơn</Tag>
              <div className="text-[11px] text-stone-500 bg-stone-50 p-1.5 rounded border border-amber-200/60 max-w-[180px]">
                Lý do: <strong>{record.cancelReason}</strong>
              </div>
              <Space size="small">
                <Button
                  type="primary"
                  danger
                  size="small"
                  icon={<CheckOutlined />}
                  onClick={() => handleCancelRequestAction(record._id, "approve-cancel")}
                  className="font-bold scale-90"
                >
                  Duyệt hủy
                </Button>
                <Button
                  size="small"
                  icon={<CloseOutlined />}
                  onClick={() => handleCancelRequestAction(record._id, "reject-cancel")}
                  className="font-bold scale-90"
                >
                  Từ chối
                </Button>
              </Space>
            </div>
          );
        }

        return (
          <Select
            value={record.status}
            onChange={(val) => handleUpdateStatus(record._id, val)}
            className="w-40 font-semibold"
            options={[
              { value: 1, label: "1. Đơn mới" },
              { value: 2, label: "2. Đã xác nhận" },
              { value: 3, label: "3. Chuẩn bị hàng" },
              { value: 4, label: "4. Đang giao hàng" },
              { value: 5, label: "5. Đã giao thành công" },
              { value: 6, label: "6. Đã hủy" },
            ]}
          />
        );
      },
    },
    {
      title: "Ngày Đặt",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date) => <span className="text-xs font-semibold text-stone-500">{new Date(date).toLocaleString("vi-VN")}</span>,
    },
  ];

  if (unauthorized) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-md border border-red-200 bg-red-50 p-8 shadow-sm text-center space-y-4">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-red-100 text-red-600">
            <WarningOutlined className="text-xl" />
          </div>
          <h2 className="text-2xl font-black text-red-950">Quyền truy cập bị từ chối</h2>
          <p className="text-sm font-semibold text-red-700 max-w-xl mx-auto leading-relaxed">
            Tài khoản hiện tại của bạn không có vai trò <strong>ADMIN</strong>. Vui lòng cập nhật trường 
            <code className="mx-1.5 px-1.5 py-0.5 rounded bg-red-100 text-red-800">role</code> thành 
            <code className="mx-1.5 px-1.5 py-0.5 rounded bg-red-100 text-red-800">"ADMIN"</code> trong cơ sở dữ liệu MongoDB 
            cho tài khoản <code className="font-bold text-red-900">{auth.user.email}</code> và đăng nhập lại.
          </p>
          <div className="pt-2">
            <Button type="primary" danger onClick={fetchAllOrders} className="font-bold">
              Thử tải lại trang
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-[calc(100vh-70px)] max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-3xl font-black text-stone-950 flex items-center gap-2">
            <DashboardOutlined /> Quản lý đơn hàng (Shop)
          </h1>
          <p className="mt-1 text-sm text-stone-500">Cập nhật vòng đời đơn hàng và phê duyệt yêu cầu hủy đơn từ khách hàng.</p>
        </div>
        <Button onClick={fetchAllOrders} type="dashed" className="font-bold">
          Làm mới danh sách
        </Button>
      </div>

      <Alert
        message="Mô phỏng Quản lý Shop"
        description="Trang này dành riêng cho Admin để kiểm thử các trạng thái đơn hàng (Chuẩn bị hàng, Đang giao, Đã giao) và duyệt các yêu cầu hủy đơn gửi từ người dùng."
        type="info"
        showIcon
      />

      <div className="rounded-md border border-stone-200 bg-white shadow-sm overflow-hidden">
        <Table
          dataSource={orders}
          columns={columns}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 8 }}
          className="admin-orders-table"
        />
      </div>
    </div>
  );
};

export default AdminOrdersPage;
