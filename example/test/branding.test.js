'use strict';

/**
 * Habillage Pixel•OnlineCreation de l'éditeur d'images.
 *
 * Deux choses valent d'être tenues sous surveillance :
 *
 * 1. l'habillage passe **uniquement par les options de Pixie**. Si quelqu'un finissait par
 *    plaquer une feuille de style sur des sélecteurs internes, une montée de version de Pixie
 *    casserait l'affichage en silence ;
 * 2. Pixie **concatène les tableaux** de configuration au lieu de les remplacer. Redéclarer ses
 *    commandes les afficherait donc en double — c'est arrivé, et cela ne se voit qu'à l'écran.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const { describe, it, assert } = require('./harness');

/** Charge `branding.js` dans un faux navigateur : le fichier ne dépend de rien d'autre. */
const load = () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../public/pixie/branding.js'), 'utf8');
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);
  return sandbox.window.OnlcPixieBranding;
};

const branding = load();

describe('Habillage — la marque', () => {
  it('porte le nom commercial', () => {
    assert.equal(branding.nom, 'Pixel•OnlineCreation');
  });

  it('fournit un logo en svg embarqué', () => {
    assert.includes(branding.logo, 'data:image/svg+xml');
    const decoded = decodeURIComponent(branding.logo.split(',')[1]);
    assert.includes(decoded, 'Pixel');
    assert.includes(decoded, 'OnlineCreation');
    assert.includes(decoded, '<svg');
  });

  it('pose le logo en tête de la barre du haut', () => {
    const logo = branding.menubar.find((item) => item.type === 'image');
    assert.ok(logo, 'aucun élément de type image dans la barre');
    assert.equal(logo.align, 'left');
    assert.equal(logo.position, 0);
    assert.equal(logo.src, branding.logo);
  });
});

describe('Habillage — les commandes d’origine', () => {
  it('n’ajoute que la marque à la barre', () => {
    // Pixie concatène : redéclarer annuler/rétablir, zoom, historique ou enregistrement les
    // afficherait deux fois. On laisse les siennes en place.
    assert.lengthOf(branding.menubar, 1);
    assert.equal(branding.menubar[0].type, 'image');
  });

  it('ne redéclare aucun widget de Pixie', () => {
    const types = branding.menubar.map((item) => item.type);
    [ 'undoWidget', 'zoomWidget', 'button' ].forEach((type) => {
      assert.notOk(types.includes(type), 'la barre redéclare « ' + type + ' »');
    });
  });

  it('traduit l’intitulé du bouton d’enregistrement plutôt que de le redéclarer', () => {
    // « Done » est l'intitulé du bouton de Pixie : le passage en français se fait par les
    // traductions, ce qui laisse à Pixie son icône et son action.
    assert.equal(branding.traductions.fr.Done, 'Enregistrer');
  });
});

describe('Habillage — le thème', () => {
  it('déclare un thème nommé', () => {
    assert.equal(branding.theme.name, 'pixel-onlinecreation');
  });

  it('porte le bleu d’ONLC en triplet R V B', () => {
    // Pixie attend « R V B » sans virgule : un `#006ce7` passerait sans bruit et sans effet.
    assert.equal(branding.theme.colors['--be-primary'], '0 108 231');
    assert.equal(branding.theme.colors['--be-on-primary'], '255 255 255');
  });

  it('déclare toutes les couleurs attendues par Pixie', () => {
    // Une clé manquante laisse la variable css sans valeur : le fond ou le texte disparaît.
    const attendues = [
      '--be-foreground-base', '--be-primary-light', '--be-primary', '--be-primary-dark',
      '--be-on-primary', '--be-danger', '--be-on-danger', '--be-background',
      '--be-background-alt', '--be-paper', '--be-disabled-bg-opacity', '--be-disabled-fg-opacity',
      '--be-hover-opacity', '--be-focus-opacity', '--be-selected-opacity',
      '--be-text-main-opacity', '--be-text-muted-opacity', '--be-divider-opacity'
    ];
    attendues.forEach((key) => {
      assert.ok(branding.theme.colors[key] !== undefined, 'couleur manquante : ' + key);
    });
  });

  it('n’utilise que des triplets ou des pourcentages', () => {
    Object.keys(branding.theme.colors).forEach((key) => {
      const value = branding.theme.colors[key];
      const valide = /^\d+ \d+ \d+$/.test(value) || /^\d+%$/.test(value);
      assert.ok(valide, key + ' : « ' + value +' » n’est ni un triplet ni un pourcentage');
    });
  });
});

