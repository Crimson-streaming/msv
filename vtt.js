const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use('/episode/:num', (req, res, next) => {
  const episodeNum = req.params.num;
  const episodePath = path.join(__dirname, 'episodes', `episode${episodeNum}`);

  // Utilise express.static pour servir ce dossier dynamique
  express.static(episodePath)(req, res, next);
});

app.get('/', (req, res) => {
  res.send('Serveur pour miniatures et fichiers VTT');
});

app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
