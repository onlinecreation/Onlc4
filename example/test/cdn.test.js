'use strict';

/**
 * Le paquet statique pour CDN.
 *
 * L'assemblage est un tri : chaque fichier produit par `prodBuild` part ou reste, et une erreur
 * de tri ne se voit pas au moment où on la commet. Un fichier oublié ne manque qu'à l'ouverture
 * d'une fenêtre précise, chez le client, une semaine plus tard ; un fichier gardé en trop
 * double le poids du dépôt sans que personne s'en aperçoive. D'où ces tests sur le tri lui-même
 * plutôt que sur son résultat : ils tournent sans qu'il faille avoir compilé l'éditeur.
 */

const { describe, it, assert } = require('./harness');
const cdn = require('../../modules/hugerte/tools/cdn/build');

/** Le verdict rendu sur un chemin, dans une arborescence donnée. */
const verdict = (relative, tree = [ relative ]) => cdn.decide(relative, new Set(tree));

describe('Paquet CDN — ce qui part', () => {
  it('renomme l’éditeur en onlc4.min.js', () => {
    assert.deepEqual(verdict('hugerte.min.js'), { action: 'keep', to: 'onlc4.min.js', mode: 'copy' });
  });

  it('emporte les plugins, le thème, le modèle et les icônes minifiés', () => {
    [ 'plugins/onlcblocks/plugin.min.js', 'themes/silver/theme.min.js',
      'models/dom/model.min.js', 'icons/default/icons.min.js' ].forEach((relative) => {
      assert.deepEqual(verdict(relative), { action: 'keep', to: relative, mode: 'copy' });
    });
  });

  it('minifie les feuilles des plugins sans les renommer', () => {
    // Le code les demande sous leur nom exact : `${pluginUrl}/css/onlcblocks.css`.
    assert.deepEqual(verdict('plugins/onlcblocks/css/onlcblocks.css'),
      { action: 'keep', to: 'plugins/onlcblocks/css/onlcblocks.css', mode: 'css' });
  });

  it('minifie les paquets de langue sans les renommer', () => {
    // Le cœur les demande en `langs/<code>.js`, jamais en `.min` : voir core/init/Render.ts.
    assert.deepEqual(verdict('langs/nl.js'), { action: 'keep', to: 'langs/nl.js', mode: 'js' });
  });

  it('emporte les polices, les dessins et leurs licences', () => {
    [ 'plugins/onlcicons/fonts/fa-solid-900.woff2',
      'plugins/onlcicons/openmoji/1F600.svg',
      'plugins/onlcicons/LICENCES.md' ].forEach((relative) => {
      assert.deepEqual(verdict(relative), { action: 'keep', to: relative, mode: 'copy' });
    });
  });

  it('n’écarte pas une police au prétexte qu’elle serait son propre doublon', () => {
    // `twinOf` ne s'applique qu'au JS et au CSS. Sans cette réserve, `x.woff2` se comparerait
    // à lui-même, se trouverait, et le paquet partirait sans une seule icône.
    const tree = [ 'plugins/onlcicons/fonts/x.woff2', 'plugins/onlcicons/openmoji/A.svg' ];
    tree.forEach((relative) => assert.equal(verdict(relative, tree).action, 'keep', relative));
  });
});

