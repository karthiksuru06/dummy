import axios from "axios";

const base = process.env.REACT_APP_API_BASE;
if (!base) {
  console.error('REACT_APP_API_BASE environment variable is not set.');
}
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
    // On ANY 401, the session is no longer valid: clear all auth keys and send
    // the user back to login. Guard against multiple simultaneous redirects so
    // a burst of failing requests doesn't trigger a redirect loop.
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("userRole");

      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default API;
