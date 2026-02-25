# 信息入库：两种方式

---

## 方式一：网页工具（推荐）

**本地用（不部署也行）**：在项目根目录执行 `npm install` 和 `npm run dev`，浏览器打开 **http://localhost:3000/ingest.html**。需在 `.env` 里配好 `OPENAI_API_KEY`、`SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`。

**部署到 Vercel 后**：打开 **`/ingest.html`**（例如 `https://你的项目.vercel.app/ingest.html`），在 Vercel 里配置好上述三个环境变量即可。

使用步骤：
1. **来源标识**：填一个名字（如 `fee-policy-2024`），方便以后区分。
2. **上传文本**：点「上传文本文件」选 `.txt`，或把内容**直接粘贴**到下方框里。
3. 点 **「开始入库」**：后台会自动切块 → 算 embedding → 写入 Supabase。

无需改 JSON、不用跑命令行。

---

## 方式二：命令行脚本（改 JSON 再运行）

把「课程、学费、政策」等文字放进 `data/documents.json`，运行脚本即可自动切块、算向量、写入 Supabase。

---

## 1. 准备环境

在项目根目录（`chatbot`）执行：

```bash
npm install
```

复制环境变量并填写（Supabase 第 4 步拿到的 URL 和 service_role key）：

```bash
cp .env.example .env
```

编辑 `.env`，填入：

- `OPENAI_API_KEY` — OpenAI API 密钥  
- `SUPABASE_URL` — 你的 Supabase 项目 URL  
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service_role 密钥  

---

## 2. 编辑要入库的内容

打开 **`data/documents.json`**，按下面格式写，每一条会按「段」自动切块并写入 `doc_chunks`：

```json
[
  {
    "source": "文档来源标识（如 fee-policy-2024）",
    "content": "这里放一整段或一整页文字。可以多段用空行隔开，脚本会按段落切块。"
  },
  {
    "source": "programmes-list",
    "content": "课程名称、简介、学费区间等……"
  }
]
```

- **source**：方便以后区分是哪个文档，检索结果里会带上。  
- **content**：纯文本即可；脚本会按段落或每约 400 字再切小块，并自动算 embedding 写入 Supabase。

可以不断往数组里加新项，改完保存即可。

---

## 3. 运行入库

在项目根目录执行：

```bash
npm run ingest
```

脚本会：

1. 读取 `data/documents.json`  
2. 按段落/长度切块（约 400 字一块，有重叠避免断句）  
3. 调用 OpenAI `text-embedding-3-small` 算向量  
4. 批量插入 Supabase 表 `doc_chunks`  

看到终端输出「入库完成」即表示成功。可在 Supabase 的 **Table Editor → doc_chunks** 里查看是否多了行。

---

## 4. 重复运行会怎样？

当前脚本**只做插入**，不会先清空表。所以：

- 同一份 `documents.json` 多跑几次，会**重复插入**同样内容。  
- 若要「只保留最新一次」：在 Supabase SQL Editor 里先执行 `delete from public.doc_chunks;`，再运行 `npm run ingest`。  
- 以后可以改成「按 source 覆盖」或「先删再插」，需要时再说。

---

## 小结

| 步骤           | 操作 |
|----------------|------|
| 编辑内容       | 改 `data/documents.json` |
| 配置密钥       | 填好 `.env` 里的 OpenAI + Supabase |
| 执行入库       | `npm run ingest` |

信息入库自动化就是以上步骤；RAG 对话时再从 `doc_chunks` 里做检索即可。
