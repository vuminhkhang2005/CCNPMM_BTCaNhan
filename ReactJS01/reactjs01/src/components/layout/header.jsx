import { useContext } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { HomeOutlined, LoginOutlined, LogoutOutlined, UserOutlined, UsergroupAddOutlined, ShoppingCartOutlined, HistoryOutlined, DashboardOutlined } from "@ant-design/icons";
import { AuthContext } from "../context/auth";
import { CartContext } from "../context/cart.context";
import { Badge } from "antd";

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { auth, setAuth } = useContext(AuthContext);
  const { cartCount } = useContext(CartContext);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    setAuth({ isAuthenticated: false, user: { email: "", name: "", role: "" } });
    navigate("/");
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-emerald-700 text-base font-bold text-white">RG</span>
          <span>
            <span className="block text-lg font-semibold leading-5 text-stone-950">RunGear Store</span>
            <span className="block text-xs font-medium text-stone-500">Premium running shoes</span>
          </span>
        </Link>

        <nav className="flex flex-wrap items-center gap-2 text-sm font-medium">
          <Link to="/" className={`inline-flex items-center gap-2 rounded-md px-3 py-2 ${isActive("/") ? "bg-emerald-50 text-emerald-800" : "text-stone-600 hover:bg-stone-100"}`}>
            <HomeOutlined /> Home
          </Link>
          {auth.isAuthenticated && (
            <>
              <Link to="/user" className={`inline-flex items-center gap-2 rounded-md px-3 py-2 ${isActive("/user") ? "bg-emerald-50 text-emerald-800" : "text-stone-600 hover:bg-stone-100"}`}>
                <UsergroupAddOutlined /> Users
              </Link>
              <Link to="/orders" className={`inline-flex items-center gap-2 rounded-md px-3 py-2 ${isActive("/orders") ? "bg-emerald-50 text-emerald-800" : "text-stone-600 hover:bg-stone-100"}`}>
                <HistoryOutlined /> Lịch sử
              </Link>
              {auth.user.role === "ADMIN" && (
                <Link to="/admin/orders" className={`inline-flex items-center gap-2 rounded-md px-3 py-2 ${isActive("/admin/orders") ? "bg-emerald-50 text-emerald-800" : "text-stone-600 hover:bg-stone-100"}`}>
                  <DashboardOutlined /> Quản lý đơn
                </Link>
              )}
            </>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {auth.isAuthenticated && (
            <Link to="/cart" className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-stone-600 hover:bg-stone-100 ${isActive("/cart") ? "bg-emerald-50 text-emerald-800" : ""}`}>
              <Badge count={cartCount} size="small" offset={[5, -5]} color="#047857">
                <ShoppingCartOutlined className="text-lg" />
              </Badge>
              <span className="hidden sm:inline font-semibold">Giỏ hàng</span>
            </Link>
          )}

          {auth.isAuthenticated ? (
            <>
              <div className="hidden min-w-0 text-right sm:block">
                <p className="truncate text-sm font-semibold text-stone-900">{auth.user.name || auth.user.email}</p>
                <p className="truncate text-xs text-stone-500">{auth.user.role || "USER"}</p>
              </div>
              <button type="button" onClick={handleLogout} className="inline-flex items-center gap-2 rounded-md bg-stone-900 px-3 py-2 text-sm font-semibold text-white hover:bg-stone-700">
                <LogoutOutlined /> Logout
              </button>
            </>
          ) : (
            <Link to="/login" className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
              <LoginOutlined /> Login
            </Link>
          )}
          <span className="grid h-9 w-9 place-items-center rounded-md border border-stone-200 bg-stone-50 text-stone-500">
            <UserOutlined />
          </span>
        </div>
      </div>
    </header>
  );
};

export default Header;

