import { create } from "zustand";
import { axiosInstance } from "../../utils/axios";

const useCallStore = create((set) => ({
  callHistory: [],
  selectedCall: null,
  async addNewCall(payload) {
    const { data } = await axiosInstance.post("/call/start", {
      ...payload,
      status: payload.status || "ringing",
    });

    return data.call;
  },
  setSelectedCall(selectedCall) {
    set({ selectedCall });
  },
  async getAllCall(userId) {
    const { data } = await axiosInstance.get(`/call/get-all-call/${userId}`);
    set({ callHistory: data.callingHistory || [] });
  },
  clearCallHistory() {
    set({ callHistory: [] });
  },
}));
export default useCallStore;
