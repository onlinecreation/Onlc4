/* eslint-env node */
'use strict';

/**
 * Régénère le catalogue Font Awesome Free embarqué dans le plugin onlcicons.
 *
 * Usage :
 *   node modules/hugerte/tools/openmoji/build-fontawesome.js <dossier du paquet fontawesome-free>
 *
 * Le script lit `metadata/icon-families.json` et `metadata/categories.yml`, ne garde que les
 * icônes disponibles dans la version gratuite, et écrit
 * `src/plugins/onlcicons/main/ts/core/FontAwesomeData.ts`.
 */

const fs = require('fs');
const path = require('path');

const target = path.resolve(__dirname, '../../src/plugins/onlcicons/main/ts/core/FontAwesomeData.ts');

/** Petit lecteur du sous-ensemble d'yaml utilisé par `categories.yml`. */
const readCategories = (file) => {
  const categories = {};
  let current = null;
  let inIcons = false;

  fs.readFileSync(file, 'utf8').split('\n').forEach((line) => {
    const top = /^([a-z0-9-]+):\s*$/.exec(line);
    if (top !== null) {
      current = { slug: top[1], label: top[1], icons: [] };
      categories[top[1]] = current;
      inIcons = false;
      return;
    }
    if (current === null) {
      return;
    }
    const label = /^\s+label:\s*(.+?)\s*$/.exec(line);
    if (label !== null) {
      current.label = label[1].replace(/^["']|["']$/g, '');
      inIcons = false;
      return;
    }
    if (/^\s+icons:\s*$/.test(line)) {
      inIcons = true;
      return;
    }
    const item = /^\s+-\s*(.+?)\s*$/.exec(line);
    if (item !== null && inIcons) {
      current.icons.push(item[1]);
    }
  });

  return categories;
};

const main = () => {
  const source = process.argv[2];
  if (!source || !fs.existsSync(source)) {
    console.error('Indiquez le dossier du paquet @fortawesome/fontawesome-free.');
    process.exit(1);
  }

  const families = JSON.parse(fs.readFileSync(path.join(source, 'metadata/icon-families.json'), 'utf8'));
  const categories = readCategories(path.join(source, 'metadata/categories.yml'));

  const categoryOf = {};
  Object.keys(categories).forEach((slug) => {
    categories[slug].icons.forEach((name) => {
      if (categoryOf[name] === undefined) {
        categoryOf[name] = categories[slug].label;
      }
    });
  });

  const entries = [];
  Object.keys(families).sort().forEach((name) => {
    const icon = families[name];
    const free = (icon.familyStylesByLicense || {}).free || [];
    const classic = free.filter((entry) => entry.family === 'classic').map((entry) => entry.style);
    if (classic.length === 0) {
      return;
    }
    const style = classic.indexOf('brands') !== -1 ? 'brands' : (classic.indexOf('regular') !== -1 && classic.indexOf('solid') === -1 ? 'regular' : 'solid');
    const terms = (icon.search || {}).terms || [];
    entries.push({
      name,
      style,
      label: icon.label || name,
      keywords: [].concat(terms).map(String).join(' ').toLowerCase(),
      category: categoryOf[name] || 'Divers'
    });
  });

  const header = `/**
 * Catalogue Font Awesome Free 6.7.2 (https://fontawesome.com) — ${entries.length} icônes.
 *
 * Fichier généré par modules/hugerte/tools/openmoji/build-fontawesome.js — ne pas modifier.
 * Les dessins sont sous licence CC BY 4.0 et les fontes sous SIL OFL 1.1 : voir
 * \`src/plugins/onlcicons/main/LICENCES.md\`.
 */

/* eslint-disable max-len */

export interface RawFontAwesomeIcon {
  readonly name: string;
  /** Famille de la fonte : \`solid\`, \`regular\` ou \`brands\`. */
  readonly style: string;
  readonly label: string;
  readonly keywords: string;
  readonly category: string;
}

export const fontAwesomeIcons: RawFontAwesomeIcon[] = `;

  // Le dépôt écrit ses chaînes entre apostrophes simples : le fichier généré fait de même.
  const quote = (value) => `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  const body = '[\n' + entries.map((entry) =>
    `  { name: ${quote(entry.name)}, style: ${quote(entry.style)}, label: ${quote(entry.label)}, ` +
    `keywords: ${quote(entry.keywords)}, category: ${quote(entry.category)} }`).join(',\n') + '\n]';

  fs.writeFileSync(target, `${header}${body};\n`);
  console.log(`${entries.length} icônes écrites dans ${target}`);
};

main();
