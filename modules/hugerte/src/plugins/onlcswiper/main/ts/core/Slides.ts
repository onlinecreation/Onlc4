import { Arr, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

import * as Detect from './Detect';

/**
 * Les vues d'un diaporama : ce qu'on en lit, ce qu'on ose y réécrire.
 *
 * ## Deux sortes de vues
 *
 * Dans une page réelle, une vue contient tantôt une image, tantôt deux, tantôt un bloc de texte
 * avec un bouton. Le formulaire ne peut proposer un champ « adresse de l'image » que pour les
 * premières.
 *
 * Une vue est donc dite **d'images** quand elle ne contient que des images, et **libre** dans tous
 * les autres cas. Les vues libres apparaissent dans la liste — on peut les déplacer et les
 * supprimer, ce sont des vues comme les autres — mais leur contenu n'est jamais réécrit : il se
 * modifie directement dans la page, où il est visible et modifiable comme n'importe quel texte.
 *
 * C'est la seule façon de ne pas détruire le travail de quelqu'un. Un formulaire qui ramènerait
 * toute vue à « une image et un texte de remplacement » effacerait sans prévenir le bouton, le
 * titre et la légende d'un diaporama d'accueil.
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

const readSlide = (editor: Editor, element: HTMLElement): Slide => ({
  element,
  images: Arr.map(editor.dom.select<HTMLImageElement>('img', element), (image) => ({
    src: editor.dom.getAttrib(image, 'src'),
    alt: editor.dom.getAttrib(image, 'alt')
  })),
  classes: extraClasses(element),
  custom: Arr.exists(Arr.from(element.childNodes), isMeaningful)
});

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
 * Le html d'une vue d'images.
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
