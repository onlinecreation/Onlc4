import { describe, it } from '@ephox/bedrock-client';
import { assert } from 'chai';

import * as Parse from 'hugerte/plugins/onlcwidgets/core/shortcodes/Parse';

/**
 * Garde-fou du texte brut d'un code court.
 *
 * À l'enregistrement, la carte d'un code court redevient son texte d'origine **sans
 * échappement** : c'est la seule façon de restituer au caractère près un code que le plugin ne
 * sait pas relire. L'attribut qui transporte ce texte est du html comme un autre, et un contenu
 * collé peut en porter un forgé — d'où cette vérification, qui décide si le texte ressort tel
 * quel ou échappé.
 */
describe('atomic.hugerte.plugins.onlcwidgets.ShortcodeGuardTest', () => {
  it('accepte un code court seul', () => {
    assert.isTrue(Parse.isShortcodeText('[MenuSite]'));
    assert.isTrue(Parse.isShortcodeText('[Contact email="hello@katakana.rocks"]'));
    assert.isTrue(Parse.isShortcodeText('[LogoSite;220;90]'));
  });

  it('accepte un code apparié avec son contenu', () => {
    assert.isTrue(Parse.isShortcodeText('[Slideshow duree="5"]une photo[/Slideshow]'));
  });

  it('refuse un texte vide', () => {
    assert.isFalse(Parse.isShortcodeText(''));
  });

  it('refuse tout ce qui porte un chevron', () => {
    assert.isFalse(Parse.isShortcodeText('<img src=x onerror=alert(1)>'));
    assert.isFalse(Parse.isShortcodeText('[MenuSite]<script>alert(1)</script>'));
    assert.isFalse(Parse.isShortcodeText('<b>[MenuSite]</b>'));
  });

  it('refuse un code suivi ou précédé d’autre chose', () => {
    assert.isFalse(Parse.isShortcodeText('avant [MenuSite]'));
    assert.isFalse(Parse.isShortcodeText('[MenuSite] après'));
    assert.isFalse(Parse.isShortcodeText('[MenuSite][Contact]'));
  });

  it('refuse un texte qui n’est pas un code', () => {
    assert.isFalse(Parse.isShortcodeText('bonjour'));
    assert.isFalse(Parse.isShortcodeText('[]'));
    assert.isFalse(Parse.isShortcodeText('[ MenuSite ]'));
  });

  it('refuse les espaces autour, qui ne seraient pas restitués tels quels', () => {
    assert.isFalse(Parse.isShortcodeText(' [MenuSite]'));
    assert.isFalse(Parse.isShortcodeText('[MenuSite]\n'));
  });

  it('lit les attributs, les drapeaux et les paramètres positionnels', () => {
    const found = Parse.findAll('[SocialButtons Facebook Twitter align="center"]');
    assert.lengthOf(found, 1);
    assert.equal(found[0].name, 'SocialButtons');
    assert.deepEqual(found[0].flags, [ 'Facebook', 'Twitter' ]);
    assert.equal(found[0].attributes.align, 'center');

    const positional = Parse.findAll('[LogoSite;220;90]');
    assert.deepEqual(positional[0].positional, [ '220', '90' ]);
  });

  it('relève la position exacte de chaque code', () => {
    const found = Parse.findAll('ab [Contact] cd');
    assert.lengthOf(found, 1);
    assert.equal(found[0].start, 3);
    assert.equal(found[0].end, 12);
    assert.equal(found[0].raw, '[Contact]');
  });
});
