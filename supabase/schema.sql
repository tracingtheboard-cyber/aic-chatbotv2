-- 在 Supabase SQL Editor 里一次性执行下面整段

-- 1. 启用 pgvector（若已启用会提示已存在，可忽略）
create extension if not exists vector;

-- 2. 建表：存文档块 + 向量（1536 = OpenAI text-embedding-3-small）
create table if not exists public.doc_chunks (
  id uuid primary key default gen_random_uuid(),
  source text,
  content text not null,
  embedding vector(1536),
  created_at timestamptz default now()
);

-- 3. 向量索引（相似度检索用）
create index if not exists doc_chunks_embedding_idx
  on public.doc_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- 4. 可选：允许通过 API 做向量检索（RLS 下 service_role 不受限）
alter table public.doc_chunks enable row level security;

create policy "Allow read for service role"
  on public.doc_chunks for select
  using (true);

create policy "Allow insert for service role"
  on public.doc_chunks for insert
  with check (true);
