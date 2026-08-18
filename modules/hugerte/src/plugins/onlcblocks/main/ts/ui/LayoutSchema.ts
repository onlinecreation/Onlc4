import { Arr, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

import { GridLayout } from '../api/Options';

/**
 * Représentation visuelle d'une disposition de colonnes. Les dispositions sont choisies sur un
 * schéma - des rectangles proportionnels - et non sur une suite de nombres.
 */

const viewWidth = 104;
const viewHeight = 28;
const gap = 3;

const toSvg = (columns: number[], total: number): string => {
  const count = Math.max(1, columns.length);
  const usable = viewWidth - gap * (count - 1);
  const sum = Arr.foldl(columns, (acc, width) => acc + width, 0) || total;

  let offset = 0;
  const rects = Arr.map(columns, (width) => {
    const boxWidth = Math.max(6, Math.round((width / sum) * usable));
    const rect = `<rect x="${offset}" y="0" width="${boxWidth}" height="${viewHeight}" rx="3" ry="3" ` +
      'fill="currentColor" fill-opacity="0.28" stroke="currentColor" stroke-opacity="0.55"></rect>';
    offset += boxWidth + gap;
    return rect;
  }).join('');

  return `<svg class="onlc-layout-schema" viewBox="0 0 ${viewWidth} ${viewHeight}" width="${viewWidth}" height="${viewHeight}" ` +
    'xmlns="http://www.w3.org/2000/svg" focusable="false" aria-hidden="true">' + rects + '</svg>';
};

const forLayout = (layout: GridLayout, total: number): string => toSvg(layout.columns, total);

const styleId = 'onlc-layout-schema-styles';

/**
 * Les vignettes des collections font 24 x 24 px : les schémas ont besoin de plus de place.
 * La feuille est injectée une seule fois dans le document de l'interface.
 */
const ensureStyles = (editor: Editor): void => {
  const container = editor.getContainer();
  const doc = Type.isNonNullable(container) ? container.ownerDocument : document;

  if (doc.getElementById(styleId) !== null) {
    return;
  }

  const style = doc.createElement('style');
  style.id = styleId;
  style.textContent =
    `.tox .tox-collection__item:has(.onlc-layout-schema) { flex-direction: column; gap: 6px; padding: 10px 12px; }` +
    `.tox .tox-collection__item-icon:has(.onlc-layout-schema) { width: auto; height: auto; }` +
    `.tox .onlc-layout-schema { width: ${viewWidth}px; height: ${viewHeight}px; color: #006ce7; }`;
  doc.head.appendChild(style);
};

const valueOf = (layout: GridLayout): string => layout.columns.join('-');

export {
  toSvg,
  forLayout,
  ensureStyles,
  valueOf
};
