import axios from "./axios.customize";

const createUserApi = (name, email, password) => axios.post("/v1/api/register", { name, email, password });
const loginApi = (email, password) => axios.post("/v1/api/login", { email, password });
const getUserApi = () => axios.get("/v1/api/user");
const getAccountApi = () => axios.get("/v1/api/account");
const getProductsApi = (params = {}) => axios.get("/v1/api/products", { params });
const getProductsByCategoryApi = (params = {}) => axios.get("/v1/api/products/by-category", { params });
const getProductRankingApi = (params = {}) => axios.get("/v1/api/products/ranking", { params });
const getProductDetailApi = (slug) => axios.get(`/v1/api/products/${slug}`);

// Cart API operations
const getCartApi = () => axios.get("/v1/api/cart");
const addToCartApi = (item) => axios.post("/v1/api/cart/add", item);
const updateCartItemApi = (item) => axios.put("/v1/api/cart/item", item);
const removeFromCartApi = (item) => axios.delete("/v1/api/cart/item", { data: item });
const clearCartApi = () => axios.delete("/v1/api/cart");

// Order API operations
const createOrderApi = (order) => axios.post("/v1/api/orders", order);
const getOrdersApi = (params = {}) => axios.get("/v1/api/orders", { params });
const getOrderByIdApi = (id) => axios.get(`/v1/api/orders/${id}`);
const cancelOrderApi = (id, reason) => axios.post(`/v1/api/orders/${id}/cancel`, { reason });
const updateOrderStatusApi = (id, payload) => axios.put(`/v1/api/orders/${id}/status`, payload);

export {
  createUserApi,
  loginApi,
  getUserApi,
  getAccountApi,
  getProductsApi,
  getProductsByCategoryApi,
  getProductRankingApi,
  getProductDetailApi,
  getCartApi,
  addToCartApi,
  updateCartItemApi,
  removeFromCartApi,
  clearCartApi,
  createOrderApi,
  getOrdersApi,
  getOrderByIdApi,
  cancelOrderApi,
  updateOrderStatusApi,
};

