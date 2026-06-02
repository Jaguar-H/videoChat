import { Hono } from "npm:hono";
import { upgradeWebSocket } from "npm:hono/deno";
import { addPeer, removePeer, getPeers, findPeerRoom } from "../services/roomManager.ts";
import { SignalMessage } from "../types/index.ts";

const ws = new Hono();

ws.get(
  "/signal",
  upgradeWebSocket(() => {
    let currentUserId: string | null = null;
    let currentRoomId: string | null = null;

    return {
      onMessage(event, ws) {
        let msg: SignalMessage;
        try {
          msg = JSON.parse(event.data as string);
        } catch {
          return;
        }

        if (msg.type === "join") {
          currentUserId = msg.userId;
          currentRoomId = msg.roomId;

          const existingPeers = getPeers(msg.roomId);

          const added = addPeer(msg.roomId, {
            userId: msg.userId,
            username: msg.username,
            socket: ws.raw as WebSocket,
          });

          if (!added) {
            ws.send(JSON.stringify({ type: "error", message: "Room not found" }));
            return;
          }

          // Notify the new peer of everyone already in the room
          ws.send(
            JSON.stringify({
              type: "room-peers",
              peers: existingPeers.map((p) => ({ userId: p.userId, username: p.username })),
            })
          );

          // Notify existing peers that a new user joined
          for (const peer of existingPeers) {
            safeSend(peer.socket, {
              type: "user-joined",
              roomId: msg.roomId,
              userId: msg.userId,
              username: msg.username,
            });
          }
          return;
        }

        if (msg.type === "leave") {
          handleLeave(currentRoomId, currentUserId);
          currentUserId = null;
          currentRoomId = null;
          return;
        }

        // Relay offer / answer / ice-candidate to the target peer
        if (msg.type === "offer" || msg.type === "answer" || msg.type === "ice-candidate") {
          const peers = getPeers(msg.roomId);
          const target = peers.find((p) => p.userId === msg.to);
          if (target) {
            safeSend(target.socket, { ...msg, from: currentUserId });
          }
        }
      },

      onClose() {
        handleLeave(currentRoomId, currentUserId);
      },

      onError() {
        handleLeave(currentRoomId, currentUserId);
      },
    };
  })
);

function safeSend(socket: WebSocket, data: unknown) {
  try {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(data));
    }
  } catch {
    // ignore closed socket errors
  }
}

function handleLeave(roomId: string | null, userId: string | null) {
  if (!roomId || !userId) return;
  const peers = getPeers(roomId);
  removePeer(roomId, userId);
  for (const peer of peers) {
    if (peer.userId !== userId) {
      safeSend(peer.socket, { type: "user-left", userId });
    }
  }
}

export default ws;
