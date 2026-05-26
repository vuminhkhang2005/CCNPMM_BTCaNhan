import { Button, Col, Divider, Form, Input, notification, Row } from "antd";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { createUserApi } from "../util/api";

const RegisterPage = () => {
  const navigate = useNavigate();

  const onFinish = async ({ name, email, password }) => {
    const res = await createUserApi(name, email, password);
    if (res?.EC === 0) {
      notification.success({ message: "CREATE USER", description: res.EM || "Account created successfully" });
      navigate("/login");
    } else {
      notification.error({ message: "CREATE USER", description: res?.EM || "Unknown error" });
    }
  };

  return (
    <Row justify="center" style={{ marginTop: 30 }}>
      <Col xs={24} md={16} lg={8}>
        <fieldset style={{ padding: 15, margin: 5, border: "1px solid #ccc", borderRadius: 5 }}>
          <legend>Create Account</legend>
          <Form name="register" onFinish={onFinish} autoComplete="off" layout="vertical">
            <Form.Item label="Email" name="email" rules={[{ required: true, message: "Please input your email!" }]}>
              <Input />
            </Form.Item>
            <Form.Item label="Password" name="password" rules={[{ required: true, message: "Please input your password!" }]}>
              <Input.Password />
            </Form.Item>
            <Form.Item label="Name" name="name" rules={[{ required: true, message: "Please input your name!" }]}>
              <Input />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit">Submit</Button>
            </Form.Item>
          </Form>
          <Link to="/"><ArrowLeftOutlined /> Back to home</Link>
          <Divider />
          <div style={{ textAlign: "center" }}>Already have an account? <Link to="/login">Login</Link></div>
        </fieldset>
      </Col>
    </Row>
  );
};

export default RegisterPage;
