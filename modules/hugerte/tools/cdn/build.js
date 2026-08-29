'use strict';

/**
 * Assemble la distribution statique d'ONLC 4 : un dossier autoportant, entièrement minifié,
 * à déposer tel quel sur un CDN.
 *
 *   npx grunt --gruntfile modules/hugerte/Gruntfile.js prodBuild   # 1. produire js/hugerte
 *   node modules/hugerte/tools/cdn/build.js                        # 2. en tirer dist/onlc4
 *
 * `prodBuild` laisse dans `js/hugerte` les deux versions de chaque fichier — la lisible et la
 * minifiée — plus les cartes de source, les définitions TypeScript et les sources des
 * habillages. Un CDN n'a que faire de tout cela : ce script recopie la moitié utile, minifie
 * ce que `prodBuild` avait laissé tel quel (les paquets de langue et les feuilles des plugins
 * ONLC), et écrit à côté un manifeste et une notice de déploiement.
 *
 * **Rien n'est recopié par défaut.** Chaque fichier doit tomber dans une règle de `decide()`,
 * sinon il est écarté *et signalé*. Un nouveau type de ressource ne peut donc pas disparaître
 * du paquet en silence : il apparaît dans la liste des fichiers non classés, en fin de course.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const CleanCss = require('clean-css');
const terser = require('terser');

const root = path.resolve(__dirname, '../../../..');
const source = path.resolve(__dirname, '../../js/hugerte');
const target = path.join(root, 'dist/onlc4');

/**
 * Le nom sous lequel l'éditeur est chargé par la page. C'est lui qui donne au cœur son dossier
 * d'installation *et* son suffixe `.min` : tout le reste du paquet est ensuite demandé à côté
 * de ce fichier, sous sa forme minifiée (voir `core/api/EditorManager.ts`).
 */
const entry = 'onlc4.min.js';

/** Les dessins OpenMoji, trop nombreux pour figurer un par un dans le manifeste. */
const openmoji = 'plugins/onlcicons/openmoji/';

/* -------------------------------------------------------------------------- *
 * Le tri
 * -------------------------------------------------------------------------- */

const basename = (relative) => relative.substring(relative.lastIndexOf('/') + 1);

const isMinified = (name) => /\.min\.(js|css)$/.test(name);

/**
 * Le nom minifié d'un fichier : `plugin.js` → `plugin.min.js`. `null` pour tout le reste — une
 * police ou un dessin n'a pas de jumeau, et se comparer à soi-même reviendrait à s'écarter.
 */
const twinOf = (relative) =>
  /\.(js|css)$/.test(relative) ? relative.replace(/\.(js|css)$/, '.min.$1') : null;

/**
 * Que faire de ce fichier ? `keep` recopie ou minifie, `skip` écarte en disant pourquoi.
 *
 * @param {string} relative chemin depuis `js/hugerte`, avec des `/`
 * @param {Set<string>} present tous les chemins du dossier source, pour repérer les jumeaux
 * @returns {{ action: 'keep', to: string, mode: 'copy'|'js'|'css' } | { action: 'skip', reason: string }}
 */
const decide = (relative, present) => {
  const name = basename(relative);
  const keep = (to, mode) => ({ action: 'keep', to, mode });
  const skip = (reason) => ({ action: 'skip', reason });

  // L'éditeur lui-même, rebaptisé. Déjà minifié par `terser:core`.
  if (relative === 'hugerte.min.js') {
    return keep(entry, 'copy');
  }
  if (relative === 'license.txt') {
    return keep(relative, 'copy');
  }

  // Ce qui ne sert qu'au développement.
  if (name.endsWith('.map')) {
    return skip('carte de source');
  }
  if (name.endsWith('.d.ts')) {
    return skip('définitions TypeScript');
  }
  if (name === 'README.md') {
    return skip('notice du dépôt');
  }
  // Les habillages sont livrés en CSS ; les `.js` de ce dossier sont la même feuille emballée
  // pour un empaqueteur, et le `.css` lisible double le `.min.css`.
  if (relative.startsWith('skins/')) {
    return name.endsWith('.min.css') ? keep(relative, 'copy') : skip('source d’habillage');
  }

  // Un fichier qui a un jumeau minifié dans le dossier source est en trop.
  const twin = twinOf(relative);
  if (!isMinified(name) && twin !== null && present.has(twin)) {
    return skip('doublé par sa version minifiée');
  }

  if (relative.startsWith('plugins/')) {
    if (name.endsWith('.min.js')) {
      return keep(relative, 'copy');
    }
    // Les feuilles des plugins ONLC : `prodBuild` les recopie sans y toucher, et le code les
    // demande sous leur nom exact (`css/onlcblocks.css`). On les minifie donc sur place.
    if (name.endsWith('.css')) {
      return keep(relative, 'css');
    }
    // Traductions de l'aide, index de raccourcis : demandés sans suffixe, minifiés sur place.
    if (name.endsWith('.js')) {
      return keep(relative, 'js');
    }
    if (/\.(woff2|woff|ttf|svg|png|gif)$/.test(name)) {
      return keep(relative, 'copy');
    }
    // Les mentions de licence des polices et des dessins doivent voyager avec eux.
    if (name === 'LICENCES.md') {
      return keep(relative, 'copy');
    }
    return skip('type inconnu dans plugins/');
  }

  // Paquets de langue : chargés sous leur nom exact, `langs/<code>.js`, jamais en `.min`.
  if (relative.startsWith('langs/')) {
    return name.endsWith('.js') ? keep(relative, 'js') : skip('hors paquet de langue');
  }

  if (/^(icons|themes|models)\//.test(relative)) {
    return name.endsWith('.min.js') ? keep(relative, 'copy') : skip('version lisible');
  }

  return skip('non classé');
};

