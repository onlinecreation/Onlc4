import { describe, it } from '@ephox/bedrock-client';
import { TinyHooks } from '@ephox/wrap-mcagar';
import { assert } from 'chai';

import Editor from 'hugerte/core/api/Editor';
import MultilangPlugin from 'hugerte/plugins/onlcmultilang/Plugin';
import SeoPlugin from 'hugerte/plugins/onlcseo/Plugin';
import WidgetsPlugin from 'hugerte/plugins/onlcwidgets/Plugin';

/**
 * Une fiche de microdonnées telle qu'on en trouve sur un vrai site, au milieu des autres plugins.
 *
 * La fiche de la page d'accueil de LM Parts porte, dans ses valeurs, les marqueurs de langue du
 * moteur du site : `"name": "[LG=en]Keychain[/LG][LG=fr]Coque de clef[/LG]"`. Trois plugins la
 * voient passer, chacun réécrivant la chaîne html brute avant l'analyse. Deux défauts en sont
 * sortis, et ces cas les gardent fermés :
 *
 * * le plugin des langues transformait les marqueurs en éléments — guillemets compris — au
 *   milieu du json, qui devenait illisible : l'éditeur affichait une fiche vide, et le contenu
 *   de l'utilisateur était perdu à l'enregistrement ;
 * * le plugin des scripts en faisait un jeton « Script JavaScript », parce que la revendication
 *   de type dépendait de l'ordre de chargement des plugins.
 */
describe('browser.hugerte.plugins.onlcseo.JsonldRoundTripTest', () => {
  // `onlcseo` est cité **avant** `onlcwidgets` : c'est l'ordre qui faisait échouer la
  // revendication du type de script, et il doit désormais être sans effet.
  const hook = TinyHooks.bddSetupLight<Editor>({
    plugins: 'onlcseo onlcmultilang onlcwidgets',
    base_url: '/project/hugerte/js/hugerte'
  }, [ SeoPlugin, MultilangPlugin, WidgetsPlugin ], true);

  const fiche =
    '<script type="application/ld+json">\n' +
    '{\n' +
    '  "@context": "https://schema.org/",\n' +
    '  "@type": "Product",\n' +
    '  "name": "[LG=en]Keychain[/LG][LG=fr]Coque de clef[/LG]",\n' +
    '  "offers": {\n' +
    '    "@type": "Offer",\n' +
    '    "price": "28",\n' +
    '    "priceCurrency": "EUR"\n' +
    '  }\n' +
    '}\n' +
    '</script>';

  const api = (editor: Editor) =>
    (editor.plugins as Record<string, {
      getMicrodata: () => Record<string, unknown> | null;
    }>).onlcseo;

  it('lit une fiche dont les valeurs portent des marqueurs de langue', () => {
    const editor = hook.editor();
    editor.setContent('<p>Texte</p>' + fiche);

    const donnees = api(editor).getMicrodata();
    assert.isNotNull(donnees, 'la fiche a été lue');
    assert.equal((donnees as Record<string, unknown>)['@type'], 'Product');
    assert.equal((donnees as Record<string, unknown>).name,
      '[LG=en]Keychain[/LG][LG=fr]Coque de clef[/LG]',
      'les marqueurs restent des données, ils ne deviennent pas des éléments');
  });

  it('garde la donnée hiérarchique', () => {
    const editor = hook.editor();
    editor.setContent(fiche);

    const offre = (api(editor).getMicrodata() as Record<string, Record<string, unknown>>).offers;
    assert.equal(offre['@type'], 'Offer');
    assert.equal(offre.price, '28');
  });

  it('n’en fait pas un jeton de script, quel que soit l’ordre des plugins', () => {
    const editor = hook.editor();
    editor.setContent(fiche);

    assert.lengthOf(editor.dom.select('[data-onlc-script]', editor.getBody()), 0,
      'la fiche n’est pas prise pour du code');
    assert.lengthOf(editor.dom.select('.onlc-jsonld', editor.getBody()), 1,
      'elle est présentée par son propre bloc');
  });

  it('la republie en tête de page, et sans y toucher', () => {
    const editor = hook.editor();
    editor.setContent('<p>Un paragraphe d’abord</p>' + fiche);

    const sortie = editor.getContent();
    assert.equal(sortie.indexOf('<script type="application/ld+json">'), 0,
      'la fiche remonte avant tout le reste');
    assert.include(sortie, '"[LG=en]Keychain[/LG][LG=fr]Coque de clef[/LG]"',
      'le nom du produit ressort au caractère près');
    assert.include(sortie, '"price": "28"');
  });

  it('la remonte en tête dès l’ouverture, pas seulement à l’enregistrement', () => {
    const editor = hook.editor();
    editor.setContent('<p>Un paragraphe d’abord</p><p>Un second</p>' + fiche);

    // L'ordre est lu sur le html de la zone d'édition : la fiche doit y précéder le texte.
    const html = editor.getBody().innerHTML;
    const carte = html.indexOf('onlc-jsonld');
    const texte = html.indexOf('Un paragraphe d’abord');

    assert.notEqual(carte, -1, 'la fiche est présentée par son bloc');
    assert.isBelow(carte, texte,
      'ce qu’on voit à l’écran est ce qui sera publié : la fiche d’abord');
  });

  it('laisse les marqueurs de langue du texte devenir des sections', () => {
    const editor = hook.editor();
    editor.setContent('<p>[LG=fr]Bonjour[/LG]</p>' + fiche);

    assert.isAtLeast(editor.dom.select('[data-onlc-lang]', editor.getBody()).length, 1,
      'hors du script, un marqueur reste un marqueur de langue');
  });

  it('ne convertit pas les marqueurs écrits dans un script ordinaire', () => {
    const editor = hook.editor();
    editor.setContent('<script>var t = "[LG=fr]Bonjour[/LG]";</script>');

    const sortie = editor.getContent();
    assert.include(sortie, 'var t = "[LG=fr]Bonjour[/LG]";',
      'le code ressort tel qu’il a été écrit');
  });
});
