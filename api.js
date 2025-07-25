const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

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

// Middleware CORS
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS refusé pour l'origine : ${origin}`), false);
  }
}));

app.options('*', cors()); // pour les requêtes prévol (OPTIONS)

function isUrlAllowed(urlString) {
  try {
    const url = new URL(urlString);
    return ALLOWED_DOMAINS.some(domain => url.hostname.endsWith(domain));
  } catch {
    return false;
  }
}

// Extraction d'un .m3u8 depuis une page HTML
app.get("/", async (req, res) => {
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
app.get("/proxy", async (req, res) => {
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

// Route de test
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Serveur proxy lancé sur le port ${PORT}`);
});
