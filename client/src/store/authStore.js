import { create } from "zustand";
import { persist } from "zustand/middleware";
import { axiosInstance } from "../../utils/axios";
import { io } from "socket.io-client";
import toast from "react-hot-toast";

const useAuthStore = create(
  persist(
    (set, get) => ({
      isLogin: false,
      authUser: 789,
      onlineUsers: [],
      socket: null,
      login: async (userData) => {
        try {
          const { data } = await axiosInstance.post("/user/register", userData);
          toast.success(data.message);
          set({ isLogin: true, authUser: data.userId });
          get().connectSocket();
        } catch (error) {
          console.log(error);
          toast.error(error?.response?.data?.message || "Something is wrong!");
        }
      },

      logOut: async () => {
        try {
          const { data } = await axiosInstance.post("/user/logout");
          set({ isLogin: false });
          set({ authUser: null });
          get().disconnectSocket();
          toast.success(data.message);
        } catch (error) {
          toast.error(error?.response?.data?.message || "Something is wrong!");
        }
      },

      connectSocket: () => {
        if (!get().authUser || get().socket?.connected) return;

        const socket = io("http://localhost:5000", {
          query: { userId: get().authUser },
        });
        socket.connect();

        set({ socket: socket });

        socket.on("getOnlineUsers", (userIds) => {
          set({ onlineUsers: userIds });
        });
      },
      disconnectSocket: () => {
        const { socket } = get();
        if (socket && socket.connected) {
          socket.disconnect();
        }
      },
    }),
    {
      name: "auth-store",
      partialize: (state) => ({
        isLogin: state.isLogin,
        authUser: state.authUser,
        onlineUsers: state.onlineUsers,
      }),
    }
  )
);

export default useAuthStore;
