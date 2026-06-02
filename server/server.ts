import { Hono } from "npm:hono";
import { serveStatic } from "npm:hono/deno";
import api from "./routes/api.ts";
import ws from "./routes/ws.ts";

const app = new Hono();

app.route("/api", api);
app.route("/ws", ws);

// Serve frontend static files
app.use("/*", serveStatic({ root: "./frontend" }));

const port = parseInt(Deno.env.get("PORT") ?? "8000");
Deno.serve({ port }, app.fetch);

console.log(`Server running at http://localhost:${port}`);
