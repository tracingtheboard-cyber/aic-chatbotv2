# PHP API（学校 WordPress 服务器用）

Vercel 部署用仓库里的 `api/*.js`。若在学校 WordPress 服务器上跑聊天接口（无 Node.js），用本文件夹。

1. 将 `wordpress-api` 整个目录上传到服务器（可重命名为 `api` 或任意路径）。
2. 复制 `config.sample.php` 为 `config.php`，填入 OpenAI API key。
3. 前端聊天窗口的请求地址改为该目录下的 `chat.php`（如 `https://你的域名/wordpress-api/chat.php`）。
