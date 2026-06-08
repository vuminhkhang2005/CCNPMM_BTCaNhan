import { createContext } from "react";

export const AuthContext = createContext({
  auth: {
    isAuthenticated: false,
    user: { email: "", name: "", role: "", phone: "", address: "", isActive: true },
  },
  setAuth: () => {},
  appLoading: true,
  setAppLoading: () => {},
});
