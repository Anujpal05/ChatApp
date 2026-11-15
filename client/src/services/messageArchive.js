import { openDB } from "idb";
import { axiosInstance } from "../../utils/axios";

const DB_NAME = "quicktalk-message-archive";
const STORE_NAME = "user-keys";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function keyDb() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });
}

async function getArchiveKey(userId, createIfMissing = true) {
  if (!userId) {
    throw new Error("User is not authenticated.");
  }

  const db = await keyDb();
  const id = String(userId);

  let key = await db.get(STORE_NAME, id);

  if (!key && !createIfMissing) {
    throw new Error(
      "Message archive encryption key is missing. Existing history cannot be decrypted.",
    );
  }

  if (!key) {
    key = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );

    await db.put(STORE_NAME, key, id);
  }

  return key;
}

function toBase64(bytes) {
  let binary = "";

  new Uint8Array(bytes).forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary);
}

function fromBase64(value) {
  const binary = atob(value);

  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

// Encrypt message history before sending it to MongoDB.
export async function encryptHistoryPayload(userId, payload) {
  const key = await getArchiveKey(userId);

  const iv = crypto.getRandomValues(new Uint8Array(12));

  const plaintext = encoder.encode(JSON.stringify(payload));

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plaintext,
  );

  return `v1.${toBase64(iv)}.${toBase64(encrypted)}`;
}

// Decrypt history after retrieving it from MongoDB.
export async function decryptHistoryPayload(userId, ciphertext) {
  const [version, ivPart, dataPart] = String(ciphertext || "").split(".");

  if (version !== "v1" || !ivPart || !dataPart) {
    throw new Error("Invalid history ciphertext.");
  }

  const key = await getArchiveKey(userId, false);

  const plaintext = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: fromBase64(ivPart),
    },
    key,
    fromBase64(dataPart),
  );

  return JSON.parse(decoder.decode(plaintext));
}

// Save encrypted history in MongoDB.
export async function saveMessageHistory({
  userId,
  peerId,
  senderId,
  receiverId,
  clientMessageId,
  payload,
}) {
  const ciphertext = await encryptHistoryPayload(userId, payload);

  await axiosInstance.post(`/message/history/${peerId}`, {
    clientMessageId,
    senderId,
    receiverId,
    ciphertext,
    messageType: payload.type === "attachment" ? "attachment" : "text",
    attachment: payload.attachment?.url
      ? {
          url: payload.attachment.url,
          publicId: payload.attachment.publicId,
          size: payload.attachment.size,
        }
      : undefined,
  });
}

export async function updateMessageHistory({
  userId,
  peerId,
  clientMessageId,
  payload,
}) {
  const ciphertext = await encryptHistoryPayload(userId, payload);

  const { data } = await axiosInstance.patch(`/message/history/${peerId}`, {
    clientMessageId,
    ciphertext,
  });

  return data;
}

export async function deleteMessageForMe({ peerId, clientMessageId }) {
  const { data } = await axiosInstance.patch(
    `/message/history/${peerId}/delete-for-me`,
    { clientMessageId },
  );

  return data;
}

export async function deleteMessageForEveryone({ peerId, clientMessageId }) {
  const { data } = await axiosInstance.patch(
    `/message/history/${peerId}/delete-for-everyone`,
    { clientMessageId },
  );

  return data;
}

// Fetch and decrypt history.

export async function loadMessageHistory({ userId, peerId }) {
  const { data } = await axiosInstance.get(`/message/history/${peerId}`);

  const decrypted = [];

  for (const row of data.messages || []) {
    // A globally deleted message must not be decrypted or displayed
    // with its original content.
    if (row.deletedAt) {
      decrypted.push({
        clientMessageId: row.clientMessageId,
        senderId: String(row.senderId),
        receiverId: String(row.receiverId),
        createdAt: row.createdAt,
        deletedAt: row.deletedAt,
        type: "deleted",
        content: "",
        status: "deleted",
        protocol: "signal",
      });

      continue;
    }

    try {
      let payload = await decryptHistoryPayload(userId, row.ciphertext);

      if (payload.type === "text" && typeof payload.content === "string") {
        try {
          const parsed = JSON.parse(payload.content);

          if (parsed.type === "attachment" && parsed.attachment?.url) {
            payload = parsed;
          }
        } catch {
          // Keep the original text payload.
        }
      }

      decrypted.push({
        ...payload,
        clientMessageId: row.clientMessageId,
        senderId: String(row.senderId),
        receiverId: String(row.receiverId),
        createdAt: row.createdAt,
        editedAt: row.editedAt || null,
        protocol: "signal",
        status: row.readAt ? "read" : row.deliveredAt ? "delivered" : "sent",
      });
    } catch (error) {
      console.warn("Unable to decrypt history:", error.message);
    }
  }

  return decrypted;
}

// Encrypt and upload attachments.
export async function encryptAndUploadAttachment(file) {
  if (!(file instanceof File)) {
    throw new Error("Choose a file first.");
  }

  if (file.size > 25 * 1024 * 1024) {
    throw new Error("Maximum attachment size is 25 MB.");
  }

  const fileKey = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));

  const rawKey = await crypto.subtle.exportKey("raw", fileKey);

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    fileKey,
    await file.arrayBuffer(),
  );

  const form = new FormData();

  form.append(
    "file",
    new Blob([encrypted], {
      type: "application/octet-stream",
    }),
    `${file.name}.qte`,
  );

  const { data } = await axiosInstance.post(
    "/message/upload-encrypted-attachment",
    form,
  );

  return {
    url: data.url,
    publicId: data.publicId,
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    encrypted: true,
    iv: toBase64(iv),
    fileKey: toBase64(rawKey),
  };
}

// Download and decrypt attachments.
export async function downloadAndDecryptAttachment(attachment) {
  if (!attachment?.url || !attachment?.fileKey || !attachment?.iv) {
    throw new Error("Attachment decryption information is incomplete.");
  }

  const response = await fetch(attachment.url);

  if (!response.ok) {
    throw new Error("Unable to download attachment.");
  }

  const rawKey = await crypto.subtle.importKey(
    "raw",
    fromBase64(attachment.fileKey),
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );

  const plaintext = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: fromBase64(attachment.iv),
    },
    rawKey,
    await response.arrayBuffer(),
  );

  return new Blob([plaintext], {
    type: attachment.mimeType || "application/octet-stream",
  });
}
