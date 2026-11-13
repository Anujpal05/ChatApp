import { create } from "zustand";
import { axiosInstance } from "../../utils/axios";
import { io } from "socket.io-client";
import useChatStore from "./chatStore";
import useCallStore from "./callStore";

const useAuthStore = create((set, get) => ({
  authUser: null,
  isAuthenticated: false,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,
  async checkAuth() {
    try {
      const { data } = await axiosInstance.get("/user/me");
      set({ authUser: data.user, isAuthenticated: true });
      get().connectSocket();
    } catch {
      set({ authUser: null, isAuthenticated: false });
      useChatStore.getState().clearMessages();
      useChatStore.getState().setSelectedUser(null);
      useCallStore.getState().clearCallHistory();
    } finally {
      set({ isCheckingAuth: false });
    }
  },
  async register(payload) {
    const { data } = await axiosInstance.post("/user/register", payload);
    set({ authUser: data.user, isAuthenticated: true });
    get().connectSocket();
    return data;
  },
  async login(payload) {
    const { data } = await axiosInstance.post("/user/login", payload);
    set({ authUser: data.user, isAuthenticated: true });
    get().connectSocket();
    return data;
  },
  async logOut() {
    try { await axiosInstance.post("/user/logout"); } finally {
      get().disconnectSocket();
      set({ authUser: null, isAuthenticated: false, onlineUsers: [] });
    }
  },
  connectSocket() {
    if (!get().authUser || get().socket?.connected) return;
    const socket = io(import.meta.env.VITE_SERVER_URL || "http://localhost:5001", {
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
    });
    socket.on("presence:snapshot", (ids) => set({ onlineUsers: ids }));
    socket.on("connect_error", (error) => {
      if (error.message === "unauthorized") set({ isAuthenticated: false, authUser: null });
    });
    set({ socket });
  },
  disconnectSocket() {
    const socket = get().socket;
    if (socket) { socket.removeAllListeners(); socket.disconnect(); }
    set({ socket: null, onlineUsers: [] });
  },
}));

export default useAuthStore;
