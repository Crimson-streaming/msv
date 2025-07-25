const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use('/episode/:num', (req, res, next) => {
  const episodeNum = req.params.num;
  const folderPath = path.join(__dirname, `episode${episodeNum}`);

  // Ici on remplace l'URL par la partie restante après /episode/:num pour express.static
  const filePath = req.path;

  // On appelle express.static sur le bon dossier avec le chemin corrigé
  express.static(folderPath)(Object.assign({}, req, { url: filePath }), res, next);
});

app.get('/', (req, res) => {
  res.send('Serveur pour miniatures et fichiers VTT');
});

app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
