import { HugeRTE } from 'hugerte/core/api/PublicApi';

declare let hugerte: HugeRTE;

/**
 * Un diaporama écrit à la main, avec sa configuration dans un script — comme dans une vraie page.
 *
 * Le second n'a pas de configuration : le formulaire doit le dire et proposer d'en poser une.
 */
const content =
  '<div class="swiper mySwiper">' +
  '<div class="swiper-wrapper">' +
  '<div class="swiper-slide"><img src="https://exemple.tld/a.jpg" alt="Première photo"></div>' +
  '<div class="swiper-slide swiper-slide-double">' +
  '<img src="https://exemple.tld/b.jpg" alt="Deuxième"><img src="https://exemple.tld/c.jpg" alt="Troisième"></div>' +
  '<div class="swiper-slide"><h3>Une vue libre</h3><p>Elle contient du texte, pas une image.</p></div>' +
  '</div>' +
  '<div class="swiper-button-next"></div><div class="swiper-button-prev"></div>' +
  '</div>' +
  '<div class="swiper images-show"><div class="swiper-wrapper">' +
  '<div class="swiper-slide"><img src="https://exemple.tld/d.jpg" alt="Sans configuration"></div>' +
  '</div></div>' +
  '<script>' +
  'new Swiper(".mySwiper", {\n' +
  '  spaceBetween: 30,\n' +
  '  autoplay: { delay: 2500, disableOnInteraction: true },\n' +
  '  breakpoints: { "@1.5": { slidesPerView: 1.8 } },\n' +
  '  navigation: { nextEl: ".swiper-button-next", prevEl: ".swiper-button-prev" }\n' +
  '});' +
  '<\/script>';

hugerte.init({
  selector: 'textarea.hugerte',
  plugins: 'onlcswiper onlcwidgets onlcblocks code',
  toolbar: 'onlcswiperedit | onlcscript | code',
  menubar: 'file edit insert format',
  height: 600,
  setup: (editor) => {
    editor.on('init', () => editor.setContent(content));
  }
});

export {};