describe('Habillage — la langue', () => {
  it('met l’interface en français', () => {
    assert.equal(branding.langue, 'fr');
    assert.ok(branding.traductions.fr, 'le paquet français doit exister');
  });

  it('traduit les chaînes de l’interface', () => {
    const fr = branding.traductions.fr;
    assert.equal(fr.Save, 'Enregistrer');
    assert.equal(fr.Cancel, 'Annuler');
    assert.equal(fr.Width, 'Largeur');
  });

  it('traduit la barre de navigation, dont les clés sont en minuscules', () => {
    const fr = branding.traductions.fr;
    [ 'filter', 'resize', 'crop', 'draw', 'text', 'shapes', 'stickers', 'frame', 'corners', 'merge' ]
      .forEach((key) => {
        assert.ok(fr[key], 'clé de navigation manquante : ' + key);
      });
  });

  it('ne laisse aucune traduction vide', () => {
    const fr = branding.traductions.fr;
    Object.keys(fr).forEach((key) => {
      assert.ok(String(fr[key]).trim() !== '', 'traduction vide : ' + key);
    });
  });
});

describe('Habillage — application à une configuration', () => {
  it('complète une configuration sans écraser ce qui la concerne', () => {
    const config = branding.appliquer({
      selector: '#pixie',
      image: '/media/photo.jpg',
      ui: { nav: { position: 'bottom' } }
    });

    assert.equal(config.selector, '#pixie', 'la configuration d’origine est conservée');
    assert.equal(config.image, '/media/photo.jpg');
    assert.deepEqual(config.ui.nav, { position: 'bottom' });
  });

  it('pose la langue, le thème et la barre', () => {
    const config = branding.appliquer({ selector: '#pixie' });

    assert.equal(config.activeLanguage, 'fr');
    assert.ok(config.languages.fr);
    assert.equal(config.ui.activeTheme, branding.theme.name);
    assert.deepEqual(config.ui.themes, [ branding.theme ]);
    assert.deepEqual(config.ui.menubar.items, branding.menubar);
  });

  it('accepte une configuration sans clé `ui`', () => {
    const config = branding.appliquer({ selector: '#pixie' });
    assert.ok(config.ui, '`ui` doit être créée si elle manque');
  });

  it('le thème déclaré est bien celui qui est activé', () => {
    const config = branding.appliquer({ selector: '#pixie' });
    const noms = config.ui.themes.map((theme) => theme.name);
    assert.ok(noms.includes(config.ui.activeTheme), 'le thème actif doit figurer dans la liste');
  });
});

describe('Habillage — pas de feuille de style plaquée', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../public/pixie/branding.js'), 'utf8');
  const page = fs.readFileSync(path.resolve(__dirname, '../public/pixie/index.html'), 'utf8');

  it('l’habillage ne vise aucun sélecteur interne de Pixie', () => {
    // Tout passe par les options : une montée de version ne peut pas casser l'affichage.
    assert.notIncludes(source, 'document.createElement(\'style\')');
    assert.notIncludes(source, '.pixie');
    assert.notIncludes(source, '!important');
  });

  it('la page charge l’habillage avant d’instancier Pixie', () => {
    assert.includes(page, 'branding.js');
    assert.includes(page, 'OnlcPixieBranding.appliquer');
  });

  it('la page porte le nom commercial', () => {
    assert.includes(page, '<title>Pixel•OnlineCreation</title>');
  });
});
