import { Room, Peer } from "../types/index.ts";

const rooms = new Map<string, Room>();

function generateId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function createRoom(name: string): Room {
  const id = generateId();
  const room: Room = { id, name, peers: new Map(), createdAt: Date.now() };
  rooms.set(id, room);
  return room;
}

export function getRoom(id: string): Room | undefined {
  return rooms.get(id);
}

export function listRooms(): { id: string; name: string; participants: number; createdAt: number }[] {
  return Array.from(rooms.values()).map((r) => ({
    id: r.id,
    name: r.name,
    participants: r.peers.size,
    createdAt: r.createdAt,
  }));
}

export function deleteRoom(id: string): boolean {
  return rooms.delete(id);
}

export function addPeer(roomId: string, peer: Peer): boolean {
  const room = rooms.get(roomId);
  if (!room) return false;
  room.peers.set(peer.userId, peer);
  return true;
}

export function removePeer(roomId: string, userId: string): boolean {
  const room = rooms.get(roomId);
  if (!room) return false;
  room.peers.delete(userId);
  if (room.peers.size === 0) rooms.delete(roomId);
  return true;
}

export function getPeers(roomId: string): Peer[] {
  const room = rooms.get(roomId);
  if (!room) return [];
  return Array.from(room.peers.values());
}

export function findPeerRoom(userId: string): { room: Room; peer: Peer } | undefined {
  for (const room of rooms.values()) {
    const peer = room.peers.get(userId);
    if (peer) return { room, peer };
  }
  return undefined;
}
