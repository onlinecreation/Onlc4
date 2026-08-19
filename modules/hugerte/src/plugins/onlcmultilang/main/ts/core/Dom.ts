import { Arr, Optional, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

import { Syntax } from '../api/Types';
import * as Languages from './Languages';

/**
 * Ce à quoi ressemble une section de langue pendant qu'on écrit.
 *
 * ```html
 * <span class="onlc-lang" lang="fr" data-onlc-lang="fr"
 *       data-onlc-lang-syntax="lg" data-onlc-lang-label="Français">Bonjour</span>
 * ```
 *
 * Un `span` quand la section n'encadre que du texte, un `div` dès qu'elle contient des blocs :
 * les deux écritures du site acceptent l'un comme l'autre, mais un `span` autour d'un `<h2>`
 * serait défait par le nettoyeur de l'éditeur, et la section perdue avec lui.
 *
 * La pastille — le nom de la langue — n'est pas un élément : c'est un `::before` de la feuille
 * de styles, nourri par `data-onlc-lang-label`. Rien à ajouter dans le document, donc rien à
 * retirer avant d'enregistrer, et rien qu'une frappe malheureuse puisse effacer.
 *
 * L'attribut `lang` est posé pour de bon : c'est lui qui fait vérifier « Bonjour » par le
 * dictionnaire français et « Hello » par l'anglais, dans la même page.
 *
 * Tout cela disparaît à l'enregistrement — l'élément entier est remplacé par ses marqueurs.
 */

export const blockClass = 'onlc-lang';
export const blockModifier = 'onlc-lang--block';
export const unknownModifier = 'onlc-lang--unknown';

export const codeAttribute = 'data-onlc-lang';
export const syntaxAttribute = 'data-onlc-lang-syntax';
export const labelAttribute = 'data-onlc-lang-label';

export const selector = `[${codeAttribute}]`;

const escape = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const classesFor = (block: boolean, known: boolean): string => {
  const classes = [ blockClass ];
  if (block) {
    classes.push(blockModifier);
  }
  if (!known) {
    classes.push(unknownModifier);
  }
  return classes.join(' ');
};

/**
 * Élément de section, prêt à être inséré.
 *
 * `code` a déjà été ramené à deux lettres minuscules par l'appelant : il part donc tel quel dans
 * les attributs. L'intitulé, lui, vient de la configuration et peut contenir n'importe quoi ; il
 * est échappé.
 */
const toHtml = (editor: Editor, code: string, syntax: Syntax, inner: string, block: boolean): string => {
  const tag = block ? 'div' : 'span';
  const known = Languages.isKnown(editor, code);

  return `<${tag} class="${classesFor(block, known)}" lang="${code}"` +
    ` ${codeAttribute}="${code}"` +
    ` ${syntaxAttribute}="${syntax}"` +
    ` ${labelAttribute}="${escape(Languages.displayOf(editor, code))}">${inner}</${tag}>`;
};

const isSection = (editor: Editor, node: Node | null): node is HTMLElement =>
  Type.isNonNullable(node) && editor.dom.is(node, selector);

const getSelected = (editor: Editor): Optional<HTMLElement> =>
  Optional.from(editor.dom.getParent<HTMLElement>(editor.selection.getNode(), selector));

const codeOf = (editor: Editor, element: HTMLElement): string =>
  editor.dom.getAttrib(element, codeAttribute).toLowerCase();

/** Écriture mémorisée avec la section ; `multilang` si l'attribut manque ou ment. */
const syntaxOf = (editor: Editor, element: HTMLElement): Syntax =>
  editor.dom.getAttrib(element, syntaxAttribute) === 'lg' ? 'lg' : 'multilang';

/**
 * Repose sur l'élément tout ce qui dépend du code de langue.
 *
 * Un seul point de passage : la pastille, le dictionnaire et le marquage « langue non déclarée »
 * ne peuvent pas se contredire.
 */
const mark = (editor: Editor, element: HTMLElement, code: string): void => {
  const dom = editor.dom;
  const block = dom.hasClass(element, blockModifier);

  dom.setAttribs(element, {
    lang: code,
    [codeAttribute]: code,
    [labelAttribute]: Languages.displayOf(editor, code)
  });
  dom.setAttrib(element, 'class', classesFor(block, Languages.isKnown(editor, code)));
};

const setSyntax = (editor: Editor, element: HTMLElement, syntax: Syntax): void => {
  editor.dom.setAttrib(element, syntaxAttribute, syntax);
};

/** Sections voisines immédiates, celle-ci comprise : les traductions d'un même passage. */
const groupOf = (editor: Editor, element: HTMLElement): HTMLElement[] => {
  const walk = (from: HTMLElement, next: (node: Node) => Node | null): HTMLElement[] => {
    const found: HTMLElement[] = [];
    let node = next(from);

    while (Type.isNonNullable(node)) {
      if (node.nodeType === 3 && (node.nodeValue ?? '').trim() === '') {
        node = next(node);
      } else if (isSection(editor, node)) {
        found.push(node);
        node = next(node);
      } else {
        return found;
      }
    }

    return found;
  };

  const before = walk(element, (node) => node.previousSibling).reverse();
  const after = walk(element, (node) => node.nextSibling);

  return before.concat([ element ], after);
};

const codesOfGroup = (editor: Editor, element: HTMLElement): string[] =>
  Arr.map(groupOf(editor, element), (section) => codeOf(editor, section));

export {
  escape,
  classesFor,
  toHtml,
  isSection,
  getSelected,
  codeOf,
  syntaxOf,
  mark,
  setSyntax,
  groupOf,
  codesOfGroup
};
