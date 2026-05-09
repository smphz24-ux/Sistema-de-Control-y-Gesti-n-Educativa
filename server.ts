
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

const getFileName = (key: string) => {
  if (key === 'users') return 'usuarios.json';
  return `${key}.json`;
};

// Helper to read/write JSON files
const readData = async (key: string, defaultVal: any = []) => {
  const file = path.join(DATA_DIR, getFileName(key));
  if (!fs.existsSync(file)) return defaultVal;
  try {
    const rawData = fs.readFileSync(file, "utf-8");
    return rawData ? JSON.parse(rawData) : defaultVal;
  } catch (e) {
    console.error(`Error parsing JSON from ${file}:`, e);
    return defaultVal;
  }
};

const writeData = async (key: string, data: any) => {
  try {
    const file = path.join(DATA_DIR, getFileName(key));
    const tempFile = path.join(DATA_DIR, `${getFileName(key)}.tmp`);
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2));
    fs.renameSync(tempFile, file);
  } catch (e) {
    console.error(`File write error for ${key}:`, e);
  }
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
        const messageStr = message.toString();
        const data = messageStr ? JSON.parse(messageStr) : {};
        if (data && data.type === "join" && data.ownerId) {
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
  app.get("/api/config", async (req, res) => {
    try {
      const data = await readData("config", null);
      res.json(data);
    } catch (e) {
      console.error("Failed to read config:", e);
      res.status(500).json({ error: "Failed to read config", details: e instanceof Error ? e.message : String(e) });
    }
  });

  app.post("/api/config", async (req, res) => {
    try {
      await writeData("config", req.body);
      
      // Broadcast config update to ALL connected clients
      const payload = JSON.stringify({ type: "config_update", data: req.body });
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      });
      
      res.json({ success: true });
    } catch (e) {
      console.error("Error saving config:", e);
      res.status(500).json({ error: "Failed to save config" });
    }
  });

  app.get("/api/users", async (req, res) => {
    try {
      res.json(await readData("users", []));
    } catch (e) {
      res.status(500).json({ error: "Failed to read users" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      await writeData("users", req.body);
      
      // Broadcast users update to ALL connected clients
      const payload = JSON.stringify({ type: "users_update", data: req.body });
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      });
      
      res.json({ success: true });
    } catch (e) {
      console.error("Error saving users:", e);
      res.status(500).json({ error: "Failed to save users" });
    }
  });

  app.post("/api/ai/report", async (req, res) => {
    const { prompt } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: "Gemini API Key no configurada" });
    }
    try {
      const ai = new GoogleGenAI({ apiKey });
      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });
      res.json({ text: result.text || "No se pudo generar respuesta" });
    } catch (e) {
      console.error("AI report error:", e);
      res.status(500).json({ error: "AI error: " + (e instanceof Error ? e.message : String(e)) });
    }
  });

  app.get("/api/public/search/:dni", async (req, res) => {
    try {
      const allData = await readData("app_data", {});
      const dni = req.params.dni;
      let foundStudent = null;
      let foundOwnerId = null;

      // Search across all users' data
      for (const ownerId in allData) {
        const userData = allData[ownerId];
        if (userData && userData.students) {
          const student = userData.students.find((s: any) => s.dni === dni);
          if (student) {
            foundStudent = student;
            foundOwnerId = ownerId;
            break;
          }
        }
      }

      if (foundStudent) {
        // Return the student and the necessary related data (attendance, grades, etc.) from that owner
        const ownerData = allData[foundOwnerId];
        res.json({
          student: foundStudent,
          attendance: ownerData.attendance || [],
          grades: ownerData.grades || [],
          incidences: ownerData.incidences || [],
          schedules: ownerData.schedules || [],
          ownerId: foundOwnerId,
          // Include these for ConsultasModal to work correctly with names/colors
          courses: ownerData.courses || [],
          gradeLevels: ownerData.gradeLevels || [],
          examTypes: ownerData.examTypes || [],
          timeSlots: ownerData.timeSlots || [],
          schoolDays: ownerData.schoolDays || []
        });
      } else {
        res.status(404).json({ error: "Student not found" });
      }
    } catch (e) {
      console.error("Public search error:", e);
      res.status(500).json({ error: "Search failed" });
    }
  });

  app.post("/api/public/save-grade", async (req, res) => {
    try {
      const { ownerId, grade } = req.body;
      if (!ownerId || !grade) {
        return res.status(400).json({ error: "Missing ownerId or grade" });
      }

      const allData = await readData("app_data", {});
      if (!allData[ownerId]) {
        return res.status(404).json({ error: "Owner data not found" });
      }

      if (!allData[ownerId].grades) allData[ownerId].grades = [];
      allData[ownerId].grades.push(grade);

      await writeData("app_data", allData);
      
      // Broadcast update to all clients in that owner's room
      broadcast(ownerId, allData[ownerId]);
      
      res.json({ success: true });
    } catch (e) {
      console.error("Public save grade error:", e);
      res.status(500).json({ error: "Failed to save grade" });
    }
  });

  app.get("/api/data/:ownerId", async (req, res) => {
    try {
      const allData = await readData("app_data", {});
      res.json(allData[req.params.ownerId] || {});
    } catch (e) {
      res.status(500).json({ error: "Failed to read data" });
    }
  });

  app.post("/api/data/:ownerId", async (req, res) => {
    try {
      const allData = await readData("app_data", {});
      allData[req.params.ownerId] = req.body;
      await writeData("app_data", allData);
      
      // Broadcast update to other clients in the same room
      broadcast(req.params.ownerId, req.body);
      
      res.json({ success: true });
    } catch (e) {
      console.error("Error saving data:", e);
      res.status(500).json({ error: "Failed to save data" });
    }
  });

  // Health check for deployment - MUST be before Vite middleware
  app.get("/api/health", (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.json({ status: "ok", timestamp: new Date().toISOString(), version: "1.0.1" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
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
