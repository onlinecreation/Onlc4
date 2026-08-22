import { Arr, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

import * as Detect from './Detect';

/**
 * L'allure d'**aperçu** d'un diaporama dans la zone d'écriture.
 *
 * Un diaporama arrivait en pile de vues, sans rien qui dise ce que c'était : les huit avis d'une
 * page réelle occupaient huit écrans de haut, et rien ne distinguait ce bloc d'une suite de
 * paragraphes. Les blocs galerie et carte, eux, se présentent en vignette — un bandeau qui les
 * nomme, un cadre, une phrase qui dit comment les régler. Un diaporama doit se lire pareil.
 *
 * ## Pourquoi des nœuds fantômes
 *
 * Le html d'un diaporama appartient au **rédacteur**, pas à l'éditeur : ses classes, ses vues
 * libres, ses commandes de navigation ont été écrites à la main, et rien ici ne saurait les
 * reconstruire. Rien ne doit donc être ajouté au contenu.
 *
 * Le bandeau et la mention sont posés en `data-mce-bogus="all"` : le cœur les retire à
 * l'enregistrement sans que ce module ait à s'en occuper, et une page rechargée ressort au
 * caractère près. C'est le même procédé que la barre des blocs, qui vit elle aussi dans la zone
 * d'écriture sans jamais être publiée.
 *
 * ## Le diaporama se manipule d'une pièce
 *
 * Le conteneur est rendu **non modifiable** pendant l'écriture : on ne tape pas dans une vue, on
 * ne colle pas entre deux, on ne tire pas une image hors de sa piste. Tout passe par le
 * formulaire, seul endroit qui sache ce qu'une vue doit contenir.
 *
 * `contenteditable` est posé ici et retiré à l'enregistrement par le filtre de sérialisation :
 * c'est un état d'écriture, il n'a rien à faire dans la page publiée.
 */

export const headClass = 'onlc-swiper-head';
export const footClass = 'onlc-swiper-foot';
export const markAttribute = 'data-onlc-swiper-card';

const slideCount = (swiper: Detect.Swiper): number =>
  swiper.container.querySelectorAll(`.${Detect.slideClass}`).length;

/** Ce que dit le bandeau : le nom du bloc, puis ce qu'il contient. */
const labelOf = (editor: Editor, swiper: Detect.Swiper): string => {
  const count = slideCount(swiper);
  const vues = count === 1
    ? (editor.translate('1 vue') as string)
    : `${count} ${editor.translate('vues') as string}`;
  const reglee = swiper.call.isSome()
    ? (editor.translate('réglages retrouvés') as string)
    : (editor.translate('sans réglages dans la page') as string);
  return `${vues} · ${reglee}`;
};

const bogus = (editor: Editor, tag: string, cls: string): HTMLElement =>
  editor.dom.create(tag, {
    class: cls,
    'data-mce-bogus': 'all',
    [markAttribute]: '1',
    contenteditable: 'false'
  });

/**
 * Pose — ou remet à jour — le bandeau et la mention d'un diaporama.
 *
 * L'opération est refaite à chaque changement de contenu : elle doit donc être idempotente, et
 * ne rien toucher quand rien n'a changé. Réécrire le même texte à chaque frappe ferait
 * clignoter le bandeau et déplacerait le curseur.
 */
const decorateOne = (editor: Editor, swiper: Detect.Swiper): void => {
  const container = swiper.container;
  const wrapper = container.querySelector(`.${Detect.wrapperClass}`);
  if (!Type.isNonNullable(wrapper)) {
    return;
  }

  // Le diaporama se manipule d'une pièce : rien ne s'y tape, rien ne s'y colle.
  if (container.getAttribute('contenteditable') !== 'false') {
    container.setAttribute('contenteditable', 'false');
  }

  const existingHead = container.querySelector(`:scope > .${headClass}`);
  const head = Type.isNonNullable(existingHead)
    ? existingHead as HTMLElement
    : bogus(editor, 'div', headClass);

  const kind = editor.translate('Diaporama') as string;
  const detail = labelOf(editor, swiper);
  const wanted = `${kind}${detail}`;

  if (head.getAttribute('data-onlc-state') !== wanted) {
    head.setAttribute('data-onlc-state', wanted);
    head.innerHTML = '';
    const name = editor.dom.create('span', { class: `${headClass}__name` });
    name.textContent = kind;
    const info = editor.dom.create('span', { class: `${headClass}__detail` });
    info.textContent = detail;
    head.appendChild(name);
    head.appendChild(info);
  }

  if (head.parentNode !== container || container.firstChild !== head) {
    container.insertBefore(head, container.firstChild);
  }

  const existingFoot = container.querySelector(`:scope > .${footClass}`);
  const foot = Type.isNonNullable(existingFoot)
    ? existingFoot as HTMLElement
    : bogus(editor, 'div', footClass);
  const hint = editor.translate(
    'Survolez le bloc puis cliquez sur « Modifier le diaporama » pour changer les vues et le défilement.') as string;
  if (foot.textContent !== hint) {
    foot.textContent = hint;
  }
  if (foot.parentNode !== container || container.lastChild !== foot) {
    container.appendChild(foot);
  }
};

/** Retire les décorations d'un élément : utile avant de relire ses vues. */
const strip = (editor: Editor, container: HTMLElement): void => {
  Arr.each(
    Arr.from(container.querySelectorAll(`[${markAttribute}]`)),
    (node) => editor.dom.remove(node));
};

/** Décore tous les diaporamas de la page. */
const decorate = (editor: Editor): void => {
  Arr.each(Detect.all(editor), (swiper) => decorateOne(editor, swiper));
};

export {
  slideCount,
  labelOf,
  decorateOne,
  decorate,
  strip
};
