import { Arr, Type } from '@ephox/katamari';

/**
 * Recognition of the bootstrap column classes, shared by the block detection and by the grid
 * operations. A column is a structural element: it is never moved, duplicated or deleted as a
 * regular block, only resized or removed through the grid actions.
 */

const columnClassRegExp = /^col(?:-(?:xs|sm|md|lg|xl|xxl))?(?:-(\d{1,2}))?$/;

const columnClasses = (element: HTMLElement): string[] =>
  Arr.filter(element.className.split(/\s+/), (cls) => columnClassRegExp.test(cls));

const isColumnElement = (node: Node | null): node is HTMLElement =>
  Type.isNonNullable(node) && node.nodeType === 1 && columnClasses(node as HTMLElement).length > 0;

const widthOf = (element: HTMLElement, fallback: number): number => {
  const widths = Arr.bind(columnClasses(element), (cls) => {
    const matches = columnClassRegExp.exec(cls);
    return matches !== null && Type.isString(matches[1]) ? [ parseInt(matches[1], 10) ] : [];
  });
  return widths.length > 0 ? widths[0] : fallback;
};

export {
  columnClassRegExp,
  columnClasses,
  isColumnElement,
  widthOf
};
