import { Arr, Optional, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

import * as Options from '../api/Options';

/**
 * Detection of the elements that behave as blocks - the ones the block toolbar is attached to.
 *
 * An element is a block when it is displayed as `block`, `flex`, `grid`, `table` or `flow-root`,
 * is not part of the plugin ui and is not one of the structural elements excluded by
 * `onlc_blocks_exclude` (list items, table cells...).
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
  return !isUi(editor, elm) && !isExcluded(editor, elm) && isBlockDisplay(editor, elm);
};

/**
 * Walks up from the given node and returns the block the user is meant to manipulate: the
 * outermost element whose parent is a container (the root, a bootstrap row or column, a section...).
 */
const getBlockFor = (editor: Editor, node: Node | null): Optional<HTMLElement> => {
  const body = editor.getBody();
  if (!Type.isNonNullable(node) || !Type.isNonNullable(body) || isUi(editor, node)) {
    return Optional.none();
  }

  let current: Node | null = node.nodeType === 1 ? node : node.parentNode;
  let candidate: Optional<HTMLElement> = Optional.none();

  while (Type.isNonNullable(current) && current !== body) {
    if (isBlock(editor, current)) {
      candidate = Optional.some(current as HTMLElement);
      if (isContainer(editor, current.parentNode)) {
        return candidate;
      }
    }
    current = current.parentNode;
  }

  return candidate;
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
