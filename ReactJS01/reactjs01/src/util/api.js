import axios from "./axios.customize";

const createUserApi = (name, email, password) => axios.post("/v1/api/register", { name, email, password });
const loginApi = (email, password) => axios.post("/v1/api/login", { email, password });
const logoutApi = () => axios.post("/v1/api/logout");
const getUserApi = () => axios.get("/v1/api/user");
const getAdminUsersApi = () => axios.get("/v1/api/admin/users");
const createManagedUserApi = (payload) => axios.post("/v1/api/admin/users", payload);
const updateManagedUserApi = (id, payload) => axios.put(`/v1/api/admin/users/${id}`, payload);
const deactivateUserApi = (id) => axios.patch(`/v1/api/admin/users/${id}/deactivate`);
const activateUserApi = (id) => axios.patch(`/v1/api/admin/users/${id}/activate`);
const getAccountApi = () => axios.get("/v1/api/account");
const updateProfileApi = (payload) => axios.patch("/v1/api/profile", payload);
const forgotPasswordApi = (email) => axios.post("/v1/api/forgot-password", { email });
const resetPasswordApi = (email, resetToken, newPassword) => axios.post("/v1/api/reset-password", { email, resetToken, newPassword });
const getProductsApi = (params = {}) => axios.get("/v1/api/products", { params });
const getProductsByCategoryApi = (params = {}) => axios.get("/v1/api/products/by-category", { params });
const getProductRankingApi = (params = {}) => axios.get("/v1/api/products/ranking", { params });
const getProductDetailApi = (slug) => axios.get(`/v1/api/products/${slug}`);
const getProductReviewsApi = (slug) => axios.get(`/v1/api/products/${slug}/reviews`);
const createProductReviewApi = (slug, payload) => axios.post(`/v1/api/products/${slug}/reviews`, payload);
const toggleFavoriteApi = (slug, payload = {}) => axios.post(`/v1/api/products/${slug}/favorite`, payload);
const getFavoritesApi = () => axios.get("/v1/api/favorites");
const getViewedProductsApi = () => axios.get("/v1/api/viewed-products");
const getCouponsApi = () => axios.get("/v1/api/coupons");
const validateCouponApi = (payload) => axios.post("/v1/api/coupons/validate", payload);
const getWalletApi = () => axios.get("/v1/api/wallet");

// Cart API operations
const getCartApi = () => axios.get("/v1/api/cart");
const addToCartApi = (item) => axios.post("/v1/api/cart/add", item);
const updateCartItemApi = (item) => axios.put("/v1/api/cart/item", item);
const removeFromCartApi = (item) => axios.delete("/v1/api/cart/item", { data: item });
const clearCartApi = () => axios.delete("/v1/api/cart");

// Order API operations
const createOrderApi = (order) => axios.post("/v1/api/orders", order);
const getOrdersApi = (params = {}) => axios.get("/v1/api/orders", { params });
const getAdminOrdersApi = () => axios.get("/v1/api/admin/orders");
const getOrderByIdApi = (id) => axios.get(`/v1/api/orders/${id}`);
const cancelOrderApi = (id, reason) => axios.post(`/v1/api/orders/${id}/cancel`, { reason });
const requestReturnOrderApi = (id, reason) => axios.post(`/v1/api/orders/${id}/return`, { reason });
const receiveOrderApi = (id) => axios.post(`/v1/api/orders/${id}/receive`);
const updateOrderStatusApi = (id, payload) => axios.put(`/v1/api/orders/${id}/status`, payload);

export {
  createUserApi,
  loginApi,
  logoutApi,
  getUserApi,
  getAdminUsersApi,
  createManagedUserApi,
  updateManagedUserApi,
  deactivateUserApi,
  activateUserApi,
  getAccountApi,
  updateProfileApi,
  getProductsApi,
  getProductsByCategoryApi,
  getProductRankingApi,
  getProductDetailApi,
  getProductReviewsApi,
  createProductReviewApi,
  toggleFavoriteApi,
  getFavoritesApi,
  getViewedProductsApi,
  getCouponsApi,
  validateCouponApi,
  getWalletApi,
  getCartApi,
  addToCartApi,
  updateCartItemApi,
  removeFromCartApi,
  clearCartApi,
  createOrderApi,
  getOrdersApi,
  getAdminOrdersApi,
  getOrderByIdApi,
  cancelOrderApi,
  requestReturnOrderApi,
  receiveOrderApi,
  updateOrderStatusApi,
  forgotPasswordApi,
  resetPasswordApi,
};

