import axios from "axios";

const api = axios.create({
  baseURL: "https://backend-sistema-seven.vercel.app",
  withCredentials: true,
});

export default api;
