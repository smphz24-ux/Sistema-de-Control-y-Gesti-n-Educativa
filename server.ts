
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase Configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://chotldwdxrbzovmmtnsh.supabase.co";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNob3RsZHdkeHJiem92bW10bnNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNzUzMzIsImV4cCI6MjA5Mzc1MTMzMn0.EME9M9cSy9FvfHvcx2gMPkp1H5Dj4YaKufPRsAyon8Tf";
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper to read/write from Supabase (Persistent Storage)
const readFromSupabase = async (key: string, defaultVal: any = []) => {
  try {
    const { data, error } = await supabase
      .from('app_persistence')
      .select('data')
      .eq('key', key)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return defaultVal; // Not found
      console.error(`Supabase read error for ${key}:`, error);
      return defaultVal;
    }
    return data?.data || defaultVal;
  } catch (e) {
    console.error(`Unexpected read error for ${key}:`, e);
    return defaultVal;
  }
};

const writeToSupabase = async (key: string, data: any) => {
  try {
    const { error } = await supabase
      .from('app_persistence')
      .upsert({ key, data, updated_at: new Date().toISOString() });

    if (error) {
      console.error(`Supabase write error for ${key}:`, error);
      throw error;
    }
  } catch (e) {
    console.error(`Unexpected write error for ${key}:`, e);
    throw e;
  }
};

// Keep JSON compatibility layer (Optional: for local migration or fallback)
const DATA_DIR = path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

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
      const data = await readFromSupabase("config", null);
      res.json(data);
    } catch (e) {
      console.error("Failed to read config:", e);
      res.status(500).json({ error: "Failed to read config" });
    }
  });

  app.post("/api/config", async (req, res) => {
    try {
      await writeToSupabase("config", req.body);
      
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
      res.json(await readFromSupabase("users", []));
    } catch (e) {
      res.status(500).json({ error: "Failed to read users" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      await writeToSupabase("users", req.body);
      
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
      // For public search, we need to find the student across ALL owner data
      // We fetch all rows starting with 'owner_data:'
      const { data: allPersistenceRows, error } = await supabase
        .from('app_persistence')
        .select('*')
        .like('key', 'owner_data:%');

      if (error) throw error;

      const dni = req.params.dni;
      let foundStudent = null;
      let foundOwnerId = null;
      let ownerData = null;

      for (const row of allPersistenceRows || []) {
        const data = row.data;
        const oId = row.key.split(':')[1];
        if (data && data.students) {
          const student = data.students.find((s: any) => s.dni === dni);
          if (student) {
            foundStudent = student;
            foundOwnerId = oId;
            ownerData = data;
            break;
          }
        }
      }

      if (foundStudent && ownerData) {
        res.json({
          student: foundStudent,
          attendance: ownerData.attendance || [],
          grades: ownerData.grades || [],
          incidences: ownerData.incidences || [],
          schedules: ownerData.schedules || [],
          ownerId: foundOwnerId,
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

      const persistenceKey = `owner_data:${ownerId}`;
      const data = await readFromSupabase(persistenceKey, null);
      if (!data) {
        return res.status(404).json({ error: "Owner data not found" });
      }

      if (!data.grades) data.grades = [];
      data.grades.push(grade);

      await writeToSupabase(persistenceKey, data);
      broadcast(ownerId, data);
      
      res.json({ success: true });
    } catch (e) {
      console.error("Public save grade error:", e);
      res.status(500).json({ error: "Failed to save grade" });
    }
  });

  app.get("/api/data/:ownerId", async (req, res) => {
    try {
      const data = await readFromSupabase(`owner_data:${req.params.ownerId}`, {});
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: "Failed to read data" });
    }
  });

  app.post("/api/data/:ownerId", async (req, res) => {
    try {
      const ownerId = req.params.ownerId;
      await writeToSupabase(`owner_data:${ownerId}`, req.body);
      broadcast(ownerId, req.body);
      res.json({ success: true });
    } catch (e) {
      console.error("Error saving data:", e);
      res.status(500).json({ error: "Failed to save data" });
    }
  });

  // Health check for deployment
  app.get("/api/health", (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.json({ status: "ok", timestamp: new Date().toISOString(), version: "1.1.0-supabase" });
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
