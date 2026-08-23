'use strict';

/**
 * Couverture des traductions ONLC.
 *
 * Une interface à moitié traduite ne casse rien : elle déçoit, et elle le fait tard, quand un
 * client néerlandophone ouvre un formulaire et tombe sur trois phrases en français. Ces épreuves
 * empêchent une chaîne d'échapper au tableau, et un paquet d'être publié incomplet.
 */

const fs = require('fs');
const path = require('path');

const { describe, it, assert } = require('./harness');
const coverage = require('../../modules/hugerte/tools/i18n/coverage');

const racine = path.resolve(__dirname, '../..');
const table = JSON.parse(fs.readFileSync(coverage.tablePath, 'utf8'));

/** Les langues produites, dans l'ordre où le tableau les range. */
const langues = [
  { code: 'en', index: 0, nom: 'anglais' },
  { code: 'es', index: 1, nom: 'espagnol' },
  { code: 'nl', index: 2, nom: 'néerlandais' }
];

describe('Traductions — couverture des modules', () => {
  coverage.report(table).forEach((module) => {
    it(`${module.plugin} n’affiche rien qui ne soit traduit`, () => {
      const noms = module.manquantes.map((m) => `${JSON.stringify(m.chaine)} (${m.fichiers[0]})`);
      assert.equal(noms.length, 0,
        noms.length === 0 ? '' : `chaînes sans traduction :\n      ${noms.join('\n      ')}`);
    });
  });

  it('relève bien les chaînes écrites en plusieurs morceaux', () => {
    const source = 'label: \'début \' +\n  \'et suite\',';
    assert.deepEqual(coverage.stringsIn(source), [ 'début et suite' ]);
  });

  it('ne relève pas ce qu’aucune langue ne change', () => {
    assert.notEqual(coverage.exemptionOf('½ + ½'), null, 'une disposition de colonnes');
    assert.notEqual(coverage.exemptionOf('noopener noreferrer'), null, 'une valeur de rel');
    assert.notEqual(coverage.exemptionOf('color: #c0392b; font-weight: 600'), null, 'du css');
    assert.notEqual(coverage.exemptionOf('Meta+K'), null, 'un raccourci clavier');
    assert.equal(coverage.exemptionOf('Ajouter un bloc'), null, 'une vraie phrase, elle, se traduit');
  });
});

/**
 * Les chaînes ONLC et celles du cœur partagent un seul dictionnaire : `addI18n` verse tout dans la
 * même table. Une clé française qui s'écrit comme une clé anglaise du cœur prend donc sa place.
 *
 * C'est arrivé : « Format » désignait chez nous les proportions d'une vidéo, et le menu « Format »
 * de la barre s'intitulait « Beeldverhouding » en néerlandais.
 *
 * Le générateur tranche maintenant à la fabrication — **le cœur l'emporte** — et énumère les
 * collisions. Celles qui restent sont relues et acceptées : les deux sens coïncident. Toute
 * nouvelle collision fait échouer cette épreuve, pour qu'elle soit relue elle aussi.
 */
const collisionsAcceptees = [
  'Emojis',   // le cœur dit « Émojis » ; c'est la même chose
  'Image...', // la même entrée de menu, au même endroit
  'Style',    // un style, des deux côtés
  'Version'   // une version, des deux côtés
];

/** Les codes de langue livrés, et le fichier que `language:` ira chercher pour chacun. */
const codes = [ 'en', 'es', 'fr', 'nl' ];

/** Les chaînes déclarées par un paquet du cœur, tous appels `addI18n` confondus. */
const paquetDuCoeur = (code) => {
  let table = {};
  // Le paquet du cœur s'adresse au global `hugerte` sans passer par `window` ; la partie ajoutée
  // par build-i18n fait de même. Les deux formes sont posées.
  const precedent = { window: global.window, hugerte: global.hugerte };
  const faux = { addI18n: (_code, strings) => { table = { ...table, ...strings }; } };
  global.hugerte = faux;
  global.window = { hugerte: faux };
  try {
    const chemin = path.join(racine, 'modules/hugerte/src/core/main/langs', `${code}.js`);
    delete require.cache[require.resolve(chemin)];
    require(chemin);
  } finally {
    global.window = precedent.window;
    global.hugerte = precedent.hugerte;
  }
  return table;
};

