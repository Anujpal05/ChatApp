import { create } from "zustand";
import { axiosInstance } from "../../utils/axios";

const useChatStore = create((set, get) => ({
  selectedUser: null,
  messages: [],
  isLoadingMessages: false,
  setSelectedUser(user) {
    set((state) => {
      const currentUserId = state.selectedUser?._id
        ? String(state.selectedUser._id)
        : null;

      const nextUserId = user?._id ? String(user._id) : null;

      // Same contact: update contact information
      // without clearing the conversation.
      if (currentUserId === nextUserId) {
        return {
          selectedUser: user,
        };
      }

      // Different contact: clear previous conversation.
      return {
        selectedUser: user,
        messages: [],
      };
    });
  },
  async getMessages() {
    const peer = get().selectedUser;
    if (!peer?._id) return;
    set({ isLoadingMessages: true });
    try {
      const { data } = await axiosInstance.get(
        `/message/get-messages/${peer._id}`,
      );
      // Ciphertext records are metadata only; decrypted Signal envelopes arrive via the E2EE SDK.
      set({ messages: data.messages || [] });
    } finally {
      set({ isLoadingMessages: false });
    }
  },
  addMessage(message) {
    set((state) =>
      state.messages.some(
        (item) => item.clientMessageId === message.clientMessageId,
      )
        ? state
        : { messages: [...state.messages, message] },
    );
  },
  updateMessageStatus(clientMessageIds, status, timestamps = {}) {
    const ids = new Set(
      Array.isArray(clientMessageIds) ? clientMessageIds : [clientMessageIds],
    );

    const statusRank = {
      sending: 0,
      sent: 1,
      delivered: 2,
      read: 3,
      failed: -1,
    };

    set((state) => ({
      messages: state.messages.map((message) => {
        if (!ids.has(message.clientMessageId)) return message;

        const currentRank = statusRank[message.status] ?? 0;
        const nextRank = statusRank[status] ?? 0;

        if (message.status === "failed" || nextRank < currentRank) {
          return message;
        }

        return {
          ...message,
          status,
          ...timestamps,
        };
      }),
    }));
  },
  setMessages(messages) {
    set({ messages });
  },
  replaceMessages(messages) {
    set({ messages });
  },
  clearMessages() {
    set({ messages: [] });
  },
}));

export default useChatStore;
