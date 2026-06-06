import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Express body parsers
  app.use(express.json());

  // Serve custom APIs or health checks
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Beacon server is healthy" });
  });

  const distPath = path.join(process.cwd(), "dist");
  const hasDist = fs.existsSync(path.join(distPath, "index.html"));
  
  // Decide whether to run in production static mode or development middleware mode.
  // We check if we are in production explicitly, OR if the dist build directory has been generated.
  const isProd = process.env.NODE_ENV === "production" || hasDist;

  if (!isProd) {
    console.log("Starting server in development mode (Vite middleware on port 3000)...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode (Serving statically built SPA)...");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Critical: failed to start server", err);
  process.exit(1);
});