describe('Traductions — un seul paquet par langue', () => {
  /**
   * Le cœur ne va chercher `langs/<code>.js` que si la langue n'est pas déjà déclarée. Un paquet
   * ONLC chargé à la main la déclarait, et le cœur restait alors en anglais sous une interface
   * traduite. Un seul fichier complet par langue supprime la question.
   */
  it('chaque paquet porte les chaînes du cœur et celles des plugins', () => {
    [ 'es', 'nl' ].forEach((code) => {
      const table = paquetDuCoeur(code);
      assert.ok(Object.prototype.hasOwnProperty.call(table, 'Bold'), `${code} — une chaîne du cœur`);
      assert.ok(Object.prototype.hasOwnProperty.call(table, 'Ajouter un bloc'), `${code} — une chaîne ONLC`);
    });
  });

  it('l’anglais a le sien, que le cœur ne livre pas', () => {
    const table = paquetDuCoeur('en');
    assert.equal(table['Ajouter un bloc'], 'Add a block');
  });

  it('le français ne traduit rien : ses clés sont déjà la langue d’écriture', () => {
    const table = paquetDuCoeur('fr');
    assert.ok(Object.prototype.hasOwnProperty.call(table, 'Bold'), 'les chaînes du cœur y sont');
    assert.notOk(Object.prototype.hasOwnProperty.call(table, 'Ajouter un bloc'),
      'et aucune chaîne ONLC, qui se traduirait en elle-même');
  });

  it('les pages d’exemple n’incluent aucun paquet à la main', () => {
    [ 'example/public/lmparts.html', 'example/public/index.html' ].forEach((page) => {
      const html = fs.readFileSync(path.join(racine, page), 'utf8');
      assert.notIncludes(html, '<script src="/hugerte/langs/',
        `${page} — « language: » suffit, il n'y a rien à inclure`);
    });
  });

  it('aucune clé ONLC ne prend la place d’une clé du cœur sans qu’on l’ait voulu', () => {
    const coeur = paquetDuCoeur('fr');
    const cles = Object.keys(coeur);
    assert.notEqual(cles.length, 0, 'le paquet du cœur a bien été lu');

    const collisions = Object.keys(table).filter((cle) => cles.indexOf(cle) !== -1);
    const nouvelles = collisions.filter((cle) => collisionsAcceptees.indexOf(cle) === -1);
    assert.equal(nouvelles.length, 0,
      nouvelles.length === 0 ? '' : `collisions à relire : ${nouvelles.map((c) => JSON.stringify(c)).join(', ')}`);
  });

  it('le cœur l’emporte sur une collision', () => {
    const table = paquetDuCoeur('nl');
    // « Style » existe des deux côtés : c'est la valeur du cœur qui doit rester.
    assert.equal(table.Style, 'Stijl');
  });
});

describe('Traductions — les quatre langues', () => {
  const cles = Object.keys(table);

  langues.forEach((langue) => {
    it(`chaque chaîne a sa version en ${langue.nom}`, () => {
      const vides = cles.filter((cle) => {
        const valeur = table[cle][langue.index];
        return typeof valeur !== 'string' || valeur.trim() === '';
      });
      assert.equal(vides.length, 0,
        vides.length === 0 ? '' : `sans ${langue.nom} : ${vides.slice(0, 5).map((c) => JSON.stringify(c)).join(', ')}`);
    });
  });

  it('le français est la langue d’écriture : son paquet est vide', () => {
    const paquets = charger();
    assert.equal(paquets.fr, 0, 'les clés sont déjà en français');
  });

  it('les paquets publiés portent tous le même nombre de chaînes', () => {
    const paquets = charger();
    langues.forEach((langue) => {
      assert.equal(paquets[langue.code], cles.length, `paquet ${langue.code}`);
    });
  });

  it('chaque langue déclare aussi ses variantes régionales', () => {
    const paquets = charger();
    [ 'en_GB', 'en_US', 'es_ES', 'es_MX', 'nl_NL', 'nl_BE', 'fr_FR' ].forEach((code) => {
      assert.ok(Object.prototype.hasOwnProperty.call(paquets, code), `code ${code}`);
    });
  });

  it('le cœur de l’éditeur a un paquet pour chacune des quatre langues', () => {
    const langs = path.join(racine, 'modules/hugerte/src/core/main/langs');
    // L'anglais est la langue du cœur : il n'a pas de fichier, et n'en a pas besoin.
    [ 'es.js', 'fr.js', 'nl.js' ].forEach((fichier) => {
      assert.ok(fs.existsSync(path.join(langs, fichier)), fichier);
    });
  });
});

/** Charge les paquets produits et rend, pour chaque code de langue, le nombre de chaînes. */
const charger = () => {
  const dossier = path.join(racine, 'modules/hugerte/src/plugins/onlcshared/main/i18n');
  const paquets = {};
  const precedent = global.window;
  global.window = { hugerte: { addI18n: (code, strings) => { paquets[code] = Object.keys(strings).length; } } };
  try {
    [ 'en.js', 'es.js', 'fr.js', 'nl.js' ].forEach((fichier) => {
      const chemin = path.join(dossier, fichier);
      delete require.cache[require.resolve(chemin)];
      require(chemin);
    });
  } finally {
    global.window = precedent;
  }
  return paquets;
};
