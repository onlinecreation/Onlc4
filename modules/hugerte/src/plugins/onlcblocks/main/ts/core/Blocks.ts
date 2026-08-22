import { Arr, Optional, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import * as BlockAtoms from 'hugerte/plugins/onlcshared/BlockAtoms';

import * as Options from '../api/Options';
import * as Columns from './Columns';

/**
 * Detection of the elements that behave as blocks - the ones the block toolbar is attached to.
 *
 * An element is a block when it is displayed as `block`, `flex`, `grid`, `table` or `flow-root`,
 * is not part of the plugin ui and is not one of the structural elements excluded by
 * `onlc_blocks_exclude` (list items, table cells...).
 *
 * Bootstrap columns are deliberately left out: a row moves as a whole, its columns are fixed and
 * only the grid actions (add, remove, resize) act on them.
 *
 * Les blocs déclarés **insécables** par un autre plugin — un diaporama, voir `BlockAtoms` — font
 * exception aux deux règles : l'élément lui-même est un bloc, et rien de ce qu'il contient n'en
 * est un. C'est ce qui permet de déplacer un diaporama d'une pièce sans qu'on puisse en tirer
 * une vue au dehors.
 */

const blockDisplays = [ 'block', 'flex', 'grid', 'table', 'flow-root', 'list-item' ];

const uiSelector = '[data-onlc-ui]';

const isUi = (editor: Editor, element: Node | null): boolean =>
  Type.isNonNullable(element) && Type.isNonNullable(editor.dom.getParent(element, uiSelector));

const displayOf = (editor: Editor, element: HTMLElement): string =>
  editor.dom.getStyle(element, 'display', true) || '';

const isBlockDisplay = (editor: Editor, element: HTMLElement): boolean =>
  Arr.contains(blockDisplays, displayOf(editor, element));

const isExcluded = (editor: Editor, element: HTMLElement): boolean =>
  editor.dom.is(element, Options.getExcludeSelector(editor));

const isContainer = (editor: Editor, element: Node | null): boolean => {
  if (!Type.isNonNullable(element) || element === editor.getBody()) {
    return true;
  }
  return editor.dom.is(element, Options.getContainerSelector(editor));
};

const isBlock = (editor: Editor, element: Node | null): element is HTMLElement => {
  if (!Type.isNonNullable(element) || element.nodeType !== 1 || element === editor.getBody()) {
    return false;
  }
  const elm = element as HTMLElement;
  // L'intérieur d'un bloc insécable ne se manipule pas ; le bloc lui-même, si, quel que soit son
  // mode d'affichage — c'est le plugin qui le possède qui en répond.
  if (BlockAtoms.isInside(editor, elm)) {
    return false;
  }
  if (BlockAtoms.enclosing(editor, elm).exists((atom) => atom === elm)) {
    return !isUi(editor, elm);
  }
  if (Columns.isColumnElement(elm)) {
    return false;
  }
  return !isUi(editor, elm) && !isExcluded(editor, elm) && isBlockDisplay(editor, elm);
};

/**
 * Ce bloc a-t-il des voisins de même rang ?
 *
 * Un bloc seul dans son parent ne se distingue pas de lui : le monter, le descendre ou le
 * dupliquer n'aurait pas de sens visible. Un bloc parmi d'autres, si.
 */
const hasBlockSiblings = (editor: Editor, element: HTMLElement): boolean => {
  const parent = element.parentNode;
  if (!Type.isNonNullable(parent)) {
    return false;
  }
  return Arr.exists(Arr.from(parent.childNodes), (node) => node !== element && isBlock(editor, node));
};

/**
 * Walks up from the given node and returns the block the user is meant to manipulate: the
 * outermost element whose parent is a container (the root, a bootstrap row or column, a section...).
 *
 * Un bloc insécable coupe court à cette remontée : quand le nœud est dedans, c'est lui le bloc.
 * Sans quoi la barre se poserait sur la section qui l'entoure, et le diaporama qu'elle contient
 * resterait impossible à désigner.
 *
 * ## Le bloc parmi ses semblables
 *
 * La remontée s'arrête aussi dès qu'elle croise un bloc qui a des **voisins de même rang**, et
 * ce choix l'emporte sur tout ce qu'elle trouverait plus haut. Sans cette règle, une page écrite
 * à la main ne comptait que pour un seul bloc : ses sections tenaient dans un `div` d'enrobage
 * qui, seul, avait le corps du document pour parent. Toute la page se surlignait d'un bloc, et
 * plus rien n'était manipulable — ni les sections, ni les diaporamas qu'elles portent.
 *
 * Un bloc seul dans son parent, lui, ne se distingue pas de ce parent : la remontée le traverse,
 * pour éviter d'offrir « monter » et « descendre » là où il n'y a rien à dépasser.
 */
const getBlockFor = (editor: Editor, node: Node | null): Optional<HTMLElement> => {
  const body = editor.getBody();
  if (!Type.isNonNullable(node) || !Type.isNonNullable(body) || isUi(editor, node)) {
    return Optional.none();
  }

  const atom = BlockAtoms.enclosing(editor, node);
  if (atom.isSome()) {
    return atom;
  }

  let current: Node | null = node.nodeType === 1 ? node : node.parentNode;
  let outermost: Optional<HTMLElement> = Optional.none();
  let amongPeers: Optional<HTMLElement> = Optional.none();

  while (Type.isNonNullable(current) && current !== body) {
    if (isBlock(editor, current)) {
      const block = current as HTMLElement;
      outermost = Optional.some(block);
      if (isContainer(editor, current.parentNode)) {
        // Un bloc trouvé plus bas parmi ses semblables l'emporte : voir plus bas.
        return amongPeers.orThunk(() => outermost);
      }
      if (amongPeers.isNone() && hasBlockSiblings(editor, block)) {
        amongPeers = Optional.some(block);
      }
    }
    current = current.parentNode;
  }

  return amongPeers.orThunk(() => outermost);
};

const getParentBlock = (editor: Editor, element: HTMLElement): Optional<HTMLElement> =>
  getBlockFor(editor, element.parentNode);

const siblingBlocks = (editor: Editor, element: HTMLElement): HTMLElement[] => {
  const parent = element.parentNode;
  if (!Type.isNonNullable(parent)) {
    return [];
  }
  return Arr.filter(Arr.from(parent.childNodes), (node) => isBlock(editor, node)) as HTMLElement[];
};

const childBlocks = (editor: Editor, element: HTMLElement): HTMLElement[] =>
  Arr.filter(Arr.from(element.childNodes), (node) => isBlock(editor, node)) as HTMLElement[];

const previousBlock = (editor: Editor, element: HTMLElement): Optional<HTMLElement> => {
  const siblings = siblingBlocks(editor, element);
  const index = Arr.findIndex(siblings, (sibling) => sibling === element);
  return index.bind((i) => i > 0 ? Optional.some(siblings[i - 1]) : Optional.none<HTMLElement>());
};

const nextBlock = (editor: Editor, element: HTMLElement): Optional<HTMLElement> => {
  const siblings = siblingBlocks(editor, element);
  const index = Arr.findIndex(siblings, (sibling) => sibling === element);
  return index.bind((i) => i < siblings.length - 1 ? Optional.some(siblings[i + 1]) : Optional.none<HTMLElement>());
};

/**
 * Every block of the document, in document order. Used by the drag and drop to find drop targets.
 */
const listAll = (editor: Editor): HTMLElement[] => {
  const body = editor.getBody();
  if (!Type.isNonNullable(body)) {
    return [];
  }
  return Arr.filter(editor.dom.select('*', body), (element) => isBlock(editor, element)) as HTMLElement[];
};

const topLevelBlocks = (editor: Editor): HTMLElement[] => {
  const body = editor.getBody();
  if (!Type.isNonNullable(body)) {
    return [];
  }
  return Arr.filter(Arr.from(body.childNodes), (node) => isBlock(editor, node)) as HTMLElement[];
};

export {
  uiSelector,
  isUi,
  isBlock,
  isContainer,
  getBlockFor,
  getParentBlock,
  siblingBlocks,
  childBlocks,
  previousBlock,
  nextBlock,
  listAll,
  topLevelBlocks
};
