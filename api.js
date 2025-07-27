const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// === CONFIG CORS ===
const allowedOrigins = [
  "https://bloom-lz8g.onrender.com",
  "http://localhost:3000",
  "http://127.0.0.1:3000"
];

const ALLOWED_DOMAINS = [
  "oneupload.to",
  "vmwesa.online",
  "vidmoly.net",
  "127.0.0.1"
];

// Middleware CORS appliqué uniquement aux routes API
function corsMiddleware(req, res, next) {
  const origin = req.headers.origin;
  if (!origin || allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
    res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  } else {
    res.status(403).json({ error: `CORS refusé pour l'origine : ${origin}` });
  }
}

// === UTILITAIRE ===
function isUrlAllowed(urlString) {
  try {
    const url = new URL(urlString);
    return ALLOWED_DOMAINS.some(domain => url.hostname.endsWith(domain));
  } catch {
    return false;
  }
}

// === SERVIR LES DOSSIERS "episode*" EN STATIQUE, AVEC VALIDATION ===
const baseDir = __dirname;

console.log(`📁 Scan des dossiers dans ${baseDir}...`);

fs.readdirSync(baseDir).forEach(folder => {
  const folderPath = path.join(baseDir, folder);

  try {
    const stats = fs.statSync(folderPath);
    const isValid =
      stats.isDirectory() &&
      folder.startsWith("episode") &&
      /^[a-zA-Z0-9_-]+$/.test(folder); // pas de caractère spécial ou d’URL

    if (!isValid) {
      console.log(`⛔ Ignoré : ${folder}`);
      return;
    }

    console.log(`🧩 Serving folder: /${folder}`);
    app.use(`/${folder}`, express.static(folderPath));
  } catch (err) {
    console.warn(`⚠️ Erreur lecture ${folder}: ${err.message}`);
  }
});

// === ROUTES API ===

app.options('*', cors());

// Extraction d'un .m3u8 depuis une page HTML
app.get("/", corsMiddleware, async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).json({ error: "Paramètre ?url= manquant." });
  }
  if (!isUrlAllowed(targetUrl)) {
    return res.status(403).json({ error: "Domaine non autorisé." });
  }

  try {
    const response = await axios.get(targetUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 10000
    });

    const html = response.data;
    const match = html.match(/file\s*:\s*"([^"]+\.m3u8[^"]*)"/) ||
                  html.match(/source\s+src=["']([^"']+\.m3u8[^"']*)["']/) ||
                  html.match(/['"](https:\/\/[^"']+\.m3u8[^"']*)['"]/);

    if (!match || !match[1]) {
      return res.status(404).json({ error: "Aucune URL .m3u8 trouvée." });
    }

    res.json({ m3u8: match[1] });
  } catch (err) {
    console.error("Erreur de récupération :", err.message);
    res.status(500).json({ error: "Erreur lors de la récupération de la page." });
  }
});

// Proxy pour les fichiers m3u8 et .ts
app.get("/proxy", corsMiddleware, async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).json({ error: "Paramètre ?url= requis." });
  }
  if (!isUrlAllowed(targetUrl)) {
    return res.status(403).json({ error: "Domaine non autorisé pour proxy." });
  }

  try {
    const response = await axios.get(targetUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      responseType: "stream",
      timeout: 10000
    });

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.setHeader("Content-Type", response.headers["content-type"] || "application/octet-stream");

    response.data.pipe(res);
  } catch (err) {
    console.error("Erreur proxy:", err.message);
    res.status(500).json({ error: "Erreur lors de la récupération du fichier." });
  }
});

// === ROUTES DE TEST ===
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

app.get("/status", (req, res) => {
  res.send("✅ Serveur de miniatures et VTT en ligne");
});

// === LANCEMENT DU SERVEUR ===
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Serveur fusionné en écoute sur le port ${PORT}`);
});
