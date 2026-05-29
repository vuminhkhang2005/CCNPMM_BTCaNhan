import { Button, Divider, Form, Input, notification } from "antd";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeftOutlined, MailOutlined } from "@ant-design/icons";
import { forgotPasswordApi } from "../util/api";
import authBanner from "../assets/auth_banner.png";

const ForgotPasswordPage = () => {
  const navigate = useNavigate();

  const onFinish = async ({ email }) => {
    const res = await forgotPasswordApi(email);
    if (res?.EC === 0) {
      notification.success({ message: "Forgot Password", description: res.EM || "A reset code has been sent. Please check your email." });
      navigate("/reset-password");
    } else {
      notification.error({ message: "Failed to Send Code", description: res?.EM || "Could not send reset code to this email." });
    }
  };

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-2 bg-stone-50 font-sans">
      {/* Left Column: Visual Banner (Desktop only) */}
      <div className="hidden lg:block relative w-full h-full overflow-hidden">
        <img
          src={authBanner}
          alt="RunGear Premium running shoes"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/95 via-stone-900/60 to-transparent flex flex-col justify-between p-12">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-emerald-700 text-base font-bold text-white shadow-md">RG</span>
            <span className="text-lg font-bold text-white tracking-wide">RunGear Store</span>
          </div>
          
          <div className="space-y-4">
            <span className="inline-block rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-300 backdrop-blur-sm">
              Account Recovery
            </span>
            <h1 className="text-4xl font-extrabold text-white leading-tight lg:text-5xl">
              Restore Your <br />Access
            </h1>
            <p className="text-stone-300 max-w-md text-sm leading-relaxed">
              Don't worry, it happens. Provide your registered email and we will help you get back on track with a secure reset process.
            </p>
          </div>
          
          <p className="text-xs text-stone-400">© 2026 RunGear Store. All rights reserved.</p>
        </div>
      </div>

      {/* Right Column: Forgot Password Card */}
      <div className="flex w-full items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md bg-white border border-stone-200/80 rounded-2xl shadow-xl p-8 md:p-10 transition-all duration-300 hover:shadow-2xl">
          {/* Mobile logo display */}
          <div className="flex items-center justify-between mb-8 lg:hidden">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-md bg-emerald-700 text-sm font-bold text-white">RG</span>
              <span className="text-base font-bold text-stone-950">RunGear Store</span>
            </div>
            <Link to="/login" style={{ color: "#047857" }} className="hover:text-emerald-800 hover:underline text-sm flex items-center gap-1 transition-all font-semibold">
              <ArrowLeftOutlined /> Login
            </Link>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-stone-950 tracking-tight">Forgot Password?</h2>
            <p className="text-sm text-stone-500 mt-1">Enter your email address and we will send you a password reset code.</p>
          </div>

          <Form name="forgot_password" onFinish={onFinish} autoComplete="off" layout="vertical" requiredMark={false}>
            <Form.Item
              label={<span className="text-stone-700 font-medium text-sm">Email</span>}
              name="email"
              rules={[
                { required: true, message: "Please enter your email!" },
                { type: "email", message: "Please enter a valid email address!" }
              ]}
            >
              <Input 
                prefix={<MailOutlined className="text-stone-400 mr-1" />}
                placeholder="your.email@example.com"
                size="large"
                className="rounded-lg h-11 border-stone-300 hover:border-emerald-500 focus:border-emerald-500"
              />
            </Form.Item>

            <Form.Item className="mt-8">
              <Button 
                type="primary" 
                htmlType="submit" 
                size="large"
                style={{ backgroundColor: "#047857", borderColor: "#047857" }}
                className="w-full hover:!bg-emerald-800 border-none font-semibold text-white rounded-lg h-11 shadow-sm hover:shadow transition-all duration-200"
              >
                Send Reset Code
              </Button>
            </Form.Item>
          </Form>

          {/* Desktop Back Link */}
          <div className="hidden lg:block mt-2">
            <Link to="/login" className="inline-flex items-center gap-1.5 text-stone-500 hover:text-stone-700 text-sm font-medium transition-colors">
              <ArrowLeftOutlined /> Back to login
            </Link>
          </div>

          <Divider className="my-6 border-stone-100" />

          <div className="text-center text-sm text-stone-600">
            Don't have an account?{" "}
            <Link 
              to="/register" 
              style={{ color: "#047857" }} 
              className="hover:text-emerald-800 hover:underline transition-all font-bold ml-1"
            >
              Register here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
