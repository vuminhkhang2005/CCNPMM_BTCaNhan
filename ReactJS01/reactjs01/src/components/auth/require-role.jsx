import { useContext } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Alert, Spin } from "antd";
import { AuthContext } from "../context/auth";

const RequireRole = ({ allowedRoles = [], children }) => {
  const { auth, appLoading } = useContext(AuthContext);
  const location = useLocation();

  if (appLoading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Spin />
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!allowedRoles.includes(auth.user.role)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <Alert
          message="Access Denied"
          description="The current account does not have the necessary role to access the administration area."
          type="error"
          showIcon
        />
      </div>
    );
  }

  return children;
};

export default RequireRole;
