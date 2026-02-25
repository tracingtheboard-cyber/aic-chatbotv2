/**
 * 把 data/documents.json 里的内容切块、算 embedding、写入 Supabase doc_chunks。
 * 使用前：复制 .env.example 为 .env，填好 OPENAI_API_KEY、SUPABASE_URL、SUPABASE_SERVICE_ROLE_KEY。
 * 运行：npm install && npm run ingest
 */

import dotenv from "dotenv";
dotenv.config();
dotenv.config({ path: ".env.local" });
dotenv.config({ path: "env.local" });
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA_FILE = join(ROOT, "data", "documents.json");

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const CHUNK_MAX = 400;
const CHUNK_OVERLAP = 50;
const EMBEDDING_MODEL = "text-embedding-3-small";

if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("缺少环境变量。请复制 .env.example 为 .env 并填写 OPENAI_API_KEY、SUPABASE_URL、SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

async function embed(texts) {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: texts,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI embedding failed: ${res.status} ${err}`);
  }
  const data = await res.json();
  return data.data.map((d) => d.embedding);
}

async function main() {
  let raw;
  try {
    raw = readFileSync(DATA_FILE, "utf8");
  } catch (e) {
    console.error("读取 data/documents.json 失败:", e.message);
    process.exit(1);
  }
  let documents;
  try {
    documents = JSON.parse(raw);
  } catch (e) {
    console.error("data/documents.json 不是合法 JSON:", e.message);
    process.exit(1);
  }
  if (!Array.isArray(documents) || documents.length === 0) {
    console.error("data/documents.json 需要是非空数组，每项含 source 和 content。");
    process.exit(1);
  }

  const allChunks = [];
  for (const doc of documents) {
    const source = doc.source || "unknown";
    const content = typeof doc.content === "string" ? doc.content : String(doc.content || "");
    const chunks = chunkText(content);
    for (const c of chunks) {
      allChunks.push({ source, content: c });
    }
  }
  console.log(`共 ${allChunks.length} 个块待入库。`);

  const BATCH = 20;
  for (let i = 0; i < allChunks.length; i += BATCH) {
    const batch = allChunks.slice(i, i + BATCH);
    const texts = batch.map((b) => b.content);
    const vectors = await embed(texts);
    const rows = batch.map((b, j) => ({
      source: b.source,
      content: b.content,
      embedding: vectors[j],
    }));
    const { error } = await supabase.from("doc_chunks").insert(rows);
    if (error) {
      console.error("Supabase 插入失败:", error.message);
      process.exit(1);
    }
    console.log(`已写入 ${Math.min(i + BATCH, allChunks.length)} / ${allChunks.length}`);
  }
  console.log("入库完成。");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
