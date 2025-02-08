# QuickTalk - Chat Application

QuickTalk is a real-time chat application built with the MERN stack (MongoDB, Express, React, Node.js), utilizing **Zustand** for state management and **WebRTC** for peer-to-peer audio and video calls. The app also integrates **Socket.io** for real-time communication and **Cloudinary** for image storage.

## Features

- **Real-time Chat:** Instant messaging with support for private and group chats using Socket.io.
- **Audio/Video Calls:** Peer-to-peer communication with WebRTC for high-quality audio and video calls.
- **State Management:** Zustand is used for efficient and simple state management.
- **Image Storage:** Store and serve images using Cloudinary.
- **Notifications:** Real-time notifications for incoming messages and calls.
- **Responsive Design:** Fully responsive UI for seamless usage on desktop and mobile devices.
- **Message Deletion:** Automatically deletes messages after 24 hours.

## Technologies Used

- **Frontend:** React, Zustand, WebRTC
- **Backend:** Node.js, Express, Socket.io
- **Database:** MongoDB
- **Storage:** Cloudinary (for image uploads)
- **Authentication:** JWT (JSON Web Token)

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/Anujpal05/ChatApp
   ```

2. Navigate to the project directory:

   ```base
   cd ChatApp
   ```

   3.Install the dependencies for the backend:

   ```base
   cd server
   npm Install
   ```

3. Install the dependencies for the frontend:

   ```base
   cd client
   npm Install
   ```

4. Set up environment variables:

- Create a .env file in the server folder with the following variables
  ```base
  MONGODB_URL = YOUR_MONGODB_URL
  SECRET_KEY = YOUR_JWT_SECRET_KEY
  PORT = YOUR_PORT
  CLOUDINARY_CLOUD_NAME = YOUR_CLOUDNAME
  CLOUDINARY_API_KEY = YOUR_CLOUDINARY_API_KEY
  CLOUDINARY_API_SECRET = YOUR_CLOUDINARY_API_SECRET
  CLIENT_URL = YOUR_CLIENT_URL
  ```
- Create a .env file in the client folder with the following variables
  ```base
  VITE_SERVER_URL = YOUR_SERVER_URL
  ```

6. Start the backend:

   ```base
   cd server
   npm start
   ```

7. Start the frontend:

   ```base
   cd client
   npm run dev
   ```

## Usage

- Once both the frontend and backend are running, open the app in your browser (http://localhost:5173).
- Sign up and log in using JWT authentication.
- Start chatting with friends, share images, and make audio/video calls.

## Contributing

Feel free to fork the project, create pull requests, or open issues for improvements. Contributions are welcome!
