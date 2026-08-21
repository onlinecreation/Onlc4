import { describe, it } from '@ephox/bedrock-client';
import { assert } from 'chai';

import * as FilterContent from 'hugerte/plugins/onlcwidgets/core/shortcodes/FilterContent';

/**
 * Découpage d'une chaîne html en texte et en balises.
 *
 * C'est ce découpage qui décide où un code court peut être reconnu. Deux endroits ne doivent
 * jamais l'être : l'**intérieur d'une balise**, où un `alt="[2] la suite"` n'est pas un code, et
 * le **corps d'un script ou d'une feuille de style**, où `lignes[index]` ressemble à s'y méprendre
 * à un code court. Le second a réellement cassé la visionneuse de pdf dans l'aperçu : le code
 * disparaissait, et le script partait à la page amputé.
 */

const texte = (html: string): string[] =>
  FilterContent.segments(html).filter((part) => part.text).map((part) => part.value);

describe('atomic.hugerte.plugins.onlcwidgets.SegmentsTest', () => {
  it('sépare le texte des balises', () => {
    assert.deepEqual(texte('<p>bonjour</p>'), [ 'bonjour' ]);
  });

  it('ne voit pas de texte dans une balise', () => {
    assert.deepEqual(texte('<img alt="[2] la suite">'), []);
  });

  it('ne voit pas de texte dans un script', () => {
    const html = '<p>avant</p><script>var a = lignes[index];</script><p>après</p>';
    assert.deepEqual(texte(html), [ 'avant', 'après' ]);
  });

  it('rend le script entier, balises comprises', () => {
    const parts = FilterContent.segments('<script>var a = t[i];</script>');
    assert.lengthOf(parts, 1);
    assert.isFalse(parts[0].text);
    assert.equal(parts[0].value, '<script>var a = t[i];</script>');
  });

  it('ne voit pas de texte dans une feuille de style', () => {
    assert.deepEqual(texte('<style>a[href] { color: red; }</style>x'), [ 'x' ]);
  });

  it('ne voit pas de texte dans un textarea', () => {
    assert.deepEqual(texte('<textarea>[Contact]</textarea>ok'), [ 'ok' ]);
  });

  it('reconnaît la balise fermante quelle que soit sa casse', () => {
    assert.deepEqual(texte('<SCRIPT>t[i]</SCRIPT>fin'), [ 'fin' ]);
  });

  it('garde tout le reste quand la balise fermante manque', () => {
    // C'est aussi ce que ferait le navigateur : rien de ce qui suit n'est du texte de page.
    assert.deepEqual(texte('<script>t[i]; [Contact]'), []);
  });

  it('laisse le texte qui suit un script auto-fermé', () => {
    assert.deepEqual(texte('<script src="a.js"/>[Contact]'), [ '[Contact]' ]);
  });

  it('ne prend pas une balise au nom voisin pour un script', () => {
    assert.deepEqual(texte('<scriptural>[Contact]</scriptural>'), [ '[Contact]' ]);
  });
});
