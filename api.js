const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors()); 

app.get("/", async (req, res) => {
  const targetUrl = req.query.url;

  // Vérifie que l’URL est fournie et qu’elle commence bien par http(s)
  if (!targetUrl || !/^https?:\/\/[^ ]+$/.test(targetUrl)) {
    return res.status(400).json({ error: "Paramètre ?url= invalide ou manquant." });
  }

  try {
    // Requête vers la page cible avec un User-Agent navigateur
    const response = await axios.get(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
      }
    });

    const html = response.data;

    // Cherche une URL m3u8 dans un setup JWPlayer (regex)
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

app.listen(PORT, () => {
  console.log(`✅ Serveur en écoute : http://localhost:${PORT}`);
});
