const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();

const PORT = process.env.PORT || 3000;

// Liste des origines frontend autorisées (CORS)
const allowedOrigins = [
  "https://msv-i92p.onrender.com",
  "https://bloom-lz8g.onrender.com",
  // ajoute d'autres origines front ici si besoin
];

// Whitelist des domaines autorisés pour la récupération
const ALLOWED_DOMAINS = [
  "oneupload.to",
  "vidmoly.net",
  // ajoute d'autres domaines autorisés ici
];

// Middleware CORS avec gestion dynamique de l'origine
app.use(cors({
  origin: function(origin, callback) {
    // Autorise requêtes sans origin (ex: Postman, curl)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error(`L'origine ${origin} n'est pas autorisée par CORS`), false);
    }
  }
}));

// Fonction pour valider que l'URL est dans la whitelist des domaines
function isUrlAllowed(urlString) {
  try {
    const url = new URL(urlString);
    return ALLOWED_DOMAINS.some(domain => url.hostname.endsWith(domain));
  } catch {
    return false;
  }
}

// Route principale
app.get("/", async (req, res) => {
  const targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).json({ error: "Paramètre ?url= manquant." });
  }

  if (!isUrlAllowed(targetUrl)) {
    return res.status(403).json({ error: "Domaine de l'URL non autorisé." });
  }

  try {
    const response = await axios.get(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
      },
      timeout: 10000
    });

    const html = response.data;

    const match = html.match(/file\s*:\s*"([^"]+\.m3u8[^"]*)"/);

    if (!match || !match[1]) {
      return res.status(404).json({ error: "URL .m3u8 non trouvée dans la page." });
    }

    const m3u8Url = match[1];

    res.json({ m3u8: m3u8Url });
  } catch (error) {
    console.error("Erreur lors de la récupération :", error.message);
    res.status(500).json({ error: "Erreur lors de la récupération de la page." });
  }
});

// Route de santé pour monitoring (UptimeRobot, Render, etc.)
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// Démarrage du serveur
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Serveur en écoute sur le port ${PORT}`);
});
