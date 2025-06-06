import { create } from "zustand";
import { persist } from "zustand/middleware";
import { axiosInstance } from "../../utils/axios";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import useChatStore from "./chatStore";

const useAuthStore = create(
  persist(
    (set, get) => ({
      isLogin: false,
      authUser: null,
      onlineUsers: [],
      socket: null,
      login: async (userData) => {
        try {
          const { data } = await axiosInstance.post("/user/register", userData);
          toast.dismiss();
          toast.success(data.message);
          set({ isLogin: true, authUser: data.userId });
          get().connectSocket();
        } catch (error) {
          console.log(error);
          toast.dismiss();
          toast.error(error?.response?.data?.message || "Something is wrong!");
        }
      },

      logOut: async () => {
        try {
          set({ isLogin: false });
          set({ authUser: null });
          const { data } = await axiosInstance.post("/user/logout");
          useChatStore.getState().setSelectedUser(null);
          get().disconnectSocket();
          toast.dismiss();
          toast.success(data.message);
          return true;
        } catch (error) {
          toast.dismiss();
          toast.error(error?.response?.data?.message || "Something is wrong!");
          return false;
        }
      },

      connectSocket: () => {
        if (!get().authUser || get().socket?.connected) return;

        const socket = io(`${import.meta.env.VITE_SERVER_URL}`, {
          query: { userId: get().authUser },
        });
        socket.connect();

        set({ socket: socket });

        socket.off("getOnlineUsers");
        socket.on("getOnlineUsers", (userIds) => {
          set({ onlineUsers: userIds });
        });
      },
      disconnectSocket: () => {
        const { socket } = get();
        if (socket && socket.connected) {
          socket.off();
          socket.disconnect();
        }

        set({ socket: null });
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
