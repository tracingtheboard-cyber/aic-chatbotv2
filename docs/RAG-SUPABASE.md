# RAG 方案：Supabase + OpenAI

后期为 AIC 聊天机器人接入 RAG 时，按此方案接 Supabase。

---

## 架构概览

1. **写入（一次性/定期）**  
   将课程介绍、学费表、政策等文档切分成 chunk → 用 OpenAI Embedding 得到向量 → 存入 Supabase（`pgvector`）。

2. **对话时**  
   用户提问 → 用同一 embedding 模型得到 query 向量 → 在 Supabase 里做向量相似度检索 → 取 top-k 条 chunk → 拼进 system/user prompt → 调 OpenAI Chat 生成回复。

3. **接口**  
   前端仍只调现有 `POST /api/chat`（或 `api/chat.php`）。后端在该接口内增加「检索 → 拼上下文 → 再调 OpenAI」即可，前端无需改。

---

## Supabase 准备

- 在 Supabase 项目里启用 **pgvector**（Database → Extensions → `vector`）。
- 建一张表存文档块与向量，例如：

```sql
create table public.doc_chunks (
  id uuid primary key default gen_random_uuid(),
  source text,           -- 出处，如 "fee-policy-2024"
  content text not null,  -- 原文
  embedding vector(1536), -- text-embedding-3-small 维度
  created_at timestamptz default now()
);

create index on public.doc_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);
```

- 若用 **Row Level Security (RLS)**：用 service_role 的 server 端请求可绕过 RLS；若用 anon key，需为 `doc_chunks` 配好 policy（例如只读）。

---

## 环境变量（后期会用到）

在 Vercel / 学校服务器上配置：

- `OPENAI_API_KEY` — 已有，用于 Chat 与 Embedding。
- `SUPABASE_URL` — 项目 URL（如 `https://xxx.supabase.co`）。
- `SUPABASE_SERVICE_ROLE_KEY` — 服务端用，用于插入与查询向量（不要暴露到前端）。

---

## 代码接入口

- **Vercel**：在 `api/chat.js` 里，在调用 OpenAI Chat 之前：
  1. 用 OpenAI 把用户问题 embed 成向量；
  2. 用 `@supabase/supabase-js` 查 `doc_chunks`（按 `embedding` 相似度排序，limit k）；
  3. 把检索到的 `content` 拼成一段「参考内容」放进 system 或 user message；
  4. 再调现有 Chat 逻辑。
- **学校 PHP**：在 `api/chat.php` 里用 Supabase REST API 或 PHP 的 pgvector 客户端做同样「embed query → 检索 → 拼上下文 → 再调 Chat」。

---

## 文档与切分建议

- 优先用**已整理好的**课程列表、学费表、FAQ、政策摘要（PDF/Word/网页导出为文本）。
- 切块：按段落或按小节，每块约 200–500 字，可重叠少量句子避免断句生硬。
- 写入脚本可单独写（Node 或 PHP），跑一次或定期跑，把结果插入 `doc_chunks`；对话接口只做「检索 + 生成」。

---

当前聊天接口已就绪，RAG 只需在后端该接口内加「Supabase 检索 + 拼 prompt」一步即可。
