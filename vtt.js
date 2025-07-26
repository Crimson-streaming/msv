const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware dynamique pour servir tous les dossiers episodeX
app.use((req, res, next) => {
  const match = req.path.match(/^\/(episode\d+)\/(.+)$/);
  if (match) {
    const folder = match[1];        // ex: 'episode1'
    const file = '/' + match[2];    // ex: '/episode1.vtt' ou '/thumb_001.jpg'
    const folderPath = path.join(__dirname, folder);

    if (fs.existsSync(folderPath)) {
      express.static(folderPath)(Object.assign({}, req, { url: file }), res, next);
    } else {
      res.status(404).send("Dossier de l'épisode introuvable");
    }
  } else {
    next();
  }
});

// Page de test racine
app.get('/', (req, res) => {
  res.send('Serveur de fichiers VTT et miniatures');
});

app.listen(PORT, () => {
  console.log(`✅ Serveur lancé sur le port ${PORT}`);
});
