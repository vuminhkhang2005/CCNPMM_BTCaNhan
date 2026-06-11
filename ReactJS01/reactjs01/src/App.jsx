import { useContext, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Spin } from "antd";
import Header from "./components/layout/header";
import { AuthContext } from "./components/context/auth";
import { getAccountApi } from "./util/api";
import { clearAccessToken, clearLegacyStoredAccessToken } from "./util/authToken";

function App() {
  const { setAuth, appLoading, setAppLoading } = useContext(AuthContext);

  useEffect(() => {
    const fetchAccount = async () => {
      clearLegacyStoredAccessToken();
      setAppLoading(true);
      try {
        const res = await getAccountApi();
        if (res && !res.message && res.EC !== 1 && res.EC !== 2) {
          const user = res.user || res;
          setAuth({
            isAuthenticated: true,
            user: {
              email: user.email,
              name: user.name,
              role: user.role,
              phone: user.phone || "",
              address: user.address || "",
              isActive: user.isActive !== false,
            },
          });
        } else if (res?.EC === 2) {
          clearAccessToken();
        }
      } finally {
        setAppLoading(false);
      }
    };

    fetchAccount();
  }, [setAppLoading, setAuth]);

  if (appLoading) {
    return (
      <div className="fixed inset-0 grid place-items-center bg-stone-50">
        <Spin />
      </div>
    );
  }

  return (
    <>
      <Header />
      <main>
        <Outlet />
      </main>
    </>
  );
}

export default App;
