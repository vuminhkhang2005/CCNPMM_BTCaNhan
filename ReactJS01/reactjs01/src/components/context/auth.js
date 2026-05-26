import { createContext } from "react";

export const AuthContext = createContext({
  auth: {
    isAuthenticated: false,
    user: { email: "", name: "", role: "" },
  },
  setAuth: () => {},
  appLoading: true,
  setAppLoading: () => {},
});
