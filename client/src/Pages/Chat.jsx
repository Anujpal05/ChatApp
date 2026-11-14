import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { axiosInstance } from "../../utils/axios";
import useAuthStore from "../store/authStore";
import useChatStore from "../store/chatStore";
import useCallStore from "../store/callStore";
import {
  getSignalClient,
  sendSignalMessage,
  setDecryptedMessageHandler,
} from "../services/signalClient";
import CallExperience from "../Components/CallExperience";

const initials = (name = "?") => name.slice(0, 1).toUpperCase();
const formatTime = (date) =>
  new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

function Avatar({ user, size = "" }) {
  return (
    <div className={`avatar ${size}`}>
      {user?.avatar ? (
        <img src={user.avatar} alt="" />
      ) : (
        initials(user?.userName)
      )}
    </div>
  );
}

function Sidebar({
  users,
  stories,
  calls,
  onStory,
  tab,
  setTab,
  query,
  setQuery,
}) {
  const { authUser, onlineUsers, logOut } = useAuthStore();
  const { selectedUser, setSelectedUser } = useChatStore();
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <a className="brand" href="/app">
          <span className="brand-mark">q</span> quicktalk
        </a>
        <span className="brand-status">
          <i /> PRIVATE SPACE
        </span>
      </div>
      <div className="profile-mini">
        <Avatar user={authUser} />
        <div className="profile-mini-copy">
          <b>{authUser?.userName}</b>
          <span>Personal workspace</span>
        </div>
        <button
          className="icon-button"
          title="Sign out"
          onClick={async () => {
            await logOut();
            window.location.href = "/";
          }}
        >
          ↗
        </button>
      </div>
      <div className="sidebar-tabs">
        <button
          className={tab === "chats" ? "active" : ""}
          onClick={() => setTab("chats")}
        >
          Messages
        </button>
        <button
          className={tab === "stories" ? "active" : ""}
          onClick={() => setTab("stories")}
        >
          Stories <span className="tab-count">{stories.length || ""}</span>
        </button>
        <button
          className={tab === "calls" ? "active" : ""}
          onClick={() => setTab("calls")}
        >
          Calls
        </button>
      </div>
      <div className="sidebar-search">
        <span>⌕</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            tab === "chats"
              ? "Search people…"
              : tab === "stories"
                ? "Find a story…"
                : "Search call history…"
          }
        />
        <kbd>⌘ K</kbd>
        <button
          className="refresh-contacts"
          title="Refresh people"
          onClick={() => window.location.reload()}
        >
          ↻
        </button>
      </div>
      {tab === "stories" ? (
        <div className="people-list">
          <button className="story-create" onClick={onStory}>
            <span>＋</span>
            <div>
              <b>Add to your story</b>
              <small>Share a moment for 24 hours</small>
            </div>
          </button>
          {stories.map((story) => (
            <button
              className="person-row"
              key={story._id}
              onClick={() =>
                window.open(story.mediaUrl, "_blank", "noopener,noreferrer")
              }
            >
              <span className="story-ring">
                <Avatar user={story.userId} />
              </span>
              <div className="person-copy">
                <b>{story.userId?.userName}</b>
                <small>{story.caption || "New story"}</small>
              </div>
            </button>
          ))}
        </div>
      ) : tab === "calls" ? null : (
        <div className="people-list">
          <div className="list-label">
            YOUR PEOPLE <span>{users.length}</span>
          </div>
          {users
            .filter((user) =>
              user.userName.toLowerCase().includes(query.toLowerCase()),
            )
            .map((user) => (
              <button
                key={user._id}
                className={`person-row ${selectedUser?._id === user._id ? "selected" : ""}`}
                onClick={() => setSelectedUser(user)}
              >
                <span className="avatar-wrap">
                  <Avatar user={user} />
                  <i
                    className={onlineUsers.includes(user._id) ? "online" : ""}
                  />
                </span>
                <div className="person-copy">
                  <b>{user.userName}</b>
                  <small>
                    {onlineUsers.includes(user._id)
                      ? "Active now"
                      : user.statusText || "Offline"}
                  </small>
                </div>
                <span className="person-time">
                  {onlineUsers.includes(user._id) ? "●" : ""}
                </span>
              </button>
            ))}
          {!users.length && (
            <div className="empty-side">
              <span>✳</span>
              <b>Your circle starts here</b>
              <small>Invite someone to start a conversation.</small>
            </div>
          )}
        </div>
      )}
      {tab === "calls" && (
        <div className="people-list">
          <div className="list-label">
            RECENT CALLS <span>{calls.length}</span>
          </div>
          {calls.map((call) => {
            const other =
              String(call.callerId?._id) === String(authUser?._id)
                ? call.receiverId
                : call.callerId;
            return (
              <div className="person-row" key={call._id}>
                <Avatar user={other} />
                <div className="person-copy">
                  <b>{other?.userName || "QuickTalk contact"}</b>
                  <small>
                    {call.kind} · {call.status || "completed"}
                  </small>
                </div>
                <span className="person-time">
                  {formatTime(call.createdAt)}
                </span>
              </div>
            );
          })}
          {!calls.length && (
            <div className="empty-side">
              <span>☎</span>
              <b>No calls yet</b>
              <small>Your recent calls will appear here.</small>
            </div>
          )}
        </div>
      )}
      <div className="sidebar-bottom">
        <button onClick={() => toast("Profile settings are coming soon.")}>
          ⚙ <span>Settings</span>
        </button>
        <span className="version">QUICKTALK 2.0 · BETA</span>
      </div>
    </aside>
  );
}

