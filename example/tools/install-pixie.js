'use strict';

/**
 * Installe l'éditeur d'images Pixie dans la démonstration.
 *
 *   node example/tools/install-pixie.js /chemin/vers/pixie.zip
 *   node example/tools/install-pixie.js /chemin/vers/un/dossier/pixie
 *
 * Pixie est un produit sous **licence commerciale** (CodeCanyon). Ses fichiers ne sont donc pas
 * versionnés ici : ce script les prend dans l'archive que vous avez achetée et les range sous
 * `example/public/pixel/vendor/`, un dossier ignoré par git.
 *
 * Seul le nécessaire est copié — le bundle et les ressources dont l'éditeur a besoin pour
 * fonctionner. Les bibliothèques de vignettes (autocollants, cadres, images d'exemple) pèsent
 * une quinzaine de mégaoctets pour un intérêt nul dans une démonstration ; ajoutez `--full`
 * pour les inclure quand même.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const target = path.resolve(__dirname, '../public/pixel/vendor');

/** Ce qu'il faut copier, et d'où. Les entrées absentes de l'archive sont simplement ignorées. */
const required = [
  { from: 'dist/pixie.umd.js', to: 'pixie.umd.js' },
  { from: 'assets/fonts', to: 'assets/fonts' },
  { from: 'assets/images/brushes', to: 'assets/images/brushes' },
  { from: 'assets/images/filter', to: 'assets/images/filter' },
  { from: 'assets/images/gradients', to: 'assets/images/gradients' },
  { from: 'assets/images/textures', to: 'assets/images/textures' },
  { from: 'assets/images/empty-canvas-bg.png', to: 'assets/images/empty-canvas-bg.png' }
];

const optional = [
  { from: 'assets/images/stickers', to: 'assets/images/stickers' },
  { from: 'assets/images/frames', to: 'assets/images/frames' },
  { from: 'assets/images/samples', to: 'assets/images/samples' }
];

const fail = (message) => {
  console.error('✗ ' + message);
  process.exit(1);
};

/** Déballe l'archive dans un dossier temporaire et renvoie son chemin. */
const unzip = (archive) => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'pixie-'));
  try {
    execFileSync('unzip', [ '-q', '-o', archive, '-d', temporary ], { stdio: 'inherit' });
  } catch (_err) {
    fail('Impossible de déballer l’archive. La commande « unzip » est-elle installée ?');
  }
  return temporary;
};

/**
 * Retrouve la racine de Pixie dans un dossier.
 *
 * Les archives CodeCanyon rangent parfois le produit dans un sous-dossier ; on cherche donc le
 * premier niveau qui contient `dist/pixie.umd.js`, plutôt que d'imposer une structure.
 */
const findRoot = (directory) => {
  if (fs.existsSync(path.join(directory, 'dist', 'pixie.umd.js'))) {
    return directory;
  }
  const children = fs.readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(directory, entry.name));

  for (const child of children) {
    const found = findRoot(child);
    if (found !== null) {
      return found;
    }
  }
  return null;
};

const copy = (root, entries) => entries.reduce((copied, entry) => {
  const source = path.join(root, entry.from);
  if (!fs.existsSync(source)) {
    console.log('  – absent de l’archive, ignoré : ' + entry.from);
    return copied;
  }
  const destination = path.join(target, entry.to);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.cpSync(source, destination, { recursive: true });
  return copied + 1;
}, 0);

const sizeOf = (directory) => fs.readdirSync(directory, { withFileTypes: true }).reduce((total, entry) => {
  const child = path.join(directory, entry.name);
  return total + (entry.isDirectory() ? sizeOf(child) : fs.statSync(child).size);
}, 0);

const main = () => {
  const args = process.argv.slice(2);
  const full = args.includes('--full');
  const source = args.find((arg) => !arg.startsWith('--'));

  if (source === undefined) {
    fail('Indiquez l’archive ou le dossier Pixie :\n' +
      '    node example/tools/install-pixie.js /chemin/vers/pixie.zip');
  }
  if (!fs.existsSync(source)) {
    fail('Introuvable : ' + source);
  }

  const extracted = fs.statSync(source).isDirectory() ? source : unzip(source);
  const root = findRoot(extracted);

  if (root === null) {
    fail('« dist/pixie.umd.js » est introuvable : ce n’est pas une archive Pixie.');
  }

  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(target, { recursive: true });

  const count = copy(root, full ? required.concat(optional) : required);
  const megabytes = (sizeOf(target) / 1024 / 1024).toFixed(1);

  console.log('✓ Pixie installé dans example/public/pixel/vendor (' + count + ' entrées, ' + megabytes + ' Mo)');
  if (!full) {
    console.log('  Autocollants, cadres et images d’exemple ont été laissés de côté : relancez avec --full pour les ajouter.');
  }
  console.log('  Lancez « yarn example » puis cliquez sur « Retoucher » dans la médiathèque.');
};

main();
