import { Button, Col, Divider, Form, Input, notification, Row } from "antd";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { resetPasswordApi } from "../util/api";

const ResetPasswordPage = () => {
  const navigate = useNavigate();

  const onFinish = async ({ email, resetToken, newPassword }) => {
    const res = await resetPasswordApi(email, resetToken, newPassword);
    if (res?.EC === 0) {
      notification.success({ message: "Reset Password", description: res.EM || "Password reset successfully. Please login again." });
      navigate("/login");
    } else {
      notification.error({ message: "Reset Password", description: res?.EM || "Could not reset password." });
    }
  };

  return (
    <Row justify="center" style={{ marginTop: 30 }}>
      <Col xs={24} md={16} lg={8}>
        <fieldset style={{ padding: 15, margin: 5, border: "1px solid #ccc", borderRadius: 5 }}>
          <legend>Reset Password</legend>
          <Form name="reset_password" onFinish={onFinish} autoComplete="off" layout="vertical">
            <Form.Item label="Email" name="email" rules={[{ required: true, message: "Please input your email!" }, { type: "email", message: "Please enter a valid email address." }]}> 
              <Input />
            </Form.Item>
            <Form.Item label="Reset Code" name="resetToken" rules={[{ required: true, message: "Please input the reset code from your email!" }]}> 
              <Input />
            </Form.Item>
            <Form.Item label="New Password" name="newPassword" rules={[{ required: true, message: "Please input your new password!" }]}> 
              <Input.Password />
            </Form.Item>
            <Form.Item label="Confirm New Password" name="confirmNewPassword" dependencies={["newPassword"]} hasFeedback rules={[
              { required: true, message: "Please confirm your new password!" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("newPassword") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("The two passwords do not match!"));
                },
              }),
            ]}>
              <Input.Password />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit">Reset Password</Button>
            </Form.Item>
          </Form>
          <Link to="/login"><ArrowLeftOutlined /> Back to login</Link>
          <Divider />
          <div style={{ textAlign: "center" }}>
            Want to request a new reset code? <Link to="/forgot-password">Forgot Password</Link>
          </div>
        </fieldset>
      </Col>
    </Row>
  );
};

export default ResetPasswordPage;
