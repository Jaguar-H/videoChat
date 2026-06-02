# Video Chat Application - Detailed Specification

## Project Overview
Build a real-time video chat application that enables users to create chat rooms and join existing rooms to conduct peer-to-peer or group video calls.

## Core Features

### 1. Room Management
- **Create Room**: User can create a new video chat room and receive a unique shareable room ID/code
- **Join Room**: Other users can join an existing room using a room ID/code or direct link
- **Room Display**: Show list of active rooms with participant count
- **Leave Room**: Clean disconnection from a room, with proper cleanup of WebRTC connections  
- **Room Persistence**: Rooms should exist until the last participant leaves

### 2. Video Call Functionality
- **Peer-to-Peer Video**: Direct WebRTC connections between participants
- **Multi-participant Support**: Support multiple users in one room (start with 2-4 participants, scalable design)
- **Audio/Video Controls**: Toggle audio/video on and off without leaving the call
- **Stream Quality**: Basic quality settings (720p, 480p, 360p)
- **Connection Status**: Display connection quality and participant presence
- **Screen Sharing (Optional Phase 2)**: Share screen in addition to camera feed

### 3. User Interface
- **Login/User Identification**: Simple username entry (no authentication required for MVP)
- **Room List Page**: Browse and join available rooms
- **Video Call Page**: Display participant video feeds in grid layout
- **Controls Panel**: Mute/unmute, video on/off, leave call buttons
- **Responsive Design**: Works on desktop and mobile browsers

## Tech Stack

### Backend
- **Runtime**: Deno (latest stable)
- **Framework**: Fresh (for routing) or Oak (for REST API)
- **Signaling Server**: Custom WebSocket server in Deno for:
  - Room management
  - Peer discovery
  - SDP offer/answer exchange
  - ICE candidate exchange
- **Database**: (Optional) Deno KV for room state, or in-memory storage for MVP

### Frontend
- **Language**: Modern JavaScript (ES modules)
- **Framework**: Vanilla JS or lightweight framework (e.g., Preact for minimal bundle)
- **WebRTC**: Native WebRTC API
- **Styling**: CSS/Tailwind CSS
- **Build Tool**: Vite or Deno's built-in bundler

## Architecture

### Backend Architecture
```
deno-server/
├── routes/
│   ├── api/rooms.ts (room CRUD operations)
│   ├── api/signal.ts (WebSocket signaling endpoint)
│   └── ws.ts (WebSocket connection handler)
├── services/
│   ├── roomManager.ts (room state management)
│   ├── signalingService.ts (SDP/ICE handling)
│   └── iceServers.ts (STUN/TURN configuration)
├── types/
│   └── index.ts (interfaces for messages, rooms, etc.)
└── server.ts (entry point)
```

### Frontend Architecture
```
frontend/
├── index.html
├── js/
│   ├── main.js (app initialization)
│   ├── rtcManager.js (WebRTC connection handling)
│   ├── signalingClient.js (WebSocket communication)
│   ├── roomManager.js (room UI management)
│   └── videoManager.js (local/remote stream handling)
├── css/
│   ├── styles.css
│   └── layout.css (responsive grid)
└── assets/
```

## WebRTC Implementation Details

### Signaling Flow
1. **Room Creation**: User A creates room, connects to signaling server
2. **Room Join**: User B joins room via ID, signaling server notifies User A
3. **Offer/Answer**: User A creates offer, User B creates answer, exchanged via WebSocket
4. **ICE Candidates**: Both peers exchange ICE candidates for connection establishment
5. **Direct Connection**: Once candidates are gathered, P2P connection established
6. **Cleanup**: On disconnect, close all connections and notify other peers

### Configuration
- **STUN Servers**: Google's free STUN servers (stun.l.google.com:19302)
- **TURN Servers**: Optional for NAT traversal (can be added later)
- **Codec Support**: Use browser defaults (VP9/H264 for video, Opus for audio)

## API Specification

### REST Endpoints
- `GET /api/rooms` - List active rooms
- `POST /api/rooms` - Create new room
- `GET /api/rooms/:id` - Get room details
- `DELETE /api/rooms/:id` - Delete room

### WebSocket Messages (Signaling)
```javascript
// Client to Server
{ type: "join", roomId: "room123", userId: "user456", username: "John" }
{ type: "offer", roomId: "room123", to: "userId", sdp: "..." }
{ type: "answer", roomId: "room123", to: "userId", sdp: "..." }
{ type: "ice-candidate", roomId: "room123", to: "userId", candidate: "..." }
{ type: "leave", roomId: "room123" }

// Server to Client
{ type: "user-joined", roomId: "room123", userId: "userId", username: "John" }
{ type: "offer", from: "userId", sdp: "..." }
{ type: "answer", from: "userId", sdp: "..." }
{ type: "ice-candidate", from: "userId", candidate: "..." }
{ type: "user-left", userId: "userId" }
```

## Development Phases

### Phase 1: MVP (Core Functionality)
- Backend signaling server with room management
- Frontend: Create/join rooms
- 1-to-1 video calling with audio
- Basic UI with video grid layout

### Phase 2: Enhancement
- Multi-user support (3+ participants)
- Audio/video toggle controls
- Connection status indicators
- Improved UI with participant names

### Phase 3: Optional
- Screen sharing
- Chat functionality
- Recording capability
- Username/room persistence

## Deployment & Hosting
- **Backend**: Deploy Deno app (Deno Deploy or Docker/VPS)
- **Frontend**: Static hosting (Vercel, Netlify, or same server)
- **STUN/TURN**: Use free STUN for MVP, add TURN for production if NAT issues arise

## Constraints & Notes
- No database required for MVP (in-memory room storage is fine)
- No user authentication for MVP (rooms are access-controlled by ID)
- Browser Support: Chrome/Edge 60+, Firefox 55+, Safari 11+
- Development: Use localhost for testing, expose via ngrok or tunnel for mobile testing
- Error Handling: Handle network failures, peer disconnections gracefully 
