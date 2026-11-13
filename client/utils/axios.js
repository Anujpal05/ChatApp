import axios from "axios";

export const axiosInstance = axios.create({
  baseURL: `${import.meta.env.VITE_SERVER_URL || "http://localhost:5001"}/api`,
  withCredentials: true,
  timeout: 15000,
});
