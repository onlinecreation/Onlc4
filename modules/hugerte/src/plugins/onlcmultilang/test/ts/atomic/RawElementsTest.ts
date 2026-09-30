import { describe, it } from '@ephox/bedrock-client';
import { assert } from 'chai';

import * as RawElements from 'hugerte/plugins/onlcshared/text/RawElements';

/**
 * Les zones d'une page où un motif n'est plus un motif.
 *
 * Le cas qui a révélé le besoin : une fiche de microdonnées dont le nom du produit valait
 * `[LG=fr]Coque de clef[/LG][LG=en]Key case[/LG]`. Le plugin des langues, voyant le motif, le
 * remplaçait par un élément — dont les attributs portent des guillemets. Ces guillemets tombaient
 * au milieu d'une chaîne json, la fiche devenait illisible, et l'éditeur affichait une fiche
 * vide. Le contenu du site, lui, était parfaitement correct.
 */
describe('atomic.hugerte.plugins.onlcmultilang.RawElementsTest', () => {
  it('rend le corps d’un script, sans sa balise', () => {
    const html = '<p>Avant</p><script>var a = 1;</script><p>Après</p>';
    const zones = RawElements.spansOf(html);

    assert.lengthOf(zones, 1);
    assert.equal(html.substring(zones[0].start, zones[0].end), 'var a = 1;');
  });

  it('rend aussi le corps d’un style', () => {
    const html = '<style>.a { color: red; }</style>';
    const zones = RawElements.spansOf(html);

    assert.lengthOf(zones, 1);
    assert.equal(html.substring(zones[0].start, zones[0].end), '.a { color: red; }');
  });

  it('tient compte des attributs de la balise ouvrante', () => {
    const html = '<script type="application/ld+json">{"name": "x"}</script>';
    const zones = RawElements.spansOf(html);

    assert.equal(html.substring(zones[0].start, zones[0].end), '{"name": "x"}');
  });

  it('trouve plusieurs corps dans la même page', () => {
    const html = '<script>un</script><p>texte</p><script>deux</script>';

    assert.lengthOf(RawElements.spansOf(html), 2);
  });

  it('ne rend rien sur une page qui n’en porte aucun', () => {
    assert.lengthOf(RawElements.spansOf('<p>Rien que du texte</p>'), 0);
  });

  it('situe une position dans un corps, et hors d’un corps', () => {
    const html = '<p>[LG=fr]Bonjour[/LG]</p><script>"[LG=fr]Bonjour[/LG]"</script>';
    const zones = RawElements.spansOf(html);

    assert.isFalse(RawElements.contains(zones, html.indexOf('[LG=fr]')),
      'le premier marqueur est dans la page');
    assert.isTrue(RawElements.contains(zones, html.lastIndexOf('[LG=fr]')),
      'le second est dans le script');
  });

  it('reconnaît un intervalle qui chevauche un corps', () => {
    const html = '<script>"[LG=fr]Bonjour[/LG]"</script>';
    const zones = RawElements.spansOf(html);
    const debut = html.indexOf('[LG=fr]');
    const fin = html.indexOf('[/LG]') + '[/LG]'.length;

    assert.isTrue(RawElements.overlaps(zones, debut, fin));
    assert.isFalse(RawElements.overlaps(zones, 0, 8), 'la balise ouvrante n’en fait pas partie');
  });

  it('ignore une balise fermante qui n’existe pas', () => {
    // Sans fermeture le motif ne correspond pas : mieux vaut ne rien protéger que protéger tout
    // le reste de la page.
    assert.lengthOf(RawElements.spansOf('<script>var a = 1;'), 0);
  });
});
