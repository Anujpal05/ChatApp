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
import {
  saveMessageHistory,
  loadMessageHistory,
  updateMessageHistory,
  deleteMessageForMe,
  deleteMessageForEveryone,
  encryptAndUploadAttachment,
  downloadAndDecryptAttachment,
} from "../services/messageArchive";

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
  onOpenStory,
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
        <button
          className="refresh-contacts"
          title="Refresh people"
          onClick={() => window.location.reload()}
        >
          ↻
        </button>
      </div>
      {tab === "stories" ? (
        <div className="people-list stories-list">
          <button className="story-create" onClick={onStory}>
            <span>＋</span>
            <div>
              <b>Add to your story</b>
              <small>Share a moment for 24 hours</small>
            </div>
          </button>

          {groupStoriesByUser(stories).map((group) => {
            const isMine = String(group.userId) === String(authUser?._id);
            const latestStory = group.stories[group.stories.length - 1];

            return (
              <button
                className="person-row story-person-row"
                key={group.userId}
                onClick={() => onOpenStory(group.userId)}
              >
                <span className="story-ring">
                  <Avatar user={group.user} />
                </span>

                <div className="person-copy">
                  <b>{isMine ? "My status" : group.user?.userName}</b>
                  <small>
                    {isMine
                      ? "Tap to view your story"
                      : latestStory?.caption || "New story"}
                  </small>
                </div>

                <small className="story-count">{group.stories.length}</small>
              </button>
            );
          })}

          {stories.length === 0 && (
            <div className="empty-side">
              <span>◉</span>
              <b>No stories yet</b>
              <small>Share a moment or check back later.</small>
            </div>
          )}
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
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState("");
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }

    const url = URL.createObjectURL(file);
    setPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  function selectFile(e) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const isImage = selected.type.startsWith("image/");
    const isVideo = selected.type.startsWith("video/");

    if (!isImage && !isVideo) {
      toast.error("Select an image or video.");
      e.target.value = "";
      return;
    }

    const maxSize = isImage ? 10 : 50;

    if (selected.size > maxSize * 1024 * 1024) {
      toast.error(
        `Maximum ${isImage ? "image" : "video"} size is ${maxSize} MB.`,
      );
      e.target.value = "";
      return;
    }

    setFile(selected);
  }

  async function submit(e) {
    e.preventDefault();

    if (!file) {
      toast.error("Choose a photo or video first.");
      return;
    }

    const formData = new FormData();
    formData.append("media", file);
    formData.append("caption", caption);

    setBusy(true);

    try {
      await axiosInstance.post("/stories", formData);

      toast.success("Story shared for 24 hours.");
      await onCreated();
      onClose();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to share story.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop story-modal-backdrop" onClick={onClose}>
      <form
        className="modal-card story-upload-modal"
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-title">
          <div>
            <span className="eyebrow">A MOMENT TO SHARE</span>
            <h3>Create a story</h3>
          </div>

          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            disabled={busy}
          >
            ×
          </button>
        </div>

        <label className="story-file-picker">
          <input
            type="file"
            accept="image/*,video/*"
            onChange={selectFile}
            disabled={busy}
          />

          <span>＋</span>
          <b>Choose photo or video</b>
          <small>Images up to 10 MB · Videos up to 50 MB</small>
        </label>

        {preview && (
          <div className="story-upload-preview">
            {file?.type.startsWith("video/") ? (
              <video src={preview} controls />
            ) : (
              <img src={preview} alt="Story preview" />
            )}
          </div>
        )}

        <label>
          Caption
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={240}
            placeholder="Add a thought…"
            disabled={busy}
          />
        </label>

        <div className="story-caption-count">{caption.length}/240</div>

        <button
          className="primary-button"
          type="submit"
          disabled={busy || !file}
        >
          {busy ? "Uploading…" : "Share story"} ↗
        </button>
      </form>
    </div>
  );
}

