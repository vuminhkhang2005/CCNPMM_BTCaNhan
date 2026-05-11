import React, { useState, useEffect } from 'react';
import { Button, Col, Divider, Form, Input, notification, Row, Alert } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeftOutlined } from '@ant-design/icons';
import axios from '../util/axios.customize';

const ResetPasswordPage = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [form] = Form.useForm();

    useEffect(() => {
        const savedEmail = localStorage.getItem("reset_email");
        const savedToken = localStorage.getItem("reset_token");
        
        if (!savedEmail) {
            notification.warning({
                message: "RESET PASSWORD",
                description: "Vui lòng yêu cầu reset mật khẩu trước"
            });
            navigate("/forgot-password");
        } else {
            setEmail(savedEmail);
            // Auto-fill the reset token if available
            if (savedToken) {
                form.setFieldsValue({ resetToken: savedToken });
            }
        }
    }, [navigate, form]);

    const onFinish = async (values) => {
        const { resetToken, newPassword, confirmPassword } = values;

        if (newPassword !== confirmPassword) {
            notification.error({
                message: "RESET PASSWORD",
                description: "Mật khẩu xác nhận không khớp"
            });
            return;
        }

        setLoading(true);

        try {
            const res = await axios.post('/v1/api/reset-password', {
                email,
                resetToken,
                newPassword
            });

            if (res && res.EC === 0) {
                notification.success({
                    message: "RESET PASSWORD",
                    description: res.EM || "Đặt lại mật khẩu thành công"
                });
                localStorage.removeItem("reset_email");
                localStorage.removeItem("reset_token");
                setTimeout(() => {
                    navigate("/login");
                }, 1500);
            } else {
                notification.error({
                    message: "RESET PASSWORD",
                    description: res?.EM || "Lỗi không xác định"
                })
            }
        } catch (error) {
            notification.error({
                message: "RESET PASSWORD",
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
                    <legend>Đặt Lại Mật Khẩu</legend>
                    
                    <Alert
                        message={`Đặt lại mật khẩu cho: ${email}`}
                        type="info"
                        showIcon
                        style={{ marginBottom: "20px" }}
                    />

                    <Form
                        form={form}
                        name="basic"
                        onFinish={onFinish}
                        autoComplete="off"
                        layout='vertical'
                    >
                        <Form.Item
                            label="Mã Reset (kiểm tra email hoặc console)"
                            name="resetToken"
                            rules={[
                                {
                                    required: true,
                                    message: 'Vui lòng nhập mã reset!',
                                },
                                {
                                    min: 6,
                                    message: 'Mã reset phải ít nhất 6 ký tự!',
                                }
                            ]}
                        >
                            <Input placeholder="Ví dụ: ABC123" />
                        </Form.Item>

                        <Form.Item
                            label="Mật Khẩu Mới"
                            name="newPassword"
                            rules={[
                                {
                                    required: true,
                                    message: 'Vui lòng nhập mật khẩu mới!',
                                },
                                {
                                    min: 6,
                                    message: 'Mật khẩu phải ít nhất 6 ký tự!',
                                }
                            ]}
                        >
                            <Input.Password />
                        </Form.Item>

                        <Form.Item
                            label="Xác Nhận Mật Khẩu"
                            name="confirmPassword"
                            rules={[
                                {
                                    required: true,
                                    message: 'Vui lòng xác nhận mật khẩu!',
                                },
                            ]}
                        >
                            <Input.Password />
                        </Form.Item>

                        <Form.Item>
                            <Button type="primary" htmlType="submit" loading={loading}>
                                Đặt Lại Mật Khẩu
                            </Button>
                        </Form.Item>
                    </Form>
                    <Link to={"/"}><ArrowLeftOutlined /> Quay lại trang chủ</Link>
                    <Divider />
                    <div style={{ textAlign: "center" }}>
                        <Link to={"/login"}>Đến trang đăng nhập</Link>
                    </div>
                </fieldset>
            </Col>
        </Row>
    )
}

export default ResetPasswordPage;