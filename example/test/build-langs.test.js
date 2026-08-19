'use strict';

/**
 * Générateur des paquets de langue du cœur.
 *
 * Le générateur ne fait que deux choses, mais les rater se remarque tard : une interface qui
 * reste en anglais ne casse rien, elle déçoit. D'où ces tests, dont un bout à bout sur une
 * arborescence de fixtures.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const { describe, it, assert } = require('./harness');
const builder = require('../../modules/hugerte/tools/i18n/build-langs');

const fixture = (files) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'onlc-langs-'));
  const langs = path.join(root, builder.sourceDirectory);
  fs.mkdirSync(langs, { recursive: true });
  Object.keys(files).forEach((name) => fs.writeFileSync(path.join(langs, name), files[name], 'utf8'));
  return root;
};

describe('Paquets de langue — conversion', () => {
  it('adresse le paquet à l’objet global de HugeRTE', () => {
    assert.equal(
      builder.convert('tinymce.addI18n("fr_FR", { "Undo": "Annuler" });'),
      'hugerte.addI18n("fr_FR", { "Undo": "Annuler" });');
  });

  it('convertit chaque appel, pas seulement le premier', () => {
    const out = builder.convert('tinymce.addI18n("a", {});\ntinymce.addI18n("b", {});');
    assert.notIncludes(out, 'tinymce.');
    assert.lengthOf(out.match(/hugerte\.addI18n/g), 2);
  });

  it('ne touche pas à un mot qui contient « tinymce »', () => {
    const source = 'tinymceHelper.addI18n("x", {});';
    assert.equal(builder.convert(source), source);
  });

  it('laisse les traductions intactes', () => {
    const out = builder.convert('tinymce.addI18n("fr_FR", { "Bold": "Gras", "e": "\\xe9" });');
    assert.includes(out, '"Bold": "Gras"');
    assert.includes(out, '\\xe9');
  });
});

describe('Paquets de langue — alias de code court', () => {
  it('réduit un code régional à son code court', () => {
    assert.equal(builder.shortCodeOf('fr_FR'), 'fr');
    assert.equal(builder.shortCodeOf('pt_BR'), 'pt');
    assert.equal(builder.shortCodeOf('zh_HK'), 'zh');
  });

  it('laisse un code déjà court tranquille', () => {
    assert.equal(builder.shortCodeOf('de'), null);
    assert.equal(builder.shortCodeOf('es'), null);
  });

  it('ne touche pas aux variantes d’écriture', () => {
    // Réduire « zh-Hans » à « zh » choisirait arbitrairement une des deux écritures du chinois.
    assert.equal(builder.shortCodeOf('zh-Hans'), null);
    assert.equal(builder.shortCodeOf('zh-Hant'), null);
  });

  it('redéclare le paquet sous le code court', () => {
    const out = builder.aliasOf('tinymce.addI18n("fr_FR", { "Undo": "Annuler" });', 'fr_FR', 'fr');
    assert.includes(out, 'hugerte.addI18n("fr"');
    assert.notIncludes(out, '"fr_FR"');
  });

  it('accepte les guillemets simples comme doubles', () => {
    const out = builder.aliasOf("tinymce.addI18n('fr_FR', {});", 'fr_FR', 'fr');
    assert.includes(out, "hugerte.addI18n('fr'");
  });

  it('ne renomme que la déclaration, pas les traductions', () => {
    const out = builder.aliasOf('tinymce.addI18n("fr_FR", { "x": "fr_FR reste" });', 'fr_FR', 'fr');
    assert.includes(out, '"fr_FR reste"');
  });
});

describe('Paquets de langue — génération', () => {
  const generate = (files, body) => {
    const root = fixture(files);
    const target = path.resolve(__dirname, '../../modules/hugerte/src/core/main/langs');
    const backup = fs.mkdtempSync(path.join(os.tmpdir(), 'onlc-langs-backup-'));
    const hadTarget = fs.existsSync(target);

    // Le générateur écrit dans l'arborescence du dépôt : on la met de côté le temps du test.
    if (hadTarget) {
      fs.cpSync(target, backup, { recursive: true });
    }
    const argv = process.argv;
    try {
      process.argv = [ argv[0], argv[1], root ];
      builder.main();
      body(target);
    } finally {
      process.argv = argv;
      fs.rmSync(root, { recursive: true, force: true });
      fs.rmSync(target, { recursive: true, force: true });
      if (hadTarget) {
        fs.cpSync(backup, target, { recursive: true });
      }
      fs.rmSync(backup, { recursive: true, force: true });
    }
  };

  it('écrit un paquet par langue, plus les alias', () => {
    generate({
      'fr_FR.js': 'tinymce.addI18n("fr_FR", { "Undo": "Annuler" });',
      'de.js': 'tinymce.addI18n("de", { "Undo": "Rückgängig" });'
    }, (target) => {
      const written = fs.readdirSync(target).filter((name) => name.endsWith('.js')).sort();
      assert.deepEqual(written, [ 'de.js', 'fr.js', 'fr_FR.js' ]);
    });
  });

  it('le paquet et son alias déclarent chacun leur code', () => {
    generate({ 'fr_FR.js': 'tinymce.addI18n("fr_FR", { "Undo": "Annuler" });' }, (target) => {
      assert.includes(fs.readFileSync(path.join(target, 'fr_FR.js'), 'utf8'), 'addI18n("fr_FR"');
      assert.includes(fs.readFileSync(path.join(target, 'fr.js'), 'utf8'), 'addI18n("fr"');
    });
  });

  it('un alias n’écrase jamais un vrai paquet', () => {
    generate({
      'es.js': 'tinymce.addI18n("es", { "Undo": "Deshacer" });',
      'es_MX.js': 'tinymce.addI18n("es_MX", { "Undo": "Deshacer (MX)" });'
    }, (target) => {
      // `es.js` existe déjà : `es_MX` ne doit pas s'y substituer.
      assert.includes(fs.readFileSync(path.join(target, 'es.js'), 'utf8'), 'Deshacer"');
      assert.notIncludes(fs.readFileSync(path.join(target, 'es.js'), 'utf8'), '(MX)');
    });
  });

  it('chaque fichier dit d’où il vient et sous quelle licence', () => {
    generate({ 'fr_FR.js': 'tinymce.addI18n("fr_FR", {});' }, (target) => {
      const head = fs.readFileSync(path.join(target, 'fr_FR.js'), 'utf8');
      assert.includes(head, 'TinyMCE 6');
      assert.includes(head, 'MIT');
      assert.includes(head, 'build-langs.js');
    });
  });

  it('écrit un mode d’emploi à côté des paquets', () => {
    generate({ 'fr_FR.js': 'tinymce.addI18n("fr_FR", {});' }, (target) => {
      const readme = fs.readFileSync(path.join(target, 'README.md'), 'utf8');
      assert.includes(readme, 'language:');
      assert.includes(readme, 'langs/onlc/');
    });
  });

  it('ignore un fichier qui ne déclare aucune traduction', () => {
    generate({
      'fr_FR.js': 'tinymce.addI18n("fr_FR", {});',
      'notice.js': '// rien à voir ici'
    }, (target) => {
      assert.notOk(fs.existsSync(path.join(target, 'notice.js')));
    });
  });

  it('puise dans les paquets de TinyMCE 6, seuls sous licence MIT', () => {
    assert.equal(builder.sourceDirectory, 'langs6');
  });
});
