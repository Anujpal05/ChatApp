// Public service policy. Do not put secrets in this file.
import { defineConfig } from "@open-e2ee/oe/config";

export default defineConfig({
  product: "signal-relay",
  project: "chatapp",
  signalRelay: {
    deliveryRetention: "30d",
    attachmentRetention: "30d",
    signalRelayReceipts: true,
  },
  environments: {
    sandbox: {
      signalRelay: {
        deliveryRetention: "1d",
        attachmentRetention: "1d",
      },
    },
  },
});
