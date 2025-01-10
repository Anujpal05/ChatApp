import { create } from "zustand";
import { persist } from "zustand/middleware";
import { axiosInstance } from "../../utils/axios";

const useChatStore = create(
  persist((set, get) => ({
    selectedUser: null,
    messages: [],
    setSelectedUser: (selectedUser) => set({ selectedUser: selectedUser }),
    sendMessage: async (message) => {
      try {
        const res = await axiosInstance.post(
          `/message/send-message/${get().selectedUser._id}`,
          { text: message }
        );

        console.log(res);
      } catch (error) {
        console.log(error);
      }
    },
    getMessages: async () => {
      try {
        const {
          data: { allMessages },
        } = await axiosInstance.get(
          `/message/get-messages/${get().selectedUser._id}`
        );
        set({ messages: allMessages });
      } catch (error) {
        console.log(error);
      }
    },
    setMessages: async (message) => {
      set((state) => ({ ...state, message: message }));
    },
    clearMessages: async () => {
      set({ messages: [] });
    },
  }))
);

export default useChatStore;
