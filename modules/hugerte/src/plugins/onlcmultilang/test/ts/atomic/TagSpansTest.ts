import { describe, it } from '@ephox/bedrock-client';
import { assert } from 'chai';

import * as RawElements from 'hugerte/plugins/onlcshared/text/RawElements';

/**
 * Ce qu'une réécriture sur chaîne brute doit laisser tranquille.
 *
 * Deux défauts sont venus de là, tous deux sur une page réelle :
 *
 * * `class="screen6 [LG=fr]label-fr[/LG]…"` — le moteur du site choisit la classe selon la
 *   langue. Le marqueur y devenait un élément, posé **au milieu d'une balise ouvrante** : la
 *   section entière du contenu s'en trouvait disloquée ;
 * * `(function(w,d,s,l,i){w[l]=w[l]||[]…` — le mouchard d'un gabarit. `[l]` y était pris pour un
 *   code court sans valeur, donc effacé.
 */
describe('atomic.hugerte.plugins.onlcmultilang.TagSpansTest', () => {
  const extrait = (html: string, span: RawElements.Span): string =>
    html.substring(span.start, span.end);

  it('rend une balise entière, chevrons compris', () => {
    const html = '<p class="a">texte</p>';
    const spans = RawElements.tagSpansOf(html);

    assert.lengthOf(spans, 2);
    assert.equal(extrait(html, spans[0]), '<p class="a">');
    assert.equal(extrait(html, spans[1]), '</p>');
  });

  it('ne ferme pas la balise sur un chevron entre guillemets', () => {
    const html = '<div title="a > b" class="c">texte</div>';
    const spans = RawElements.tagSpansOf(html);

    assert.equal(extrait(html, spans[0]), '<div title="a > b" class="c">');
  });

  it('suit aussi les apostrophes', () => {
    const html = '<div title=\'a > b\'>texte</div>';

    assert.equal(extrait(html, RawElements.tagSpansOf(html)[0]), '<div title=\'a > b\'>');
  });

  it('emporte le reste de la chaîne quand la balise ne se referme pas', () => {
    const html = '<p>texte<div class="a';
    const spans = RawElements.tagSpansOf(html);

    assert.equal(extrait(html, spans[spans.length - 1]), '<div class="a');
  });

  it('protège un marqueur écrit dans un attribut', () => {
    const html = '<div class="screen6 [LG=fr]label-fr[/LG]">texte</div>';
    const spans = RawElements.nonTextSpansOf(html);
    const debut = html.indexOf('[LG=fr]');
    const fin = html.indexOf('[/LG]') + '[/LG]'.length;

    assert.isTrue(RawElements.overlaps(spans, debut, fin),
      'le marqueur est dans la balise : il n’est pas du contenu');
  });

  it('laisse le texte hors balise à découvert', () => {
    const html = '<p>[LG=fr]Bonjour[/LG]</p>';
    const spans = RawElements.nonTextSpansOf(html);
    const debut = html.indexOf('[LG=fr]');
    const fin = html.indexOf('[/LG]') + '[/LG]'.length;

    assert.isFalse(RawElements.overlaps(spans, debut, fin),
      'le marqueur est du contenu : il devient une section');
  });

  it('réunit balises et corps de script, dans l’ordre du document', () => {
    const html = '<p>a</p><script>var t = "[LG=fr]x[/LG]";</script>';
    const spans = RawElements.nonTextSpansOf(html);

    assert.isTrue(RawElements.overlaps(spans, html.indexOf('[LG=fr]'), html.indexOf('[/LG]')),
      'le marqueur du script est protégé');
    for (let i = 1; i < spans.length; i++) {
      assert.isAtLeast(spans[i].start, spans[i - 1].start, 'les intervalles sont ordonnés');
    }
  });
});
