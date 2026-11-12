import crypto from "node:crypto";
import jwt from "jsonwebtoken";

export const createRelayIdentityAssertion = async (req, res) => {
  try {
    const { purpose, assurance = "normal", environment, publishableKey } = req.body || {};
    const configuredEnvironment = process.env.SIGNAL_RELAY_ENVIRONMENT;
    const configuredPublishableKey = process.env.SIGNAL_RELAY_PUBLISHABLE_KEY;
    const issuer = process.env.SIGNAL_RELAY_ISSUER;
    const audience = process.env.SIGNAL_RELAY_AUDIENCE;
    const kid = process.env.SIGNAL_RELAY_KID;
    const privateJwk = process.env.SIGNAL_RELAY_PRIVATE_JWK;

    if (!configuredEnvironment || !configuredPublishableKey || !issuer?.startsWith("https://") || !audience || !kid || !privateJwk) {
      return res.status(503).json({ message: "Signal Relay application identity is not configured on the server." });
    }
    if (environment !== configuredEnvironment || publishableKey !== configuredPublishableKey ||
        !["register", "refresh", "recover"].includes(purpose) ||
        !["normal", "recent"].includes(assurance)) {
      return res.status(400).json({ message: "Invalid Signal Relay assertion request." });
    }
    const now = Math.floor(Date.now() / 1000);
    const authenticatedAt = Number(req.user.authenticatedAtSeconds || 0);
    const recentAuthentication = authenticatedAt > 0 && now - authenticatedAt <= 300;
    if (assurance === "recent" && !recentAuthentication) {
      return res.status(403).json({ message: "Please sign in again before this security-sensitive operation." });
    }

    const parsedJwk = JSON.parse(privateJwk);
    delete parsedJwk.kid;
    const keyObject = crypto.createPrivateKey({ key: parsedJwk, format: "jwk" });
    const assertion = jwt.sign(
      { token_use: "identity", purpose, assurance, iat: now, nbf: now },
      keyObject,
      {
        algorithm: "ES256",
        keyid: kid,
        issuer,
        audience,
        subject: String(req.user.userId),
        expiresIn: 300,
        jwtid: crypto.randomUUID(),
      }
    );
    res.set("Cache-Control", "no-store");
    return res.json({ assertion });
  } catch (error) {
    console.error("Signal Relay assertion error:", error.message);
    return res.status(500).json({ message: "Unable to issue Signal Relay identity assertion." });
  }
};
