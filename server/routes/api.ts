import { Hono } from "npm:hono";
import { createRoom, listRooms, getRoom, deleteRoom } from "../services/roomManager.ts";

const api = new Hono();

api.get("/rooms", (c) => {
  return c.json(listRooms());
});

api.post("/rooms", async (c) => {
  const body = await c.req.json<{ name?: string }>();
  const name = body.name?.trim() || "Unnamed Room";
  const room = createRoom(name);
  return c.json({ id: room.id, name: room.name, participants: 0, createdAt: room.createdAt }, 201);
});

api.get("/rooms/:id", (c) => {
  const room = getRoom(c.req.param("id"));
  if (!room) return c.json({ error: "Room not found" }, 404);
  return c.json({ id: room.id, name: room.name, participants: room.peers.size, createdAt: room.createdAt });
});

api.delete("/rooms/:id", (c) => {
  const deleted = deleteRoom(c.req.param("id"));
  if (!deleted) return c.json({ error: "Room not found" }, 404);
  return c.json({ success: true });
});

export default api;
