/**
 * Signal Protocol browser adapter.
 * The Relay uses a custom-token identity assertion signed by the QuickTalk API.
 * Device protocol state remains in the browser's encrypted local store.
 */
import { axiosInstance } from "../../utils/axios";

let clientPromise;
let messageHandler = () => {};

export const setDecryptedMessageHandler = (handler) => { messageHandler = handler || (() => {}); };

export async function getSignalClient() {
  if (clientPromise) return clientPromise;
  clientPromise = (async () => {
    const relayUrl = import.meta.env.VITE_OPEN_E2EE_SIGNAL_RELAY_URL;
    if (!relayUrl) throw new Error("Signal Relay is not configured. Set VITE_OPEN_E2EE_SIGNAL_RELAY_URL.");

    const sdk = await import("@open-e2ee/signal-protocol-sdk");
    let storage;
    try {
      const store = await import("@open-e2ee/signal-protocol-sdk/local/store/web-sqlite");
      storage = await store.webSqliteStore();
    } catch (error) {
      if (error?.code !== "OPFS_UNAVAILABLE") throw error;
      const fallback = await import("@open-e2ee/signal-protocol-sdk/local/store/web");
      storage = await fallback.indexedDbStore();
    }

    const getIdentityAssertion = async (request) => {
      const { data } = await axiosInstance.post("/e2ee/identity-assertion", request, { headers: { "Cache-Control": "no-store" } });
      if (typeof data.assertion !== "string") throw new Error("Signal Relay identity assertion was not returned.");
      return data.assertion;
    };

    const signal = await sdk.createHostedSignalProtocolClient({
      adapters: { storage },
      hosted: { relayUrl, getIdentityAssertion },
    });
    signal.registerHook("onMessageDecrypted", (envelope) => {
      messageHandler({
        conversationId: envelope.conversationId,
        senderId: envelope.senderId,
        content: envelope.content,
        createdAt: envelope.timestamp ? new Date(envelope.timestamp) : new Date(),
        protocol: "signal",
      });
    });
    signal.startRelaySubscription();
    return signal;
  })().catch((error) => {
    clientPromise = null;
    throw error;
  });
  return clientPromise;
}

export async function sendSignalMessage(recipientSignalId, content) {
  if (!recipientSignalId) throw new Error("The recipient has not registered an E2EE device yet.");
  const signal = await getSignalClient();
  return signal.send(recipientSignalId, content);
}

export async function stopSignalClient() {
  if (!clientPromise) return;
  try {
    const signal = await clientPromise;
    await signal.stop();
  } finally {
    clientPromise = null;
  }
}
