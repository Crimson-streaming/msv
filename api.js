const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = [
  "https://bloom-lz8g.onrender.com",
  "http://localhost:5500",
  "http://127.0.0.1:5500"
];

const ALLOWED_DOMAINS = [
  "oneupload.to",
  "vmwesa.online",
  "vidmoly.net",
  "127.0.0.1",
  "fremtv.lol"
];

function isUrlAllowed(urlString) {
  try {
    const url = new URL(urlString);
    return ALLOWED_DOMAINS.includes(url.hostname);
  } catch {
    return false;
  }
}

function isValidEpisodeFolder(folder) {
  return /^episode\d+$/.test(folder);
}

// Middleware CORS officiel pour simplifier la gestion
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`❌ Origin rejetée par CORS : ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  }
}));

const baseDir = __dirname;
console.log(`📁 Scan des dossiers dans ${baseDir}...`);

fs.readdirSync(baseDir).forEach(folder => {
  const folderPath = path.join(baseDir, folder);
  if (fs.statSync(folderPath).isDirectory() && isValidEpisodeFolder(folder)) {
    console.log(`🧩 Serving folder: /${folder}`);
    app.use(`/${folder}`, express.static(folderPath));
  } else {
    console.log(`⛔ Ignoré : ${folder}`);
  }
});

const cache = {};
const CACHE_TTL = 60 * 60 * 1000; // 1 heure en millisecondes

// Route d’extraction .m3u8 avec cache 1h
app.get("/", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).json({ error: "Paramètre ?url= manquant." });
  if (!isUrlAllowed(targetUrl)) return res.status(403).json({ error: "Domaine non autorisé." });

  const now = Date.now();
  const cacheEntry = cache[targetUrl];

  if (cacheEntry && (now - cacheEntry.timestamp) < CACHE_TTL) {
    // Renvoi cache si encore valide
    return res.json({ m3u8: cacheEntry.m3u8, cached: true });
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

    // Mise à jour du cache
    cache[targetUrl] = { m3u8: match[1], timestamp: now };

    res.json({ m3u8: match[1], cached: false });
  } catch (err) {
    console.error("Erreur de récupération :", err.message);
    res.status(500).json({ error: "Erreur lors de la récupération de la page." });
  }
});

// 🔓 Proxy ouvert (autorise tous les domaines)
app.get("/proxy", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).json({ error: "Paramètre ?url= requis." });

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

// Routes utilitaires
app.get("/health", (req, res) => res.status(200).send("OK"));
app.get("/status", (req, res) => res.send('✅ Serveur de miniatures et VTT en ligne'));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Serveur fusionné en écoute sur le port ${PORT}`);
});