/** Tous les chemins d'un dossier, relatifs et triés. */
const walk = (directory, prefix = '') => {
  const entries = fs.readdirSync(path.join(directory, prefix), { withFileTypes: true });
  return entries.sort((a, b) => a.name.localeCompare(b.name)).reduce((found, item) => {
    const relative = prefix === '' ? item.name : `${prefix}/${item.name}`;
    return found.concat(item.isDirectory() ? walk(directory, relative) : [ relative ]);
  }, []);
};

/**
 * Le plan complet : ce qui part, ce qui reste, et pourquoi.
 *
 * @param {string[]} tree les chemins relevés dans le dossier source
 */
const plan = (tree) => {
  const present = new Set(tree);
  return tree.reduce((result, relative) => {
    const verdict = decide(relative, present);
    if (verdict.action === 'keep') {
      result.keep.push({ from: relative, to: verdict.to, mode: verdict.mode });
    } else {
      result.skip.push({ from: relative, reason: verdict.reason });
    }
    return result;
  }, { keep: [], skip: [] });
};

/* -------------------------------------------------------------------------- *
 * La minification
 * -------------------------------------------------------------------------- */

/**
 * Les paquets de langue et les index d'aide sont des données, pas du code : on les compacte
 * sans renommer quoi que ce soit, et on garde `ascii_only` pour qu'un serveur qui se trompe
 * de jeu de caractères n'abîme pas les accents.
 */
const minifyJs = async (code, name) => {
  const result = await terser.minify(code, {
    ecma: 2018,
    compress: { passes: 2 },
    output: { ascii_only: true, comments: false }
  });
  if (typeof result.code !== 'string') {
    throw new Error(`Minification impossible : ${name}`);
  }
  return result.code;
};

const cleaner = new CleanCss({ level: 2, rebase: false });

/**
 * Les feuilles gardent leurs `url(../fonts/…)` telles quelles : le paquet conserve son
 * arborescence, les chemins relatifs restent justes une fois sur le CDN.
 */
const minifyCss = (code, name) => {
  const result = cleaner.minify(code);
  if (result.errors.length > 0) {
    throw new Error(`Minification impossible : ${name} — ${result.errors.join(', ')}`);
  }
  return result.styles;
};

/* -------------------------------------------------------------------------- *
 * Le contrôle des renvois
 * -------------------------------------------------------------------------- */

/**
 * Les adresses relatives citées par une feuille de style, résolues depuis son propre dossier.
 * Les `data:`, les adresses absolues et les ancres SVG (`url(#…)`) ne désignent pas un fichier
 * du paquet et ne regardent donc pas ce contrôle.
 */
