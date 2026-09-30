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

/**
 * Les paquets du cœur, produits par `tools/i18n/build-langs.js`.
 *
 * Les chaînes ONLC y sont **ajoutées**, pour que chaque `langs/<code>.js` se suffise à lui-même.
 * Voir `mergeIntoCore` pour la raison.
 */
const coreLangs = path.resolve(__dirname, '../../src/core/main/langs');

/** Bornes de la partie ajoutée, pour qu'une seconde exécution la remplace au lieu de l'empiler. */
const beginMark = '/* — ONLC : début des chaînes des plugins — */';
const endMark = '/* — ONLC : fin des chaînes des plugins — */';

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

/**
 * Ajoute les chaînes ONLC aux paquets du cœur, pour que `language:` suffise.
 *
 * ## Pourquoi les deux paquets ne peuvent pas rester séparés
 *
 * Le cœur ne va chercher `langs/<code>.js` que si la langue n'est **pas déjà déclarée** :
 *
 * ```js
 * if (!I18n.hasCode(languageCode)) { scriptLoader.add(url); }   // core/init/Render.ts
 * ```
 *
 * Or un paquet ONLC chargé à la main déclare la langue. Le cœur n'allait donc plus chercher le
 * sien, et son interface — « Insert », « Bold », « Undo » — restait en anglais sous des
 * formulaires traduits. Cela se voit à l'œil nu, mais seulement une fois la page ouverte.
 *
 * Demander de charger les deux fichiers dans le bon ordre marche, mais c'est une règle de plus à
 * retenir, et elle n'est écrite nulle part dans la documentation de l'éditeur. Un seul fichier
 * par langue, complet, la supprime : `language: 'nl'` suffit, et c'est l'usage documenté.
 *
 * ## Qui gagne en cas de collision
 *
 * Les deux jeux versent dans un même dictionnaire. Nos clés sont françaises, celles du cœur
 * anglaises, et quelques-unes s'écrivent pareil — `Style`, `Version`, `Image...`. **Le cœur
 * l'emporte** : son interface est la plus vaste, et c'est son sens qui est établi. Les collisions
 * sont énumérées à la fin de l'exécution, pour qu'aucune ne passe inaperçue.
 */
const mergeIntoCore = (language, strings) => {
  const collisions = new Set();

  language.codes.forEach((code) => {
    const file = path.join(coreLangs, `${code}.js`);
    const existing = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';

    // On repart toujours de la partie produite par build-langs : deux exécutions de suite
    // donnent le même fichier.
    const debut = existing.indexOf(beginMark);
    const garde = debut === -1 ? existing : existing.slice(0, debut);
    const base = garde === '' ? '' : `${garde.replace(/\s+$/, '')}\n\n`;

    const propres = {};
    Object.keys(strings).forEach((key) => {
      if (base.indexOf(`${JSON.stringify(key)}:`) !== -1) {
        collisions.add(key);
      } else {
        propres[key] = strings[key];
      }
    });

    const entries = Object.keys(propres)
      .map((key) => `    ${JSON.stringify(key)}: ${JSON.stringify(propres[key])}`).join(',\n');

    const ajout = base === '' ? coreHeader(language, code) : '';
    const bloc = entries === ''
      ? `${beginMark}\n/* Le français est la langue d'écriture des plugins : rien à traduire. */\n${endMark}\n`
      : `${beginMark}\nhugerte.addI18n(${JSON.stringify(code)}, {\n${entries}\n});\n${endMark}\n`;

    fs.mkdirSync(coreLangs, { recursive: true });
    fs.writeFileSync(file, `${base}${ajout}${bloc}`, 'utf8');
  });

  return collisions;
};

/** En-tête d'un paquet que le cœur ne livre pas — l'anglais, et les variantes régionales. */
const coreHeader = (language, code) => `/**
 * Paquet de langue « ${code} » — ${language.name}.
 *
 * Produit par tools/openmoji/build-i18n.js. Le cœur de l'éditeur ne livre pas de paquet pour
 * cette langue ; celui-ci ne porte donc que les chaînes des plugins ONLC.
 */
`;

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

  // Les paquets autonomes : un seul fichier par langue, que `language:` charge tout seul.
  const toutes = new Set();
  languages.concat([{ file: 'fr.js', codes: [ 'fr', 'fr_FR' ], index: -1, name: 'Français' }])
    .forEach((language) => {
      const strings = {};
      if (language.index >= 0) {
        keys.forEach((key) => { strings[key] = table[key][language.index]; });
      }
      mergeIntoCore(language, strings).forEach((key) => toutes.add(key));
    });

  console.log(`${keys.length} chaînes écrites dans ${target}`);
  console.log(`chaînes ajoutées aux paquets de ${coreLangs}`);
  if (toutes.size > 0) {
    console.log(`${toutes.size} clé(s) déjà présentes dans le paquet du cœur, qui l'emporte :`);
    Array.from(toutes).sort().forEach((key) => console.log(`  ${JSON.stringify(key)}`));
  }
};

main();
