import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware para JSON com limite maior para blobs
  app.use(express.json({ limit: '10mb' }));

  // Endpoint para salvar as prévias localmente (Opção 2)
  app.post("/api/admin/save-preview", (req, res) => {
    const { voiceId, audioBase64, adminEmail } = req.body;
    
    // Segurança básica: apenas o e-mail do admin permitido
    if (adminEmail?.toLowerCase() !== 'kurosaki.mpm@gmail.com') {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (!voiceId || !audioBase64) {
      return res.status(400).json({ error: "Missing data" });
    }

    try {
      const publicDir = path.join(process.cwd(), 'public');
      const previewsDir = path.join(publicDir, 'previews');
      
      if (!fs.existsSync(previewsDir)) {
        fs.mkdirSync(previewsDir, { recursive: true });
      }

      const filePath = path.join(previewsDir, `${voiceId}.wav`);
      const buffer = Buffer.from(audioBase64, 'base64');
      
      fs.writeFileSync(filePath, buffer);
      
      console.log(`Saved local preview: ${voiceId}.wav`);
      res.json({ success: true, path: `/previews/${voiceId}.wav` });
    } catch (err) {
      console.error("Error saving preview:", err);
      res.status(500).json({ error: "Failed to save file" });
    }
  });

  // Endpoint para proxy de downloads (evita bloqueios de CORS do Firebase/Navegador)
  app.get("/api/download", async (req, res) => {
    try {
      const url = req.query.url as string;
      const filename = req.query.filename as string || "download";

      if (!url) {
        return res.status(400).send("Falta a URL do arquivo");
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Falha ao buscar o arquivo: ${response.statusText}`);
      }

      // Definir cabeçalhos para forçar o download com o nome correto
      const contentType = response.headers.get("content-type") || "application/octet-stream";
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Type", contentType);

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return res.send(buffer);
    } catch (error) {
      console.error("Proxy download error:", error);
      return res.status(500).send("Erro ao processar o download remoto.");
    }
  });

  // Vite middleware para desenvolvimento
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
