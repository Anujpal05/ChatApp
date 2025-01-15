import { create } from "zustand";
import { persist } from "zustand/middleware";
import { axiosInstance } from "../../utils/axios";
import useAuthStore from "./authStore";

const useChatStore = create(
  persist(
    (set, get) => ({
      selectedUser: null,
      messages: [],
      setSelectedUser: (selectedUser) => set({ selectedUser: selectedUser }),
      sendMessage: async (messageData) => {
        try {
          const { selectedUser } = get();
          const res = await axiosInstance.post(
            `/message/send-message/${selectedUser._id}`,
            messageData
          );

          const msg = {
            senderId: useAuthStore.getState().authUser,
            recieverid: selectedUser._id,
            text: messageData.text,
            image: messageData.image,
          };

          get().getMessages(msg);
        } catch (error) {
          console.log(error);
        }
      },
      getMessages: async () => {
        try {
          if (get().selectedUser) {
            const {
              data: { allMessages },
            } = await axiosInstance.get(
              `/message/get-messages/${get().selectedUser._id}`
            );

            set({ messages: allMessages });
          }
        } catch (error) {
          console.log(error);
        }
      },
      setMessages: async (message) => {
        set((state) => ({ messages: [...state.messages, message] }));
      },
      clearMessages: async () => {
        set({ messages: [] });
      },
      subscribeToMessages: async () => {
        const { selectedUser } = get();
        if (!selectedUser) return;

        const socket = useAuthStore.getState().socket;
        if (!socket) return;

        socket.on("newMessage", (newMessage) => {
          console.log("new Mwsg", newMessage);
          // const isMessageSentFromSelectedUser =
          //   newMessage.senderId === selectedUser._id;
          // if (!isMessageSentFromSelectedUser) return;

          set((state) => ({ messages: [...state.messages, newMessage] }));
        });
      },
      unsubscribeFromMessage: async () => {
        const socket = useAuthStore.getState().socket;
        if (socket) {
          socket.off("newMessage");
        }
      },
    }),
    {
      name: "chat-store",
      partialize: (state) => ({
        selectedUser: state.selectedUser,
      }),
    }
  )
);

export default useChatStore;