function AICompanion({ open, onClose }) {
  const [action, setAction] = useState("rewrite");
  const [text, setText] = useState("");
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);
  async function run() {
    if (!text.trim()) return;
    setBusy(true);
    setResult("");
    try {
      const { data } = await axiosInstance.post("/ai/assistant", {
        action,
        text,
      });
      setResult(data.result);
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "AI assistant is unavailable.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (!open) return null;
  return (
    <div className="ai-backdrop" onClick={onClose}>
      <aside className="ai-panel" onClick={(e) => e.stopPropagation()}>
        <div className="ai-head">
          <div className="ai-icon">✦</div>
          <div>
            <b>QuickTalk AI</b>
            <small>Your thoughtful sidekick</small>
          </div>
          <button className="icon-button" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="ai-note">
          <b>Privacy reminder</b>
          <p>
            Only text you enter here is sent to AI. Hybrid mode tries your
            hosted provider first, then a local model; choose local-only mode
            for text you do not want sent to a hosted provider.
          </p>
        </div>
        <label className="ai-label">WHAT WOULD YOU LIKE HELP WITH?</label>
        <div className="ai-actions">
          {[
            ["rewrite", "✧ Rewrite"],
            ["reply", "↗ Smart replies"],
            ["summarize", "≋ Summarize"],
            ["translate", "文 Translate"],
            ["tone", "◉ Tone check"],
          ].map(([id, label]) => (
            <button
              key={id}
              className={action === id ? "active" : ""}
              onClick={() => setAction(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste or write text you want help with…"
        />
        <button
          className="primary-button ai-run"
          onClick={run}
          disabled={busy || !text.trim()}
        >
          {busy ? "Thinking…" : "Generate with AI"} <span>✦</span>
        </button>
        {result && (
          <div className="ai-result">
            <div className="ai-result-head">
              SUGGESTION{" "}
              <button
                onClick={() => {
                  navigator.clipboard.writeText(result);
                  toast.success("Copied");
                }}
              >
                Copy
              </button>
            </div>
            <p>{result}</p>
          </div>
        )}
        <div className="ai-disclaimer">
          AI can make mistakes. Review suggestions before sending.
        </div>
      </aside>
    </div>
  );
}

function StoriesModal({ onClose, onCreated }) {
  const [mediaUrl, setMediaUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [mediaType, setMediaType] = useState("image");
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await axiosInstance.post("/stories", { mediaUrl, caption, mediaType });
      toast.success("Story shared for 24 hours.");
      onCreated();
      onClose();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to share story.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form
        className="modal-card"
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-title">
          <div>
            <span className="eyebrow">A MOMENT TO SHARE</span>
            <h3>Create a story</h3>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            ×
          </button>
        </div>
        <label>
          Media URL
          <input
            type="url"
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            placeholder="https://…"
            required
          />
        </label>
        <label>
          Media type
          <select
            value={mediaType}
            onChange={(e) => setMediaType(e.target.value)}
          >
            <option value="image">Image</option>
            <option value="video">Video</option>
          </select>
        </label>
        <label>
          Caption
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={240}
            placeholder="Add a thought…"
          />
        </label>
        <p className="modal-hint">
          Stories are currently visible to signed-in users and expire after 24
          hours. Upload media to your storage first.
        </p>
        <button className="primary-button" disabled={busy}>
          {busy ? "Sharing…" : "Share story"} ↗
        </button>
      </form>
    </div>
  );
}

function Conversation({ signalStatus }) {
  const { authUser, socket, onlineUsers } = useAuthStore();
  const { selectedUser, messages, addMessage } = useChatStore();
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const [sending, setSending] = useState(false);
  const [call, setCall] = useState(null);
  const [aiOpen, setAiOpen] = useState(false);
  const bottomRef = useRef(null);
  const typingTimer = useRef(null);
  const peerOnline = selectedUser && onlineUsers.includes(selectedUser._id);

  useEffect(() => {
    if (!selectedUser) return;
    socket?.emit("conversation:join", { peerId: selectedUser._id });
    const handleTyping = ({ userId, isTyping }) => {
      if (userId === selectedUser._id) setTyping(isTyping);
    };
    socket?.on("typing:update", handleTyping);
    return () => {
      socket?.off("typing:update", handleTyping);
    };
  }, [selectedUser?._id, socket]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const value = draft.trim();
    if (!value || !selectedUser || sending) return;
    setSending(true);
    try {
      // The selected contact may have been loaded before they registered E2EE.
      // Refresh their Signal identity once before attempting encryption.
      let recipient = selectedUser;
      if (!recipient.signalUserId) {
        const { data } = await axiosInstance.get("/user/get-all-users");
        recipient = (data.users || []).find(
          (user) => String(user._id) === String(selectedUser._id),
        ) || recipient;
        if (recipient.signalUserId) {
          useChatStore.getState().setSelectedUser(recipient);
        }
      }
      if (!recipient.signalUserId) {
        throw new Error(
          "This contact has not registered an E2EE device yet. Ask them to sign in to QuickTalk and open the chat page, then refresh your contacts."
        );
      }
      const result = await sendSignalMessage(recipient.signalUserId, value);
      const message = {
        clientMessageId: result?.messageId || crypto.randomUUID(),
        content: value,
        senderId: authUser._id,
        createdAt: new Date(),
        protocol: "signal",
        status: "sent",
      };
      addMessage(message);
      setDraft("");
      socket?.emit("typing:stop", { peerId: selectedUser._id });
    } catch (error) {
      toast.error(
        error?.message ||
          "Signal encryption is not configured. See the setup guide.",
      );
    } finally {
      setSending(false);
    }
  }

  function changeDraft(value) {
    setDraft(value);
    if (!selectedUser || !socket) return;
    socket.emit("typing:start", { peerId: selectedUser._id });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(
      () => socket.emit("typing:stop", { peerId: selectedUser._id }),
      1200,
    );
  }

  useEffect(() => {
    setDecryptedMessageHandler((envelope) => {
      if (envelope.senderId === selectedUser?.signalUserId) {
        addMessage({
          ...envelope,
          clientMessageId: `${envelope.senderId}-${new Date(envelope.createdAt).getTime()}`,
          content: envelope.content,
        });
      }
    });
    return () => setDecryptedMessageHandler(null);
  }, [selectedUser?._id]);

  async function startCall(kind) {
    if (!peerOnline) return toast.error("This person is offline right now.");
    setCall({ kind, incoming: false });
  }

  if (!selectedUser)
    return (
      <div className="welcome-screen">
        <div className="welcome-art">
          <span>q</span>
          <i>✦</i>
        </div>
        <h2>Make room for a good conversation.</h2>
        <p>Choose someone from your circle and pick up where you left off.</p>
        <div className="welcome-tags">
          <span>Private by design</span>
          <span>Real-time connection</span>
          <span>AI when you need it</span>
        </div>
      </div>
    );

  return (
    <>
      <section className="conversation">
        <header className="conversation-header">
          <div className="conversation-person">
            <button
              className="back-mobile"
              onClick={() => useChatStore.getState().setSelectedUser(null)}
            >
              ←
            </button>
            <Avatar user={selectedUser} />
            <div>
              <b>{selectedUser.userName}</b>
              <small className={peerOnline ? "online-text" : ""}>
                {typing ? "typing…" : peerOnline ? "Active now" : "Away"}
              </small>
            </div>
          </div>
          <div className="header-actions">
            <button
              className="call-action"
              onClick={() => startCall("audio")}
              title="Audio call"
            >
              ☎
            </button>
            <button
              className="call-action"
              onClick={() => startCall("video")}
              title="Video call"
            >
              ▣
            </button>
            <button className="ai-action" onClick={() => setAiOpen(true)}>
              ✦ <span>AI assist</span>
            </button>
            <button
              className="icon-button"
              title="More options"
              onClick={() => toast("Conversation details coming soon.")}
            >
              •••
            </button>
          </div>
        </header>
        <div className="encryption-banner">
          <span>◈</span>{" "}
          {signalStatus === "connected"
            ? "Signal Protocol · Encrypted on your device"
            : "E2EE not configured · Sending is disabled"}{" "}
          <i>Learn more</i>
        </div>
        <div className="message-scroll">
          <div className="conversation-start">
            <span>Today</span>
            <p>
              Messages in this conversation are designed to stay between you
              two.
            </p>
          </div>
          {messages.map((message, index) => {
            const mine = String(message.senderId) === String(authUser?._id);
            const body = message.content ?? message.text;
            if (!body) return null;
            return (
              <div
                key={message.clientMessageId || message._id || index}
                className={`message-row ${mine ? "mine" : "theirs"}`}
              >
                {!mine && <Avatar user={selectedUser} size="tiny" />}
                <div className="message-content">
                  <div className="message-bubble">{body}</div>
                  <div className="message-meta">
                    {formatTime(message.createdAt || Date.now())}
                    {mine && <span className="read-check">✓✓</span>}
                  </div>
                </div>
              </div>
            );
          })}
          {typing && (
            <div className="typing-indicator">
              <span />
              <span />
              <span />
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        <div className="composer-wrap">
          <div className="composer-tools">
            <span>
              ◈{" "}
              {signalStatus === "connected"
                ? "Signal encryption active"
                : "Configure Signal Relay to send messages"}
            </span>
            <button onClick={() => setAiOpen(true)}>✦ Improve with AI</button>
          </div>
          <div className="composer">
            <button
              className="composer-plus"
              onClick={() =>
                toast(
                  "Encrypted attachments are part of the next media integration step.",
                )
              }
            >
              ＋
            </button>
            <textarea
              value={draft}
              onChange={(e) => changeDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Write a message…"
              rows={1}
            />
            <button
              className="send-button"
              onClick={send}
              disabled={!draft.trim() || sending}
            >
              {sending ? "…" : "↑"}
            </button>
          </div>
          <div className="composer-foot">
            Enter to send <span>·</span> Shift + Enter for a new line
          </div>
        </div>
      </section>
      <AICompanion open={aiOpen} onClose={() => setAiOpen(false)} />
      {call && (
        <CallExperience
          peer={selectedUser}
          kind={call.kind}
          onClose={() => setCall(null)}
        />
      )}
    </>
  );
}

export default function Chat() {
  const { authUser, socket, onlineUsers } = useAuthStore();
  const selectedUser = useChatStore((state) => state.selectedUser);
  const setSelectedUser = useChatStore((state) => state.setSelectedUser);
  const { callHistory, getAllCall } = useCallStore();
  const [users, setUsers] = useState([]);
  const [stories, setStories] = useState([]);
  const [tab, setTab] = useState("chats");
  const [query, setQuery] = useState("");
  const [storyModal, setStoryModal] = useState(false);
  const [signalStatus, setSignalStatus] = useState("checking");
  const [incomingCall, setIncomingCall] = useState(null);
  const [globalAiOpen, setGlobalAiOpen] = useState(false);

  async function loadData() {
    try {
      const [usersResponse, storiesResponse] = await Promise.all([
        axiosInstance.get("/user/get-all-users"),
        axiosInstance.get("/stories"),
      ]);
      const refreshedUsers = usersResponse.data.users || [];
      setUsers(refreshedUsers);
      // Keep the open conversation in sync with the latest contact identity.
      const currentPeer = useChatStore.getState().selectedUser;
      if (currentPeer) {
        const refreshedPeer = refreshedUsers.find(
          (user) => String(user._id) === String(currentPeer._id),
        );
        if (refreshedPeer) setSelectedUser(refreshedPeer);
      }
      setStories(storiesResponse.data.stories || []);
      if (authUser?._id) await getAllCall(authUser._id).catch(() => {});
    } catch {
      toast.error("Unable to load your workspace.");
    }
  }

  useEffect(() => {
    loadData();
  }, []);
  useEffect(() => {
    if (!socket) return;
    const invite = (payload) => setIncomingCall(payload);
    socket.on("call:invite", invite);
    return () => socket.off("call:invite", invite);
  }, [socket]);
 

useEffect(() => {
  let active = true;

  console.log("[E2EE] Initialization started");

  getSignalClient()
    .then(async (signal) => {
      console.log("[E2EE] Signal client created");
      console.log("[E2EE] Signal user ID:", signal.userId);

      if (!active) return;

      setSignalStatus("connected");

      try {
        const response = await axiosInstance.put("/user/signal-identity", {
          signalUserId: signal.userId,
        });

        console.log("[E2EE] Identity saved:", response.status);

        await loadData();
      } catch (error) {
        console.error("[E2EE] Identity save failed:", error);
      }
    })
    .catch((error) => {
      console.error("[E2EE] Initialization failed:", error);

      if (active) {
        setSignalStatus("not-configured");
      }
    });

  return () => {
    active = false;
  };
}, []);


  return (
    <main className={`app-shell ${selectedUser ? "has-selection" : ""}`}>
      <Sidebar
        users={users}
        stories={stories}
        calls={callHistory}
        onStory={() => setStoryModal(true)}
        tab={tab}
        setTab={setTab}
        query={query}
        setQuery={setQuery}
      />
      <Conversation signalStatus={signalStatus} />
      <aside className="right-rail">
        <div className="rail-top">
          <span className="eyebrow">YOUR SPACE</span>
          <div className="rail-status">
            <i /> {onlineUsers.length} people online
          </div>
        </div>
        <div className="rail-card security-card">
          <div className="rail-card-icon">◈</div>
          <b>Privacy, by design.</b>
          <p>
            {signalStatus === "connected"
              ? "Signal Protocol encrypts message content between registered devices."
              : "Connect a Signal Protocol Relay before sending encrypted messages."}
          </p>
          <span className={`security-status ${signalStatus}`}>
            {signalStatus === "connected"
              ? "● E2EE connected"
              : "○ E2EE setup required"}
          </span>
        </div>
        <div className="rail-card ai-rail-card">
          <div className="ai-icon">✦</div>
          <b>Need a little help?</b>
          <p>
            Polish a message, find the right tone, or turn a wall of text into
            key points.
          </p>
          <button onClick={() => setGlobalAiOpen(true)}>
            Open AI assistant ↗
          </button>
        </div>
        <div className="rail-tip">
          <span>✧ A QUICK TIP</span>
          <p>
            Use the AI assistant for text you choose to share. Your encrypted
            messages are not automatically sent to AI.
          </p>
        </div>
        <div className="rail-footer">QUICKTALK · BUILT FOR PEOPLE</div>
      </aside>
      <AICompanion open={globalAiOpen} onClose={() => setGlobalAiOpen(false)} />
      {incomingCall && !incomingCall.accepted && (
        <div className="incoming-call">
          <div className="incoming-card">
            <div className="incoming-icon">☎</div>
            <b>
              Incoming {incomingCall.kind === "video" ? "video" : "audio"} call
            </b>
            <p>Someone is calling you.</p>
            <div>
              <button
                onClick={() => {
                  socket?.emit("call:reject", {
                    peerId: incomingCall.peerId,
                    callId: incomingCall.callId,
                  });
                  setIncomingCall(null);
                }}
              >
                Decline
              </button>
              <button
                onClick={() => {
                  setIncomingCall({ ...incomingCall, accepted: true });
                }}
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}
      {incomingCall?.accepted && (
        <CallExperience
          peer={
            users.find((u) => u._id === incomingCall.peerId) || {
              _id: incomingCall.peerId,
              userName: "Contact",
            }
          }
          kind={incomingCall.kind}
          incoming={incomingCall}
          onClose={() => setIncomingCall(null)}
        />
      )}
      {storyModal && (
        <StoriesModal
          onClose={() => setStoryModal(false)}
          onCreated={loadData}
        />
      )}
    </main>
  );
}
