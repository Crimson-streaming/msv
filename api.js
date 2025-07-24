const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();

// Configuration via variables d'environnement
const PORT = process.env.PORT || 3000;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "https://msv-i92p.onrender.com"; // modifie ici pour ton front

// Whitelist simple de domaines autorisés (à adapter)
const ALLOWED_DOMAINS = [
  "example.com",
  "autredomaine.com",
  // ajoute d'autres domaines autorisés ici
];

// Middleware CORS restreint à un domaine précis
app.use(cors({
  origin: ALLOWED_ORIGIN
}));

// Fonction pour valider que l'URL est bien dans la whitelist
function isUrlAllowed(urlString) {
  try {
    const url = new URL(urlString);
    // Vérifie que le hostname est dans la whitelist
    return ALLOWED_DOMAINS.some(domain => url.hostname.endsWith(domain));
  } catch {
    return false;
  }
}

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
      timeout: 10000 // Timeout 10s pour éviter blocages
    });

    const html = response.data;

    // Cherche une URL m3u8 dans la page (regex)
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

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Serveur en écoute sur le port ${PORT}`);
});
