import axios from "axios";

const base = process.env.REACT_APP_API_BASE || "http://localhost:5000";
const API = axios.create({
  baseURL: `${base}/api`,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401)) {
      const data = error.response.data;
      if (data?.tokenExpired || data?.message?.includes('expired')) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default API;
