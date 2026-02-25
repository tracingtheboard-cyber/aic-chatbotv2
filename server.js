/**
 * 本地运行：提供静态页面 + 入库 API，不部署 Vercel 也能用 ingest 网页工具。
 * 运行：npm run dev  然后打开 http://localhost:3000/ingest.html
 */

import dotenv from "dotenv";
dotenv.config();
dotenv.config({ path: ".env.local" });
dotenv.config({ path: "env.local" });
import express from "express";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(express.json());
app.use(express.static("."));

const CHUNK_MAX = 400;
const CHUNK_OVERLAP = 50;
const EMBEDDING_MODEL = "text-embedding-3-small";
const BATCH = 20;

function chunkText(text) {
  const paragraphs = text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  const chunks = [];
  for (const p of paragraphs) {
    if (p.length <= CHUNK_MAX) {
      chunks.push(p);
      continue;
    }
    for (let i = 0; i < p.length; i += CHUNK_MAX - CHUNK_OVERLAP) {
      const slice = p.slice(i, i + CHUNK_MAX);
      if (slice.trim()) chunks.push(slice);
    }
  }
  if (chunks.length === 0 && text.trim()) chunks.push(text.trim());
  return chunks;
}

async function embed(texts, apiKey) {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: texts }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI embedding failed: ${res.status} ${err}`);
  }
  const data = await res.json();
  return data.data.map((d) => d.embedding);
}

app.post("/api/ingest", async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!apiKey || !supabaseUrl || !supabaseKey) {
    return res.status(500).json({
      error: "缺少 .env：OPENAI_API_KEY、SUPABASE_URL、SUPABASE_SERVICE_ROLE_KEY",
    });
  }

  const source = (req.body.source != null ? String(req.body.source) : "").trim() || "upload";
  const content = (req.body.content != null ? String(req.body.content) : "").trim();

  if (!content) {
    return res.status(400).json({ error: "content 不能为空。" });
  }

  const chunks = chunkText(content);
  if (chunks.length === 0) {
    return res.status(400).json({ error: "切块后无有效内容。" });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  let inserted = 0;

  try {
    for (let i = 0; i < chunks.length; i += BATCH) {
      const batch = chunks.slice(i, i + BATCH);
      const vectors = await embed(batch, apiKey);
      const rows = batch.map((c, j) => ({
        source,
        content: c,
        embedding: vectors[j],
      }));
      const { error } = await supabase.from("doc_chunks").insert(rows);
      if (error) throw new Error(error.message);
      inserted += rows.length;
    }
    res.json({ ok: true, chunks: inserted });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || "入库失败" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`本地服务: http://localhost:${PORT}`);
  console.log(`入库工具: http://localhost:${PORT}/ingest.html`);
  console.log(`首页:     http://localhost:${PORT}/index.html`);
});
