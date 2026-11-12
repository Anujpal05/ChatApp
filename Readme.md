# QuickTalk 2.0

QuickTalk is a privacy-first communication app built with React, Vite, Zustand, Express, MongoDB, Socket.IO and WebRTC. This upgrade modernizes the interface and backend foundations and adds an integration path for Signal Protocol messaging, AI assistance, stories, and improved calling.

## What's included

- Separate account registration, login, logout and `/me` session restoration.
- HTTP-only JWT cookie authentication and authenticated Socket.IO handshakes.
- Multi-tab presence, conversation rooms, typing indicators and scoped call signaling.
- Encrypted-message-oriented API schema (ciphertext only; no plaintext body accepted by the new send endpoint).
- Signal Protocol browser client adapter using `@open-e2ee/signal-protocol-sdk`.
- AI assistant endpoint for rewrite, smart reply, summarize, translate and tone actions.
- Stories metadata API with 24-hour expiry.
- Redesigned responsive chat/auth UI.
- WebRTC audio/video call experience, device media controls, screen share and TURN configuration support.
- Built-in Node tests for core utility behavior.

## Important security and integration notes

1. **Signal Protocol setup is required before sending messages.** The browser client uses the OpenE2EE Signal Protocol SDK, an independent TypeScript implementation of the Signal Protocol. It is not Signal Messenger's official `libsignal` package and is not interoperable with Signal Messenger. The SDK vendor states its current assurance work is not an independent security audit.
2. The API includes a custom-token identity assertion endpoint. Configure the Relay environment as **Custom token from your backend (ES256)** before the first device registers. Configure the public P-256 JWK in the Relay console and keep the matching private JWK only in the server environment. Sandbox and Production must use separate audiences and publishable keys.
3. The browser SDK uses a device-local encrypted store. Browser-origin JavaScript and XSS can still invoke keys; use a strict Content Security Policy, minimize third-party scripts, and protect against XSS.
4. The relay sees routing metadata (sender/recipient identifiers, device IDs, timestamps and message sizes), even though it does not receive plaintext.
5. AI requests only include text the user explicitly enters into the AI panel. Do not automatically pass decrypted conversation content to AI. If adding selected-chat summarization later, require an explicit consent step.
6. WebRTC media is encrypted in transit with DTLS-SRTP. Configure TURN for reliable calls across restrictive NATs. TURN credentials must be short-lived and generated server-side in production; do not expose static TURN secrets in a public Vite environment.
7. The Stories API currently accepts a secure media URL and publishes stories to signed-in users. Add authenticated upload/signing and real audience/contacts enforcement before using it with untrusted users.
8. The rate limiter included here is in-memory and suitable only for a single-process demo. Use Redis-backed rate limiting for multi-instance deployment.
9. Messages are sent through the hosted Signal Relay client. The current UI keeps decrypted messages in memory for the active session; it does not yet restore message history after a reload. The app database ciphertext endpoint is a separate foundation, not yet connected to the hosted SDK transport. Implement the SDK's documented custom relay adapter and encrypted local history before treating this as a full chat-history product.

## Requirements

- Node.js 22.18+ recommended for the Signal SDK tooling.
- MongoDB.
- A Signal Protocol Relay Sandbox for development, then a configured Production Relay for deployment.
- Optional AI provider: an OpenAI-compatible hosted endpoint or local endpoint such as Ollama.
- TURN server for robust calling.

## Setup

### 1. Server

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

Set `MONGODB_URL`, `SECRET_KEY` (use a long random value), and `CLIENT_URL`.

### 2. Client

```bash
cd client
cp .env.example .env
npm install
npm run dev
```

Set `VITE_SERVER_URL`.

### 3. Signal Protocol development relay

Create a Signal Protocol Relay project and configure its Sandbox identity profile as **Custom token from your backend (ES256)**. Generate a P-256 signing key pair with `cd server && npm run generate:signal-jwk`. Put only the public JWK into the Relay console; put the private JWK in `server/.env` as `SIGNAL_RELAY_PRIVATE_JWK`. Configure `SIGNAL_RELAY_ENVIRONMENT`, `SIGNAL_RELAY_PUBLISHABLE_KEY`, `SIGNAL_RELAY_ISSUER`, `SIGNAL_RELAY_AUDIENCE`, and `SIGNAL_RELAY_KID` on the server. Set the Sandbox connection URL in `VITE_OPEN_E2EE_SIGNAL_RELAY_URL`. Do not register any device until the Relay identity mode and signing keys are configured. Keep Sandbox and Production stores/URLs/audiences separate.

### 4. AI configuration

The default `hybrid` mode tries the hosted provider first and falls back to a local Ollama-compatible endpoint if the hosted request fails. Keep API keys on the server:

```env
AI_PROVIDER=hybrid
AI_BASE_URL=https://api.openai.com/v1/chat/completions
AI_MODEL=gpt-4o-mini
AI_API_KEY=your-server-side-key
AI_LOCAL_BASE_URL=http://localhost:11434/v1/chat/completions
AI_LOCAL_MODEL=llama3.2
```

Use `AI_PROVIDER=local` to keep requests on the configured local endpoint, or `AI_PROVIDER=hosted` for hosted-only operation.

### 5. TURN configuration

Set `VITE_TURN_URL`, `VITE_TURN_USERNAME`, and `VITE_TURN_CREDENTIAL` for local testing only. For production, replace static public-client credentials with a backend endpoint that issues short-lived TURN credentials.

## Tests

```bash
cd server
npm test
```

## API overview

- `POST /api/user/register`
- `POST /api/user/login`
- `POST /api/user/logout`
- `GET /api/user/me`
- `GET /api/user/get-all-users`
- `PATCH /api/user/profile`
- `PUT /api/user/signal-identity`
- `POST /api/e2ee/identity-assertion`
- `GET /api/message/get-messages/:id`
- `POST /api/message/send-message/:id` (Signal ciphertext only)
- `PATCH /api/message/delivered/:messageId`
- `PATCH /api/message/read/:id`
- `POST /api/call/add-new-call`
- `GET /api/call/get-all-call/:userid`
- `GET /api/stories`
- `POST /api/stories`
- `POST /api/ai/assistant`
- `GET /api/health`

## Suggested next production milestones

- Custom Signal Relay adapter/persistence so ciphertext envelopes can be retained by the application backend.
- Encrypted attachment uploads and device verification UX.
- User-managed multi-device linking, recovery and key-change warnings.
- Redis-backed presence/rate limits and background jobs.
- Group conversations, group calls, message search and push notifications.
- Story media upload, audience authorization, viewers and reactions.
- Integration/E2E tests across browsers, TURN-only networks and multiple devices.


## Dependency compatibility fix (QuickTalk 2.0.1)

The Signal Protocol SDK 14.4.x declares an optional React peer dependency of `>=19.0.0`.
The original client manifest used React 18.3.1, which causes npm 7+ to stop with `ERESOLVE`.
The client manifest now uses React and React DOM 19.1.x, with matching React 19 type definitions.
Do not use `--force` or `--legacy-peer-deps` to bypass this peer dependency check.

After extracting this updated ZIP, run:

```bash
cd client
# If a failed install created partial dependency state, remove it first:
# Windows Command Prompt:
rmdir /s /q node_modules
del package-lock.json

npm install
npm run build
```

The `rmdir` and `del` commands are only needed if a previous failed install left partial files.
