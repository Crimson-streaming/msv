const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// Origines frontend autorisées pour accéder à ce backend
const allowedOrigins = [
  "https://bloom-lz8g.onrender.com",
  "https://msv-i92p.onrender.com",
  "http://localhost:3000" // pour développement local
];

// Domaines autorisés pour la récupération de fichiers (proxy)
const ALLOWED_DOMAINS = [
  "vmwesa.online",       // ← permet tous les sous-domaines dynamiques (ex: prx-xxxx-yyyy.vmwesa.online)
  "oneupload.to",
  "vidmoly.net",
  "127.0.0.1"
];

// Middleware CORS sécurisé
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS refusé pour l'origine : ${origin}`), false);
  }
}));

// Fonction : vérifie si une URL appartient à un domaine autorisé
function isUrlAllowed(urlString) {
  try {
    const url = new URL(urlString);
    return ALLOWED_DOMAINS.some(domain => url.hostname.endsWith(domain));
  } catch {
    return false;
  }
}

// ➤ Route principale pour extraire une URL .m3u8 depuis une page d'hébergement
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
      return res.status(404).json({ error: "Aucune URL .m3u8 trouvée dans la page." });
    }

    const m3u8Url = match[1];
    res.json({ m3u8: m3u8Url });

  } catch (error) {
    console.error("Erreur de récupération :", error.message);
    res.status(500).json({ error: "Erreur lors de la récupération de la page." });
  }
});

// ➤ Route proxy : contourne le CORS pour .m3u8 et .ts (lecture directe côté client)
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
      responseType: "stream", // pour diffuser les flux directement
      timeout: 10000
    });

    res.setHeader("Content-Type", response.headers["content-type"] || "application/octet-stream");
    response.data.pipe(res); // renvoie la réponse directement au client

  } catch (error) {
    console.error("Erreur proxy :", error.message);
    res.status(500).json({ error: "Erreur lors de la récupération du fichier." });
  }
});

// ➤ Route de santé (monitoring / uptime)
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// ➤ Lancement du serveur
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Serveur proxy démarré sur le port ${PORT}`);
});
