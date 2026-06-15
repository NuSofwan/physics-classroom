# Curated Long-Term Memory (MEMORY.md)

## 📌 Project Overview: PhysicsClassroom
- **Purpose**: A video-streaming web application to host physics lectures from Google Drive without waiting for slow YouTube uploads.
- **Frontend**: Vite SPA + custom vanilla CSS (glassmorphism/dark theme).
- **Backend**: Node.js + Express.js + local JSON file DB.
- **Key Feature**: Streaming proxy that fetches files from Google Drive (handling potential large-file virus scan warnings) and streams them with seek support.

## 💡 Lessons Learned & Technical Patterns
- **Node.js Native Fetch Streaming**: Native `fetch` in Node 18+ returns a Web standard `ReadableStream`. Trying to call `.pipe(res)` on it directly will crash with `TypeError`. Use `Readable.fromWeb(response.body).pipe(res)` from the Node `stream` module to bridge to Express's writeable stream.
- **Vite Proxy Configuration**: Setup a proxy in `vite.config.js` to redirect `/api` requests to `localhost:3000` to avoid CORS issues and simplify frontend fetch URLs during development.
