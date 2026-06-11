import { useContext, useEffect } from "react";
import { Button, Form, Input, notification } from "antd";
import { IdcardOutlined, LockOutlined, MailOutlined, PhoneOutlined, UserOutlined, HomeOutlined } from "@ant-design/icons";
import { AuthContext } from "../components/context/auth";
import useLockedAsyncAction from "../hooks/useLockedAsyncAction";
import { updateProfileApi } from "../util/api";
import { setAccessToken } from "../util/authToken";

const ProfilePage = () => {
  const { auth, setAuth } = useContext(AuthContext);
  const [form] = Form.useForm();
  const { loading: submitting, run: runSubmit } = useLockedAsyncAction();

  useEffect(() => {
    form.setFieldsValue({
      name: auth.user.name,
      email: auth.user.email,
      phone: auth.user.phone || "",
      address: auth.user.address || "",
      currentPassword: "",
      newPassword: "",
    });
  }, [auth.user, form]);

  const handleSubmit = async (values) => {
    await runSubmit(async () => {
      const payload = {
        name: values.name,
        email: values.email,
        phone: values.phone || "",
        address: values.address || "",
      };

      if (values.newPassword) {
        payload.currentPassword = values.currentPassword;
        payload.newPassword = values.newPassword;
      }

      const res = await updateProfileApi(payload);
      if (res?.EC === 0) {
        if (res.access_token) {
          setAccessToken(res.access_token);
        }
        setAuth({
          isAuthenticated: true,
          user: {
            email: res.user.email,
            name: res.user.name,
            role: res.user.role,
            phone: res.user.phone || "",
            address: res.user.address || "",
            isActive: res.user.isActive !== false,
          },
        });
        form.setFieldsValue({ currentPassword: "", newPassword: "" });
        notification.success({
          message: "Update Profile",
          description: res.EM || "Personal information updated.",
        });
      } else {
        notification.error({
          message: "Update Error",
          description: res?.EM || "Could not update profile.",
        });
      }
    });
  };

  return (
    <div className="mx-auto min-h-[calc(100vh-70px)] max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-3xl font-black text-stone-950">
          <IdcardOutlined /> Personal Profile
        </h1>
        <p className="mt-1 text-sm text-stone-500">Edit login user profile details.</p>
      </div>

      <div className="rounded-md border border-stone-200 bg-white p-6 shadow-sm">
        <Form form={form} layout="vertical" onFinish={handleSubmit} requiredMark={false}>
          <div className="grid gap-4 md:grid-cols-2">
            <Form.Item
              name="name"
              label="Full Name"
              rules={[{ required: true, message: "Please enter your full name" }]}
            >
              <Input prefix={<UserOutlined />} placeholder="John Doe" />
            </Form.Item>

            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: "Please enter your email" },
                { type: "email", message: "Invalid email address" },
              ]}
            >
              <Input prefix={<MailOutlined />} placeholder="email@example.com" />
            </Form.Item>

            <Form.Item name="phone" label="Phone Number">
              <Input prefix={<PhoneOutlined />} placeholder="0900000000" />
            </Form.Item>

            <Form.Item name="address" label="Address">
              <Input prefix={<HomeOutlined />} placeholder="Default shipping address" />
            </Form.Item>
          </div>

          <div className="mt-2 border-t border-stone-100 pt-5">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-stone-500">Change Password</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Form.Item
                name="currentPassword"
                label="Current Password"
                dependencies={["newPassword"]}
                rules={[
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!getFieldValue("newPassword") || value) return Promise.resolve();
                      return Promise.reject(new Error("Please enter your current password"));
                    },
                  }),
                ]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="Enter current password to change" />
              </Form.Item>

              <Form.Item
                name="newPassword"
                label="New Password"
                rules={[{ min: 6, message: "Password must be at least 6 characters" }]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="Leave blank if not changing" />
              </Form.Item>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="primary" htmlType="submit" loading={submitting} disabled={submitting} className="font-bold">
              Save Changes
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
};

export default ProfilePage;
