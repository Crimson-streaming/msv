const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// Origines frontend autorisées pour accéder au backend
const allowedOrigins = [
  "https://bloom-lz8g.onrender.com",
  "https://msv-i92p.onrender.com",
  "http://localhost:3000", // pour développement local
];

// Domaines vers lesquels le backend peut faire des requêtes
const ALLOWED_DOMAINS = [
  "prx-1316-ant.vmwesa.online",
  "oneupload.to",
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

// Fonction utilitaire : vérifie si une URL est autorisée
function isUrlAllowed(urlString) {
  try {
    const url = new URL(urlString);
    return ALLOWED_DOMAINS.some(domain => url.hostname.endsWith(domain));
  } catch {
    return false;
  }
}

// ➤ Route principale : retourne une URL m3u8 trouvée dans une page HTML
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
      headers: {
        "User-Agent": "Mozilla/5.0"
      },
      timeout: 10000
    });

    const html = response.data;
    const match = html.match(/file\s*:\s*"([^"]+\.m3u8[^"]*)"/);

    if (!match || !match[1]) {
      return res.status(404).json({ error: "Aucune URL .m3u8 trouvée." });
    }

    const m3u8Url = match[1];
    res.json({ m3u8: m3u8Url });

  } catch (error) {
    console.error("Erreur de récupération :", error.message);
    res.status(500).json({ error: "Erreur lors de la récupération de la page." });
  }
});

// ➤ Route proxy : sert les fichiers .m3u8 / .ts en contournant le CORS
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
      headers: {
        "User-Agent": "Mozilla/5.0"
      },
      responseType: "stream", // important pour diffuser directement les .m3u8 ou .ts
      timeout: 10000
    });

    // Transmet le Content-Type original
    res.setHeader("Content-Type", response.headers["content-type"] || "application/octet-stream");

    // Diffuse directement la réponse
    response.data.pipe(res);

  } catch (error) {
    console.error("Erreur proxy:", error.message);
    res.status(500).json({ error: "Erreur lors de la récupération du fichier." });
  }
});

// ➤ Route de santé (utile pour Render, UptimeRobot)
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// ➤ Démarrage du serveur
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Serveur proxy démarré sur le port ${PORT}`);
});
