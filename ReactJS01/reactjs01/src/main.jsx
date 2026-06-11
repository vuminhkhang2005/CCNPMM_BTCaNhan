import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App.jsx";
import "./styles/global.css";
import HomePage from "./pages/home.jsx";
import LoginPage from "./pages/login.jsx";
import RegisterPage from "./pages/register.jsx";
import UserPage from "./pages/user.jsx";
import ProfilePage from "./pages/profile.jsx";
import ProductDetailPage from "./pages/product-detail.jsx";
import CartPage from "./pages/cart.jsx";
import CheckoutPage from "./pages/checkout.jsx";
import OrdersPage from "./pages/orders.jsx";
import OrderDetailPage from "./pages/order-detail.jsx";
import AdminOrdersPage from "./pages/admin-orders.jsx";
import ForgotPasswordPage from "./pages/forgot-password.jsx";
import ResetPasswordPage from "./pages/reset-password.jsx";
import { AuthWrapper } from "./components/context/auth.context.jsx";
import { CartWrapper } from "./components/context/cart.context.jsx";
import RequireRole from "./components/auth/require-role.jsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      {
        path: "user",
        element: (
          <RequireRole allowedRoles={["ADMIN"]}>
            <UserPage />
          </RequireRole>
        ),
      },
      {
        path: "profile",
        element: (
          <RequireRole allowedRoles={["ADMIN", "USER"]}>
            <ProfilePage />
          </RequireRole>
        ),
      },
      { path: "products/:slug", element: <ProductDetailPage /> },
      { path: "cart", element: <CartPage /> },
      { path: "checkout", element: <CheckoutPage /> },
      { path: "orders", element: <OrdersPage /> },
      { path: "orders/:id", element: <OrderDetailPage /> },
      {
        path: "admin/orders",
        element: (
          <RequireRole allowedRoles={["ADMIN"]}>
            <AdminOrdersPage />
          </RequireRole>
        ),
      },
    ],
  },
  { path: "login", element: <LoginPage /> },
  { path: "register", element: <RegisterPage /> },
  { path: "forgot-password", element: <ForgotPasswordPage /> },
  { path: "reset-password", element: <ResetPasswordPage /> },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthWrapper>
      <CartWrapper>
        <RouterProvider router={router} />
      </CartWrapper>
    </AuthWrapper>
  </React.StrictMode>,
);

