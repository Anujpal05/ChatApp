# Security notes

- Never commit `.env`, credentials, private keys, or protocol storage.
- Rotate secrets if they were ever committed or shared in an archive.
- Use HTTPS in production; configure Secure, HttpOnly, SameSite cookies and a CSRF strategy appropriate to the deployment topology.
- Configure a strict Content Security Policy. The browser Signal SDK web SQLite worker requires the SDK-documented WebAssembly policy (`wasm-unsafe-eval`); do not add broad `unsafe-eval` or inline-script allowances.
- Use a maintained Signal Protocol implementation. Do not create a home-grown ratchet or claim E2EE for plaintext legacy messages.
- Keep AI calls opt-in and do not automatically send decrypted conversation data to a model provider.
- Use short-lived TURN credentials generated server-side.
- Replace the included in-memory rate limiter with Redis before horizontal scaling.
- Run dependency and secret scans before release.

- `client/public/_headers` provides a Netlify-style baseline CSP and browser security headers. If deploying elsewhere, configure equivalent response headers and replace broad `https:` connect sources with the exact API and Signal Relay origins.
- The included Signal Relay assertion endpoint supports normal and recent assurance. Recent assurance is derived from the signed-in session timestamp; step-up/MFA assurance is deliberately not claimed because MFA is not implemented.
