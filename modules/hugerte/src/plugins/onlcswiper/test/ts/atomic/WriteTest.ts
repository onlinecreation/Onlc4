import { describe, it } from '@ephox/bedrock-client';
import { assert } from 'chai';

import * as Detect from 'hugerte/plugins/onlcswiper/core/Detect';
import * as Write from 'hugerte/plugins/onlcswiper/core/Write';

/**
 * Réécriture des réglages **dans le script d'une page réelle**.
 *
 * Le script d'une page d'accueil configure trois diaporamas et fait dix autres choses. Modifier
 * l'un ne doit rien changer aux autres — c'est ce qu'on vérifie ici, sur le script tel qu'il est
 * écrit dans la page LM Parts du second exemple.
 */

/** Le script de la page d'accueil, réduit à ce qui compte pour l'épreuve. */
const script = `$(document).ready(function () {
    swiper = new Swiper(".mySwiper", {
        spaceBetween: 30,
        autoplay: {
            delay: 2500,
            disableOnInteraction: true,
        },
        effect: 'coverflow'
    });

    swiper3 = new Swiper('.swiper-reviews', {
        spaceBetween: 15,
        slidesPerView: 2.5,
        navigation: {
            nextEl: ".swiper-reviews-button-next",
            hideOnClick: true,
        },
        breakpoints: {
            '@1.5': { slidesPerView: 4 }
        }
    });
});

function showEmailAddress() {
    return 'contact';
}`;

describe('atomic.hugerte.plugins.onlcswiper.WriteTest', () => {
  it('trouve les deux appels et leurs sélecteurs', () => {
    const appels = Detect.callsIn(script);
    assert.equal(appels.length, 2);
    assert.deepEqual(appels.map((appel) => appel.selector), [ '.mySwiper', '.swiper-reviews' ]);
    assert.isTrue(appels[0].settings.isSome());
    assert.isTrue(appels[1].settings.isSome());
  });

  it('ne remplace que l’intervalle du premier appel', () => {
    const appel = Detect.callsIn(script)[0];
    const config = appel.settings.getOrDie();
    const reecrit = Write.replaceSettings(script, appel.start, appel.end, { ...config, spaceBetween: 40 });

    assert.isNotNull(reecrit);
    const resultat = reecrit as string;
    assert.include(resultat, 'spaceBetween: 40', 'le réglage demandé est écrit');
    assert.include(resultat, `swiper3 = new Swiper('.swiper-reviews'`, 'le second appel est intact');
    // Les guillemets doubles du second appel sont conservés tels quels : c'est la preuve qu'il n'a
    // pas été réécrit, puisque l'écriture normalise les chaînes en guillemets simples.
    assert.include(resultat, 'nextEl: ".swiper-reviews-button-next"',
      'les sélecteurs du second appel sont intacts, guillemets compris');
    assert.include(resultat, 'function showEmailAddress', 'le reste du script est intact');
    assert.include(resultat, `'@1.5': {`, 'les paliers du second appel sont intacts');
  });

  it('reprend l’indentation de la ligne de l’appel', () => {
    const appel = Detect.callsIn(script)[0];
    const reecrit = Write.replaceSettings(script, appel.start, appel.end,
      appel.settings.getOrDie()) as string;

    // L'appel est indenté de quatre espaces : ses réglages doivent l'être de six, et l'accolade
    // fermante de quatre. Une configuration recollée à gauche passerait pour une erreur.
    assert.include(reecrit, '\n      spaceBetween: 30');
    assert.include(reecrit, '\n    });');
  });

  it('refuse d’écrire si l’intervalle n’est plus celui qu’on croit', () => {
    assert.isNull(Write.replaceSettings(script, 0, 10, {}), 'le début ne pointe pas sur une accolade');
    assert.isNull(Write.replaceSettings(script, 5, 5, {}), 'un intervalle vide');
    assert.isNull(Write.replaceSettings(script, 10, script.length + 50, {}), 'une fin hors du texte');
  });

  it('écrit un appel neuf lisible et relisible', () => {
    const code = Write.newCallCode('.mySwiper', { spaceBetween: 20, loop: true });
    assert.include(code, `new Swiper('.mySwiper', {`);

    const relu = Detect.callsIn(code);
    assert.equal(relu.length, 1);
    assert.deepEqual(relu[0].settings.getOrDie(), { spaceBetween: 20, loop: true });
  });

  it('calcule l’indentation d’une ligne', () => {
    assert.equal(Write.indentAt('        a = {', 12), '        ');
    assert.equal(Write.indentAt('a = {', 4), '');
    assert.equal(Write.indentAt('x\n  b = {', 8), '  ');
  });

  it('n’ajoute pas d’indentation quand il n’y en a pas', () => {
    assert.equal(Write.reindent('{\n  a: 1\n}', ''), '{\n  a: 1\n}');
    assert.equal(Write.reindent('{\n  a: 1\n}', '  '), '{\n    a: 1\n  }');
  });

  it('ignore un appel dont le sélecteur n’est pas une chaîne', () => {
    // On ne saurait pas à quel conteneur le rattacher : mieux vaut ne rien proposer.
    assert.equal(Detect.callsIn('new Swiper(element, { loop: true });').length, 0);
    assert.equal(Detect.callsIn('new Swiper(selecteur, { loop: true });').length, 0);
  });

  it('lit un appel écrit avec des guillemets doubles comme simples', () => {
    assert.equal(Detect.callsIn(`new Swiper("a", {}); new Swiper('b', {});`).length, 2);
  });

  it('garde une valeur qu’il n’a pas comprise en réécrivant', () => {
    const code = 'new Swiper(".a", { delay: 2 * 60, loop: true });';
    const appel = Detect.callsIn(code)[0];
    const reecrit = Write.replaceSettings(code, appel.start, appel.end,
      appel.settings.getOrDie()) as string;
    assert.include(reecrit, 'delay: 2 * 60', 'le calcul est recopié, pas remplacé par son résultat');
  });

  it('relit ce qu’il vient d’écrire', () => {
    const code = 'new Swiper(".a", { spaceBetween: 10 });';
    const appel = Detect.callsIn(code)[0];
    const reecrit = Write.replaceSettings(code, appel.start, appel.end, { spaceBetween: 25 }) as string;
    const relu = Detect.callsIn(reecrit)[0];
    assert.deepEqual(relu.settings.getOrDie(), { spaceBetween: 25 });
  });
});
