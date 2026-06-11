import axios from "axios";
import { clearAccessToken, getAccessToken, setAccessToken } from "./authToken";

const baseURL = import.meta.env.VITE_BACKEND_URL || "";

const instance = axios.create({
  baseURL,
  withCredentials: true,
});

let refreshPromise = null;

const refreshAccessToken = async () => {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${baseURL}/v1/api/refresh-token`, {}, { withCredentials: true })
      .then((response) => {
        const nextToken = response?.data?.access_token;
        if (!nextToken) {
          throw new Error("Missing refreshed access token");
        }
        setAccessToken(nextToken);
        return nextToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

instance.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

instance.interceptors.response.use(
  (response) => {
    if (response?.data) return response.data;
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const status = error?.response?.status;
    const requestUrl = originalRequest?.url || "";
    const canRefresh = status === 401
      && originalRequest
      && !originalRequest._retry
      && !requestUrl.includes("/login")
      && !requestUrl.includes("/refresh-token")
      && !requestUrl.includes("/logout");

    if (canRefresh) {
      originalRequest._retry = true;
      try {
        const token = await refreshAccessToken();
        originalRequest.headers = {
          ...(originalRequest.headers || {}),
          Authorization: `Bearer ${token}`,
        };
        return instance(originalRequest);
      } catch {
        clearAccessToken();
      }
    }

    if (error?.response?.data) return error.response.data;
    return Promise.reject(error);
  },
);

export default instance;
