import React, { useState } from 'react';
import { Button, Col, Divider, Form, Input, notification, Row, Spin, Alert } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeftOutlined } from '@ant-design/icons';
import axios from '../util/axios.customize';

const ForgotPasswordPage = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);

    const onFinish = async (values) => {
        const { email } = values;
        setLoading(true);

        try {
            const res = await axios.post('/v1/api/forgot-password', { email });

            if (res && res.EC === 0) {
                setEmailSent(true);
                
                notification.success({
                    message: "QUÊN MẬT KHẨU",
                    description: "Mã đặt lại mật khẩu đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.",
                    duration: 0
                });

                // Lưu email vào localStorage để dùng trên trang reset password
                localStorage.setItem("reset_email", email);

                setTimeout(() => {
                    navigate("/reset-password");
                }, 3000);
            } else {
                notification.error({
                    message: "QUÊN MẬT KHẨU",
                    description: res?.EM || "Lỗi không xác định"
                })
            }
        } catch (error) {
            notification.error({
                message: "QUÊN MẬT KHẨU",
                description: error?.EM || error?.message || "Lỗi không xác định"
            })
        } finally {
            setLoading(false);
        }
    };

    return (
        <Row justify={"center"} style={{ marginTop: "30px" }}>
            <Col xs={24} md={16} lg={8}>
                <fieldset style={{
                    padding: "15px",
                    margin: "5px",
                    border: "1px solid #ccc",
                    borderRadius: "5px"
                }}>
                    <legend>Quên Mật Khẩu</legend>
                    
                    {emailSent && (
                        <Alert
                            message="Email đã được gửi"
                            description="Vui lòng kiểm tra hộp thư của bạn để nhận mã đặt lại mật khẩu."
                            type="success"
                            closable
                            style={{ marginBottom: "20px" }}
                        />
                    )}

                    <Form
                        name="basic"
                        onFinish={onFinish}
                        autoComplete="off"
                        layout='vertical'
                    >
                        <Form.Item
                            label="Email"
                            name="email"
                            rules={[
                                {
                                    required: true,
                                    message: 'Vui lòng nhập email!',
                                },
                                {
                                    type: 'email',
                                    message: 'Email không hợp lệ!',
                                }
                            ]}
                        >
                            <Input />
                        </Form.Item>

                        <Form.Item>
                            <Button type="primary" htmlType="submit" loading={loading}>
                                Gửi Mã Reset
                            </Button>
                        </Form.Item>
                    </Form>

                    {emailSent && (
                        <div style={{ 
                            backgroundColor: "#e6f7ff", 
                            padding: "10px", 
                            borderRadius: "4px",
                            marginBottom: "15px",
                            border: "1px solid #91d5ff"
                        }}>
                            <strong>Hướng dẫn:</strong>
                            <ul style={{ marginBottom: 0, marginTop: "5px" }}>
                                <li>Kiểm tra email để nhận mã reset</li>
                                <li>Đi đến trang "Đặt lại mật khẩu"</li>
                                <li>Nhập mã và mật khẩu mới</li>
                            </ul>
                        </div>
                    )}

                    <Link to={"/"}><ArrowLeftOutlined /> Quay lại trang chủ</Link>
                    <Divider />
                    <div style={{ textAlign: "center" }}>
                        <Link to={"/login"}>Quay lại đăng nhập</Link>
                    </div>
                </fieldset>
            </Col>
        </Row>
    )
}

export default ForgotPasswordPage;