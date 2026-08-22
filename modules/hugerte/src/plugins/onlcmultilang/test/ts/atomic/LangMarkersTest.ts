import { describe, it } from '@ephox/bedrock-client';
import { assert } from 'chai';

import * as LangMarkers from 'hugerte/plugins/onlcshared/text/LangMarkers';

/**
 * Les marqueurs de langue lus comme **valeur**, et non comme contenu.
 *
 * Une fiche de microdonnées réelle écrit
 * `"name": "[LG=en]Keychain[/LG][LG=fr]Coque de clef[/LG]"`. Ce n'est pas une section de page :
 * c'est une chaîne dans un formulaire, à découper en versions et à recomposer.
 */
describe('atomic.hugerte.plugins.onlcmultilang.LangMarkersTest', () => {
  it('rend une valeur sans marqueur en international', () => {
    const lu = LangMarkers.parse('Coque de clef');

    assert.equal(lu.common, 'Coque de clef');
    assert.lengthOf(lu.parts, 0);
  });

  it('découpe les versions dans l’ordre où elles sont écrites', () => {
    const lu = LangMarkers.parse('[LG=en]Keychain[/LG][LG=fr]Coque de clef[/LG]');

    assert.equal(lu.common, '');
    assert.deepEqual(lu.parts, [
      { code: 'en', text: 'Keychain' },
      { code: 'fr', text: 'Coque de clef' }
    ]);
  });

  it('lit aussi l’écriture en balises', () => {
    const lu = LangMarkers.parse('<multilang lang="nl">Sleutelhanger</multilang>');

    assert.deepEqual(lu.parts, [{ code: 'nl', text: 'Sleutelhanger' }]);
  });

  it('accepte les guillemets autour du code', () => {
    assert.deepEqual(LangMarkers.parse('[LG="fr"]Bonjour[/LG]').parts, [{ code: 'fr', text: 'Bonjour' }]);
  });

  it('garde ce qui reste hors marqueur comme version internationale', () => {
    const lu = LangMarkers.parse('Réf. 4821 [LG=fr]Coque[/LG]');

    assert.equal(lu.common, 'Réf. 4821');
    assert.deepEqual(lu.parts, [{ code: 'fr', text: 'Coque' }]);
  });

  it('rend la version d’une langue, ou rien', () => {
    const lu = LangMarkers.parse('[LG=en]Keychain[/LG]');

    assert.equal(LangMarkers.textOf(lu, 'en'), 'Keychain');
    assert.equal(LangMarkers.textOf(lu, 'EN'), 'Keychain', 'la casse du code est sans importance');
    assert.equal(LangMarkers.textOf(lu, 'nl'), '');
  });

  it('ne compte que les langues dont la version n’est pas vide', () => {
    const lu = LangMarkers.parse('[LG=en]Keychain[/LG][LG=nl]   [/LG]');

    assert.deepEqual(LangMarkers.codesOf(lu), [ 'en' ]);
  });

  it('ajoute une version en la mettant à la fin', () => {
    const lu = LangMarkers.withText(LangMarkers.parse('[LG=fr]Coque[/LG]'), 'en', 'Case');

    assert.equal(LangMarkers.compose(lu), '[LG=fr]Coque[/LG][LG=en]Case[/LG]');
  });

  it('remplace une version sans déplacer les autres', () => {
    const lu = LangMarkers.withText(
      LangMarkers.parse('[LG=en]Keychain[/LG][LG=fr]Coque[/LG]'), 'en', 'Key case');

    assert.equal(LangMarkers.compose(lu), '[LG=en]Key case[/LG][LG=fr]Coque[/LG]');
  });

  it('retire la version quand on vide le champ', () => {
    const lu = LangMarkers.withText(
      LangMarkers.parse('[LG=en]Keychain[/LG][LG=fr]Coque[/LG]'), 'en', '');

    assert.equal(LangMarkers.compose(lu), '[LG=fr]Coque[/LG]');
  });

  it('écrit la version internationale en tête', () => {
    const lu = LangMarkers.withCommon(LangMarkers.parse('[LG=fr]Coque[/LG]'), 'Réf. 4821');

    assert.equal(LangMarkers.compose(lu), 'Réf. 4821[LG=fr]Coque[/LG]');
  });

  it('refuse un code qui n’en est pas un', () => {
    const avant = LangMarkers.parse('[LG=fr]Coque[/LG]');

    assert.deepEqual(LangMarkers.withText(avant, 'français', 'x'), avant);
  });

  it('rend la valeur d’origine quand rien n’a changé', () => {
    const texte = '[LG=en]Keychain[/LG][LG=fr]Coque de clef[/LG]';

    assert.equal(LangMarkers.compose(LangMarkers.parse(texte)), texte);
  });
});
