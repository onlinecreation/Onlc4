import { Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

import * as Options from '../api/Options';
import { IconEntry } from './IconDatabase';
import * as OpenMoji from './OpenMoji';

/**
 * Markup produit à l'insertion.
 *
 * Chaque famille a sa propre écriture, et c'est l'entrée choisie qui décide :
 *
 * - Material Design : `<span class="material-icons" …>home</span>` — l'icône est une ligature,
 *   le nom est donc écrit en toutes lettres dans l'élément ;
 * - Font Awesome : `<i class="fa-solid fa-house" …></i>` — l'icône est une classe, l'élément
 *   reste vide ;
 * - emoji : `<img class="onlc-emoji" src="…/1F600.svg" alt="😀">` — le dessin OpenMoji.
 */

const familyClasses = (editor: Editor, entry: IconEntry): string => {
  if (entry.family === 'fontawesome') {
    const style = Type.isString(entry.style) && entry.style !== '' ? entry.style : 'solid';
    return `fa-${style} fa-${entry.name}`;
  }
  return Options.getClassPrefix(editor) + entry.name;
};

/** Markup d'une icône décrite par son entrée de catalogue. */
const toHtml = (editor: Editor, entry: IconEntry): string => {
  const title = editor.dom.encode(entry.title);

  if (entry.family === 'material') {
    const cls = editor.dom.encode(Options.getIconClass(editor));
    return `<span class="${cls} onlc-icon" role="img" aria-label="${title}">${editor.dom.encode(entry.name)}</span>`;
  }

  const cls = editor.dom.encode(familyClasses(editor, entry));
  return `<i class="${cls} onlc-icon" role="img" aria-label="${title}"></i>`;
};

/**
 * Markup d'une icône désignée par son seul nom, pour les intégrations qui appellent la commande
 * `OnlcInsertIcon`. La famille est devinée : un nom en `mot_mot` est une ligature Material.
 */
const toIconHtml = (editor: Editor, name: string): string => toHtml(editor, {
  name,
  title: name.replace(/[_-]/g, ' '),
  keywords: [],
  category: '',
  family: name.indexOf('_') !== -1 || name.indexOf('-') === -1 ? 'material' : 'fontawesome',
  style: 'solid'
});

const insertHtml = (editor: Editor, html: string): void => {
  editor.undoManager.transact(() => {
    editor.insertContent(html);
  });
  editor.nodeChanged();
};

const insertEntry = (editor: Editor, entry: IconEntry): void => insertHtml(editor, toHtml(editor, entry));

const insertIcon = (editor: Editor, name: string): void => insertHtml(editor, toIconHtml(editor, name));

/**
 * Insère un emoji. Quand le dessin OpenMoji existe, c'est lui qui est posé dans la page : le
 * rendu est alors identique sur tous les systèmes.
 */
const insertEmoji = (editor: Editor, char: string, index?: OpenMoji.OpenMojiIndex): void => {
  const drawn = Type.isNonNullable(index)
    ? index.fileOf(char).map((file) => OpenMoji.toHtml(editor, char, file))
    : undefined;

  insertHtml(editor, drawn?.getOr(editor.dom.encode(char)) ?? editor.dom.encode(char));
};

export {
  familyClasses,
  toHtml,
  toIconHtml,
  insertEntry,
  insertIcon,
  insertEmoji
};
