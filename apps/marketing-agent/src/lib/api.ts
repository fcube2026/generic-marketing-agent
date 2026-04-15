import axios from "axios";
import { getApiBaseUrl } from "./apiBaseUrl";

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 15000,
  withCredentials: true, // if you use cookie auth; safe even if you use JWT
});

// Optional: attach token if you store it
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Optional: nicer error message mapping
export function toUserFriendlyApiError(err: any): string {
  // axios network error -> no response
  if (err?.code === "ERR_NETWORK" || !err?.response) {
    return `Unable to reach the server at ${getApiBaseUrl()}. Please check that the API is running and CORS is configured.`;
  }
  const msg = err?.response?.data?.message;
  if (typeof msg === "string") return msg;
  return "Request failed. Please try again.";
}