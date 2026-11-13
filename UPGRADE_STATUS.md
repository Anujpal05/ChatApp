# QuickTalk 2.0 — Upgrade Status

## Implemented in this source package

- Redesigned responsive sign-in/register experience and dark communication workspace.
- Separate registration/login/logout and server-restored authenticated session.
- HTTP-only JWT cookies, password hashing, API origin checks, security headers, and authenticated Socket.IO handshakes.
- Multi-socket presence, conversation room authorization, typing indicators, and server-tracked call signaling sessions.
- Signal Protocol SDK browser adapter with encrypted browser storage and an application-bound ES256 Relay identity assertion endpoint.
- P-256 JWK generation helper for Relay setup.
- Ciphertext-only message API schema; plaintext is not accepted by the new message-send API.
- AI assistant endpoint with hybrid hosted-first/local-fallback model routing.
- Story metadata API with 24-hour expiry and signed-in-user visibility.
- WebRTC audio/video calls, remote audio playback, mute/camera controls, camera switching, screen sharing, ICE candidate buffering, TURN configuration, and connection quality indicator.
- Call history view.
- Basic automated Node tests and setup/security documentation.

## Must be configured before end-to-end testing

1. Install dependencies in both `client` and `server`.
2. Configure MongoDB and a strong `SECRET_KEY`.
3. Create a Signal Protocol Relay project, select **Custom token from your backend (ES256)** before device registration, generate a P-256 key pair, add its public JWK to the Relay console, and put the private JWK only in the server environment.
4. Configure the Relay publishable key, issuer, audience, key ID and connection URL.
5. Configure a hosted AI API key and/or a local Ollama-compatible model.
6. Configure TURN credentials for reliable calling across restrictive networks.

## Known incomplete production work

- The hosted Signal Relay transport is separate from the app's MongoDB message endpoint. Decrypted messages currently remain in client memory for the active session; message history is not restored after a reload. A custom Relay adapter and encrypted local history are still needed.
- Signal identity verification UX, safety-number display, device linking/revocation and recovery are not implemented.
- AI is opt-in for manually entered text; selected decrypted chat summarization and on-device inference are not wired into the chat timeline.
- Stories accept an HTTPS media URL; authenticated uploads, audience/contacts controls, reactions and viewer UI remain to be built.
- Group chats/calls, voice notes, encrypted file attachments, push notifications, password reset, email verification, MFA, refresh-token rotation and Redis-backed scaling remain future work.
- TURN credentials are currently read from client build variables for local testing; production must issue short-lived credentials from the backend.
- The included in-memory rate limiter and in-memory Socket.IO presence/call-session maps are single-instance demo implementations.

## Validation performed in this environment

- Server JavaScript syntax checks.
- Client JavaScript/JSX parser checks.
- Package JSON validation.
- Node built-in tests: 3 passing.
- Signal ES256 JWK generation script smoke check.

A full Vite production build and live integration tests were not run because npm dependencies could not be installed in this environment. Run `npm install` in each app folder, then `npm run build` in `client` and `npm test` in `server`.


## Dependency fix 2.0.1

- Resolved the npm `ERESOLVE` conflict by aligning React, React DOM, and React type packages to React 19.1.x, matching the Signal SDK 14.4.x peer requirement.
- A clean `npm install` and client production build still need to be run on the user's Windows machine; this environment cannot confirm a registry install.
