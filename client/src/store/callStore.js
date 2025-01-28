import { create } from "zustand";
import { axiosInstance } from "../../utils/axios";

const useCallStore = create((set, get) => ({
  callHistory: [],
  selectedCall: null,
  addNewCall: async (payload) => {
    try {
      await axiosInstance.post("/call/add-new-call", payload);
    } catch (error) {
      console.log(error);
    }
  },
  setSelectedCall: (callInfo) => {
    set({ selectedCall: callInfo });
  },
  getAllCall: async (userId) => {
    try {
      const {
        data: { callingHistory },
      } = await axiosInstance.get(`/call/get-all-call/${userId}`);
      set({ callHistory: callingHistory });
    } catch (error) {
      console.log(error);
    }
  },
  clearCallHistory: () => {
    set({ callHistory: [] });
  },
}));

export default useCallStore;
