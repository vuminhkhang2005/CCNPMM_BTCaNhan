import axios from "axios";

const instance = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
});

instance.interceptors.request.use(
  (config) => {
    config.headers.Authorization = `Bearer ${localStorage.getItem("access_token")}`;
    return config;
  },
  (error) => Promise.reject(error),
);

instance.interceptors.response.use(
  (response) => {
    if (response?.data) return response.data;
    return response;
  },
  (error) => {
    if (error?.response?.data) return error.response.data;
    return Promise.reject(error);
  },
);

export default instance;
