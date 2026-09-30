'use strict';

/**
 * Produit les paquets de langue du cœur de l'éditeur, à partir de ceux de TinyMCE.
 *
 *   node modules/hugerte/tools/i18n/build-langs.js            # télécharge le paquet npm
 *   node modules/hugerte/tools/i18n/build-langs.js /chemin    # part d'un dossier déjà extrait
 *
 * HugeRTE est un fork de TinyMCE 6 mais n'embarque aucune traduction : `language: 'fr'` va
 * chercher `langs/fr.js`, qui n'existe pas, et l'interface reste en anglais. Les fichiers de
 * TinyMCE 6 conviennent tels quels — mêmes chaînes, même format — à deux détails près, que ce
 * script règle :
 *
 * 1. ils appellent `tinymce.addI18n` ; l'objet global s'appelle ici `hugerte` ;
 * 2. le français s'y nomme `fr_FR`, l'allemand `de`. Un projet qui écrit `language: 'fr'`
 *    n'obtiendrait rien. Chaque paquet régional reçoit donc un alias sur son code court, quand
 *    celui-ci n'existe pas déjà.
 *
 * **Licence.** Ces fichiers viennent de la distribution TinyMCE 6, publiée sous licence MIT —
 * la même que HugeRTE et que ce dépôt. Ils sont relayés par le paquet npm `tinymce-i18n`
 * (github.com/mklkj/tinymce-i18n), qui n'est affilié ni à Tiny Technologies ni à HugeRTE. La
 * mention de provenance est écrite en tête de chaque fichier produit.
 *
 * Les traductions de l'interface **ONLC** sont produites séparément, par
 * `tools/openmoji/build-i18n.js`. Celui-ci les **ajoute aux fichiers écrits ici**, entre deux
 * bornes en commentaire, et en dépose au passage une copie isolée dans `langs/onlc/`. Comme ce
 * script-ci efface le dossier avant de le réécrire, relancez toujours l'autre après lui.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

/** Version figée : une montée de version doit être un changement visible dans l'historique. */
const packageVersion = '26.8.2';

/**
 * TinyMCE 6 est la version dont HugeRTE est issu, et la dernière publiée sous licence MIT.
 * Les dossiers `langs7` et `langs8` relèvent d'un autre régime de licence : ne pas y toucher.
 */
const sourceDirectory = 'langs6';

const target = path.resolve(__dirname, '../../src/core/main/langs');

const banner = (code) =>
  '/**\n' +
  ` * Paquet de langue « ${code} » de l'interface HugeRTE.\n` +
  ' *\n' +
  ' * Produit par tools/i18n/build-langs.js à partir des traductions de TinyMCE 6 (licence MIT,\n' +
  ' * © Tiny Technologies Inc. et les contributeurs). Ne pas modifier à la main : reprenez le\n' +
  " * générateur, ou surchargez les chaînes voulues avec hugerte.addI18n() dans votre page.\n" +
  ' */\n';

/** Télécharge et déballe `tinymce-i18n`, et renvoie le dossier obtenu. */
const download = () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'hugerte-langs-'));
  console.log(`Téléchargement de tinymce-i18n@${packageVersion}…`);
  execFileSync('npm', [ 'pack', `tinymce-i18n@${packageVersion}` ], { cwd: temporary, stdio: 'inherit' });
  const archive = fs.readdirSync(temporary).find((entry) => entry.endsWith('.tgz'));
  if (archive === undefined) {
    throw new Error('npm pack n’a produit aucune archive.');
  }
  execFileSync('tar', [ 'xzf', archive ], { cwd: temporary, stdio: 'inherit' });
  return path.join(temporary, 'package');
};

/**
 * Code court d'un paquet régional : `fr_FR` → `fr`, `zh-Hans` → rien.
 *
 * Les variantes d'écriture (`zh-Hans`, `zh-Hant`) ne sont pas des régions : les réduire à `zh`
 * choisirait arbitrairement une des deux écritures du chinois. On les laisse telles quelles.
 */
const shortCodeOf = (code) => {
  const index = code.indexOf('_');
  return index > 0 ? code.slice(0, index) : null;
};

/** Le même paquet, adressé à l'objet global de HugeRTE. */
const convert = (source) => source.replace(/\btinymce\.addI18n\b/g, 'hugerte.addI18n');

