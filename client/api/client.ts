import axios, { AxiosInstance, AxiosError } from "axios";

// API Base URL from specification: http://localhost:8081/api/v1
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8081/api/v1";

const API_KEY_STORAGE_KEY = "arbitrage_bot_api_key";

/**
 * Get API key from localStorage
 */
function getApiKey(): string {
  if (typeof window !== "undefined") {
    return localStorage.getItem(API_KEY_STORAGE_KEY) || "";
  }
  return "";
}

const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add X-API-Key header for mutation requests
axiosInstance.interceptors.request.use((config) => {
  // Add API key for POST, PUT, DELETE requests
  if (["POST", "PUT", "DELETE"].includes(config.method?.toUpperCase() || "")) {
    const apiKey = getApiKey();
    if (apiKey) {
      config.headers["X-API-Key"] = apiKey;
    }
  }
  return config;
});

// Error handling interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    console.error("API Error:", error.response?.data || error.message);
    return Promise.reject(error);
  },
);

export default axiosInstance;
