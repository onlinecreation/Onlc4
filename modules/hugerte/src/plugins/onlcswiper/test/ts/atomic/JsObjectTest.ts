import { describe, it } from '@ephox/bedrock-client';
import { assert } from 'chai';

import * as JsObject from 'hugerte/plugins/onlcswiper/core/JsObject';

/**
 * Lecture d'un littéral objet javascript sans l'exécuter.
 *
 * C'est la pièce dont tout le plugin dépend : si elle se trompe, une configuration de diaporama
 * est mal lue, et la réécriture abîme le script d'une page réelle. Les cas éprouvés ici sont ceux
 * qu'on rencontre vraiment dans les pages d'Online Création : clés nues, guillemets simples,
 * virgules finales, commentaires, clés qui commencent par une arobase, et fonctions.
 *
 * La règle la plus importante est la dernière : **ce que le lecteur ne comprend pas, il le
 * recopie**. Une configuration qui contient une fonction doit ressortir avec sa fonction intacte,
 * sans quoi le formulaire casserait le diaporama qu'il prétend régler.
 */

const lu = (texte: string): JsObject.JsObjectValue =>
  JsObject.parse(texte).getOrDie('le littéral aurait dû être lisible');

describe('atomic.hugerte.plugins.onlcswiper.JsObjectTest', () => {
  it('lit les clés nues et les guillemets simples', () => {
    assert.deepEqual(lu(`{ spaceBetween: 30, effect: 'coverflow' }`), {
      spaceBetween: 30,
      effect: 'coverflow'
    });
  });

  it('accepte une virgule finale', () => {
    assert.deepEqual(lu('{ delay: 2500, disableOnInteraction: true, }'), {
      delay: 2500,
      disableOnInteraction: true
    });
  });

  it('ignore les commentaires, de ligne comme de bloc', () => {
    const texte = '{\n  // le pas\n  spaceBetween: 15,\n  /* désactivé\n  loop: true,\n  */\n  slidesPerView: 2.5\n}';
    assert.deepEqual(lu(texte), { spaceBetween: 15, slidesPerView: 2.5 });
  });

  it('lit les objets imbriqués et les clés qui ne sont pas des identifiants', () => {
    assert.deepEqual(lu(`{ breakpoints: { '@1.5': { slidesPerView: 4 }, 768: { slidesPerView: 2 } } }`), {
      breakpoints: {
        '@1.5': { slidesPerView: 4 },
        768: { slidesPerView: 2 }
      }
    });
  });

  it('lit les tableaux et les valeurs particulières', () => {
    assert.deepEqual(lu('{ liste: [ 1, 2, 3 ], vide: [], rien: null, non: false }'), {
      liste: [ 1, 2, 3 ],
      vide: [],
      rien: null,
      non: false
    });
  });

  it('garde une fonction telle quelle, virgules comprises', () => {
    const config = lu('{ on: 1, f: function () { return "a, b"; }, apres: 2 }');
    assert.deepEqual(config.on, 1, 'ce qui précède la fonction est lu');
    assert.deepEqual(config.apres, 2, 'ce qui la suit aussi');
    assert.isTrue(JsObject.isRaw(config.f), 'la fonction est rangée comme expression brute');
    assert.equal((config.f as JsObject.RawExpression).raw, 'function () { return "a, b"; }');
  });

  it('garde un calcul plutôt que son résultat', () => {
    const config = lu('{ delay: 2 * 60 * 1000 }');
    assert.isTrue(JsObject.isRaw(config.delay));
    assert.equal((config.delay as JsObject.RawExpression).raw, '2 * 60 * 1000');
  });

  it('refuse un texte qui n’est pas un littéral objet', () => {
    assert.isTrue(JsObject.parse('nouvelleConfiguration').isNone());
    assert.isTrue(JsObject.parse('{ sansValeur }').isNone());
    assert.isTrue(JsObject.parse('{ a: 1').isNone(), 'un objet non refermé est illisible');
  });

  it('trouve la fin de l’objet, accolades des fonctions comprises', () => {
    const code = 'new Swiper(".a", { f: function () { return {}; }, b: 1 });';
    const debut = code.indexOf('{');
    const fin = JsObject.endOfObject(code, debut);
    assert.equal(code.substring(debut, fin), '{ f: function () { return {}; }, b: 1 }');
  });

  it('ne se laisse pas tromper par une accolade dans une chaîne', () => {
    const code = 'new Swiper(".a", { sel: "}", b: 1 });';
    const debut = code.indexOf('{');
    assert.equal(code.substring(debut, JsObject.endOfObject(code, debut)), '{ sel: "}", b: 1 }');
  });

  it('réécrit une valeur lue de façon équivalente', () => {
    const texte = `{ spaceBetween: 30, autoplay: { delay: 2500 }, effect: 'fade' }`;
    const relu = JsObject.parse(JsObject.write(lu(texte))).getOrDie();
    assert.deepEqual(relu, lu(texte), 'lire, écrire puis relire donne la même chose');
  });

  it('écrit les clés nues quand elles le peuvent, entre guillemets sinon', () => {
    assert.equal(JsObject.writeKey('slidesPerView'), 'slidesPerView');
    assert.equal(JsObject.writeKey('@1.5'), `'@1.5'`);
    assert.equal(JsObject.writeKey('768'), `'768'`);
  });

  it('échappe ce qui refermerait une chaîne', () => {
    assert.equal(JsObject.quote(`l'un`), `'l\\'un'`);
    assert.equal(JsObject.quote('a\\b'), `'a\\\\b'`);
  });
});
