/* eslint-env node */
'use strict';

/**
 * Régénère les emojis OpenMoji embarqués dans le plugin onlcicons.
 *
 * Usage :
 *   1. télécharger le paquet npm `openmoji` (ou le zip `openmoji-svg-color.zip`) ;
 *   2. node modules/hugerte/tools/openmoji/build-openmoji.js <dossier des svg couleur>
 *
 * Le script copie les svg dans `src/plugins/onlcicons/main/openmoji`, les allège des groupes
 * vides et des indentations, puis écrit l'index `src/plugins/onlcicons/main/js/openmoji.js`.
 *
 * OpenMoji est publié sous licence CC BY-SA 4.0 : la mention « OpenMoji » doit accompagner
 * toute page qui affiche ces dessins (voir `main/OPENMOJI-LICENCE.md`).
 */

const fs = require('fs');
const path = require('path');

const pluginRoot = path.resolve(__dirname, '../../src/plugins/onlcicons/main');
const targetDir = path.join(pluginRoot, 'openmoji');
const indexFile = path.join(pluginRoot, 'js', 'openmoji.js');

const minify = (svg) => svg
  .replace(/<g id="[a-z-]+"\/>/g, '')
  .replace(/\r?\n\s*/g, '')
  .replace(/>\s+</g, '><')
  .trim() + '\n';

const main = () => {
  const source = process.argv[2];
  if (!source || !fs.existsSync(source)) {
    console.error('Indiquez le dossier contenant les svg couleur d’OpenMoji.');
    process.exit(1);
  }

  fs.mkdirSync(targetDir, { recursive: true });
  fs.mkdirSync(path.dirname(indexFile), { recursive: true });

  const names = [];
  fs.readdirSync(source).filter((file) => file.endsWith('.svg')).forEach((file) => {
    fs.writeFileSync(path.join(targetDir, file), minify(fs.readFileSync(path.join(source, file), 'utf8')));
    names.push(file.replace(/\.svg$/, ''));
  });

  names.sort();

  const header = '/**\n' +
    ' * Liste des dessins OpenMoji embarqués (https://openmoji.org), licence CC BY-SA 4.0.\n' +
    ' * Fichier généré par modules/hugerte/tools/openmoji/build-openmoji.js — ne pas modifier.\n' +
    ' */\n';

  fs.writeFileSync(indexFile,
    `${header}window.hugerte.Resource.add('onlc.plugins.onlcicons.openmoji', ${JSON.stringify(names)});\n`);

  console.log(`${names.length} dessins copiés dans ${targetDir}`);
};

main();
