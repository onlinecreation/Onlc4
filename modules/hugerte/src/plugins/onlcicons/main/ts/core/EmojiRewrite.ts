import { Arr, Throttler, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

import * as Options from '../api/Options';
import * as OpenMoji from './OpenMoji';

/**
 * Transformation des emojis tapés ou collés en dessins OpenMoji.
 *
 * Le remplacement se fait dans le dom, sur les nœuds de texte, plutôt que sur la chaîne html :
 * un emoji peut se trouver dans un attribut - un texte alternatif, un titre - où il n'a rien à
 * voir avec l'affichage, et une substitution textuelle abîmerait le document.
 *
 * Pendant la frappe, seul le nœud qui porte le curseur est traité, et le curseur est replacé
 * juste après le dessin inséré : la saisie continue sans à-coup.
 */

/** Emplacements où un emoji doit rester un caractère : code, script, blocs non modifiables. */
const protectedSelector = 'code, pre, kbd, samp, [data-onlc-script], .onlc-widget__static, [data-mce-bogus]';

const isProtected = (editor: Editor, node: Node): boolean => {
  const parent = node.parentNode;
  return !Type.isNonNullable(parent) ||
    Type.isNonNullable(editor.dom.getParent(parent as HTMLElement, protectedSelector)) ||
    editor.dom.getParent(parent as HTMLElement, '[contenteditable="false"]') !== null;
};

interface Replacement {
  readonly start: number;
  readonly end: number;
  readonly char: string;
  readonly file: string;
}

const findReplacements = (index: OpenMoji.OpenMojiIndex, text: string): Replacement[] => {
  const pattern = OpenMoji.sequenceRegExp();
  const found: Replacement[] = [];
  let match = pattern.exec(text);

  while (match !== null) {
    const char = match[0];
    const at = match.index;
    index.fileOf(char).each((file) => {
      found.push({ start: at, end: at + char.length, char, file });
    });
    match = pattern.exec(text);
  }

  return found;
};

/**
 * Remplace les emojis d'un nœud de texte. Renvoie le dernier élément inséré, pour que l'appelant
 * puisse y replacer le curseur.
 */
const rewriteTextNode = (editor: Editor, index: OpenMoji.OpenMojiIndex, node: Text): HTMLElement | null => {
  const text = node.data;
  const replacements = findReplacements(index, text);

  if (replacements.length === 0) {
    return null;
  }

  const document_ = node.ownerDocument;
  const fragment = document_.createDocumentFragment();
  let cursor = 0;
  let last: HTMLElement | null = null;

  Arr.each(replacements, (replacement) => {
    if (replacement.start > cursor) {
      fragment.appendChild(document_.createTextNode(text.substring(cursor, replacement.start)));
    }
    const holder = document_.createElement('span');
    holder.innerHTML = OpenMoji.toHtml(editor, replacement.char, replacement.file);
    const image = holder.firstChild as HTMLElement;
    fragment.appendChild(image);
    last = image;
    cursor = replacement.end;
  });

  if (cursor < text.length) {
    fragment.appendChild(document_.createTextNode(text.substring(cursor)));
  }

  node.parentNode?.replaceChild(fragment, node);
  return last;
};

const textNodesOf = (editor: Editor, root: Node): Text[] => {
  const owner = root.ownerDocument ?? editor.getDoc();
  const walker = owner.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let current = walker.nextNode();
  while (current !== null) {
    const node = current as Text;
    if (node.data !== '' && !isProtected(editor, node)) {
      nodes.push(node);
    }
    current = walker.nextNode();
  }
  return nodes;
};

/** Traite tout le document : au chargement, après un collage, après un `setContent`. */
const rewriteAll = (editor: Editor, index: OpenMoji.OpenMojiIndex, root?: Node): void => {
  if (!Options.shouldRewriteEmoji(editor) || !index.hasLoaded()) {
    return;
  }
  const target = root ?? editor.getBody();
  if (!Type.isNonNullable(target)) {
    return;
  }
  Arr.each(textNodesOf(editor, target), (node) => {
    rewriteTextNode(editor, index, node);
  });
};

/** Traite le nœud qui porte le curseur, puis replace le curseur derrière le dessin inséré. */
const rewriteAtCaret = (editor: Editor, index: OpenMoji.OpenMojiIndex): void => {
  if (!Options.shouldRewriteEmoji(editor) || !index.hasLoaded()) {
    return;
  }

  const selection = editor.selection.getSel();
  const anchor = selection?.anchorNode;

  if (!Type.isNonNullable(anchor) || anchor.nodeType !== 3 || isProtected(editor, anchor)) {
    return;
  }

  const inserted = rewriteTextNode(editor, index, anchor as Text);
  if (inserted !== null) {
    editor.selection.setCursorLocation(inserted.parentNode as Node, editor.dom.nodeIndex(inserted) + 1);
  }
};

const setup = (editor: Editor, index: OpenMoji.OpenMojiIndex): void => {
  const onInput = Throttler.last(() => rewriteAtCaret(editor, index), 60);

  editor.on('init', () => {
    index.waitForLoad().then(() => rewriteAll(editor, index));
  });

  editor.on('SetContent', () => rewriteAll(editor, index));
  editor.on('PastePostProcess', (e) => rewriteAll(editor, index, e.node));
  editor.on('input', () => onInput.throttle());
  editor.on('remove', () => onInput.cancel());
};

export {
  protectedSelector,
  findReplacements,
  rewriteTextNode,
  rewriteAll,
  rewriteAtCaret,
  setup
};
