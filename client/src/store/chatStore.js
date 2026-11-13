import { create } from "zustand";
import { axiosInstance } from "../../utils/axios";

const useChatStore = create((set, get) => ({
  selectedUser: null,
  messages: [],
  isLoadingMessages: false,
  setSelectedUser(user) { set({ selectedUser: user, messages: [] }); },
  async getMessages() {
    const peer = get().selectedUser;
    if (!peer?._id) return;
    set({ isLoadingMessages: true });
    try {
      const { data } = await axiosInstance.get(`/message/get-messages/${peer._id}`);
      // Ciphertext records are metadata only; decrypted Signal envelopes arrive via the E2EE SDK.
      set({ messages: data.messages || [] });
    } finally { set({ isLoadingMessages: false }); }
  },
  addMessage(message) {
    set((state) => state.messages.some((item) => item.clientMessageId === message.clientMessageId)
      ? state : { messages: [...state.messages, message] });
  },
  clearMessages() { set({ messages: [] }); },
}));

export default useChatStore;
