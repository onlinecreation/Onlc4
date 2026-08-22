import { describe, it } from '@ephox/bedrock-client';
import { assert } from 'chai';

import * as JsObject from 'hugerte/plugins/onlcswiper/core/JsObject';
import * as Settings from 'hugerte/plugins/onlcswiper/core/Settings';

/**
 * Traduction des réglages d'un diaporama dans les deux sens.
 *
 * Deux garanties sont vérifiées ici, et ce sont celles qui font qu'on peut lâcher ce formulaire
 * sur une page existante :
 *
 * 1. **rien ne se perd** — les options que le formulaire ne connaît pas ressortent intactes ;
 * 2. **rien ne s'invente** — une option laissée à sa valeur par défaut n'est pas écrite, et une
 *    option qui existait garde ses propres sélecteurs plutôt que ceux de la bibliothèque.
 */

const configuration = (texte: string): JsObject.JsObjectValue =>
  JsObject.parse(texte).getOrDie('le littéral aurait dû être lisible');

describe('atomic.hugerte.plugins.onlcswiper.SettingsTest', () => {
  it('lit un interrupteur écrit de trois façons différentes', () => {
    assert.isTrue(Settings.flagOf(true, false));
    assert.isTrue(Settings.flagOf({ enabled: true }, false), 'un objet activé vaut oui');
    assert.isFalse(Settings.flagOf({ enabled: false }, true), 'un objet désactivé vaut non');
    assert.isTrue(Settings.flagOf({ releaseOnEdges: true }, false), 'un objet sans « enabled » vaut oui');
    assert.isFalse(Settings.flagOf(undefined, false), 'absente, l’option garde sa valeur par défaut');
  });

  it('lit la configuration réelle d’une page', () => {
    const lu = Settings.fromConfig(configuration(`{
      spaceBetween: 30,
      centeredSlides: true,
      freeMode: { enabled: false },
      mousewheel: { enabled: true, releaseOnEdges: true },
      autoplay: { delay: 2500, disableOnInteraction: true },
      effect: 'coverflow'
    }`));

    assert.equal(lu.spaceBetween, '30');
    assert.isTrue(lu.centeredSlides);
    assert.isFalse(lu.freeMode, 'freeMode désactivé explicitement');
    assert.isTrue(lu.mousewheel);
    assert.isTrue(lu.autoplay);
    assert.equal(lu.autoplayDelay, '2500');
    assert.isTrue(lu.autoplayStopsOnTouch);
    assert.equal(lu.effect, 'coverflow');
    assert.isFalse(lu.navigation, 'aucune navigation déclarée');
  });

  it('lit les paliers d’écran', () => {
    const lu = Settings.fromConfig(configuration(`{
      breakpoints: { '@1.5': { slidesPerView: 4 }, '@1': { slidesPerView: 3, spaceBetween: 10 } }
    }`));
    assert.deepEqual(lu.breakpoints, [
      { key: '@1.5', slidesPerView: '4', spaceBetween: '' },
      { key: '@1', slidesPerView: '3', spaceBetween: '10' }
    ]);
  });

  it('garde ce que le formulaire ne connaît pas', () => {
    const origine = configuration(`{
      effect: 'coverflow',
      coverflowEffect: { rotate: 30, stretch: 0 },
      on: function () { return 1; }
    }`);
    const reecrit = Settings.toConfig(origine, { ...Settings.fromConfig(origine), spaceBetween: '20' });

    assert.deepEqual(reecrit.coverflowEffect, { rotate: 30, stretch: 0 }, 'l’effet réglé finement survit');
    assert.isTrue(JsObject.isRaw(reecrit.on as JsObject.JsValue), 'la fonction survit');
    assert.equal(reecrit.spaceBetween, 20, 'le réglage demandé est écrit');
  });

  it('n’écrit pas une option laissée à sa valeur par défaut', () => {
    const reecrit = Settings.toConfig({}, Settings.defaults);
    assert.deepEqual(reecrit, {}, 'une configuration entièrement par défaut reste vide');
  });

  it('retire une option qu’on désactive', () => {
    const origine = configuration(`{ loop: true, autoplay: { delay: 4000 } }`);
    const reecrit = Settings.toConfig(origine, {
      ...Settings.fromConfig(origine),
      loop: false,
      autoplay: false
    });
    assert.notProperty(reecrit, 'loop');
    assert.notProperty(reecrit, 'autoplay');
  });

  it('conserve les sélecteurs de commandes propres à la page', () => {
    const origine = configuration(`{
      navigation: { nextEl: '.swiper-reviews-button-next', prevEl: '.swiper-reviews-button-prev' }
    }`);
    const reecrit = Settings.toConfig(origine, { ...Settings.fromConfig(origine), navigation: true });
    assert.deepEqual(reecrit.navigation, {
      nextEl: '.swiper-reviews-button-next',
      prevEl: '.swiper-reviews-button-prev'
    }, 'les sélecteurs de la page ne sont pas remplacés par ceux de la bibliothèque');
  });

  it('pose les sélecteurs standard quand l’option n’existait pas', () => {
    const reecrit = Settings.toConfig({}, { ...Settings.defaults, navigation: true });
    assert.deepEqual(reecrit.navigation, {
      nextEl: '.swiper-button-next',
      prevEl: '.swiper-button-prev'
    });
  });

  it('écrit « auto » tel quel et les nombres en nombres', () => {
    assert.equal(Settings.numberOrText('3'), 3);
    assert.equal(Settings.numberOrText('1.15'), 1.15);
    assert.equal(Settings.numberOrText('auto'), 'auto');
  });

  it('fait un aller-retour sans rien changer', () => {
    const origine = configuration(`{
      spaceBetween: 15,
      slidesPerView: 2.5,
      freeMode: { enabled: true },
      navigation: { nextEl: '.a', prevEl: '.b', hideOnClick: true },
      breakpoints: { '@1': { slidesPerView: 3 } }
    }`);
    const reecrit = Settings.toConfig(origine, Settings.fromConfig(origine));
    assert.deepEqual(Settings.fromConfig(reecrit), Settings.fromConfig(origine));
  });
});