const referencesOf = (relative, css) => {
  const directory = relative.substring(0, relative.lastIndexOf('/'));
  const found = [];
  const pattern = /url\(\s*['"]?([^'")]+?)['"]?\s*\)/g;
  let match = pattern.exec(css);
  while (match !== null) {
    const address = match[1].trim();
    if (!/^(data:|https?:|\/\/|#|\/)/.test(address)) {
      const parts = `${directory}/${address.split(/[?#]/)[0]}`.split('/');
      const resolved = parts.reduce((stack, part) => {
        if (part === '..') {
          stack.pop();
        } else if (part !== '.' && part !== '') {
          stack.push(part);
        }
        return stack;
      }, []).join('/');
      found.push(resolved);
    }
    match = pattern.exec(css);
  }
  return found;
};

/**
 * Une feuille qui cite un fichier absent du paquet est une panne différée : le navigateur
 * n'ira le chercher qu'au moment où il en aura besoin, et ne dira rien avant. Le contrôle se
 * fait donc ici, sur le paquet assemblé, pendant qu'il est encore temps d'ajouter le fichier.
 */
const danglingLinks = (files) => {
  const present = new Set(files.map((file) => file.to));
  return files.reduce((broken, file) => {
    if (!file.to.endsWith('.css')) {
      return broken;
    }
    const missing = referencesOf(file.to, file.content.toString('utf8'))
      .filter((address) => !present.has(address));
    return broken.concat([ ...new Set(missing) ].map((address) => ({ from: file.to, missing: address })));
  }, []);
};

/* -------------------------------------------------------------------------- *
 * Le manifeste
 * -------------------------------------------------------------------------- */

const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

/** L'empreinte à recopier dans l'attribut `integrity` d'une balise `<script>` ou `<link>`. */
const integrity = (buffer) => `sha384-${crypto.createHash('sha384').update(buffer).digest('base64')}`;

const gzipped = (buffer) => zlib.gzipSync(buffer, { level: 9 }).length;

/**
 * Une ligne de manifeste par fichier — sauf les dessins OpenMoji, réunis en une seule entrée :
 * 4 495 lignes de plus rendraient le fichier illisible pour la seule chose qu'on lui demande,
 * vérifier qu'un dépôt est complet et intact.
 */
const describe = (files) => {
  const drawings = files.filter((file) => file.to.startsWith(openmoji));
  const listed = files.filter((file) => !file.to.startsWith(openmoji));

  const entries = listed.reduce((table, file) => {
    table[file.to] = {
      octets: file.content.length,
      gzip: gzipped(file.content),
      sha256: sha256(file.content),
      integrite: /\.(js|css)$/.test(file.to) ? integrity(file.content) : undefined
    };
    return table;
  }, {});

  if (drawings.length > 0) {
    // L'empreinte du groupe : celle de la liste « nom empreinte » triée. Elle change dès qu'un
    // dessin est ajouté, retiré ou modifié.
    const inventory = drawings
      .map((file) => `${file.to} ${sha256(file.content)}`)
      .sort()
      .join('\n');
    entries[openmoji] = {
      fichiers: drawings.length,
      octets: drawings.reduce((total, file) => total + file.content.length, 0),
      sha256: sha256(Buffer.from(inventory, 'utf8')),
      empreinte: 'somme de la liste « chemin empreinte » triée'
    };
  }

  return entries;
};

/* -------------------------------------------------------------------------- *
 * Les fichiers écrits à côté du paquet
 * -------------------------------------------------------------------------- */

const readme = (version) => `# ONLC 4 — distribution statique

Éditeur ONLC 4, version **${version}**. Ce dossier est autoportant : déposez-le tel quel, sans
en changer l'arborescence, et appelez \`onlc4.min.js\` depuis votre page.

\`\`\`html
<script src="https://cdn.exemple.fr/onlc4/${version}/onlc4.min.js"></script>
<script>
  hugerte.init({
    selector: '#contenu',
    language: 'fr',
    plugins: 'onlcblocks onlcwidgets onlcicons onlclink onlcmedia onlcanimtext',
    toolbar: 'onlcblocks | bold italic | onlclink onlcicons'
  });
</script>
\`\`\`

C'est le **nom du fichier** qui indique à l'éditeur où trouver le reste : il en déduit le
dossier d'installation et le suffixe \`.min\`, puis va chercher le thème, le modèle,
l'habillage, les plugins et la langue à côté. Ne renommez pas \`onlc4.min.js\`, ne le recopiez
pas ailleurs que dans son dossier. Si votre page charge l'éditeur autrement — par un
empaqueteur, une injection, un \`import()\` — indiquez l'adresse à la main :

\`\`\`js
hugerte.init({ selector: '#contenu', base_url: 'https://cdn.exemple.fr/onlc4/${version}', suffix: '.min' });
\`\`\`

## Ce que le serveur doit envoyer

| Chemin | En-tête | Pourquoi |
|---|---|---|
| tout le dossier | \`Access-Control-Allow-Origin: *\` | voir ci-dessous |
| \`*.woff2\` | \`Content-Type: font/woff2\` | sinon la police est refusée en silence |
| \`*.svg\` | \`Content-Type: image/svg+xml\` | les dessins d'emoji |
| dossier versionné | \`Cache-Control: public, max-age=31536000, immutable\` | le contenu ne change jamais |

**\`Access-Control-Allow-Origin\` n'est pas facultatif.** Trois choses passent par un mécanisme
qui vérifie cet en-tête, et échouent sans lui :

1. **Les polices d'icônes** (\`plugins/onlcicons/fonts/*.woff2\`). Une police appelée depuis une
   feuille de style est toujours demandée en mode CORS, même sans \`crossorigin\` dans la page.
   Sans l'en-tête, le navigateur télécharge le fichier puis refuse de l'utiliser : les icônes
   Font Awesome et Material s'affichent en carrés vides.
2. **La lecture des feuilles des plugins**, dont l'éditeur tire la liste des classes qu'il
   propose dans ses formulaires. Il essaie d'abord de lire la feuille déjà chargée — ce que le
   navigateur interdit d'un autre domaine — puis se rabat sur un téléchargement, soumis à CORS.
   Sans l'en-tête, les listes de classes sont simplement vides.
3. **Les tests d'intégrité** si vous posez un attribut \`integrity\` sur la balise \`<script>\`
   (les empreintes sont dans \`manifest.json\`) : il exige alors \`crossorigin="anonymous"\`,
   donc CORS.

Le reste du paquet — l'éditeur, les plugins, les habillages, les langues, les dessins — est
chargé par des balises \`<script>\`, \`<link>\` et \`<img>\`, qui n'ont pas besoin de l'en-tête.
Le mettre partout est plus simple que de le poser fichier par fichier, et sans risque : ces
fichiers sont publics et ne portent aucune donnée de compte.

## Ce que contient le dossier

| Dossier | Contenu |
|---|---|
| \`onlc4.min.js\` | l'éditeur |
| \`themes/\`, \`models/\`, \`icons/\` | thème, modèle de document, icônes de l'interface |
| \`skins/\` | habillages de l'interface et du texte |
| \`plugins/\` | un dossier par plugin, avec ses feuilles et ses polices |
| \`langs/\` | 80 langues d'interface, chargées d'elles-mêmes par \`language:\` |
| \`manifest.json\` | la liste des fichiers, leur taille et leur empreinte |
| \`exemple.html\` | une page minimale, pour vérifier un dépôt |

Chaque langue est dans **un seul fichier**, qui traduit l'interface du cœur comme les
formulaires des plugins ONLC. \`language: 'nl'\` suffit ; il n'y a pas de second script à
inclure.

## Vérifier un dépôt

Ouvrez \`exemple.html\` depuis le CDN. Si l'éditeur apparaît, que les icônes de la barre
d'outils sont dessinées et que le sélecteur d'icônes montre des pictogrammes, l'arborescence,
les types MIME et les en-têtes CORS sont bons.

## Mise à jour

Déposez chaque version dans son propre dossier (\`/onlc4/${version}/\`) plutôt que d'écraser la
précédente : les pages déjà servies continuent de fonctionner, et le cache long ci-dessus
devient sans danger.

## Licences

L'éditeur est publié sous licence MIT (\`license.txt\`) — c'est un dérivé de HugeRTE, lui-même
dérivé de TinyMCE 6. Les polices d'icônes et les dessins d'emoji ont leurs propres licences,
rappelées dans \`plugins/onlcicons/LICENCES.md\`, qui doit rester dans le dépôt.
`;

const example = (version) => `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ONLC 4 ${version} — vérification du dépôt</title>
<style>
  body { margin: 0; padding: 24px; font: 15px/1.5 system-ui, sans-serif; background: #f6f7f9; }
  main { max-width: 900px; margin: 0 auto; }
  h1 { font-size: 20px; }
  p { color: #444; }
  #etat { padding: 10px 14px; border-radius: 6px; background: #eef; margin-bottom: 16px; }
  #etat.bon { background: #e6f6e9; }
  #etat.mauvais { background: #fdecec; }
</style>
</head>
<body>
<main>
  <h1>ONLC 4 ${version}</h1>
  <p>Cette page charge l'éditeur depuis le dossier où elle se trouve. Si l'éditeur apparaît
  ci-dessous avec ses icônes, le dépôt est complet.</p>
  <p id="etat">Chargement…</p>
  <textarea id="contenu">&lt;p&gt;Bonjour. Cliquez pour écrire.&lt;/p&gt;</textarea>
</main>
<script src="./${entry}"></script>
<script>
  var etat = document.getElementById('etat');
  var dire = function (texte, bon) { etat.textContent = texte; etat.className = bon ? 'bon' : 'mauvais'; };
  if (typeof hugerte === 'undefined') {
    dire('Échec : ' + './${entry}' + ' n’a pas été chargé.', false);
  } else {
    hugerte.init({
      selector: '#contenu',
      language: 'fr',
      height: 420,
      plugins: 'onlcicons onlclink lists',
      toolbar: 'undo redo | bold italic | bullist | onlclink onlcicons',
      menubar: 'edit insert format',
      setup: function (editor) {
        editor.on('init', function () {
          dire('Éditeur chargé depuis ' + hugerte.baseURL + ' (suffixe « ' + hugerte.suffix + ' »).', true);
        });
      }
    });
  }
</script>
</body>
</html>
`;

/* -------------------------------------------------------------------------- *
 * L'assemblage
 * -------------------------------------------------------------------------- */

const emptyDirectory = (directory) => {
  if (fs.existsSync(directory)) {
    fs.rmSync(directory, { recursive: true });
  }
  fs.mkdirSync(directory, { recursive: true });
};

const kilobytes = (octets) => `${(octets / 1024).toFixed(0)} Ko`;

const build = async () => {
  if (!fs.existsSync(path.join(source, 'hugerte.min.js'))) {
    throw new Error(
      'Rien à empaqueter : js/hugerte/hugerte.min.js est absent.\n' +
      'Produisez d’abord la version de production :\n' +
      '  npx grunt --gruntfile modules/hugerte/Gruntfile.js prodBuild');
  }

  const version = require('../../package.json').version;
  const tree = walk(source);
  const { keep, skip } = plan(tree);

  emptyDirectory(target);

  const written = [];
  for (const file of keep) {
    const raw = fs.readFileSync(path.join(source, file.from));
    const content = file.mode === 'copy' ? raw
      : file.mode === 'css' ? Buffer.from(minifyCss(raw.toString('utf8'), file.from), 'utf8')
        : Buffer.from(await minifyJs(raw.toString('utf8'), file.from), 'utf8');
    const destination = path.join(target, file.to);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, content);
    written.push({ to: file.to, content });
  }

  const broken = danglingLinks(written);
  if (broken.length > 0) {
    throw new Error('Feuilles de style qui renvoient à des fichiers absents du paquet :\n' +
      broken.map((link) => `  ${link.from} → ${link.missing}`).join('\n'));
  }

  const fichiers = describe(written);
  const total = written.reduce((sum, file) => sum + file.content.length, 0);

  fs.writeFileSync(path.join(target, 'README.md'), readme(version), 'utf8');
  fs.writeFileSync(path.join(target, 'exemple.html'), example(version), 'utf8');
  fs.writeFileSync(path.join(target, 'manifest.json'), JSON.stringify({
    nom: 'onlc4',
    version,
    entree: entry,
    genere: new Date().toISOString(),
    total: { fichiers: written.length, octets: total },
    fichiers
  }, null, 2) + '\n', 'utf8');

  const unknown = skip.filter((file) => file.reason === 'non classé' || file.reason === 'type inconnu dans plugins/');
  return { version, written, skip, unknown, total };
};

const main = () => {
  build().then((result) => {
    const source_size = walk(source).reduce((sum, relative) =>
      sum + fs.statSync(path.join(source, relative)).size, 0);
    console.log(`✓ dist/onlc4 — ONLC 4 ${result.version}`);
    console.log(`  ${result.written.length} fichiers, ${kilobytes(result.total)} ` +
      `(sur ${kilobytes(source_size)} produits par prodBuild)`);
    if (result.unknown.length > 0) {
      console.log(`  ⚠ ${result.unknown.length} fichiers non classés, écartés du paquet :`);
      result.unknown.slice(0, 20).forEach((file) => console.log(`      ${file.from}`));
      console.log('    Ajoutez-leur une règle dans tools/cdn/build.js, ou confirmez qu’ils sont inutiles.');
    }
  }).catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
};

/* Lancé directement : on empaquette. Requis par un test : on n'expose que les fonctions. */
if (require.main === module) {
  main();
}

module.exports = {
  decide, plan, walk, describe, minifyJs, minifyCss, referencesOf, danglingLinks,
  build, entry, openmoji, target, source
};
