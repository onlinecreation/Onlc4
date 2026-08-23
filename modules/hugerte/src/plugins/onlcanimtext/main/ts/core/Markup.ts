import { Arr } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

import * as Anim from './Anim';
import * as Styles from './Styles';

/**
 * L'écriture d'un texte animé dans la page.
 *
 * Le html produit est **lisible sans la feuille** : les mots s'y suivent dans l'ordre, en texte
 * ordinaire. Un moteur de recherche, un lecteur d'écran ou un navigateur qui n'appliquerait pas la
 * feuille voit donc « Renault Dacia Alpine », et non un trou.
 */

/**
 * Les classes du conteneur : les nôtres, plus celles que le rédacteur avait posées.
 *
 * Les classes de l'**écriture d'origine** sont retirées, elles et elles seules. Elles portaient
 * l'ancienne technique — des mots superposés et une largeur devinée, `min-width: 5em` — et la
 * garder ferait exactement ce que le module vient supprimer : réserver une place qui n'est pas
 * celle du plus long mot. Les mots, eux, sont conservés ; c'est la présentation qui change de
 * mains.
 */
const legacyClasses = [ Anim.legacyContainerClass, Anim.legacyItemClass ];

const isLegacy = (name: string): boolean =>
  Arr.contains(legacyClasses, name) || name.indexOf(`${Anim.legacyItemClass}-`) === 0;

const classesOf = (element: HTMLElement | null, kind: Anim.AnimKind): string => {
  const propres = [ Anim.containerClass, `${Anim.containerClass}--${kind}` ];
  const anciennes = element === null
    ? []
    : Arr.filter(element.className.split(/\s+/), (name) =>
      name !== '' && !Arr.contains(propres, name) && name.indexOf(`${Anim.containerClass}--`) !== 0
      && name !== Anim.containerClass && !isLegacy(name));
  return propres.concat(anciennes).join(' ');
};

/**
 * Écrit les réglages **sur** l'élément : classes, attributs, mots.
 *
 * L'élément est réécrit en place plutôt que remplacé : il garde ainsi sa position dans la phrase,
 * et les classes que le rédacteur lui avait données.
 */
const apply = (editor: Editor, element: HTMLElement, settings: Anim.AnimSettings): void => {
  const mots = Arr.filter(settings.items, (mot) => mot.trim() !== '');
  const retenus = mots.length === 0 ? [ '' ] : mots;

  editor.dom.setAttrib(element, 'class', classesOf(element, settings.kind));
  editor.dom.setAttrib(element, Anim.dataAttribute,
    encodeURIComponent(JSON.stringify({ kind: settings.kind, duration: settings.duration, items: retenus })));
  editor.dom.setAttrib(element, Styles.countAttribute, String(retenus.length));
  editor.dom.setStyle(element, '--onlc-animtext-duration', `${settings.duration}s`);

  element.innerHTML = '';
  Arr.each(retenus, (mot, index) => {
    const item = editor.dom.create('span', { class: Anim.itemClass }, editor.dom.encode(mot));
    // Le rang décide du moment où le mot prend son tour. Il est posé ici plutôt que calculé dans
    // la feuille : un sélecteur ne sait pas compter ses frères sans `nth-child`, qu'il faudrait
    // écrire autant de fois qu'il y a de mots possibles.
    editor.dom.setStyle(item, '--onlc-animtext-index', String(index));
    element.appendChild(item);
  });
};

/** Crée un texte animé à partir du texte donné, sans l'insérer. */
const create = (editor: Editor, settings: Anim.AnimSettings): HTMLElement => {
  const element = editor.dom.create('span');
  apply(editor, element, settings);
  return element;
};

/** Le nombre de mots de chaque texte animé de la page — ce dont la feuille a besoin. */
const counts = (editor: Editor): number[] =>
  Arr.map(Anim.all(editor), (element) => Anim.settingsOf(editor, element).items.length);

export {
  isLegacy,
  classesOf,
  apply,
  create,
  counts
};
