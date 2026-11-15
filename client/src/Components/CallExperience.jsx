import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import useAuthStore from "../store/authStore";
import { axiosInstance } from "../../utils/axios";
import useCallStore from "../store/callStore";

const makeId = () => crypto.randomUUID();

export default function CallExperience({
  peer,
  kind,
  onClose,
  incoming = null,
}) {
  const { socket, authUser } = useAuthStore();
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const remoteAudio = useRef(null);
  const remoteStreamRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const finishingRef = useRef(false);
  const pendingCandidates = useRef([]);
  const [status, setStatus] = useState(incoming ? "connecting" : "calling");
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [quality, setQuality] = useState("checking");
  const [facingMode, setFacingMode] = useState("user");
  // UUID used by Socket.IO and WebRTC.
  const callId = useRef(incoming?.callId || makeId());

  // MongoDB _id used for call-history updates.
  const callHistoryId = useRef(incoming?.historyId || null);

  const callHistoryStarted = useRef(false);
  const callHistoryFinished = useRef(false);
  const peerId = peer?._id;
  const isIncoming = Boolean(incoming);

  useEffect(() => {
    if (status !== "connected") return;
    const timer = setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [status]);

  useEffect(() => {
    if (status !== "connected" || !pcRef.current) return;
    const timer = setInterval(async () => {
      try {
        const stats = await pcRef.current?.getStats();
        const pair = [...(stats?.values?.() || [])].find(
          (item) =>
            item.type === "candidate-pair" &&
            item.state === "succeeded" &&
            (item.selected || item.nominated),
        );
        const rtt = pair?.currentRoundTripTime;
        setQuality(
          typeof rtt !== "number"
            ? "connected"
            : rtt < 0.15
              ? "good"
              : rtt < 0.35
                ? "fair"
                : "poor",
        );
      } catch {
        setQuality("unknown");
      }
    }, 2500);
    return () => clearInterval(timer);
  }, [status]);
  useEffect(() => {
    if (status !== "calling") return;
    const timeout = setTimeout(() => {
      toast.error("No answer. The call has ended.");
      finish(true, "missed");
    }, 35_000);
    return () => clearTimeout(timeout);
  }, [status]);

  useEffect(() => {
    let disposed = false;
    let audioStatsTimer = null;
    let micMonitor = null;
    let audioContext = null;
    let microphoneSource = null;

    const configuration = {
      iceServers: [
        {
          urls: [
            "stun:stun.l.google.com:19302",
            "stun:stun1.l.google.com:19302",
          ],
        },
        ...(import.meta.env.VITE_TURN_URL
          ? [
              {
                urls: import.meta.env.VITE_TURN_URL.split(",").map((v) =>
                  v.trim(),
                ),
                username: import.meta.env.VITE_TURN_USERNAME,
                credential: import.meta.env.VITE_TURN_CREDENTIAL,
              },
            ]
          : []),
      ],
      bundlePolicy: "max-bundle",
      rtcpMuxPolicy: "require",
    };

    const emit = (event, payload) =>
      new Promise((resolve, reject) => {
        if (!socket)
          return reject(new Error("Realtime connection is unavailable."));
        socket.emit(event, payload, (result) => {
          if (result?.ok === false)
            reject(new Error(result.error || "Call signaling failed."));
          else resolve(result || { ok: true });
        });
      });

    async function setup() {
      try {
        if (!navigator.mediaDevices?.getUserMedia)
          throw new Error("Camera and microphone require HTTPS or localhost.");
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video:
            kind === "video"
              ? {
                  facingMode: { ideal: facingMode },
                  width: { ideal: 1280 },
                  height: { ideal: 720 },
                  frameRate: { ideal: 30, max: 30 },
                }
              : false,
        });
        if (disposed) {
          stream.getTracks().forEach((track) => track.stop());
          console.log(
            "Local media tracks:",
            stream.getTracks().map((track) => ({
              kind: track.kind,
              enabled: track.enabled,
              muted: track.muted,
              readyState: track.readyState,
            })),
          );
          return;
        }
        localStreamRef.current = stream;
        const audioTrack = stream.getAudioTracks()[0];

        console.log("LOCAL MICROPHONE:", {
          label: audioTrack?.label,
          enabled: audioTrack?.enabled,
          muted: audioTrack?.muted,
          readyState: audioTrack?.readyState,
          settings: audioTrack?.getSettings(),
        });
        const context = new AudioContext();
        audioContext = context;

        console.log("AudioContext state:", context.state);

        context.onstatechange = () => {
          if (audioContext !== context) return;

          console.log("AudioContext state changed:", context.state);
        };
        microphoneSource = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();

        analyser.fftSize = 2048;
        microphoneSource.connect(analyser);

        const samples = new Uint8Array(analyser.fftSize);

        micMonitor = setInterval(() => {
          analyser.getByteTimeDomainData(samples);

          let sum = 0;

          for (const sample of samples) {
            const normalized = (sample - 128) / 128;
            sum += normalized * normalized;
          }

          const rms = Math.sqrt(sum / samples.length);

          console.log("LOCAL MICROPHONE LEVEL:", rms.toFixed(4));
        }, 2000);

        if (localVideo.current) localVideo.current.srcObject = stream;

        const pc = new RTCPeerConnection(configuration);
        pcRef.current = pc;

        audioStatsTimer = setInterval(async () => {
          const pc = pcRef.current;
          if (!pc) return;

          const stats = await pc.getStats();

          stats.forEach((report) => {
            if (report.type === "inbound-rtp" && report.kind === "audio") {
              console.log("Incoming audio statistics:", {
                bytesReceived: report.bytesReceived,
                packetsReceived: report.packetsReceived,
                audioLevel: report.audioLevel,
              });
            }

            if (report.type === "outbound-rtp" && report.kind === "audio") {
              console.log("Outgoing audio statistics:", {
                bytesSent: report.bytesSent,
                packetsSent: report.packetsSent,
              });
            }
          });
        }, 2000);
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
        pc.ontrack = (event) => {
          console.log("Remote track received:", {
            kind: event.track.kind,
            enabled: event.track.enabled,
            muted: event.track.muted,
            readyState: event.track.readyState,
          });

          const remoteStream =
            event.streams[0] || new MediaStream([event.track]);

          remoteStreamRef.current = remoteStream;

          const mediaElement =
            kind === "video" ? remoteVideo.current : remoteAudio.current;

          if (mediaElement && mediaElement.srcObject !== remoteStream) {
            mediaElement.srcObject = remoteStream;

            mediaElement.muted = false;
            mediaElement.volume = 1;

            mediaElement
              .play()
              .then(() => {
                console.log("Remote playback started:", {
                  kind: event.track.kind,
                  paused: mediaElement.paused,
                  muted: mediaElement.muted,
                  volume: mediaElement.volume,
                  readyState: mediaElement.readyState,
                });
              })
              .catch((error) => {
                console.error("Remote media playback failed:", error);
              });
          }

          event.track.onunmute = () => {
            console.log("Remote track is now unmuted:", event.track.kind);
          };

          setStatus("connected");
        };
        pc.onicecandidate = (event) => {
          if (event.candidate)
            emit("webrtc:ice-candidate", {
              peerId,
              callId: callId.current,
              candidate: event.candidate,
            });
        };
        pc.onconnectionstatechange = () => {
          if (["failed", "disconnected"].includes(pc.connectionState))
            setStatus(pc.connectionState);
          if (pc.connectionState === "connected") setStatus("connected");
        };
        pc.oniceconnectionstatechange = () => {
          if (pc.iceConnectionState === "failed") setStatus("reconnecting");
        };

        const flushCandidates = async () => {
          while (pendingCandidates.current.length) {
            const candidate = pendingCandidates.current.shift();
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (error) {
              console.warn("ICE candidate rejected", error.message);
            }
          }
        };

        const handleOffer = async (payload) => {
          if (payload.callId !== callId.current || payload.peerId !== peerId)
            return;
          await pc.setRemoteDescription(
            new RTCSessionDescription(payload.offer),
          );
          await flushCandidates();
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await emit("webrtc:answer", {
            peerId,
            callId: callId.current,
            answer,
          });
          setStatus("connecting");
        };
        const handleAnswer = async (payload) => {
          if (payload.callId !== callId.current || payload.peerId !== peerId)
            return;
          await pc.setRemoteDescription(
            new RTCSessionDescription(payload.answer),
          );
          await flushCandidates();
          setStatus("connecting");
        };
        const handleCandidate = async (payload) => {
          if (payload.callId !== callId.current || payload.peerId !== peerId)
            return;
          if (!pc.remoteDescription)
            pendingCandidates.current.push(payload.candidate);
          else {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } catch (error) {
              console.warn("ICE candidate rejected", error.message);
            }
          }
        };
        const handleAccepted = async (payload) => {
          if (
            payload.callId !== callId.current ||
            payload.peerId !== peerId ||
            isIncoming
          ) {
            return;
          }

          // The recipient already updated the existing history record.
          // The caller only needs to establish the WebRTC connection.
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: kind === "video",
          });

          await pc.setLocalDescription(offer);

          await emit("webrtc:offer", {
            peerId,
            callId: callId.current,
            offer,
          });

          setStatus("connecting");
        };

        const handleHangup = (payload) => {
          if (payload.callId === callId.current && payload.peerId === peerId) {
            finish(false, "ended");
          }
        };

        const handleReject = (payload) => {
          if (payload.callId === callId.current && payload.peerId === peerId) {
            finish(false, "rejected");
          }
        };
        socket?.on("webrtc:offer", handleOffer);
        socket?.on("webrtc:answer", handleAnswer);
        socket?.on("webrtc:ice-candidate", handleCandidate);
        socket?.on("call:accept", handleAccepted);
        socket?.on("call:hangup", handleHangup);
        socket?.on("call:reject", handleReject);

        if (!isIncoming) {
          // Create the ringing history record.
          const { data } = await axiosInstance.post("/call/start", {
            callerId: authUser._id,
            receiverId: peerId,
            kind: kind === "audio" ? "Audio" : "Video",
            status: "ringing",
          });

          callHistoryId.current = data.call._id;
          callHistoryStarted.current = true;

          // Send both identifiers to the recipient.
          await emit("call:invite", {
            peerId,
            callId: callId.current,
            historyId: callHistoryId.current,
            kind,
          });
        } else {
          // The outgoing caller already created the history record.
          // Reuse its MongoDB ID instead of creating another record.
          if (!callHistoryId.current) {
            throw new Error("Call history identifier is missing.");
          }

          await axiosInstance.patch(`/call/${callHistoryId.current}/finish`, {
            status: "accepted",
          });

          callHistoryStarted.current = true;

          await emit("call:accept", {
            peerId,
            callId: callId.current,
            kind,
          });
        }

        return () => {
          socket?.off("webrtc:offer", handleOffer);
          socket?.off("webrtc:answer", handleAnswer);
          socket?.off("webrtc:ice-candidate", handleCandidate);
          socket?.off("call:accept", handleAccepted);
          socket?.off("call:hangup", handleHangup);
          socket?.off("call:reject", handleReject);
        };
      } catch (error) {
        toast.error(
          error?.message ||
            "Unable to start the call. Check camera and microphone permissions.",
        );
        finish(false);
      }
    }

    let cleanup;
    setup().then((fn) => {
      cleanup = fn;
    });
    return () => {
      disposed = true;

      clearInterval(audioStatsTimer);
      clearInterval(micMonitor);

      if (microphoneSource) {
        try {
          microphoneSource.disconnect();
        } catch (error) {
          console.warn("Unable to disconnect microphone source:", error);
        }

        microphoneSource = null;
      }

      if (audioContext) {
        const contextToClose = audioContext;

        // Prevent callbacks from accessing a context being closed.
        contextToClose.onstatechange = null;

        audioContext = null;

        if (contextToClose.state !== "closed") {
          contextToClose.close().catch((error) => {
            console.warn("Unable to close AudioContext:", error);
          });
        }
      }

      cleanup?.();

      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;

      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }

      remoteStreamRef.current = null;
    };
  }, [socket, peerId, kind, isIncoming]);

  async function finish(notify = true, finalStatus = "ended") {
    // Prevent multiple hangup events from finalizing the same call.
    if (finishingRef.current) return;

    finishingRef.current = true;
    callHistoryFinished.current = true;

    // Notify the other participant.
    if (notify) {
      socket?.emit("call:hangup", {
        peerId,
        callId: callId.current,
      });
    }

    // Stop local media immediately.
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;

    // Close WebRTC immediately.
    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.oniceconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }

    // Release remote media references.
    if (remoteAudio.current) {
      remoteAudio.current.srcObject = null;
    }

    if (remoteVideo.current) {
      remoteVideo.current.srcObject = null;
    }

    remoteStreamRef.current = null;

    setStatus("ended");
    onClose();

    // Save call history independently of UI cleanup.
    if (callHistoryStarted.current && callHistoryId.current) {
      try {
        await axiosInstance.patch(`/call/${callHistoryId.current}/finish`, {
          status: finalStatus,
          durationSeconds: elapsed,
        });

        await useCallStore.getState().getAllCall(authUser._id);
      } catch (error) {
        console.error("Unable to finalize call history:", error);
      }
    }
  }

  async function switchCamera() {
    if (kind !== "video") return;
    try {
      const nextMode = facingMode === "user" ? "environment" : "user";
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { exact: nextMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      const nextTrack = stream.getVideoTracks()[0];
      const sender = pcRef.current
        ?.getSenders()
        .find((item) => item.track?.kind === "video");
      if (!sender || !nextTrack)
        throw new Error("Camera switch is unavailable.");
      await sender.replaceTrack(nextTrack);
      const oldTrack = localStreamRef.current?.getVideoTracks()[0];
      if (oldTrack) {
        localStreamRef.current.removeTrack(oldTrack);
        oldTrack.stop();
      }
      localStreamRef.current?.addTrack(nextTrack);
      if (localVideo.current)
        localVideo.current.srcObject = localStreamRef.current;
      setFacingMode(nextMode);
    } catch {
      toast.error("Unable to switch camera on this device.");
    }
  }

  function toggleMute() {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setMuted(!track.enabled);
    }
  }
  function toggleCamera() {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setCameraOff(!track.enabled);
    }
  }
  async function toggleShare() {
    try {
      if (!sharing) {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        const track = stream.getVideoTracks()[0];
        const sender = pcRef.current
          ?.getSenders()
          .find((item) => item.track?.kind === "video");
        if (sender) await sender.replaceTrack(track);
        track.onended = async () => {
          const camera = localStreamRef.current?.getVideoTracks()[0];
          const activeSender = pcRef.current
            ?.getSenders()
            .find((item) => item.track?.kind === "video");
          if (activeSender && camera) await activeSender.replaceTrack(camera);
          setSharing(false);
        };
        setSharing(true);
      } else {
        const camera = localStreamRef.current?.getVideoTracks()[0];
        const sender = pcRef.current
          ?.getSenders()
          .find((item) => item.track?.kind === "video");
        if (sender && camera) await sender.replaceTrack(camera);
        setSharing(false);
      }
    } catch {
      toast.error("Screen sharing was cancelled or unavailable.");
    }
  }

  const time = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;

  return (
    <div className="call-overlay">
      <section className="call-stage">
        <div className="call-stage-top">
          <div>
            <span className="call-live-dot" />{" "}
            {status === "connected"
              ? `${time} · ${quality} connection`
              : status === "calling"
                ? "Calling…"
                : status === "connecting"
                  ? "Connecting securely…"
                  : status}
          </div>
          <span>{kind === "video" ? "VIDEO CALL" : "VOICE CALL"}</span>
        </div>
        <div className="remote-stage">
          {kind === "video" ? (
            <video ref={remoteVideo} autoPlay playsInline />
          ) : (
            <div className="voice-avatar">
              {peer?.userName?.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="remote-name">
            <b>{peer?.userName}</b>
            <small>
              {status === "connected" ? "Connected" : "Waiting for connection"}
            </small>
          </div>
        </div>
        {kind === "video" && (
          <video
            ref={localVideo}
            autoPlay
            muted
            playsInline
            className="local-stage"
          />
        )}
        {kind === "audio" && (
          <video
            ref={localVideo}
            autoPlay
            muted
            playsInline
            className="audio-local"
          />
        )}
        {kind === "audio" && (
          <audio ref={remoteAudio} autoPlay className="audio-remote" />
        )}
        <div className="call-controls">
          <button className={muted ? "control-on" : ""} onClick={toggleMute}>
            {muted ? "Mic off" : "Mic"}
          </button>
          {kind === "video" && (
            <button
              className={cameraOff ? "control-on" : ""}
              onClick={toggleCamera}
            >
              {cameraOff ? "Camera off" : "Camera"}
            </button>
          )}
          {kind === "video" && (
            <button onClick={switchCamera}>Switch camera</button>
          )}
          {kind === "video" && (
            <button
              className={sharing ? "control-on" : ""}
              onClick={toggleShare}
            >
              {sharing ? "Stop share" : "Share screen"}
            </button>
          )}
          <button className="hangup" onClick={() => finish(true)}>
            End call
          </button>
        </div>
        {!import.meta.env.VITE_TURN_URL && (
          <div className="turn-warning">
            TURN server not configured · Some networks may not connect.
          </div>
        )}
      </section>
    </div>
  );
}
