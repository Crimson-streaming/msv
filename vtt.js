const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Route dynamique pour servir chaque dossier episodeX
app.use('/episode/:num', (req, res, next) => {
  const episodeNum = req.params.num;
  const folderPath = path.join(__dirname, `episode${episodeNum}`);

  // Sert les fichiers statiques depuis le dossier correspondant
  express.static(folderPath)(req, res, next);
});

app.get('/', (req, res) => {
  res.send('Serveur pour miniatures et fichiers VTT');
});

app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
