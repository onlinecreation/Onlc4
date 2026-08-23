/* eslint-env node */
'use strict';

/**
 * Régénère les paquets de langue des plugins ONLC à partir de `tools/i18n/translations.json`.
 *
 *   node modules/hugerte/tools/openmoji/build-i18n.js
 *
 * Le fichier source associe à chaque chaîne française ses traductions, dans l'ordre : anglaise,
 * espagnole, néerlandaise. Les chaînes françaises servent de clés : c'est la langue dans laquelle
 * les plugins sont écrits, et c'est donc elle qui s'affiche quand aucun paquet n'est chargé.
 *
 * Une entrée à laquelle il manque une langue **arrête** le générateur : un paquet incomplet ne se
 * remarque qu'au moment où quelqu'un ouvre le formulaire concerné, et il est alors trop tard.
 */

const fs = require('fs');
const path = require('path');

const source = path.resolve(__dirname, '../i18n/translations.json');
const target = path.resolve(__dirname, '../../src/plugins/onlcshared/main/i18n');

const languages = [
  { file: 'en.js', codes: [ 'en', 'en_GB', 'en_US', 'en_CA', 'en_AU' ], index: 0, name: 'English' },
  { file: 'es.js', codes: [ 'es', 'es_ES', 'es_MX', 'es_419' ], index: 1, name: 'Español' },
  { file: 'nl.js', codes: [ 'nl', 'nl_NL', 'nl_BE' ], index: 2, name: 'Nederlands' }
];

const header = (name, codes) => `/**
 * ONLC 4 — ${name} interface strings.
 *
 * Généré par modules/hugerte/tools/openmoji/build-i18n.js — ne pas modifier à la main.
 * Chargez ce fichier avant \`hugerte.init()\` :
 *
 *     <script src="hugerte/langs/onlc/${codes[0]}.js"></script>
 *
 * Les clés sont les chaînes françaises écrites dans les plugins : sans paquet de langue,
 * l'interface reste en français.
 */
`;

/** Une entrée doit porter une traduction non vide pour chaque langue déclarée. */
const check = (table, keys) => {
  const fautives = [];
  keys.forEach((key) => {
    languages.forEach((language) => {
      const value = table[key][language.index];
      if (typeof value !== 'string' || value.trim() === '') {
        fautives.push(`${language.file} : ${JSON.stringify(key)}`);
      }
    });
  });
  if (fautives.length > 0) {
    throw new Error(`${fautives.length} traduction(s) manquante(s) :\n  ${fautives.slice(0, 20).join('\n  ')}`);
  }
};

const main = () => {
  const table = JSON.parse(fs.readFileSync(source, 'utf8'));
  const keys = Object.keys(table).sort((a, b) => a.localeCompare(b, 'fr'));

  check(table, keys);

  fs.mkdirSync(target, { recursive: true });

  languages.forEach((language) => {
    const entries = keys.map((key) =>
      `  ${JSON.stringify(key)}: ${JSON.stringify(table[key][language.index])}`).join(',\n');

    const body = language.codes
      .map((code) => `window.hugerte.addI18n('${code}', strings);`)
      .join('\n');

    fs.writeFileSync(path.join(target, language.file),
      `${header(language.name, language.codes)}(function () {\n  var strings = {\n${entries}\n  };\n\n  ${body.split('\n').join('\n  ')}\n})();\n`);
  });

  // Le français est la langue d'écriture : le paquet est vide, il sert seulement à déclarer le
  // code de langue pour que le cœur n'aille pas chercher un fichier inexistant.
  fs.writeFileSync(path.join(target, 'fr.js'),
    `${header('Français', [ 'fr_FR' ])}(function () {\n` +
    `  var strings = {};\n\n` +
    `  window.hugerte.addI18n('fr', strings);\n` +
    `  window.hugerte.addI18n('fr_FR', strings);\n})();\n`);

  console.log(`${keys.length} chaînes écrites dans ${target}`);
};

main();
