import express from "express";
import serverless from "serverless-http";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase with Service Role Key for server-side operations
const getSupabase = () => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase credentials missing in Netlify environment');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
};

const app = express();
app.use(express.json({ limit: '50mb' }));

// Helper to interact with Supabase (replacing JSON file logic)
const getFromSupabase = async (table: string, ownerId?: string) => {
  const supabase = getSupabase();
  let query = supabase.from(table).select('*');
  if (ownerId) {
    query = query.eq('owner_id', ownerId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data;
};

const saveToSupabase = async (table: string, data: any, ownerId: string) => {
  const supabase = getSupabase();
  const { error } = await supabase
    .from(table)
    .upsert({ ...data, owner_id: ownerId, updated_at: new Date().toISOString() });
  if (error) throw error;
  return { success: true };
};

// API Routes (Prefix with /.netlify/functions/api if calling directly, but we'll use redirects)
const router = express.Router();

router.get("/health", (req, res) => {
  res.json({ status: "ok", environment: "netlify-functions" });
});

router.post("/ai/report", async (req, res) => {
  const { prompt } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: "Gemini API Key missing" });
  
  try {
    const ai = new GoogleGenAI({ apiKey });
    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt
    });
    res.json({ text: result.text || "No response generated" });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Note: Standard WebSockets are not supported in Netlify Functions.
// Logic for /api/data, /api/users etc. should be migrated to call Supabase directly from frontend
// or via these serverless routes if additional logic is needed.

app.use("/api", router);

export const handler = serverless(app);