/**
 * Le même paquet, redéclaré sous un code court.
 *
 * `addI18n` fusionne : l'alias et le paquet régional peuvent donc être chargés ensemble sans se
 * contredire.
 */
const aliasOf = (source, code, short) =>
  convert(source).replace(new RegExp(`addI18n\\((["'])${code}\\1`), `addI18n($1${short}$1`);

const main = () => {
  const given = process.argv[2];
  const root = given === undefined ? download() : path.resolve(given);
  const langs = path.join(root, sourceDirectory);

  if (!fs.existsSync(langs)) {
    console.error(`✗ Introuvable : ${langs}`);
    process.exit(1);
  }

  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(target, { recursive: true });

  const files = fs.readdirSync(langs).filter((entry) => entry.endsWith('.js')).sort();
  const written = new Set();

  // Les codes complets d'abord : un alias ne doit jamais écraser un vrai paquet.
  files.forEach((file) => {
    const code = path.basename(file, '.js');
    const source = fs.readFileSync(path.join(langs, file), 'utf8');
    const converted = convert(source);

    if (converted === source) {
      console.warn(`  ! ${file} : aucun appel « tinymce.addI18n » trouvé, fichier ignoré`);
      return;
    }

    fs.writeFileSync(path.join(target, file), banner(code) + converted, 'utf8');
    written.add(code);
  });

  let aliases = 0;
  files.forEach((file) => {
    const code = path.basename(file, '.js');
    const short = shortCodeOf(code);
    if (short === null || written.has(short)) {
      return;
    }
    // L'alias déclare les mêmes chaînes sous le code court : `addI18n` fusionne, les deux
    // fichiers peuvent donc être chargés ensemble sans se contredire.
    const source = fs.readFileSync(path.join(langs, file), 'utf8');
    const converted = aliasOf(source, code, short);

    fs.writeFileSync(path.join(target, `${short}.js`), banner(`${short} (alias de ${code})`) + converted, 'utf8');
    written.add(short);
    aliases += 1;
  });

  const readme = path.join(target, 'README.md');
  fs.writeFileSync(readme,
    '# Paquets de langue de l’interface\n\n' +
    'Ces fichiers traduisent l’interface du **cœur et du thème** de l’éditeur. Ils sont produits\n' +
    'par `tools/i18n/build-langs.js` à partir des traductions de TinyMCE 6 (licence MIT).\n\n' +
    '```html\n' +
    '<script src="/hugerte/hugerte.js"></script>\n' +
    '<script>hugerte.init({ language: \'fr\' });</script>\n' +
    '```\n\n' +
    'Le fichier est chargé tout seul depuis `langs/<code>.js`. Les codes régionaux (`fr_FR`,\n' +
    '`pt_BR`…) ont un alias sur leur code court quand celui-ci est libre : `fr` et `fr_FR`\n' +
    'fonctionnent donc l’un comme l’autre.\n\n' +
    'Les intitulés des **plugins ONLC** sont ensuite **ajoutés à ces mêmes fichiers** par\n' +
    '`tools/openmoji/build-i18n.js`, entre deux bornes en commentaire. Un paquet suffit donc à\n' +
    'traduire toute l’interface, et il n’y a pas de second script à inclure (voir\n' +
    '`docs/i18n.md`). Relancez toujours ce générateur-là après celui-ci, qui efface le dossier.\n\n' +
    'Ne modifiez pas ces fichiers à la main : ils sont réécrits à chaque génération. Pour\n' +
    'corriger une traduction de l’interface du cœur, passez par le projet amont :\n' +
    'https://crowdin.com/project/hugerte\n',
    'utf8');

  const size = fs.readdirSync(target).reduce((total, entry) =>
    total + fs.statSync(path.join(target, entry)).size, 0);

  console.log(`✓ ${written.size} paquets écrits dans src/core/main/langs ` +
    `(${aliases} alias de code court, ${(size / 1024).toFixed(0)} Ko)`);
};

/* Lancé directement : on génère. Requis par un test : on n'expose que les fonctions. */
if (require.main === module) {
  main();
}

module.exports = { shortCodeOf, convert, aliasOf, main, sourceDirectory, packageVersion };
