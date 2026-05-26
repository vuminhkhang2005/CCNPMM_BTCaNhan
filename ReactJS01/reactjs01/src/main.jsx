import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App.jsx";
import "./styles/global.css";
import HomePage from "./pages/home.jsx";
import LoginPage from "./pages/login.jsx";
import RegisterPage from "./pages/register.jsx";
import UserPage from "./pages/user.jsx";
import ProductDetailPage from "./pages/product-detail.jsx";
import { AuthWrapper } from "./components/context/auth.context.jsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "user", element: <UserPage /> },
      { path: "products/:slug", element: <ProductDetailPage /> },
    ],
  },
  { path: "login", element: <LoginPage /> },
  { path: "register", element: <RegisterPage /> },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthWrapper>
      <RouterProvider router={router} />
    </AuthWrapper>
  </React.StrictMode>,
);
