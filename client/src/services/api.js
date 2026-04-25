import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        await axios.post(`${API_URL}/auth/refresh`, null, { withCredentials: true });
        return api(original);
      } catch (_refreshError) {
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);