describe('Paquet CDN — ce qui reste', () => {
  it('écarte la version lisible d’un fichier qui a sa version minifiée', () => {
    const tree = [ 'plugins/link/plugin.js', 'plugins/link/plugin.min.js' ];
    assert.equal(verdict('plugins/link/plugin.js', tree).action, 'skip');
    assert.equal(verdict('plugins/link/plugin.min.js', tree).action, 'keep');
  });

  it('garde la version lisible quand il n’y a pas de version minifiée', () => {
    // Les traductions de l'aide, par exemple : demandées sans suffixe, minifiées sur place.
    assert.deepEqual(verdict('plugins/help/js/i18n/keynav/fr.js'),
      { action: 'keep', to: 'plugins/help/js/i18n/keynav/fr.js', mode: 'js' });
  });

  it('écarte ce qui ne sert qu’au développement', () => {
    [ 'hugerte.d.ts', 'skins/ui/oxide/skin.min.css.map', 'README.md', 'langs/README.md',
      'skins/ui/oxide/skin.css', 'skins/ui/oxide/skin.js' ].forEach((relative) => {
      assert.equal(verdict(relative).action, 'skip', relative);
    });
  });

  it('ne garde des habillages que les feuilles minifiées', () => {
    assert.equal(verdict('skins/ui/oxide/skin.min.css').action, 'keep');
    assert.equal(verdict('skins/content/default/content.min.css').action, 'keep');
  });

  it('signale un type inconnu au lieu de l’emporter en silence', () => {
    // Rien n'est recopié par défaut : une ressource d'un genre nouveau doit se voir.
    assert.deepEqual(verdict('plugins/onlcicons/data/tables.bin'),
      { action: 'skip', reason: 'type inconnu dans plugins/' });
    assert.deepEqual(verdict('quelque-chose.txt'), { action: 'skip', reason: 'non classé' });
  });
});

describe('Paquet CDN — le plan', () => {
  const tree = [
    'hugerte.js', 'hugerte.min.js', 'hugerte.d.ts', 'license.txt',
    'langs/fr.js', 'langs/README.md',
    'plugins/onlcicons/plugin.js', 'plugins/onlcicons/plugin.min.js',
    'plugins/onlcicons/css/onlcicons.css',
    'plugins/onlcicons/fonts/material-icons.woff2',
    'skins/ui/oxide/skin.css', 'skins/ui/oxide/skin.min.css', 'skins/ui/oxide/skin.min.css.map'
  ];

  it('trie chaque fichier, sans en perdre ni en inventer', () => {
    const plan = cdn.plan(tree);
    assert.equal(plan.keep.length + plan.skip.length, tree.length);
  });

  it('ne retient que la moitié utile', () => {
    const kept = cdn.plan(tree).keep.map((file) => file.to).sort();
    assert.deepEqual(kept, [
      'langs/fr.js', 'license.txt', 'onlc4.min.js',
      'plugins/onlcicons/css/onlcicons.css',
      'plugins/onlcicons/fonts/material-icons.woff2',
      'plugins/onlcicons/plugin.min.js',
      'skins/ui/oxide/skin.min.css'
    ]);
  });
});

describe('Paquet CDN — les renvois des feuilles', () => {
  it('résout une adresse relative depuis le dossier de la feuille', () => {
    assert.deepEqual(
      cdn.referencesOf('plugins/onlcicons/css/fontawesome.css',
        '@font-face{src:url(../fonts/fa-solid-900.woff2) format("woff2")}'),
      [ 'plugins/onlcicons/fonts/fa-solid-900.woff2' ]);
  });

  it('laisse tranquilles les adresses qui ne désignent pas un fichier du paquet', () => {
    assert.deepEqual(
      cdn.referencesOf('plugins/x/css/a.css',
        'a{background:url(data:image/png;base64,AA)}b{mask:url(#forme)}c{src:url(https://ailleurs/x.woff2)}'),
      []);
  });

  it('dénonce une feuille qui renvoie à un fichier absent du paquet', () => {
    // Le cas réel : Font Awesome propose une source truetype en secours, jamais livrée. Le
    // navigateur ne va la chercher qu'au moment où le woff2 échoue — un 404 différé, invisible
    // à la mise en ligne.
    const files = [
      { to: 'plugins/onlcicons/css/fontawesome.css',
        content: Buffer.from('@font-face{src:url(../fonts/a.woff2),url(../fonts/a.ttf)}', 'utf8') },
      { to: 'plugins/onlcicons/fonts/a.woff2', content: Buffer.from('x', 'utf8') }
    ];
    assert.deepEqual(cdn.danglingLinks(files),
      [ { from: 'plugins/onlcicons/css/fontawesome.css', missing: 'plugins/onlcicons/fonts/a.ttf' } ]);
  });

  it('ne dit rien quand tout est là', () => {
    const files = [
      { to: 'plugins/onlcicons/css/a.css', content: Buffer.from('@font-face{src:url(../fonts/a.woff2)}', 'utf8') },
      { to: 'plugins/onlcicons/fonts/a.woff2', content: Buffer.from('x', 'utf8') }
    ];
    assert.lengthOf(cdn.danglingLinks(files), 0);
  });
});

