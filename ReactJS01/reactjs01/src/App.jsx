import { useContext, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Spin } from "antd";
import Header from "./components/layout/header";
import { AuthContext } from "./components/context/auth";
import { getAccountApi } from "./util/api";

function App() {
  const { setAuth, appLoading, setAppLoading } = useContext(AuthContext);

  useEffect(() => {
    const fetchAccount = async () => {
      setAppLoading(true);
      try {
        const res = await getAccountApi();
        if (res && !res.message) {
          setAuth({
            isAuthenticated: true,
            user: {
              email: res.email,
              name: res.name,
              role: res.role,
            },
          });
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
