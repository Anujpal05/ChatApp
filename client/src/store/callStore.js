import { useRef } from "react";
import { create } from "zustand";

const useCallStore = create((set, get) => ({
  peerConnection: null,
  setupWebRTC: () => {
    const configuration = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" }, // Public Google STUN server
      ],
    };

    const pc = useRef(new RTCPeerConnection(configuration));
    set({ peerConnection: pc });
  },
}));
export default useCallStore;
