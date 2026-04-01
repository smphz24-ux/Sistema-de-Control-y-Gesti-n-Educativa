
import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

const USERS_FILE = path.join(DATA_DIR, "users.json");
const APP_DATA_FILE = path.join(DATA_DIR, "app_data.json");
const CONFIG_FILE = path.join(DATA_DIR, "config.json");

// Helper to read/write JSON files
const readJson = (file: string, defaultVal: any = []) => {
  if (!fs.existsSync(file)) return defaultVal;
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch (e) {
    return defaultVal;
  }
};

const writeJson = (file: string, data: any) => {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
};

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer });

  app.use(express.json({ limit: '50mb' }));

  const clients = new Map<string, Set<WebSocket>>();

  wss.on("connection", (ws) => {
    let currentOwnerId: string | null = null;

    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === "join" && data.ownerId) {
          currentOwnerId = data.ownerId;
          if (!clients.has(currentOwnerId!)) {
            clients.set(currentOwnerId!, new Set());
          }
          clients.get(currentOwnerId!)!.add(ws);
          console.log(`Client joined room: ${currentOwnerId}`);
        }
      } catch (e) {
        console.error("WS error:", e);
      }
    });

    ws.on("close", () => {
      if (currentOwnerId && clients.has(currentOwnerId)) {
        clients.get(currentOwnerId)!.delete(ws);
        if (clients.get(currentOwnerId)!.size === 0) {
          clients.delete(currentOwnerId);
        }
      }
    });
  });

  const broadcast = (ownerId: string, data: any, senderWs?: WebSocket) => {
    const room = clients.get(ownerId);
    if (room) {
      const payload = JSON.stringify({ type: "update", data });
      room.forEach((client) => {
        if (client !== senderWs && client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      });
    }
  };

  // API Routes
  app.get("/api/config", (req, res) => {
    res.json(readJson(CONFIG_FILE, null));
  });

  app.post("/api/config", (req, res) => {
    writeJson(CONFIG_FILE, req.body);
    
    // Broadcast config update to ALL connected clients
    const payload = JSON.stringify({ type: "config_update", data: req.body });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
    
    res.json({ success: true });
  });

  app.get("/api/users", (req, res) => {
    res.json(readJson(USERS_FILE, []));
  });

  app.post("/api/users", (req, res) => {
    writeJson(USERS_FILE, req.body);
    
    // Broadcast users update to ALL connected clients
    const payload = JSON.stringify({ type: "users_update", data: req.body });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
    
    res.json({ success: true });
  });

  app.get("/api/data/:ownerId", (req, res) => {
    const allData = readJson(APP_DATA_FILE, {});
    res.json(allData[req.params.ownerId] || {});
  });

  app.post("/api/data/:ownerId", (req, res) => {
    const allData = readJson(APP_DATA_FILE, {});
    allData[req.params.ownerId] = req.body;
    writeJson(APP_DATA_FILE, allData);
    
    // Broadcast update to other clients in the same room
    broadcast(req.params.ownerId, req.body);
    
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = 3000;
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
