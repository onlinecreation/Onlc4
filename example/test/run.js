'use strict';

/**
 * Lance les tests des simulations d'API et des générateurs.
 *
 *   node example/test/run.js
 *   yarn test-node
 *
 * Ces tests-là ne passent pas par un navigateur : ils portent sur du code Node — les contrats
 * d'api de la démonstration et les outils de génération. Les tests de l'éditeur lui-même vivent
 * sous les dossiers `test/ts` des plugins, et sont exécutés par bedrock (`yarn test`).
 */

const path = require('path');

const { run } = require('./harness');

const files = [
  './media-api.test.js',
  './template-api.test.js',
  './build-langs.test.js'
];

files.forEach((file) => require(path.resolve(__dirname, file)));

run().then((failures) => {
  process.exit(failures === 0 ? 0 : 1);
}, (err) => {
  console.error(err);
  process.exit(1);
});
