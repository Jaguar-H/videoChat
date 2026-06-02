# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a real-time peer-to-peer video chat application built with Deno (backend) and vanilla JavaScript (frontend). Users can create rooms, join existing rooms, and conduct video calls with multiple participants using WebRTC for peer connections and WebSockets for signaling.

## Development Commands

### Start Development Server
```bash
deno run --allow-net --allow-read --allow-env --watch server/server.ts
```
This runs the server with file watching enabled, perfect for development iteration.

### Start Production Server
```bash
deno run --allow-net --allow-read --allow-env server/server.ts
```
Or set the PORT environment variable:
```bash
PORT=3000 deno run --allow-net --allow-read --allow-env server/server.ts
```

### Run with Docker
```bash
docker build -t videochat .
docker run -p 8000:8000 videochat
```

### Cache Dependencies
```bash
deno cache server/server.ts
```
Useful before deployment to pre-download dependencies.

## Architecture Overview

### Backend Architecture (Deno + Hono)

The backend is a lightweight WebRTC signaling server and room management system:

- **`server/server.ts`** - Entry point that sets up the Hono app, routes, and serves frontend static files. Listens on port 8000 (configurable via PORT env var).

- **`server/routes/api.ts`** - REST endpoints:
  - `GET /api/rooms` - List all active rooms with participant counts
  - `POST /api/rooms` - Create a new room (accepts optional `name` field)
  - `GET /api/rooms/:id` - Get room details
  - `DELETE /api/rooms/:id` - Delete/close a room

- **`server/routes/ws.ts`** - WebSocket signaling handler at `/ws/signal`:
  - Handles WebRTC SDP offer/answer and ICE candidate exchange between peers
  - Manages room membership (join/leave)
  - Broadcasts user-joined/user-left notifications
  - Uses `safeSend()` to gracefully handle closed sockets
  - Auto-deletes rooms when the last peer leaves

- **`server/services/roomManager.ts`** - In-memory room state:
  - `Room` type: `{ id, name, peers: Map<userId, Peer>, createdAt }`
  - `Peer` type: `{ userId, username, socket: WebSocket }`
  - Functions for CRUD operations and peer discovery
  - ID generation: 6-character uppercase random strings

- **`server/types/index.ts`** - TypeScript interfaces for signaling protocol:
  - Message types: `join`, `offer`, `answer`, `ice-candidate`, `leave`
  - Server-to-client types: `room-peers`, `user-joined`, `user-left`, `error`

**Key Design Notes:**
- No persistent database; rooms exist only in memory during server runtime
- Rooms are automatically garbage-collected when empty
- Signaling is peer-to-peer after initial server-brokered SDP exchange
- STUN servers for NAT traversal: Google's free STUN at `stun.l.google.com:19302`

### Frontend Architecture (Vanilla JS + WebRTC)

The frontend is a two-page SPA:

- **`frontend/index.html` + `frontend/js/main.js`** - Lobby page:
  - Username entry with localStorage persistence
  - Room creation with optional name
  - Room list with live updates every 4 seconds
  - Join button navigates to `/room.html?roomId=X&username=Y`

- **`frontend/room.html` + `frontend/js/room.js`** - Call page:
  - Orchestrates all call logic: media, signaling, RTC connections, UI updates
  - Manages local and remote video tiles
  - Handles mic/camera toggles
  - Gracefully handles permission denials (continues with empty streams)

- **`frontend/js/signalingClient.js`** - WebSocket client:
  - Wraps WebSocket connection to `/ws/signal`
  - Auto-queues messages until connection opens
  - Parses incoming signaling messages

- **`frontend/js/rtcManager.js`** - WebRTC peer management:
  - Maintains `Map<peerId, RTCPeerConnection>`
  - Creates peers and adds local tracks
  - Handles offer/answer/ICE-candidate exchange
  - Collects remote streams and fires `onRemoteStream()` callback
  - STUN config: Google's free STUN server

- **`frontend/js/videoManager.js`** - Video tile rendering:
  - Renders local and remote video elements in grid
  - Handles "no-video" overlay when camera is disabled
  - Manages video element lifecycle (add/remove/update)

**Call Flow:**
1. User enters username, creates or joins room
2. Browser navigates to `room.html?roomId=X&username=Y`
3. Local media acquired via `getUserMedia()` (graceful fallback if denied)
4. WebSocket connects to `/ws/signal` and sends `join` message
5. Server responds with list of existing peers in room
6. For each existing peer, our RTCManager creates an offer
7. Peer receives offer, creates answer
8. ICE candidates exchanged until connection established
9. Remote streams trigger video tiles

### Data Flow: The Signaling Protocol

Client → Server messages:
```javascript
{ type: "join", roomId, userId, username }           // Enter room
{ type: "offer", roomId, to: peerId, sdp }           // WebRTC offer
{ type: "answer", roomId, to: peerId, sdp }          // WebRTC answer
{ type: "ice-candidate", roomId, to: peerId, candidate }  // ICE candidate
{ type: "leave", roomId }                             // Exit room
```

Server → Client messages:
```javascript
{ type: "room-peers", peers: [{userId, username}, ...] }  // Initial peer list
{ type: "user-joined", roomId, userId, username }    // Someone joined
{ type: "offer", from: userId, sdp }                 // Forwarded offer
{ type: "answer", from: userId, sdp }                // Forwarded answer
{ type: "ice-candidate", from: userId, candidate }   // Forwarded ICE
{ type: "user-left", userId }                        // Someone left
{ type: "error", message }                           // Error (e.g., room not found)
```

## Important Implementation Details

### Peer Connection Management
- Each peer in a call has a separate RTCPeerConnection
- Local tracks are added to all peer connections from `localStream`
- Remote tracks trigger the `track` event, which adds to `remoteStream`
- Peers are cleaned up when users leave or disconnect

### Error Handling
- Missing camera/mic permissions: App continues with empty MediaStream (black/silent)
- Closed WebSocket during send: `safeSend()` checks readyState before sending
- Rooms not found: API returns 404, WebSocket sends error message
- Invalid JSON: Silently ignored in message handlers

### State Management
- **Server:** In-memory `Map<roomId, Room>` in `roomManager.ts`
- **Client:** RTCManager maintains peer map; room.js tracks participant names
- Username persistence: localStorage key `vc_username`

## Key Files to Understand When Making Changes

- **Adding new signaling messages:** Update `server/types/index.ts`, add handler in `server/routes/ws.ts`, and add client-side handler in `frontend/js/room.js`
- **Changing room lifecycle:** Modify `server/services/roomManager.ts` and corresponding API routes
- **UI changes on the lobby:** Edit `frontend/index.html` and `frontend/js/main.js`
- **UI changes on the call page:** Edit `frontend/room.html` and `frontend/js/room.js`
- **Video grid layout:** Modify `frontend/css/styles.css` and `frontend/js/videoManager.js`

## Deployment Notes

The app is containerized for Render.com deployment:
- `Dockerfile` uses `denoland/deno:2.3.3`
- Health check: `GET /api/rooms`
- `render.yaml` defines the service configuration
- Environment: PORT is read from `Deno.env.get("PORT")`
