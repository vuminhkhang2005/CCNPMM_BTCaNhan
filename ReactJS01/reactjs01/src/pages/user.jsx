import { useCallback, useEffect, useState } from "react";
import { Button, Form, Input, Modal, Popconfirm, Space, Switch, Table, Tag, notification } from "antd";
import { EditOutlined, PlusOutlined, StopOutlined, CheckCircleOutlined, UsergroupAddOutlined } from "@ant-design/icons";
import {
  activateUserApi,
  createManagedUserApi,
  deactivateUserApi,
  getAdminUsersApi,
  updateManagedUserApi,
} from "../util/api";

const USER_ROLES = [
  { value: "USER", label: "USER" },
  { value: "ADMIN", label: "ADMIN" },
];

const emptyUserForm = {
  name: "",
  email: "",
  password: "",
  role: "USER",
  phone: "",
  address: "",
  isActive: true,
};

const UserPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminUsersApi();
      if (Array.isArray(res)) {
        setUsers(res);
      } else {
        notification.error({
          message: "Could not load users",
          description: res?.EM || res?.message || "Please try again.",
        });
      }
    } catch (error) {
      console.error(">>> Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(fetchUsers);
  }, [fetchUsers]);

  const openCreateModal = () => {
    setEditingUser(null);
    form.setFieldsValue(emptyUserForm);
    setModalOpen(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    form.setFieldsValue({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role || "USER",
      phone: user.phone || "",
      address: user.address || "",
      isActive: user.isActive !== false,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingUser(null);
    form.resetFields();
  };

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      const payload = {
        name: values.name,
        email: values.email,
        role: values.role,
        phone: values.phone || "",
        address: values.address || "",
        isActive: values.isActive !== false,
      };

      if (values.password) {
        payload.password = values.password;
      }

      const res = editingUser
        ? await updateManagedUserApi(editingUser._id, payload)
        : await createManagedUserApi({ ...payload, password: values.password });

      if (res?.EC === 0) {
        notification.success({
          message: editingUser ? "User updated successfully" : "User created successfully",
          description: res.EM,
        });
        closeModal();
        await fetchUsers();
      } else {
        notification.error({
          message: "Could not save user",
          description: res?.EM || "Please check user information again.",
        });
      }
    } catch (error) {
      console.error(">>> Error saving user:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetActive = async (user, isActive) => {
    const res = isActive ? await activateUserApi(user._id) : await deactivateUserApi(user._id);
    if (res?.EC === 0) {
      notification.success({
        message: isActive ? "User activated successfully" : "User deactivated successfully",
        description: res.EM,
      });
      await fetchUsers();
    } else {
      notification.error({
        message: "Could not update user status",
        description: res?.EM || "Please try again.",
      });
    }
  };

  const columns = [
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      render: (email) => <span className="font-semibold text-stone-900">{email}</span>,
    },
    {
      title: "Full Name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      render: (role) => <Tag color={role === "ADMIN" ? "purple" : "blue"}>{role}</Tag>,
    },
    {
      title: "Contact",
      key: "contact",
      render: (_, record) => (
        <div className="text-xs text-stone-600">
          <p>{record.phone || "No phone number"}</p>
          <p className="max-w-[220px] truncate" title={record.address}>{record.address || "No address"}</p>
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "isActive",
      key: "isActive",
      render: (isActive) => (
        <Tag color={isActive === false ? "red" : "green"}>
          {isActive === false ? "Inactive" : "Active"}
        </Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space wrap>
          <Button icon={<EditOutlined />} onClick={() => openEditModal(record)}>
            Edit
          </Button>
          {record.isActive === false ? (
            <Button icon={<CheckCircleOutlined />} onClick={() => handleSetActive(record, true)}>
              Activate
            </Button>
          ) : (
            <Popconfirm
              title="Deactivate this user?"
              description="User will not be able to log in or make API requests with old tokens."
              okText="Deactivate"
              cancelText="Close"
              onConfirm={() => handleSetActive(record, false)}
            >
              <Button danger icon={<StopOutlined />}>
                Deactivate
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="mx-auto min-h-[calc(100vh-70px)] max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-black text-stone-950">
            <UsergroupAddOutlined /> User Management
          </h1>
          <p className="mt-1 text-sm text-stone-500">Only administrators can create, edit, and deactivate accounts.</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal} className="font-bold">
          Create User
        </Button>
      </div>

      <div className="overflow-hidden rounded-md border border-stone-200 bg-white shadow-sm">
        <Table
          bordered
          dataSource={users}
          columns={columns}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 8 }}
        />
      </div>

      <Modal
        title={editingUser ? "Edit User" : "Create User"}
        open={modalOpen}
        okText={editingUser ? "Save Changes" : "Create User"}
        cancelText="Close"
        confirmLoading={submitting}
        onOk={() => form.submit()}
        onCancel={closeModal}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} requiredMark={false}>
          <Form.Item
            name="name"
            label="Full Name"
            rules={[{ required: true, message: "Please enter full name" }]}
          >
            <Input placeholder="John Doe" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: "Please enter email" },
              { type: "email", message: "Invalid email address" },
            ]}
          >
            <Input placeholder="email@example.com" />
          </Form.Item>

          <Form.Item
            name="password"
            label={editingUser ? "New Password" : "Password"}
            rules={[
              { required: !editingUser, message: "Please enter password" },
              { min: 6, message: "Password must be at least 6 characters" },
            ]}
          >
            <Input.Password placeholder={editingUser ? "Leave blank if not changing" : "Minimum 6 characters"} />
          </Form.Item>

          <div className="grid gap-4 md:grid-cols-2">
            <Form.Item name="role" label="Role" rules={[{ required: true, message: "Please select role" }]}>
              <Select options={USER_ROLES} />
            </Form.Item>

            <Form.Item name="isActive" label="Active" valuePropName="checked">
              <Switch />
            </Form.Item>
          </div>

          <Form.Item name="phone" label="Phone Number">
            <Input placeholder="0900000000" />
          </Form.Item>

          <Form.Item name="address" label="Address">
            <Input.TextArea rows={3} placeholder="Contact address" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserPage;
