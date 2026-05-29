import { Button, Col, Divider, Form, Input, notification, Row } from "antd";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { forgotPasswordApi } from "../util/api";

const ForgotPasswordPage = () => {
  const navigate = useNavigate();

  const onFinish = async ({ email }) => {
    const res = await forgotPasswordApi(email);
    if (res?.EC === 0) {
      notification.success({ message: "Forgot Password", description: res.EM || "The reset code has been sent. Please check your email." });
      navigate("/reset-password");
    } else {
      notification.error({ message: "Forgot Password", description: res?.EM || "Could not send reset code." });
    }
  };

  return (
    <Row justify="center" style={{ marginTop: 30 }}>
      <Col xs={24} md={16} lg={8}>
        <fieldset style={{ padding: 15, margin: 5, border: "1px solid #ccc", borderRadius: 5 }}>
          <legend>Forgot Password</legend>
          <Form name="forgot_password" onFinish={onFinish} autoComplete="off" layout="vertical">
            <Form.Item label="Email" name="email" rules={[{ required: true, message: "Please input your email!" }, { type: "email", message: "Please enter a valid email address." }]}> 
              <Input />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit">Send Reset Code</Button>
            </Form.Item>
          </Form>
          <Link to="/login"><ArrowLeftOutlined /> Back to login</Link>
          <Divider />
          <div style={{ textAlign: "center" }}>
            Remembered your password? <Link to="/login">Login here</Link>
          </div>
        </fieldset>
      </Col>
    </Row>
  );
};

export default ForgotPasswordPage;
