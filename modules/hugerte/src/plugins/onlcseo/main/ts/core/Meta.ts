import { Arr, Optional, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

/**
 * Le code court des métadonnées de la page — description et mots-clés.
 *
 * Il n'appartient pas à ce plugin : c'est `onlcwidgets` qui tient le catalogue des éléments du
 * site, qui sait dessiner la carte d'un code court et la réécrire à l'identique. Ce module ne fait
 * que le **retrouver** dans la page, pour deux raisons qui relèvent bien du référencement :
 *
 * * il n'en faut qu'un. Deux balises `description` dans une page, et les moteurs en choisissent
 *   une au hasard — ou n'en prennent aucune ;
 * * il va en tête, avec la fiche de microdonnées : ce sont les mêmes métadonnées, elles se lisent
 *   au même endroit.
 *
 * Rien ici ne suppose que `onlcwidgets` soit chargé : sans lui, aucun code court n'est reconnu,
 * `existing` ne trouve rien, et l'entrée de menu correspondante n'est pas proposée.
 */

export const shortcodeName = 'Meta';

/** Attribut posé par `onlcwidgets` sur la carte d'un code court. */
const nameAttribute = 'data-onlc-shortcode';

const selector = `[${nameAttribute}="${shortcodeName}"]`;

const isAvailable = (editor: Editor): boolean => editor.hasPlugin('onlcwidgets');

/** Toutes les cartes de métadonnées de la page — il ne devrait y en avoir qu'une. */
const all = (editor: Editor): HTMLElement[] => {
  const body = editor.getBody();
  return Type.isNonNullable(body) ? editor.dom.select<HTMLElement>(selector, body) : [];
};

const existing = (editor: Editor): Optional<HTMLElement> => Arr.head(all(editor));

/**
 * Ramène les doublons à un seul.
 *
 * Le premier gagne : c'est celui que le rédacteur a écrit en premier, et celui qu'un moteur
 * lisant la page de haut en bas rencontrerait d'abord. Rien n'est supprimé en silence — la
 * fonction rend ce qu'elle a retiré, et l'appelant le dit.
 */
const dedupe = (editor: Editor): number => {
  const found = all(editor);
  if (found.length < 2) {
    return 0;
  }
  editor.undoManager.transact(() => {
    Arr.each(found.slice(1), (element) => editor.dom.remove(element));
  });
  editor.nodeChanged();
  return found.length - 1;
};

export {
  selector,
  isAvailable,
  all,
  existing,
  dedupe
};
