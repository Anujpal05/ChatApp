import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import useAuthStore from "../store/authStore";
import { axiosInstance } from "../../utils/axios";

const makeId = () => crypto.randomUUID();

export default function CallExperience({ peer, kind, onClose, incoming = null }) {
  const { socket, authUser } = useAuthStore();
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const remoteAudio = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingCandidates = useRef([]);
  const [status, setStatus] = useState(incoming ? "connecting" : "calling");
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [quality, setQuality] = useState("checking");
  const [facingMode, setFacingMode] = useState("user");
  const callId = useRef(incoming?.callId || makeId());
  const peerId = peer?._id;
  const isIncoming = Boolean(incoming);

  useEffect(() => {
    if (status !== "connected") return;
    const timer = setInterval(() => setElapsed(value => value + 1), 1000);
    return () => clearInterval(timer);
  }, [status]);

  useEffect(() => {
    if (status !== "connected" || !pcRef.current) return;
    const timer = setInterval(async () => {
      try {
        const stats = await pcRef.current?.getStats();
        const pair = [...(stats?.values?.() || [])].find(item => item.type === "candidate-pair" && item.state === "succeeded" && (item.selected || item.nominated));
        const rtt = pair?.currentRoundTripTime;
        setQuality(typeof rtt !== "number" ? "connected" : rtt < 0.15 ? "good" : rtt < 0.35 ? "fair" : "poor");
      } catch { setQuality("unknown"); }
    }, 2500);
    return () => clearInterval(timer);
  }, [status]);
  useEffect(() => {
    if (status !== "calling") return;
    const timeout = setTimeout(() => {
      toast.error("No answer. The call has ended.");
      finish(true);
    }, 35_000);
    return () => clearTimeout(timeout);
  }, [status]);

  useEffect(() => {
    let disposed = false;
    const configuration = {
      iceServers: [
        { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
        ...(import.meta.env.VITE_TURN_URL ? [{
          urls: import.meta.env.VITE_TURN_URL.split(",").map(v => v.trim()),
          username: import.meta.env.VITE_TURN_USERNAME,
          credential: import.meta.env.VITE_TURN_CREDENTIAL,
        }] : []),
      ],
      bundlePolicy: "max-bundle",
      rtcpMuxPolicy: "require",
    };

    const emit = (event, payload) => new Promise((resolve, reject) => {
      if (!socket) return reject(new Error("Realtime connection is unavailable."));
      socket.emit(event, payload, result => {
        if (result?.ok === false) reject(new Error(result.error || "Call signaling failed."));
        else resolve(result || { ok: true });
      });
    });

    async function setup() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera and microphone require HTTPS or localhost.");
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: kind === "video" ? { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30, max: 30 } } : false,
        });
        if (disposed) { stream.getTracks().forEach(track => track.stop()); return; }
        localStreamRef.current = stream;
        if (localVideo.current) localVideo.current.srcObject = stream;

        const pc = new RTCPeerConnection(configuration);
        pcRef.current = pc;
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
        pc.ontrack = event => {
          if (remoteVideo.current) {
            remoteVideo.current.srcObject = event.streams[0];
            remoteVideo.current.play().catch(() => {});
          }
          if (kind === "audio" && remoteAudio.current) {
            remoteAudio.current.srcObject = event.streams[0];
            remoteAudio.current.play().catch(() => {});
          }
          setStatus("connected");
        };
        pc.onicecandidate = event => {
          if (event.candidate) emit("webrtc:ice-candidate", { peerId, callId: callId.current, candidate: event.candidate });
        };
        pc.onconnectionstatechange = () => {
          if (["failed", "disconnected"].includes(pc.connectionState)) setStatus(pc.connectionState);
          if (pc.connectionState === "connected") setStatus("connected");
        };
        pc.oniceconnectionstatechange = () => {
          if (pc.iceConnectionState === "failed") setStatus("reconnecting");
        };

        const flushCandidates = async () => {
          while (pendingCandidates.current.length) {
            const candidate = pendingCandidates.current.shift();
            try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch (error) { console.warn("ICE candidate rejected", error.message); }
          }
        };

        const handleOffer = async payload => {
          if (payload.callId !== callId.current || payload.peerId !== peerId) return;
          await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
          await flushCandidates();
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await emit("webrtc:answer", { peerId, callId: callId.current, answer });
          setStatus("connecting");
        };
        const handleAnswer = async payload => {
          if (payload.callId !== callId.current || payload.peerId !== peerId) return;
          await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
          await flushCandidates();
          setStatus("connecting");
        };
        const handleCandidate = async payload => {
          if (payload.callId !== callId.current || payload.peerId !== peerId) return;
          if (!pc.remoteDescription) pendingCandidates.current.push(payload.candidate);
          else {
            try { await pc.addIceCandidate(new RTCIceCandidate(payload.candidate)); }
            catch (error) { console.warn("ICE candidate rejected", error.message); }
          }
        };
        const handleAccepted = async payload => {
          if (payload.callId !== callId.current || payload.peerId !== peerId || isIncoming) return;
          const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: kind === "video" });
          await pc.setLocalDescription(offer);
          await emit("webrtc:offer", { peerId, callId: callId.current, offer });
          setStatus("connecting");
        };
        const handleHangup = payload => {
          if (payload.callId === callId.current && payload.peerId === peerId) finish(false);
        };
        socket?.on("webrtc:offer", handleOffer);
        socket?.on("webrtc:answer", handleAnswer);
        socket?.on("webrtc:ice-candidate", handleCandidate);
        socket?.on("call:accept", handleAccepted);
        socket?.on("call:hangup", handleHangup);
        socket?.on("call:reject", handleHangup);

        if (!isIncoming) {
          const historyPayload = {
            callerId: authUser?._id,
            receiverId: peerId,
            kind: kind === "audio" ? "Audio" : "Video",
            status: "accepted",
          };
          // Register before the invite to avoid missing a very fast acceptance.
          socket?.once("call:accept", async accepted => {
            if (accepted.callId === callId.current) {
              try { await axiosInstance.post("/call/add-new-call", historyPayload); } catch {}
            }
          });
          await emit("call:invite", { peerId, callId: callId.current, kind });
        } else {
          await emit("call:accept", { peerId, callId: callId.current, kind });
        }

        return () => {
          socket?.off("webrtc:offer", handleOffer);
          socket?.off("webrtc:answer", handleAnswer);
          socket?.off("webrtc:ice-candidate", handleCandidate);
          socket?.off("call:accept", handleAccepted);
          socket?.off("call:hangup", handleHangup);
          socket?.off("call:reject", handleHangup);
        };
      } catch (error) {
        toast.error(error?.message || "Unable to start the call. Check camera and microphone permissions.");
        finish(false);
      }
    }

    let cleanup;
    setup().then(fn => { cleanup = fn; });
    return () => {
      disposed = true;
      cleanup?.();
      localStreamRef.current?.getTracks().forEach(track => track.stop());
      pcRef.current?.getSenders().forEach(sender => sender.track?.stop());
      pcRef.current?.close();
      pcRef.current = null;
    };
  }, [socket, peerId, kind, isIncoming]);

  function finish(notify = true) {
    if (notify) socket?.emit("call:hangup", { peerId, callId: callId.current });
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    pcRef.current?.close();
    setStatus("ended");
    onClose();
  }

  async function switchCamera() {
    if (kind !== "video") return;
    try {
      const nextMode = facingMode === "user" ? "environment" : "user";
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { exact: nextMode }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      const nextTrack = stream.getVideoTracks()[0];
      const sender = pcRef.current?.getSenders().find(item => item.track?.kind === "video");
      if (!sender || !nextTrack) throw new Error("Camera switch is unavailable.");
      await sender.replaceTrack(nextTrack);
      const oldTrack = localStreamRef.current?.getVideoTracks()[0];
      if (oldTrack) { localStreamRef.current.removeTrack(oldTrack); oldTrack.stop(); }
      localStreamRef.current?.addTrack(nextTrack);
      if (localVideo.current) localVideo.current.srcObject = localStreamRef.current;
      setFacingMode(nextMode);
    } catch {
      toast.error("Unable to switch camera on this device.");
    }
  }

  function toggleMute() {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; setMuted(!track.enabled); }
  }
  function toggleCamera() {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; setCameraOff(!track.enabled); }
  }
  async function toggleShare() {
    try {
      if (!sharing) {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const track = stream.getVideoTracks()[0];
        const sender = pcRef.current?.getSenders().find(item => item.track?.kind === "video");
        if (sender) await sender.replaceTrack(track);
        track.onended = async () => {
          const camera = localStreamRef.current?.getVideoTracks()[0];
          const activeSender = pcRef.current?.getSenders().find(item => item.track?.kind === "video");
          if (activeSender && camera) await activeSender.replaceTrack(camera);
          setSharing(false);
        };
        setSharing(true);
      } else {
        const camera = localStreamRef.current?.getVideoTracks()[0];
        const sender = pcRef.current?.getSenders().find(item => item.track?.kind === "video");
        if (sender && camera) await sender.replaceTrack(camera);
        setSharing(false);
      }
    } catch { toast.error("Screen sharing was cancelled or unavailable."); }
  }

  const time = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;

  return <div className="call-overlay"><section className="call-stage">
    <div className="call-stage-top"><div><span className="call-live-dot" /> {status === "connected" ? `${time} · ${quality} connection` : status === "calling" ? "Calling…" : status === "connecting" ? "Connecting securely…" : status}</div><span>{kind === "video" ? "VIDEO CALL" : "VOICE CALL"}</span></div>
    <div className="remote-stage">{kind === "video" ? <video ref={remoteVideo} autoPlay playsInline /> : <div className="voice-avatar">{peer?.userName?.slice(0, 1).toUpperCase()}</div>}
      <div className="remote-name"><b>{peer?.userName}</b><small>{status === "connected" ? "Connected" : "Waiting for connection"}</small></div>
    </div>
    {kind === "video" && <video ref={localVideo} autoPlay muted playsInline className="local-stage" />}
    {kind === "audio" && <video ref={localVideo} autoPlay muted playsInline className="audio-local" />}
    {kind === "audio" && <audio ref={remoteAudio} autoPlay className="audio-remote" />}
    <div className="call-controls"><button className={muted ? "control-on" : ""} onClick={toggleMute}>{muted ? "Mic off" : "Mic"}</button>{kind === "video" && <button className={cameraOff ? "control-on" : ""} onClick={toggleCamera}>{cameraOff ? "Camera off" : "Camera"}</button>}{kind === "video" && <button onClick={switchCamera}>Switch camera</button>}{kind === "video" && <button className={sharing ? "control-on" : ""} onClick={toggleShare}>{sharing ? "Stop share" : "Share screen"}</button>}<button className="hangup" onClick={() => finish(true)}>End call</button></div>
    {!import.meta.env.VITE_TURN_URL && <div className="turn-warning">TURN server not configured · Some networks may not connect.</div>}
  </section></div>;
}