function StoryViewer({
  stories,
  initialUserId,
  currentUserId,
  onClose,
  onRefresh,
}) {
  const groups = groupStoriesByUser(stories);

  const [groupIndex, setGroupIndex] = useState(() =>
    Math.max(
      0,
      groups.findIndex((group) => group.userId === String(initialUserId)),
    ),
  );

  const [storyIndex, setStoryIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [storyViewers, setStoryViewers] = useState([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [loadingViewers, setLoadingViewers] = useState(false);
  const videoRef = useRef(null);
  const group = groups[groupIndex];
  const story = group?.stories[storyIndex];

  const isMine = String(group?.userId) === String(currentUserId);

  useEffect(() => {
    if (!videoRef.current) return;

    if (paused) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => {});
    }
  }, [paused, story?._id]);

  function nextStory() {
    if (!group) return;

    if (storyIndex < group.stories.length - 1) {
      setStoryIndex((value) => value + 1);
      return;
    }

    if (groupIndex < groups.length - 1) {
      setGroupIndex((value) => value + 1);
      setStoryIndex(0);
      return;
    }

    onClose();
  }

  function previousStory() {
    if (storyIndex > 0) {
      setStoryIndex((value) => value - 1);
      return;
    }

    if (groupIndex > 0) {
      const previousGroup = groups[groupIndex - 1];
      setGroupIndex((value) => value - 1);
      setStoryIndex(previousGroup.stories.length - 1);
    }
  }

  async function refreshViewers() {
    if (!story?._id || !isMine) return;

    try {
      const response = await axiosInstance.get(`/stories/${story._id}/viewers`);

      const viewers = response.data.viewers || [];

      setStoryViewers(viewers);
      setViewerCount(response.data.totalViews ?? viewers.length);

      return viewers;
    } catch (error) {
      console.error("Unable to refresh story viewers:", error);
    }
  }

  useEffect(() => {
    if (!isMine || !story?._id) return;

    refreshViewers();

    const interval = setInterval(() => {
      refreshViewers();
    }, 5000);

    return () => clearInterval(interval);
  }, [story?._id, isMine]);

  async function openViewers() {
    if (!story?._id || !isMine) return;

    setShowViewers(true);
    setLoadingViewers(true);

    try {
      await refreshViewers();
    } catch (error) {
      toast.error("Unable to load viewers.");
    } finally {
      setLoadingViewers(false);
    }
  }

  useEffect(() => {
    if (!story?._id || isMine) return;

    axiosInstance.post(`/stories/${story._id}/view`).catch((error) => {
      console.error("Unable to record story view:", error);
    });
  }, [story?._id, isMine]);

  useEffect(() => {
    if (!story || paused || story.mediaType === "video") return;

    const timer = setTimeout(nextStory, 5000);
    return () => clearTimeout(timer);
  }, [story?._id, paused, groupIndex, storyIndex]);

  async function removeStory() {
    if (!story || !isMine || deleting) return;

    if (!window.confirm("Delete this story?")) return;

    setDeleting(true);

    try {
      await axiosInstance.delete(`/stories/${story._id}`);
      toast.success("Story deleted.");

      await onRefresh();

      if (group.stories.length > 1 && storyIndex > 0) {
        setStoryIndex((value) => value - 1);
      } else if (group.stories.length > 1) {
        setStoryIndex(0);
      } else {
        onClose();
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to delete story.");
    } finally {
      setDeleting(false);
    }
  }

  if (!story) return null;

  return (
    <div className="story-viewer-backdrop">
      <div className="story-viewer">
        <div className="story-progress">
          {group.stories.map((item, index) => (
            <div className="story-progress-track" key={item._id}>
              <div
                className={`story-progress-fill ${
                  index < storyIndex ? "completed" : ""
                }`}
                style={{
                  width: index < storyIndex ? "100%" : "0%",
                  animation:
                    index === storyIndex && story.mediaType !== "video"
                      ? paused
                        ? "none"
                        : "story-progress 5s linear forwards"
                      : "none",
                }}
              />
            </div>
          ))}
        </div>

        <div className="story-viewer-header">
          <Avatar user={group.user} />

          <div>
            <b>{isMine ? "My status" : group.user?.userName}</b>
            <small>{formatTime(story.createdAt)}</small>
          </div>

          {isMine && (
            <button
              type="button"
              className="story-view-count"
              onClick={openViewers}
              title="See who viewed your story"
            >
              <span>◉</span>
              <span>{viewerCount}</span>
            </button>
          )}

          <button
            className="story-viewer-close"
            onClick={onClose}
            aria-label="Close story"
          >
            ×
          </button>
        </div>

        <div
          className="story-viewer-media"
          onMouseDown={() => setPaused(true)}
          onMouseUp={() => setPaused(false)}
          onMouseLeave={() => setPaused(false)}
          onTouchStart={() => setPaused(true)}
          onTouchEnd={() => setPaused(false)}
        >
          {story.mediaType === "video" ? (
            <video
              key={story._id}
              src={story.mediaUrl}
              ref={videoRef}
              autoPlay
              playsInline
              controls={false}
              onEnded={nextStory}
            />
          ) : (
            <img src={story.mediaUrl} alt="Story" />
          )}

          <button
            className="story-nav story-nav-left"
            onClick={previousStory}
            aria-label="Previous story"
          />

          <button
            className="story-nav story-nav-right"
            onClick={nextStory}
            aria-label="Next story"
          />
        </div>

        {story.caption && (
          <div className="story-viewer-caption">{story.caption}</div>
        )}

        {isMine && (
          <div className="story-owner-actions">
            <button onClick={removeStory} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete story"}
            </button>
          </div>
        )}

        {showViewers && (
          <div
            className="story-viewers-backdrop"
            onClick={() => setShowViewers(false)}
          >
            <div
              className="story-viewers-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="story-viewers-heading">
                <div>
                  <h3>Viewed by</h3>
                  <small>{storyViewers.length} viewers</small>
                </div>

                <button
                  type="button"
                  onClick={() => setShowViewers(false)}
                  aria-label="Close viewers"
                >
                  ×
                </button>
              </div>

              {loadingViewers ? (
                <div className="story-viewers-empty">Loading viewers...</div>
              ) : storyViewers.length === 0 ? (
                <div className="story-viewers-empty">
                  No one has viewed this story yet.
                </div>
              ) : (
                <div className="story-viewers-list">
                  {storyViewers.map((viewer) => (
                    <div className="story-viewer-person" key={viewer.userId}>
                      <Avatar
                        user={{
                          userName: viewer.userName,
                          avatar: viewer.avatar,
                        }}
                      />

                      <div className="story-viewer-person-info">
                        <b>{viewer.userName || "User"}</b>
                        <small>
                          First viewed{" "}
                          {new Date(viewer.viewedAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function groupStoriesByUser(stories = []) {
  const groups = new Map();

  for (const story of stories) {
    const userId = String(story.userId?._id || story.userId);

    if (!userId) continue;

    if (!groups.has(userId)) {
      groups.set(userId, {
        userId,
        user: story.userId,
        stories: [],
      });
    }

    groups.get(userId).stories.push(story);
  }

  return Array.from(groups.values()).map((group) => ({
    ...group,
    stories: group.stories.sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    ),
  }));
}

function AttachmentPreview({ attachment }) {
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl;

    async function loadPreview() {
      try {
        setLoading(true);
        setError("");

        const blob = await downloadAndDecryptAttachment(attachment);

        if (!active) return;

        objectUrl = URL.createObjectURL(blob);
        setPreviewUrl(objectUrl);
      } catch (err) {
        console.error("[Attachment] Preview decryption failed:", err);
        if (active) setError("Unable to decrypt attachment.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadPreview();

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment?.url, attachment?.fileKey, attachment?.iv]);

  // Close viewer with Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const downloadImage = (event) => {
    event.stopPropagation();

    const link = document.createElement("a");
    link.href = previewUrl;
    link.download = attachment.fileName || "quicktalk-image";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  if (loading) return <div>Decrypting attachment...</div>;
  if (error) return <div>{error}</div>;
  if (!previewUrl) return null;

  const isImage = attachment.mimeType?.startsWith("image/");

  return (
    <>
      {isImage ? (
        <img
          src={previewUrl}
          alt={attachment.fileName || "Shared image"}
          onClick={() => setIsOpen(true)}
          style={{
            display: "block",
            maxWidth: "240px",
            maxHeight: "240px",
            objectFit: "contain",
            borderRadius: "10px",
            cursor: "pointer",
          }}
        />
      ) : (
        <button onClick={downloadImage}>
          <icon-placeholder />
          Download {attachment.fileName || "attachment"}
        </button>
      )}

      {isImage && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0, 0, 0, 0.92)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: isOpen ? 1 : 0,
            visibility: isOpen ? "visible" : "hidden",
            transition: "opacity 250ms ease, visibility 250ms ease",
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              position: "relative",
              maxWidth: "90vw",
              maxHeight: "90vh",
              transform: isOpen ? "scale(1)" : "scale(0.95)",
              transition: "transform 250ms ease",
            }}
          >
            <img
              src={previewUrl}
              alt={attachment.fileName || "Shared image"}
              style={{
                display: "block",
                maxWidth: "90vw",
                maxHeight: "85vh",
                objectFit: "contain",
                borderRadius: "8px",
              }}
            />

            {/* Top-right action buttons */}
            <div
              style={{
                position: "absolute",
                top: "-48px",
                right: 0,
                display: "flex",
                gap: "12px",
              }}
            >
              <button
                onClick={downloadImage}
                title="Download image"
                aria-label="Download image"
                style={viewerButtonStyle}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <path d="m7 10 5 5 5-5" />
                  <path d="M12 15V3" />
                </svg>
              </button>

              <button
                onClick={() => setIsOpen(false)}
                title="Close image"
                aria-label="Close image viewer"
                style={viewerButtonStyle}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const viewerButtonStyle = {
  width: "40px",
  height: "40px",
  borderRadius: "50%",
  border: "none",
  background: "rgba(255, 255, 255, 0.15)",
  color: "#ffffff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

function Conversation({ signalStatus }) {
  const { authUser, socket, onlineUsers } = useAuthStore();
  const {
    selectedUser,
    messages,
    addMessage,
    setMessages,
    updateMessageStatus,
  } = useChatStore();
  const [draft, setDraft] = useState("");
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editDraft, setEditDraft] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState(null);
  const [openMessageMenuId, setOpenMessageMenuId] = useState(null);
  const [typing, setTyping] = useState(false);
  const [sending, setSending] = useState(false);
  const [call, setCall] = useState(null);
  const [aiOpen, setAiOpen] = useState(false);
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimer = useRef(null);
  const peerOnline = selectedUser && onlineUsers.includes(selectedUser._id);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFilePreview, setSelectedFilePreview] = useState("");

  useEffect(() => {
    if (!selectedFile || !selectedFile.type.startsWith("image/")) {
      setSelectedFilePreview("");
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setSelectedFilePreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

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
    if (!socket) return;

    const handleDelivered = ({ clientMessageIds, deliveredAt }) => {
      updateMessageStatus(clientMessageIds || [], "delivered", {
        deliveredAt,
      });
    };

    const handleRead = ({ clientMessageIds, readAt }) => {
      updateMessageStatus(clientMessageIds || [], "read", {
        readAt,
      });
    };

    socket.on("message:delivered", handleDelivered);
    socket.on("message:read", handleRead);

    return () => {
      socket.off("message:delivered", handleDelivered);
      socket.off("message:read", handleRead);
    };
  }, [socket, updateMessageStatus]);

  useEffect(() => {
    if (!selectedUser?._id || !authUser?._id) return;

    let active = true;

    async function fetchHistory() {
      try {
        console.log("[Archive] Loading conversation history...");

        const history = await loadMessageHistory({
          userId: authUser._id,
          peerId: selectedUser._id,
        });

        if (!active) return;

        // Keep messages received while the history request was running.
        const currentMessages = useChatStore.getState().messages;

        const mergedMessages = [...history, ...currentMessages];

        // Remove duplicates using the stable client message ID.
        const uniqueMessages = Array.from(
          new Map(
            mergedMessages.map((message) => [message.clientMessageId, message]),
          ).values(),
        );

        // Display messages in chronological order.
        uniqueMessages.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );

        setMessages(uniqueMessages);

        console.log(
          `[Archive] Loaded ${history.length} messages from MongoDB.`,
        );
      } catch (error) {
        console.error("[Archive] History loading failed:", error);
        toast.error("Unable to load encrypted message history.");
      }
    }

    fetchHistory();

    return () => {
      active = false;
    };
  }, [selectedUser?._id, authUser?._id, setMessages]);

  useEffect(() => {
    if (!selectedUser?._id || !authUser?._id) return;

    const unreadMessages = messages.filter(
      (message) =>
        String(message.senderId) === String(selectedUser._id) &&
        String(message.receiverId) === String(authUser._id) &&
        message.status !== "read" &&
        !message.readAt &&
        message.clientMessageId,
    );

    if (!unreadMessages.length) return;

    const clientMessageIds = unreadMessages.map(
      (message) => message.clientMessageId,
    );

    let active = true;

    async function markConversationRead() {
      try {
        const { data } = await axiosInstance.patch(
          `/message/history/${selectedUser._id}/read`,
          { clientMessageIds },
        );

        if (!active) return;

        updateMessageStatus(clientMessageIds, "read", {
          readAt: data.readAt,
        });

        console.log("[Receipt] Messages marked as read:", clientMessageIds);
      } catch (error) {
        console.error("[Receipt] Read confirmation failed:", error);
      }
    }

    markConversationRead();

    return () => {
      active = false;
    };
  }, [messages, selectedUser?._id, authUser?._id, updateMessageStatus]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const value = draft.trim();

    if (!value || !selectedUser || sending) return;

    setSending(true);

    const clientMessageId = crypto.randomUUID();
    const createdAt = new Date();

    // Add the message immediately to the sender's chat.
    const message = {
      clientMessageId,
      content: value,
      senderId: authUser._id,
      receiverId: selectedUser._id,
      createdAt,
      protocol: "signal",
      status: "sending",
    };

    addMessage(message);
    setDraft("");

    // Send a structured payload so both devices use the same message ID.
    const payload = {
      type: "text",
      clientMessageId,
      content: value,
      createdAt: createdAt.toISOString(),
    };

    try {
      await sendSignalMessage(
        selectedUser.signalUserId,
        JSON.stringify(payload),
      );

      // Signal Relay accepted the message.
      updateMessageStatus(clientMessageId, "sent");

      // Save the independently encrypted history copy.
      try {
        await saveMessageHistory({
          userId: authUser._id,
          peerId: selectedUser._id,
          senderId: authUser._id,
          receiverId: selectedUser._id,
          clientMessageId,
          payload,
        });

        console.log("[Archive] Message saved in MongoDB.");
      } catch (archiveError) {
        console.error("[Archive] Message save failed:", archiveError);
        toast.error("Message sent, but saving its history failed.");
      }

      socket?.emit("typing:stop", {
        peerId: selectedUser._id,
      });
    } catch (error) {
      console.error("[Message] Sending failed:", error);

      updateMessageStatus(clientMessageId, "failed");

      toast.error(error?.message || "Unable to send encrypted message.");
    } finally {
      setSending(false);
    }
  }

  async function saveEdit(message) {
    const updatedContent = editDraft.trim();

    if (!message || !updatedContent || !selectedUser || savingEdit) {
      return;
    }

    // Only the original sender can edit their text message.
    if (String(message.senderId) !== String(authUser._id)) {
      toast.error("You can only edit your own messages.");
      return;
    }

    if (message.attachment || message.type === "deleted") {
      toast.error("This message cannot be edited.");
      return;
    }

    setSavingEdit(true);

    const editedAt = new Date();

    const payload = {
      type: "message:edit",
      clientMessageId: message.clientMessageId,
      content: updatedContent,
      editedAt: editedAt.toISOString(),
    };

    try {
      // Send the edit through Signal Protocol.
      await sendSignalMessage(
        selectedUser.signalUserId,
        JSON.stringify(payload),
      );

      // Update the sender's own message immediately.
      const currentMessages = useChatStore.getState().messages;

      setMessages(
        currentMessages.map((item) =>
          item.clientMessageId === message.clientMessageId
            ? {
                ...item,
                content: updatedContent,
                editedAt,
              }
            : item,
        ),
      );

      // Update the sender's independently encrypted archive copy.
      await updateMessageHistory({
        userId: authUser._id,
        peerId: selectedUser._id,
        clientMessageId: message.clientMessageId,
        payload: {
          type: "text",
          content: updatedContent,
          createdAt: new Date(message.createdAt).toISOString(),
        },
      });

      setEditingMessageId(null);
      setEditDraft("");

      toast.success("Message edited.");
    } catch (error) {
      console.error("[Edit] Message update failed:", error);
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to edit message.",
      );
    } finally {
      setSavingEdit(false);
    }
  }

  async function deleteForMe(message) {
    if (!message?.clientMessageId || !selectedUser || deletingMessageId) {
      return;
    }

    setDeletingMessageId(message.clientMessageId);

    try {
      await deleteMessageForMe({
        peerId: selectedUser._id,
        clientMessageId: message.clientMessageId,
      });

      const currentMessages = useChatStore.getState().messages;

      setMessages(
        currentMessages.filter(
          (item) => item.clientMessageId !== message.clientMessageId,
        ),
      );

      toast.success("Message deleted for you.");
    } catch (error) {
      console.error("[Delete] Delete for me failed:", error);
      toast.error(
        error?.response?.data?.message || "Unable to delete this message.",
      );
    } finally {
      setDeletingMessageId(null);
    }
  }

  async function deleteForEveryone(message) {
    if (!message?.clientMessageId || !selectedUser || deletingMessageId) {
      return;
    }

    if (String(message.senderId) !== String(authUser._id)) {
      toast.error("You can only delete your own messages for everyone.");
      return;
    }

    setDeletingMessageId(message.clientMessageId);

    const deletedAt = new Date();

    try {
      // Update both participants' encrypted archive records.
      await deleteMessageForEveryone({
        peerId: selectedUser._id,
        clientMessageId: message.clientMessageId,
      });

      // Notify the recipient through Signal Protocol.
      const payload = {
        type: "message:delete",
        scope: "everyone",
        clientMessageId: message.clientMessageId,
        deletedAt: deletedAt.toISOString(),
      };

      await sendSignalMessage(
        selectedUser.signalUserId,
        JSON.stringify(payload),
      );

      // Replace the message locally with a tombstone.
      const currentMessages = useChatStore.getState().messages;

      setMessages(
        currentMessages.map((item) =>
          item.clientMessageId === message.clientMessageId
            ? {
                ...item,
                content: "",
                text: "",
                attachment: null,
                type: "deleted",
                status: "deleted",
                deletedAt,
                editedAt: null,
              }
            : item,
        ),
      );

      setEditingMessageId(null);
      setEditDraft("");

      toast.success("Message deleted for everyone.");
    } catch (error) {
      console.error("[Delete] Delete for everyone failed:", error);
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to delete message for everyone.",
      );
    } finally {
      setDeletingMessageId(null);
    }
  }

  async function sendAttachment(file) {
    if (!file || !selectedUser || uploadingFile) return;

    const allowedTypes = ["image/", "audio/", "video/"];

    if (!allowedTypes.some((type) => file.type.startsWith(type))) {
      toast.error("Only image, audio and video files are supported.");
      return;
    }

    setUploadingFile(true);

    try {
      let recipient = selectedUser;

      if (!recipient.signalUserId) {
        const { data } = await axiosInstance.get("/user/get-all-users");

        recipient =
          (data.users || []).find(
            (user) => String(user._id) === String(selectedUser._id),
          ) || recipient;
      }

      if (!recipient.signalUserId) {
        throw new Error("Recipient has not registered an E2EE device.");
      }

      // Encrypt file bytes and upload encrypted bytes to Cloudinary.
      const attachment = await encryptAndUploadAttachment(file);

      const clientMessageId = crypto.randomUUID();

      const payload = {
        type: "attachment",
        clientMessageId,
        attachment,
        senderId: authUser._id,
        createdAt: new Date().toISOString(),
      };

      // Deliver attachment metadata and file key inside Signal encryption.
      await sendSignalMessage(recipient.signalUserId, JSON.stringify(payload));

      // Save encrypted archive copy in MongoDB.
      await saveMessageHistory({
        userId: authUser._id,
        peerId: selectedUser._id,
        senderId: authUser._id,
        receiverId: selectedUser._id,
        clientMessageId,
        payload,
      });

      addMessage({
        ...payload,
        content: "",
        createdAt: new Date(payload.createdAt),
        protocol: "signal",
        status: "sent",
      });

      toast.success("Attachment sent.");
      return true;
    } catch (error) {
      console.error("Attachment sending failed:", error);
      toast.error(error.message || "Unable to send attachment.");
      return false;
    } finally {
      setUploadingFile(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleSend() {
    if (sending || uploadingFile) return;

    const fileToSend = selectedFile;
    const hasText = Boolean(draft.trim());

    if (!fileToSend && !hasText) return;

    // Send the selected attachment first.
    if (fileToSend) {
      const success = await sendAttachment(fileToSend);

      if (!success) return;

      setSelectedFile(null);
    }

    // Send the text, if the user also typed a message.
    if (hasText) {
      await send();
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
    if (!selectedUser?._id || !authUser?._id) return;

    setDecryptedMessageHandler(async (envelope) => {
      // Only process messages from the currently selected contact.
      if (envelope.senderId !== selectedUser.signalUserId) {
        return;
      }

      const createdAt = new Date(envelope.createdAt);

      // Parse the decrypted Signal message.
      let payload;

      try {
        payload = JSON.parse(envelope.content);
      } catch {
        // Ordinary text messages are not JSON.
        payload = {
          type: "text",
          content: envelope.content,
        };
      }

      // Handle a message deletion received through Signal Protocol.
      if (payload.type === "message:delete") {
        if (payload.scope !== "everyone" || !payload.clientMessageId) {
          return;
        }

        const deletedAt = payload.deletedAt
          ? new Date(payload.deletedAt)
          : new Date();

        const currentMessages = useChatStore.getState().messages;

        const messageExists = currentMessages.some(
          (message) =>
            message.clientMessageId === payload.clientMessageId &&
            String(message.senderId) === String(selectedUser._id),
        );

        if (!messageExists) {
          console.warn(
            "[Delete] Original message is not in the current conversation:",
            payload.clientMessageId,
          );
          return;
        }

        setMessages(
          currentMessages.map((message) =>
            message.clientMessageId === payload.clientMessageId
              ? {
                  ...message,
                  content: "",
                  text: "",
                  attachment: null,
                  type: "deleted",
                  status: "deleted",
                  deletedAt,
                  editedAt: null,
                }
              : message,
          ),
        );

        console.log(
          "[Delete] Message deleted for everyone:",
          payload.clientMessageId,
        );

        return;
      }

      // Handle an edit control message separately from a normal message.
      if (payload.type === "message:edit") {
        if (!payload.clientMessageId || typeof payload.content !== "string") {
          return;
        }

        const currentMessages = useChatStore.getState().messages;

        const originalMessage = currentMessages.find(
          (message) => message.clientMessageId === payload.clientMessageId,
        );

        // Ignore edits for messages that are not present in this conversation.
        if (!originalMessage || originalMessage.type === "deleted") {
          return;
        }

        const editedAt = payload.editedAt
          ? new Date(payload.editedAt)
          : new Date();

        // Update the message displayed in this device's chat.
        setMessages(
          currentMessages.map((message) =>
            message.clientMessageId === payload.clientMessageId
              ? {
                  ...message,
                  content: payload.content,
                  editedAt,
                }
              : message,
          ),
        );

        // Re-encrypt and update this user's own archive copy.
        try {
          await updateMessageHistory({
            userId: authUser._id,
            peerId: selectedUser._id,
            clientMessageId: payload.clientMessageId,
            payload: {
              type: "text",
              content: payload.content,
              createdAt: new Date(originalMessage.createdAt).toISOString(),
            },
          });

          console.log("[Edit] Incoming edit saved in encrypted history.");
        } catch (error) {
          console.error("[Edit] Failed to update encrypted history:", error);
          toast.error("Message updated, but history synchronization failed.");
        }

        return;
      }

      const isAttachment =
        payload.type === "attachment" && Boolean(payload.attachment?.url);

      const clientMessageId =
        payload.clientMessageId ||
        envelope.messageId ||
        `${envelope.senderId}-${createdAt.getTime()}`;

      const message = {
        ...payload,
        clientMessageId,
        content: isAttachment ? "" : payload.content,
        senderId: selectedUser._id,
        receiverId: authUser._id,
        createdAt: payload.createdAt ? new Date(payload.createdAt) : createdAt,
        protocol: "signal",
        status: "received",
      };

      // Display the received message immediately.
      addMessage(message);

      // Confirm that this device received and decrypted the message.
      try {
        await axiosInstance.patch(
          `/message/history/${selectedUser._id}/delivered`,
          {
            clientMessageIds: [clientMessageId],
          },
        );

        console.log("[Receipt] Delivery confirmed:", clientMessageId);
      } catch (error) {
        console.error("[Receipt] Delivery confirmation failed:", error);
      }

      // Save the correct message type in encrypted history.
      try {
        await saveMessageHistory({
          userId: authUser._id,
          peerId: selectedUser._id,
          senderId: selectedUser._id,
          receiverId: authUser._id,
          clientMessageId,
          payload: isAttachment
            ? {
                ...payload,
                clientMessageId,
                createdAt: message.createdAt.toISOString(),
              }
            : {
                type: "text",
                content: payload.content,
                createdAt: message.createdAt.toISOString(),
              },
        });

        console.log(
          `[Archive] Incoming ${isAttachment ? "attachment" : "message"} saved in MongoDB.`,
        );
      } catch (error) {
        console.error("[Archive] Incoming message save failed:", error);
        toast.error("Message received, but history could not be saved.");
      }
    });

    return () => setDecryptedMessageHandler(null);
  }, [
    selectedUser?._id,
    selectedUser?.signalUserId,
    authUser?._id,
    addMessage,
  ]);

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
            {/* <button className="ai-action" onClick={() => setAiOpen(true)}>
              ✦ <span>AI assist</span>
            </button> */}
            <button
              className="ai-action"
              onClick={() => toast.success("Coming soon!")}
            >
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
            const attachment = message.attachment;
            const isDeleted = message.type === "deleted";
            const isEditing = editingMessageId === message.clientMessageId;

            if (!isDeleted && !body && !attachment) return null;

            return (
              <div
                key={message.clientMessageId || message._id || index}
                className={`message-row ${mine ? "mine" : "theirs"}`}
              >
                {!mine && <Avatar user={selectedUser} size="tiny" />}

                <div className="message-content">
                  {!isDeleted && (
                    <div
                      className="message-menu-container"
                      onBlur={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget)) {
                          setOpenMessageMenuId(null);
                        }
                      }}
                    >
                      <button
                        type="button"
                        className="message-menu-trigger"
                        title="Message options"
                        aria-label="Message options"
                        aria-expanded={
                          openMessageMenuId === message.clientMessageId
                        }
                        onClick={() =>
                          setOpenMessageMenuId((current) =>
                            current === message.clientMessageId
                              ? null
                              : message.clientMessageId,
                          )
                        }
                      >
                        ⋮
                      </button>

                      {openMessageMenuId === message.clientMessageId && (
                        <div className="message-dropdown">
                          {mine && !attachment && body && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingMessageId(message.clientMessageId);
                                setEditDraft(body);
                                setOpenMessageMenuId(null);
                              }}
                            >
                              <span>✎</span>
                              Edit
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={
                              deletingMessageId === message.clientMessageId
                            }
                            onClick={() => {
                              setOpenMessageMenuId(null);
                              deleteForMe(message);
                            }}
                          >
                            <span>⌫</span>
                            Delete for me
                          </button>

                          {mine && (
                            <button
                              type="button"
                              className="delete-everyone-option"
                              disabled={
                                deletingMessageId === message.clientMessageId
                              }
                              onClick={() => {
                                setOpenMessageMenuId(null);
                                deleteForEveryone(message);
                              }}
                            >
                              <span>🗑</span>
                              Delete for everyone
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {isDeleted ? (
                    <div className="message-bubble deleted-message">
                      This message was deleted.
                    </div>
                  ) : isEditing ? (
                    // Keep your existing edit textarea and Save/Cancel buttons here.
                    <div className="message-edit-area">
                      <textarea
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                      />
                      <div className=" save-edit">
                        <button
                          type="button"
                          onClick={() => saveEdit(message)}
                          disabled={savingEdit || !editDraft.trim()}
                        >
                          {savingEdit ? "Saving..." : "Save"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMessageId(null);
                            setEditDraft("");
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="message-bubble">
                      {attachment ? (
                        <AttachmentPreview attachment={attachment} />
                      ) : (
                        body
                      )}
                    </div>
                  )}

                  {!isDeleted && (
                    <div className="message-meta">
                      {message.editedAt && (
                        <span className="edited-label">Edited</span>
                      )}
                      {formatTime(message.createdAt || Date.now())}
                      {mine && <span className="read-check">✓✓</span>}
                    </div>
                  )}
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
            {/* <button onClick={() => setAiOpen(true)}>✦ Improve with AI</button> */}
            <button onClick={() => toast.success("Coming soon!")}>
              ✦ Improve with AI
            </button>
          </div>
          {selectedFile && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 14px",
                alignSelf: "flex-start",
              }}
            >
              <div style={{ position: "relative" }}>
                {selectedFilePreview ? (
                  <img
                    src={selectedFilePreview}
                    alt="Selected attachment"
                    style={{
                      width: "70px",
                      height: "70px",
                      objectFit: "cover",
                      borderRadius: "10px",
                      border: "1px solid #888",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "70px",
                      height: "70px",
                      borderRadius: "10px",
                      background: "#333",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "5px",
                      fontSize: "11px",
                      textAlign: "center",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {selectedFile.name}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  title="Remove attachment"
                  aria-label="Remove selected attachment"
                  style={{
                    position: "absolute",
                    top: "-8px",
                    right: "-8px",
                    width: "23px",
                    height: "23px",
                    borderRadius: "50%",
                    border: "none",
                    background: "#e5484d",
                    color: "white",
                    cursor: "pointer",
                    fontSize: "16px",
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>

              <span style={{ fontSize: "12px", opacity: 0.7 }}>
                {selectedFile.name}
              </span>
            </div>
          )}
          <div className="composer">
            <button
              className="composer-plus"
              disabled={uploadingFile}
              onClick={() => fileInputRef.current?.click()}
              title="Attach image, audio or video"
            >
              {uploadingFile ? "…" : "＋"}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,audio/*,video/*"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];

                if (!file) return;

                const allowedTypes = ["image/", "audio/", "video/"];

                if (!allowedTypes.some((type) => file.type.startsWith(type))) {
                  toast.error(
                    "Only image, audio and video files are supported.",
                  );
                  event.target.value = "";
                  return;
                }

                setSelectedFile(file);
                event.target.value = "";
              }}
            />
            <textarea
              className="outline-none"
              value={draft}
              onChange={(e) => changeDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Write a message…"
              rows={1}
            />
            <button
              className="send-button"
              onClick={handleSend}
              disabled={
                (!draft.trim() && !selectedFile) || sending || uploadingFile
              }
            >
              {sending || uploadingFile ? "…" : "↑"}
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
  const [activeStoryUserId, setActiveStoryUserId] = useState(null);
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
    const invite = (payload) => {
      setIncomingCall({
        ...payload,
        callerId: payload.peerId,
      });
    };
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
        onOpenStory={(userId) => setActiveStoryUserId(userId)}
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
          {/* <button onClick={() => setGlobalAiOpen(true)}>
            Open AI assistant ↗
          </button> */}
          <button onClick={() => toast.success("Coming soon")}>
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

      {activeStoryUserId && (
        <StoryViewer
          stories={stories}
          initialUserId={activeStoryUserId}
          currentUserId={authUser?._id}
          onClose={() => setActiveStoryUserId(null)}
          onRefresh={loadData}
        />
      )}
    </main>
  );
}
