import axios from "./axios.customize";

const createUserApi = (name, email, password) => axios.post("/v1/api/register", { name, email, password });
const loginApi = (email, password) => axios.post("/v1/api/login", { email, password });
const getUserApi = () => axios.get("/v1/api/user");
const getAccountApi = () => axios.get("/v1/api/account");
const getProductsApi = (params = {}) => axios.get("/v1/api/products", { params });
const getProductsByCategoryApi = (params = {}) => axios.get("/v1/api/products/by-category", { params });
const getProductRankingApi = (params = {}) => axios.get("/v1/api/products/ranking", { params });
const getProductDetailApi = (slug) => axios.get(`/v1/api/products/${slug}`);

export {
  createUserApi,
  loginApi,
  getUserApi,
  getAccountApi,
  getProductsApi,
  getProductsByCategoryApi,
  getProductRankingApi,
  getProductDetailApi,
};
