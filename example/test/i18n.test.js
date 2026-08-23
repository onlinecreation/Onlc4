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
 * Les paquets ONLC et ceux du cœur partagent un seul dictionnaire : `addI18n` verse tout dans la
 * même table. Une clé française qui s'écrit comme une clé anglaise du cœur prend donc sa place, et
 * la remplace dans toute l'interface.
 *
 * C'est arrivé : « Format » désignait chez nous les proportions d'une vidéo, et le menu « Format »
 * de la barre s'intitulait « Beeldverhouding » en néerlandais.
 *
 * Les collisions qui restent sont **relues et acceptées** : les deux sens coïncident, et la
 * traduction convient des deux côtés. Toute nouvelle collision fait échouer cette épreuve, pour
 * qu'elle soit relue elle aussi.
 */
const collisionsAcceptees = [
  'Emojis',   // le cœur dit « Émojis » ; c'est la même chose
  'Image...', // la même entrée de menu, au même endroit
  'Style',    // un style, des deux côtés
  'Version'   // une version, des deux côtés
];

describe('Traductions — cohabitation avec le paquet du cœur', () => {
  /** Les clés du paquet français du cœur, qui sont écrites en anglais. */
  const clesDuCoeur = () => {
    let table = {};
    // Le paquet du cœur s'adresse au global `hugerte` sans passer par `window` : celui des
    // plugins, lui, écrit `window.hugerte`. Les deux formes sont posées.
    const precedent = { window: global.window, hugerte: global.hugerte };
    const faux = { addI18n: (code, strings) => { if (code === 'fr_FR') { table = strings; } } };
    global.hugerte = faux;
    global.window = { hugerte: faux };
    try {
      const chemin = path.join(racine, 'modules/hugerte/src/core/main/langs/fr_FR.js');
      delete require.cache[require.resolve(chemin)];
      require(chemin);
    } finally {
      global.window = precedent.window;
      global.hugerte = precedent.hugerte;
    }
    return Object.keys(table);
  };

  it('aucune clé ONLC ne prend la place d’une clé du cœur sans qu’on l’ait voulu', () => {
    const coeur = clesDuCoeur();
    assert.notEqual(coeur.length, 0, 'le paquet du cœur a bien été lu');

    const collisions = Object.keys(table).filter((cle) => coeur.indexOf(cle) !== -1);
    const nouvelles = collisions.filter((cle) => collisionsAcceptees.indexOf(cle) === -1);
    assert.equal(nouvelles.length, 0,
      nouvelles.length === 0 ? '' : `collisions à relire : ${nouvelles.map((c) => JSON.stringify(c)).join(', ')}`);
  });

  it('les pages d’exemple chargent les deux moitiés de chaque langue', () => {
    // Le cœur ne va chercher son propre fichier que si la langue n'est pas déjà déclarée. Charger
    // le paquet ONLC seul la déclare, et le cœur reste alors en anglais sous une interface
    // traduite : les deux se chargent donc à la main, et c'est ce qu'on vérifie.
    [ 'example/public/lmparts.html', 'example/public/index.html' ].forEach((page) => {
      const html = fs.readFileSync(path.join(racine, page), 'utf8');
      [ 'es', 'fr', 'nl' ].forEach((code) => {
        assert.includes(html, `/hugerte/langs/${code}.js`, `${page} — paquet du cœur ${code}`);
        assert.includes(html, `/hugerte/langs/onlc/${code}.js`, `${page} — paquet ONLC ${code}`);
      });
    });
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
