# QuickTalk — Real-Time Chat Application

QuickTalk is a privacy-focused, full-stack messaging application built with **React, Node.js, Express, MongoDB, Socket.IO and WebRTC**. It combines real-time one-to-one conversations with encrypted messaging, media attachments, stories, audio/video calls and an AI writing assistant.

> **Live Demo:**   https://chat-app-quicktalk.netlify.app/

## Table of Contents

- [Highlights](#highlights)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Signal Protocol Setup](#signal-protocol-setup)
- [AI Assistant Configuration](#ai-assistant-configuration)
- [Audio and Video Calling](#audio-and-video-calling)
- [API Overview](#api-overview)
- [Security and Privacy Notes](#security-and-privacy-notes)
- [Known Limitations and Roadmap](#known-limitations-and-roadmap)
- [Testing](#testing)
- [Author](#author)

## Highlights

- Real-time one-to-one messaging with online presence and typing indicators.
- Signal Protocol client integration for end-to-end encrypted message transport.
- AES-GCM encrypted message-history archive and encrypted media attachments.
- Message editing, deletion, and sent/delivered/read receipt data.
- Image, audio and video attachments.
- 24-hour image/video stories with captions and viewer tracking.
- WebRTC audio and video calls with call history.
- Microphone/camera controls, camera switching and screen sharing.
- AI writing assistant for rewriting, smart replies, summarizing, translation and tone checking.
- JWT authentication using HTTP-only cookies.
- Responsive React interface with Zustand state management.

## Features

### 1. Authentication and user profiles

- User registration and login using a username and password.
- Optional email during registration.
- Password hashing with `bcrypt`.
- JWT-based sessions stored in an HTTP-only cookie.
- Logout and profile updates.
- User avatar, bio and status text fields.
- Online status and last-seen information.
- Login and registration rate limiting.

### 2. Real-time one-to-one chat

- Browse registered users and search contacts by username.
- Online/offline presence updates through Socket.IO.
- Live typing indicators.
- Conversation-specific Socket.IO rooms.
- Real-time encrypted message delivery through the configured Signal Protocol Relay.
- Message timestamps.
- Message editing.
- Delete a message for yourself or delete it for everyone.
- Delivery/read receipt timestamps and message status data.


### 3. End-to-end encrypted messaging

The browser integrates [`@open-e2ee/signal-protocol-sdk`](https://www.npmjs.com/package/@open-e2ee/signal-protocol-sdk) and connects to a configured hosted Signal Protocol Relay.

- Device protocol state is stored in browser IndexedDB through the SDK's web storage adapter.
- A backend identity-assertion endpoint issues short-lived ES256-signed JWT assertions for Relay registration/refresh/recovery.
- The backend message-history API accepts encrypted payloads rather than plaintext message bodies.
- The application has a separate AES-256-GCM encrypted history archive mechanism.


### 4. Encrypted media attachments

- Attach image, audio and video files in one-to-one conversations.
- Client-side AES-GCM encryption before upload.
- Encrypted attachment blobs are uploaded to Cloudinary as raw files.
- The client retains the decryption key and IV in the encrypted message payload.
- Download and decrypt attachments in the browser.
- Maximum attachment size in the client helper: **25 MB**.

The file content is encrypted before it is uploaded. The attachment URL and some metadata are still stored by the application so the recipient can retrieve the encrypted blob.

### 5. Stories

- Publish image or video stories.
- Add a caption.
- View stories grouped by user.
- Record story views and show viewer information.
- Delete your own story.
- Stories expire after 24 hours through an `expiresAt` field and MongoDB TTL index.
- Image size limit: **10 MB**.
- Video size limit: **50 MB**.

The current story model uses a public-to-authenticated-users audience setting, subject to blocking checks. It does not currently provide granular custom story audiences.

### 6. Audio and video calls

Calling is implemented using **WebRTC** for peer-to-peer media and **Socket.IO** for signaling.

- One-to-one audio calls.
- One-to-one video calls.
- Incoming call invitation, accept, reject and hang-up flows.
- Call status and duration history.
- Microphone mute/unmute.
- Camera on/off.
- Switch between front and rear cameras where supported.
- Screen sharing during video calls.
- Connection-state handling and cleanup of media tracks.
- STUN configuration and optional TURN server configuration.

A TURN server is recommended for reliable connections across restrictive NATs and firewalls. Camera and microphone access requires HTTPS in deployed environments (or localhost during development).

## Technology Stack

| Category | Technologies |
|---|---|
| Frontend | React 19, JavaScript, Vite 6 |
| Styling | CSS, Tailwind CSS 3 |
| Routing | React Router 7 |
| State management | Zustand 5 |
| HTTP requests | Axios |
| Real-time client | Socket.IO Client |
| End-to-end encryption | `@open-e2ee/signal-protocol-sdk` |
| Browser encrypted storage | IndexedDB (`idb`), Web Crypto API |
| Backend | Node.js, Express 4 |
| Database | MongoDB, Mongoose 8 |
| Authentication | JSON Web Tokens, HTTP-only cookies |
| Password hashing | bcrypt |
| Real-time server | Socket.IO |
| Peer-to-peer calls | WebRTC |
| Media storage | Cloudinary |
| File upload handling | Multer |
| Testing | Node.js built-in test runner |

## Architecture

```text
                         QUICKTALK
                             |
              +--------------+--------------+
              |                             |
        React + Vite Client             Express API
              |                             |
       +------+------+               +------+------+
       |             |               |             |
    Zustand      Axios API       Controllers   Middleware
       |             |               |             |
       |       HTTP-only Cookie       +------+------+
       |             |                      |
       +-------------+                  Mongoose
              |                             |
       Socket.IO Client                 MongoDB
              |
       +------+----------------------+
       |                             |
  Presence / Typing             Call Signaling
                                      |
                                WebRTC Peer
                                      |
                              Audio / Video Media

  Encrypted Messaging:
  React Client <--> Signal Protocol SDK <--> Hosted Signal Relay

  Encrypted Attachments:
  Browser AES-GCM --> Cloudinary (encrypted blob) --> Browser decrypts

```

## Project Structure

```text
ChatApp/
├── client/
│   ├── public/
│   ├── src/
│   │   ├── Components/
│   │   │   └── CallExperience.jsx
│   │   ├── Pages/
│   │   │   ├── Home.jsx
│   │   │   └── Chat.jsx
│   │   ├── services/
│   │   │   ├── messageArchive.js
│   │   │   └── signalClient.js
│   │   ├── store/
│   │   │   ├── authStore.js
│   │   │   ├── callStore.js
│   │   │   └── chatStore.js
│   │   ├── utils/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── index.css
│   ├── utils/
│   │   └── axios.js
│   └── package.json
│
├── server/
│   ├── auth/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── scripts/
│   ├── utils/
│   ├── index.js
│   └── package.json
│
├── open-e2ee.config.ts
└── README.md
```

## Getting Started

### Prerequisites

Install the following before running the project:

- Node.js **22.18 or later** (recommended for the Signal SDK tooling).
- npm.
- MongoDB database (local MongoDB or MongoDB Atlas).
- Cloudinary account for encrypted attachment and story media storage.
- Signal Protocol Relay Sandbox project for encrypted messaging.
- Optional hosted AI API key or local Ollama-compatible service.
- Optional TURN server for production-quality calling.

### 1. Clone the repository

```bash
git clone https://github.com/Anujpal05/ChatApp.git
cd ChatApp
```

If your repository URL differs, replace the URL above with your repository's clone URL.

### 2. Configure the backend

```bash
cd server
npm install
```

Create a `.env` file inside `server/` (do not commit it):

```env
PORT=5001
CLIENT_URL=http://localhost:5173
MONGODB_URL=mongodb://127.0.0.1:27017/quicktalk
SECRET_KEY=replace_with_a_long_random_secret

# Cloudinary (required by media upload configuration)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Signal Relay identity (required for E2EE device registration)
SIGNAL_RELAY_ENVIRONMENT=sandbox
SIGNAL_RELAY_PUBLISHABLE_KEY=your_sandbox_publishable_key
SIGNAL_RELAY_ISSUER=https://your-configured-issuer
SIGNAL_RELAY_AUDIENCE=your_sandbox_audience
SIGNAL_RELAY_KID=your_signing_key_id
SIGNAL_RELAY_PRIVATE_JWK={"kty":"EC","crv":"P-256","x":"...","y":"...","d":"..."}

# AI configuration (optional)
AI_PROVIDER=hybrid
AI_BASE_URL=https://api.openai.com/v1/chat/completions
AI_MODEL=gpt-4o-mini
AI_API_KEY=your_server_side_api_key
AI_LOCAL_BASE_URL=http://localhost:11434/v1/chat/completions
AI_LOCAL_MODEL=llama3.2
```

Start the backend:

```bash
npm run dev
```

The API runs at `http://localhost:5001` by default.

### 3. Configure the frontend

Open a second terminal:

```bash
cd client
npm install
```

Create `client/.env`:

```env
VITE_SERVER_URL=http://localhost:5001
VITE_OPEN_E2EE_SIGNAL_RELAY_URL=your_signal_relay_sandbox_url

# Optional local testing only.
# For production, issue short-lived TURN credentials from the backend.
VITE_TURN_URL=
VITE_TURN_USERNAME=
VITE_TURN_CREDENTIAL=
```

Start the frontend:

```bash
npm run dev
```

Open the local Vite URL, normally `http://localhost:5173`.

### 4. Verify the backend

Open:

```text
http://localhost:5001/api/health
```

A healthy server returns a JSON response similar to:

```json
{
  "status": "ok",
  "service": "quicktalk-api",
  "timestamp": "..."
}
```

## Signal Protocol Setup

Encrypted message sending remains disabled until the Relay is correctly configured.

1. Create a Signal Protocol Relay project and use its Sandbox environment for development.
2. Configure the Relay identity mode as **Custom token from your backend (ES256)**.
3. Generate a P-256 signing key pair from the server directory:

   ```bash
   cd server
   npm run generate:signal-jwk
   ```

4. Add the public JWK to the Relay configuration.
5. Store the matching private JWK only in `server/.env` as `SIGNAL_RELAY_PRIVATE_JWK`.
6. Configure the server-side issuer, audience, key ID, environment and publishable key.
7. Set `VITE_OPEN_E2EE_SIGNAL_RELAY_URL` in the client environment.
8. Restart both applications and complete device registration.


## Author

**Anuj Pal**

- GitHub: [Anujpal05](https://github.com/Anujpal05)

---