import { describe, it } from '@ephox/bedrock-client';
import { TinyHooks } from '@ephox/wrap-mcagar';
import { assert } from 'chai';

import Editor from 'hugerte/core/api/Editor';
import * as Detect from 'hugerte/plugins/onlcswiper/core/Detect';
import * as Slides from 'hugerte/plugins/onlcswiper/core/Slides';
import SwiperPlugin from 'hugerte/plugins/onlcswiper/Plugin';
import WidgetsPlugin from 'hugerte/plugins/onlcwidgets/Plugin';

/**
 * Reconnaissance des diaporamas dans une page écrite à la main.
 *
 * Le html d'une page réelle ne nomme pas ses diaporamas de la même façon d'un bloc à l'autre :
 * `class="swiper mySwiper"`, `class="swiper images-show"`, et parfois pas de classe `swiper` du
 * tout. C'est la piste — `.swiper-wrapper` — qui les désigne, et c'est ce qu'on vérifie ici.
 *
 * `onlcwidgets` est chargé parce que c'est lui qui transforme les `script` de la page en jetons :
 * sans lui, le nettoyeur du cœur les supprimerait, et la configuration serait introuvable.
 */
describe('browser.hugerte.plugins.onlcswiper.DetectTest', () => {
  const hook = TinyHooks.bddSetupLight<Editor>({
    plugins: 'onlcswiper onlcwidgets',
    base_url: '/project/hugerte/js/hugerte'
  }, [ SwiperPlugin, WidgetsPlugin ], true);

  /** Une page à trois diaporamas nommés différemment, comme dans la vraie vie. */
  const page =
    '<div class="swiper mySwiper"><div class="swiper-wrapper">' +
    '<div class="swiper-slide"><img src="a.jpg" alt="Un"></div>' +
    '<div class="swiper-slide swiper-slide-double"><img src="b.jpg" alt="Deux"><img src="c.jpg" alt="Trois"></div>' +
    '<div class="swiper-slide"><h3>Titre</h3><p>Une vue libre</p></div>' +
    '</div></div>' +
    '<div class="swiper images-show"><div class="swiper-wrapper">' +
    '<div class="swiper-slide"><img src="d.jpg" alt="Quatre"></div>' +
    '</div></div>' +
    '<div class="swiper-reviews position-relative"><div class="swiper-wrapper">' +
    '<div class="swiper-slide"><img src="e.jpg" alt="Cinq"></div>' +
    '</div></div>' +
    '<script>\n' +
    'swiper = new Swiper(".mySwiper", { spaceBetween: 30, autoplay: { delay: 2500 } });\n' +
    `swiper3 = new Swiper('.swiper-reviews', { slidesPerView: 2.5 });\n` +
    '<\/script>';

  it('trouve les trois diaporamas, quelles que soient leurs classes', () => {
    const editor = hook.editor();
    editor.setContent(page);
    const trouves = Detect.all(editor);
    assert.equal(trouves.length, 3, 'la piste les désigne tous les trois');
  });

  it('rattache chaque configuration à son diaporama', () => {
    const editor = hook.editor();
    editor.setContent(page);
    const trouves = Detect.all(editor);

    assert.isTrue(trouves[0].call.isSome(), 'le premier est configuré');
    assert.isFalse(trouves[1].call.isSome(), 'le deuxième ne l’est pas');
    assert.isTrue(trouves[2].call.isSome(), 'le troisième l’est, par un autre appel du même script');

    assert.equal(trouves[0].call.getOrDie().selector, '.mySwiper');
    assert.equal(trouves[2].call.getOrDie().selector, '.swiper-reviews');
  });

  it('lit les réglages sans exécuter le script', () => {
    const editor = hook.editor();
    editor.setContent(page);
    assert.equal(editor.getDoc().querySelectorAll('script').length, 0,
      'aucun script n’existe dans la zone d’écriture');

    const config = Detect.all(editor)[0].call.getOrDie().settings.getOrDie();
    assert.equal(config.spaceBetween, 30);
  });

  it('retrouve le diaporama qui contient un nœud', () => {
    const editor = hook.editor();
    editor.setContent(page);
    const image = editor.dom.select('img', editor.getBody())[0];
    const trouve = Detect.at(editor, image);
    assert.isTrue(trouve.isSome());
    assert.isTrue(editor.dom.hasClass(trouve.getOrDie().container, 'mySwiper'));
  });

  it('ne trouve rien hors d’un diaporama', () => {
    const editor = hook.editor();
    editor.setContent('<p>Un paragraphe</p>');
    assert.isTrue(Detect.at(editor, editor.dom.select('p', editor.getBody())[0]).isNone());
  });

  /**
   * Une vue est **d'image** quand elle contient exactement une image et rien d'autre.
   *
   * Tout le reste est une vue libre : plusieurs images, du texte, un bouton. Le formulaire ne les
   * réécrit jamais, il les déplace — c'est ce qui protège la seconde image d'une vue double, que
   * le modèle « une image et son texte de remplacement » effacerait sans prévenir.
   */
  it('distingue les vues d’image des vues libres', () => {
    const editor = hook.editor();
    editor.setContent(page);
    const vues = Slides.read(editor, Detect.all(editor)[0]);

    assert.equal(vues.length, 3);
    assert.isFalse(vues[0].custom);
    assert.equal(vues[0].images.length, 1);
    assert.equal(vues[0].images[0].alt, 'Un');

    assert.isTrue(vues[1].custom, 'deux images font une vue libre : le formulaire n’en produit plus');
    assert.equal(vues[1].images.length, 2, 'ses deux images sont relevées, et gardées');
    assert.equal(vues[1].classes, 'swiper-slide-double', 'sa classe propre est relevée');

    assert.isTrue(vues[2].custom, 'un titre et un paragraphe font une vue libre');
  });

  it('garde les deux images d’une vue double à la réécriture', () => {
    const editor = hook.editor();
    editor.setContent(page);
    const diaporama = Detect.all(editor)[0];
    const vues = Slides.read(editor, diaporama);

    // On inverse deux vues : la vue double doit ressortir entière.
    Slides.write(editor, diaporama, [ vues[1], vues[0], vues[2] ]);

    const apres = Slides.read(editor, diaporama);
    assert.equal(apres[0].images.length, 2, 'la seconde image survit au déplacement');
    assert.equal(apres[0].classes, 'swiper-slide-double');
  });

  it('réécrit la piste sans reconstruire les vues libres', () => {
    const editor = hook.editor();
    editor.setContent(page);
    const diaporama = Detect.all(editor)[0];
    const vues = Slides.read(editor, diaporama);
    const nœudLibre = vues[2].element;

    // On inverse l'ordre : la vue libre passe en tête, et doit rester le même nœud.
    Slides.write(editor, diaporama, [ vues[2], vues[0], vues[1] ]);

    const apres = Slides.read(editor, diaporama);
    assert.equal(apres.length, 3);
    assert.isTrue(apres[0].custom);
    assert.strictEqual(apres[0].element, nœudLibre, 'le nœud d’origine est déplacé, pas recréé');
    assert.include(editor.getContent(), 'Une vue libre', 'son contenu est intact');
    assert.include(editor.getContent(), 'swiper-slide-double', 'la classe des autres vues survit');
  });

  it('écrit une image avec son texte de remplacement et le chargement différé', () => {
    const html = Slides.imageSlideHtml({
      element: null,
      images: [{ src: 'x.jpg', alt: 'Une "photo" & sa légende' }],
      classes: 'swiper-slide-double',
      custom: false
    });
    assert.include(html, 'class="swiper-slide swiper-slide-double"');
    assert.include(html, 'loading="lazy"');
    assert.include(html, 'alt="Une &quot;photo&quot; &amp; sa légende"', 'les guillemets sont échappés');
  });
});
