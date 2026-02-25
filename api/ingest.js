/**
 * 入库 API：接收文本 → 自动切块 → embedding → 写入 Supabase。
 * 供 ingest.html 上传/粘贴使用。需配置 OPENAI_API_KEY、SUPABASE_URL、SUPABASE_SERVICE_ROLE_KEY。
 */

import { createClient } from "@supabase/supabase-js";

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

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!apiKey || !supabaseUrl || !supabaseKey) {
    res.status(500).json({ error: "缺少环境变量：OPENAI_API_KEY、SUPABASE_URL、SUPABASE_SERVICE_ROLE_KEY" });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      res.status(400).json({ error: "请求体需为 JSON：{ source?, content }" });
      return;
    }
  }

  const source = (body.source != null ? String(body.source) : "").trim() || "upload";
  const raw = body.content != null ? String(body.content) : "";
  const content = raw.trim();

  if (!content) {
    res.status(400).json({ error: "content 不能为空。" });
    return;
  }

  const chunks = chunkText(content);
  if (chunks.length === 0) {
    res.status(400).json({ error: "切块后无有效内容。" });
    return;
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
    res.status(200).json({ ok: true, chunks: inserted });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || "入库失败" });
  }
}
