import { Arr, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

import * as Detect from './Detect';

/**
 * Les vues d'un diaporama : ce qu'on en lit, ce qu'on ose y réécrire.
 *
 * ## Deux sortes de vues
 *
 * Dans une page réelle, une vue contient tantôt une image, tantôt deux, tantôt un bloc de texte
 * avec un bouton. Le formulaire ne sait proposer « une image et son texte de remplacement » que
 * pour la première sorte.
 *
 * Une vue est donc dite **d'image** quand elle contient exactement **une** image et rien d'autre,
 * et **libre** dans tous les autres cas — plusieurs images, du texte, un bouton. Les vues libres
 * apparaissent dans la liste : on les déplace et on les retire comme les autres, mais leur
 * contenu n'est **jamais réécrit**.
 *
 * C'est la seule façon de ne pas détruire le travail de quelqu'un. Un formulaire qui ramènerait
 * toute vue à une image effacerait sans prévenir la seconde image d'une vue double, ou le bouton
 * et le titre d'un diaporama d'accueil.
 *
 * ## Une seule image par vue
 *
 * Ce que l'éditeur **produit** ne porte qu'une image : c'est le modèle qu'un diaporama demande, et
 * deux images dans une même vue relèvent d'une mise en page que la bibliothèque ne connaît pas.
 * Les vues doubles déjà écrites ne sont pas converties pour autant — elles passent en vues libres,
 * et traversent l'éditeur intactes.
 */

export interface SlideImage {
  readonly src: string;
  readonly alt: string;
}

export interface Slide {
  /** Le nœud d'origine, ou `null` pour une vue qui vient d'être ajoutée. */
  readonly element: HTMLElement | null;
  readonly images: SlideImage[];
  /** Classes portées par la vue, en plus de `swiper-slide`. */
  readonly classes: string;
  /** La vue contient autre chose que des images : son contenu n'est pas réécrit. */
  readonly custom: boolean;
}

const isMeaningful = (node: Node): boolean => {
  if (node.nodeType === 3) {
    return (node.nodeValue ?? '').trim() !== '';
  }
  if (node.nodeType !== 1) {
    return false;
  }
  return (node as HTMLElement).nodeName.toLowerCase() !== 'img';
};

const extraClasses = (element: HTMLElement): string =>
  Arr.filter(element.className.split(/\s+/), (name) =>
    name !== '' && name !== Detect.slideClass && name.indexOf('mce-') !== 0).join(' ');

const readSlide = (editor: Editor, element: HTMLElement): Slide => {
  const images = Arr.map(editor.dom.select<HTMLImageElement>('img', element), (image) => ({
    src: editor.dom.getAttrib(image, 'src'),
    alt: editor.dom.getAttrib(image, 'alt')
  }));

  // Une vue à deux images est une mise en page que le formulaire ne saurait pas reconstruire :
  // elle est traitée comme libre, donc déplacée sans jamais être réécrite.
  const libre = Arr.exists(Arr.from(element.childNodes), isMeaningful) || images.length > 1;

  return {
    element,
    images: libre ? images : images.slice(0, 1),
    classes: extraClasses(element),
    custom: libre
  };
};

const read = (editor: Editor, swiper: Detect.Swiper): Slide[] =>
  Arr.map(
    Arr.filter(Arr.from(swiper.wrapper.children), (child) =>
      editor.dom.hasClass(child as HTMLElement, Detect.slideClass)) as HTMLElement[],
    (element) => readSlide(editor, element));

const escape = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const classesOf = (slide: Slide): string =>
  slide.classes === '' ? Detect.slideClass : `${Detect.slideClass} ${slide.classes}`;

/**
 * Le html d'une vue d'image.
 *
 * `loading="lazy"` est posé comme dans les pages d'Online Création : un diaporama d'accueil charge
 * volontiers huit photos, dont sept ne seront jamais regardées.
 */
const imageSlideHtml = (slide: Slide): string => {
  const images = Arr.map(slide.images, (image) =>
    `<img src="${escape(image.src)}" alt="${escape(image.alt)}" loading="lazy">`).join('');
  return `<div class="${escape(classesOf(slide))}">${images}</div>`;
};

/**
 * Réécrit la piste du diaporama.
 *
 * Les vues libres sont **déplacées**, jamais reconstruites : leur nœud d'origine est repris tel
 * quel, avec tout ce qu'il contient. Les vues d'images sont réécrites à partir du formulaire.
 */
const write = (editor: Editor, swiper: Detect.Swiper, slides: Slide[]): void => {
  const wrapper = swiper.wrapper;
  const built = Arr.bind(slides, (slide) => {
    if (slide.custom && Type.isNonNullable(slide.element)) {
      // La classe peut avoir changé : c'est le seul attribut que le formulaire touche ici.
      editor.dom.setAttrib(slide.element, 'class', classesOf(slide));
      return [ slide.element ];
    }
    const first = editor.dom.createFragment(imageSlideHtml(slide)).firstChild;
    return Type.isNonNullable(first) ? [ first as HTMLElement ] : [];
  });

  while (Type.isNonNullable(wrapper.firstChild)) {
    wrapper.removeChild(wrapper.firstChild);
  }
  Arr.each(built, (element) => wrapper.appendChild(element));
};

/** Une vue neuve, prête à recevoir une image. */
const empty = (): Slide => ({
  element: null,
  images: [{ src: '', alt: '' }],
  classes: '',
  custom: false
});

export {
  isMeaningful,
  extraClasses,
  readSlide,
  read,
  escape,
  classesOf,
  imageSlideHtml,
  write,
  empty
};
