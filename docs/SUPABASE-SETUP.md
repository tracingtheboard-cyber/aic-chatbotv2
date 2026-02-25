# Supabase 一步一步设置（RAG 用）

按顺序做下面几步即可。

---

## 第 1 步：建 Supabase 项目

1. 打开 https://supabase.com 并登录（没有就注册）。
2. 点 **New project**。
3. 填：
   - **Name**：例如 `aic-chatbot`。
   - **Database Password**：设一个强密码，**自己记下来**（后面本地脚本或服务端会用到）。
   - **Region**：选离你或新加坡用户近的（如 Singapore）。
4. 点 **Create new project**，等一两分钟项目建好。

---

## 第 2 步：打开 pgvector

1. 左侧菜单点 **Database** → **Extensions**。
2. 在列表里找到 **vector**，点右侧的 **Enable**。
3. 看到它变成已启用即可。

---

## 第 3 步：建表（跑 SQL）

1. 左侧菜单点 **SQL Editor**。
2. 点 **New query**。
3. 打开本项目里的 **`supabase/schema.sql`**，把里面整段 SQL 复制过来，粘贴到编辑器。
4. 点 **Run**（或 Ctrl+Enter）。
5. 看到底部提示 “Success” 即可。

检查：左侧 **Table Editor** 里应出现表 **doc_chunks**，点进去可以看到列：id, source, content, embedding, created_at。

---

## 第 4 步：拿到 URL 和密钥

1. 左侧点 **Project Settings**（齿轮图标）。
2. 点 **API**。
3. 记下这两项（后面填到 Vercel 或 .env）：
   - **Project URL**：例如 `https://xxxxx.supabase.co` → 用作 `SUPABASE_URL`。
   - **Project API keys** 里 **service_role** 的 key（点眼睛显示后复制）→ 用作 `SUPABASE_SERVICE_ROLE_KEY`。  
     ⚠️ 只在后端用，不要写进前端或提交到 Git。

---

## 第 5 步：验证（可选）

在 **SQL Editor** 里跑一句，确认表能写能查：

```sql
insert into public.doc_chunks (source, content)
values ('test', 'This is a test chunk for AIC chatbot RAG.');

select id, source, left(content, 40) from public.doc_chunks;
```

能看到一行记录就说明表没问题。`embedding` 先为空没关系，后面用脚本批量写。

---

## 接下来

- **写数据**：用项目里的「灌库脚本」把课程/学费等文档切块、算 embedding、插入 `doc_chunks`（见 README 或 `scripts/` 说明）。
- **接聊天**：在 `api/chat.js` 里加上「用问题查 Supabase → 把结果拼进 prompt → 再调 OpenAI」（见 `docs/RAG-SUPABASE.md`）。

把第 1～4 步做完，Supabase 就算准备好了。