describe('Paquet CDN — la minification', () => {
  it('compacte un paquet de langue sans en changer le sens', async () => {
    const source = 'hugerte.addI18n("nl", {\n  "Bold": "Vet",\n  "Ajouter un bloc": "Een blok toevoegen"\n});\n';
    const out = await cdn.minifyJs(source, 'langs/nl.js');
    assert.ok(out.length < source.length, 'le paquet devrait rétrécir');
    assert.includes(out, 'addI18n');
    assert.includes(out, 'Een blok toevoegen');
  });

  it('échappe les accents plutôt que de les confier au serveur', () => {
    // `ascii_only` : un serveur qui annonce le mauvais jeu de caractères ne peut plus abîmer
    // une traduction. C'est le même choix que pour le reste du paquet (`terser` du Gruntfile).
    return cdn.minifyJs('hugerte.addI18n("fr", { "Undo": "Rétablir" });', 'langs/fr.js')
      .then((out) => {
        assert.includes(out, '\\xe9');
        assert.notIncludes(out, 'é');
      });
  });

  it('compacte une feuille sans toucher aux chemins relatifs', () => {
    // Le paquet garde son arborescence : réécrire les `url()` la casserait.
    const out = cdn.minifyCss('@font-face {\n  font-family: "X";\n  src: url(../fonts/x.woff2);\n}\n', 'a.css');
    assert.includes(out, 'url(../fonts/x.woff2)');
    assert.notIncludes(out, '\n  ');
  });
});

describe('Paquet CDN — le manifeste', () => {
  const file = (to, body) => ({ to, content: Buffer.from(body, 'utf8') });

  it('donne pour chaque fichier sa taille, son poids compressé et son empreinte', () => {
    const table = cdn.describe([ file('onlc4.min.js', 'var a=1;') ]);
    const entry = table['onlc4.min.js'];
    assert.equal(entry.octets, 8);
    assert.ok(entry.gzip > 0);
    assert.lengthOf(entry.sha256, 64);
    assert.includes(entry.integrite, 'sha384-');
  });

  it('ne met pas d’empreinte d’intégrité sur ce qui n’est ni script ni feuille', () => {
    const table = cdn.describe([ file('plugins/onlcicons/fonts/a.woff2', 'wOF2') ]);
    assert.equal(table['plugins/onlcicons/fonts/a.woff2'].integrite, undefined);
  });

  it('réunit les 4 495 dessins en une seule ligne', () => {
    // Une ligne par dessin rendrait illisible la seule chose qu'on demande au manifeste :
    // vérifier qu'un dépôt est complet et intact.
    const table = cdn.describe([
      file('onlc4.min.js', 'var a=1;'),
      file(cdn.openmoji + '1F600.svg', '<svg/>'),
      file(cdn.openmoji + '1F601.svg', '<svg id="b"/>')
    ]);
    assert.deepEqual(Object.keys(table).sort(), [ 'onlc4.min.js', cdn.openmoji ]);
    assert.equal(table[cdn.openmoji].fichiers, 2);
    assert.equal(table[cdn.openmoji].octets, 6 + 13);
  });

  it('change l’empreinte du groupe dès qu’un dessin change', () => {
    const avant = cdn.describe([ file(cdn.openmoji + 'A.svg', '<svg/>') ]);
    const apres = cdn.describe([ file(cdn.openmoji + 'A.svg', '<svg id="x"/>') ]);
    assert.notEqual(apres[cdn.openmoji].sha256, avant[cdn.openmoji].sha256);
  });

  it('change l’empreinte du groupe dès qu’un dessin est ajouté', () => {
    const avant = cdn.describe([ file(cdn.openmoji + 'A.svg', '<svg/>') ]);
    const apres = cdn.describe([ file(cdn.openmoji + 'A.svg', '<svg/>'), file(cdn.openmoji + 'B.svg', '<svg/>') ]);
    assert.notEqual(apres[cdn.openmoji].sha256, avant[cdn.openmoji].sha256);
  });
});
