import { describe, it } from '@ephox/bedrock-client';
import { assert } from 'chai';

import * as FilterContent from 'hugerte/plugins/onlcmultilang/core/FilterContent';
import * as Parse from 'hugerte/plugins/onlcmultilang/core/Parse';

/**
 * Lecture des deux écritures polyglottes.
 *
 * Ces motifs reproduisent ceux du moteur de rendu du site. Les cas qui suivent tiennent donc
 * autant du contrat que du test : chaque « ne reconnaît pas » vérifie que l'éditeur ne prétend
 * pas comprendre une écriture que le site, lui, publierait en toutes lettres.
 */
describe('atomic.hugerte.plugins.onlcmultilang.ParseTest', () => {
  describe('les deux écritures', () => {
    it('lit un [LG] autour de texte', () => {
      const found = Parse.sections('[LG="fr"]Bonjour[/LG]');
      assert.lengthOf(found, 1);
      assert.equal(found[0].syntax, 'lg');
      assert.equal(found[0].code, 'fr');
      assert.equal(found[0].inner, 'Bonjour');
    });

    it('lit un [LG] autour de blocs', () => {
      // Le site n'interdit pas les balises dans un [LG] : seulement les crochets.
      const found = Parse.sections('[LG="fr"]<h2>Titre</h2><p>Texte</p>[/LG]');
      assert.lengthOf(found, 1);
      assert.equal(found[0].inner, '<h2>Titre</h2><p>Texte</p>');
    });

    it('lit un multilang autour de blocs', () => {
      const found = Parse.sections('<multilang lang="nl"><h2>Titel</h2></multilang>');
      assert.lengthOf(found, 1);
      assert.equal(found[0].syntax, 'multilang');
      assert.equal(found[0].code, 'nl');
      assert.equal(found[0].inner, '<h2>Titel</h2>');
    });

    it('lit un multilang autour de texte simple', () => {
      const found = Parse.sections('<p>Bonjour <multilang lang="en">Hello</multilang></p>');
      assert.lengthOf(found, 1);
      assert.equal(found[0].inner, 'Hello');
    });

    it('lit les deux écritures dans la même page, dans l’ordre', () => {
      const found = Parse.sections('[LG="fr"]a[/LG]<multilang lang="en">b</multilang>[LG="nl"]c[/LG]');
      assert.deepEqual(found.map((section) => section.code), [ 'fr', 'en', 'nl' ]);
      assert.deepEqual(found.map((section) => section.syntax), [ 'lg', 'multilang', 'lg' ]);
    });

    it('accepte les guillemets simples et l’absence de guillemets, comme le site', () => {
      assert.lengthOf(Parse.sections('[LG=\'fr\']a[/LG]'), 1);
      assert.lengthOf(Parse.sections('[LG=fr]a[/LG]'), 1);
    });

    it('ne tient pas compte de la casse et ramène le code en minuscules', () => {
      const found = Parse.sections('[lg="FR"]a[/lg]');
      assert.lengthOf(found, 1);
      assert.equal(found[0].code, 'fr');
    });

    it('traverse les retours à la ligne', () => {
      const found = Parse.sections('<multilang lang="fr">\n<p>a</p>\n</multilang>');
      assert.lengthOf(found, 1);
      assert.include(found[0].inner, '<p>a</p>');
    });
  });

  describe('ce que le site ne reconnaît pas', () => {
    it('refuse les espaces dans le marqueur [LG]', () => {
      // Le motif du site n'en accepte aucun : le reconnaître ici tromperait le rédacteur.
      assert.lengthOf(Parse.sections('[LG = "fr"]a[/LG]'), 0);
    });

    it('refuse un [LG] qui contient un crochet ouvrant', () => {
      // `[^\[]*` côté site : le moteur s'arrête au crochet et n'interprète rien.
      assert.lengthOf(Parse.sections('[LG="fr"]Voir [MenuSite][/LG]'), 0);
    });

    it('refuse un code de langue qui ne fait pas deux lettres', () => {
      assert.lengthOf(Parse.sections('[LG="fra"]a[/LG]'), 0);
      assert.lengthOf(Parse.sections('[LG="f"]a[/LG]'), 0);
      assert.lengthOf(Parse.sections('<multilang lang="fra">a</multilang>'), 0);
    });

    it('refuse un multilang écrit autrement que le site ne l’écrit', () => {
      assert.lengthOf(Parse.sections('<multilang lang=\'fr\'>a</multilang>'), 0);
      assert.lengthOf(Parse.sections('<multilang  lang="fr">a</multilang>'), 0);
    });

    it('ignore une section imbriquée dans une autre', () => {
      const found = Parse.sections('<multilang lang="fr">a<multilang lang="en">b</multilang></multilang>');
      assert.lengthOf(found, 1);
      assert.equal(found[0].code, 'fr');
    });
  });

  describe('équilibre des balises', () => {
    it('reconnaît un fragment équilibré', () => {
      assert.isTrue(Parse.isBalanced('<p>a</p><div><span>b</span></div>'));
      assert.isTrue(Parse.isBalanced('du texte sans balise'));
      assert.isTrue(Parse.isBalanced('<img src="a.png"><br>'), 'les éléments vides se referment seuls');
      assert.isTrue(Parse.isBalanced('<img src="a.png" />'));
    });

    it('refuse un fragment dont une balise reste ouverte', () => {
      assert.isFalse(Parse.isBalanced('<p>a'));
      assert.isFalse(Parse.isBalanced('a</p>'));
      assert.isFalse(Parse.isBalanced('<p><span>a</p></span>'));
    });

    it('ne se laisse pas tromper par un chevron dans un attribut', () => {
      assert.isTrue(Parse.isBalanced('<p title="a > b">x</p>'));
    });
  });

  describe('texte ou blocs', () => {
    it('voit les blocs', () => {
      assert.isTrue(Parse.hasBlock('<p>a</p>'));
      assert.isTrue(Parse.hasBlock('texte <h2>Titre</h2>'));
      assert.isTrue(Parse.hasBlock('<ul><li>a</li></ul>'));
    });

    it('ne voit pas de bloc dans du texte enrichi', () => {
      assert.isFalse(Parse.hasBlock('Bonjour <strong>toi</strong> <em>et</em> <a href="#">vous</a>'));
      assert.isFalse(Parse.hasBlock('du texte nu'));
      assert.isFalse(Parse.hasBlock('<img src="a.png">'));
    });
  });

  describe('écriture', () => {
    it('écrit les marqueurs des deux formes', () => {
      assert.equal(Parse.wrap('lg', 'fr', 'a'), '[LG="fr"]a[/LG]');
      assert.equal(Parse.wrap('multilang', 'fr', 'a'), '<multilang lang="fr">a</multilang>');
    });

    it('se relit elle-même', () => {
      const written = Parse.wrap('multilang', 'en', '<p>Hello</p>');
      const found = Parse.sections(written);
      assert.lengthOf(found, 1);
      assert.equal(found[0].code, 'en');
      assert.equal(found[0].inner, '<p>Hello</p>');
    });

    it('refuse [LG] dès qu’un crochet ouvrant apparaît', () => {
      assert.isTrue(Parse.canUseLg('Bonjour tout le monde'));
      assert.isTrue(Parse.canUseLg('<p>a] b</p>'), 'seul le crochet ouvrant arrête le site');
      assert.isFalse(Parse.canUseLg('Voir [MenuSite]'));
    });
  });

  describe('rendu pour une langue', () => {
    const page =
      '<h1>[LG="fr"]Bonjour[/LG][LG="en"]Hello[/LG]</h1>' +
      '<p>Commun</p>' +
      '<multilang lang="fr"><p>Ouvert</p></multilang>' +
      '<multilang lang="en"><p>Open</p></multilang>';

    it('ne garde que la langue demandée', () => {
      assert.equal(Parse.resolve(page, 'fr'), '<h1>Bonjour</h1><p>Commun</p><p>Ouvert</p>');
      assert.equal(Parse.resolve(page, 'en'), '<h1>Hello</h1><p>Commun</p><p>Open</p>');
    });

    it('laisse intact ce qui n’est marqué dans aucune langue', () => {
      assert.include(Parse.resolve(page, 'nl'), '<p>Commun</p>');
    });

    it('vide toutes les sections pour une langue absente', () => {
      assert.equal(Parse.resolve(page, 'nl'), '<h1></h1><p>Commun</p>');
    });

    it('ne tient pas compte de la casse du code demandé', () => {
      assert.equal(Parse.resolve(page, 'FR'), Parse.resolve(page, 'fr'));
    });
  });

  describe('inventaire', () => {
    it('relève les langues employées, sans doublon', () => {
      const page = '[LG="fr"]a[/LG][LG="en"]b[/LG]<multilang lang="fr">c</multilang>';
      assert.deepEqual(Parse.codesOf(page), [ 'fr', 'en' ]);
    });

    it('ne relève rien dans une page sans section', () => {
      assert.deepEqual(Parse.codesOf('<p>Bonjour</p>'), []);
    });
  });

  describe('repérage rapide', () => {
    it('reconnaît les deux marqueurs, quelle que soit la casse', () => {
      // Ce test garde le raccourci et les motifs d'accord : un contenu que le motif reconnaît
      // mais que le raccourci écarte ne serait jamais converti.
      assert.isTrue(FilterContent.marks.test('[LG="fr"]a[/LG]'));
      assert.isTrue(FilterContent.marks.test('[lg="fr"]a[/lg]'));
      assert.isTrue(FilterContent.marks.test('<multilang lang="fr">a</multilang>'));
      assert.isTrue(FilterContent.marks.test('<MULTILANG lang="fr">a</MULTILANG>'));
    });

    it('écarte une page qui n’en porte aucun', () => {
      assert.isFalse(FilterContent.marks.test('<p>Bonjour [MenuSite]</p>'));
    });
  });

  describe('validation d’un code', () => {
    it('n’accepte que deux lettres minuscules', () => {
      assert.isTrue(Parse.isCode('fr'));
      assert.isFalse(Parse.isCode('FR'), 'la normalisation se fait avant, pas ici');
      assert.isFalse(Parse.isCode('fra'));
      assert.isFalse(Parse.isCode('f'));
      assert.isFalse(Parse.isCode(''));
      assert.isFalse(Parse.isCode('f"'));
    });
  });
});
