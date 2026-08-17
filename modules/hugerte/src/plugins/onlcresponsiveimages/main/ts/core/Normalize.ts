import { Arr, Optional, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

import * as Options from '../api/Options';
import * as Sizing from './Sizing';

/**
 * Reads the width an image is currently displayed at, in pixels.
 * Attributes come first because that is what the core writes when resizing an unstyled image.
 */
const getPixelWidth = (editor: Editor, elm: HTMLElement): Optional<number> => {
  const attrWidth = Sizing.parsePixels(editor.dom.getAttrib(elm, 'width'));
  return attrWidth.orThunk(
    () => Sizing.parsePixels(editor.dom.getStyle(elm, 'width'))
  ).orThunk(
    () => elm.clientWidth > 0 ? Optional.some(elm.clientWidth) : Optional.none<number>()
  );
};

const needsNormalizing = (editor: Editor, elm: HTMLElement): boolean => {
  const dom = editor.dom;
  const hasDimensionAttribute = dom.getAttrib(elm, 'width') !== '' || dom.getAttrib(elm, 'height') !== '';
  const styleWidth = dom.getStyle(elm, 'width');
  const styleHeight = dom.getStyle(elm, 'height');
  const hasPixelStyle = Sizing.parsePixels(styleWidth).isSome() || Sizing.parsePixels(styleHeight).isSome();
  const missingAutoHeight = Options.isHeightAuto(editor) && Sizing.isPercentage(styleWidth) && styleHeight !== '' && styleHeight !== 'auto';
  return hasDimensionAttribute || hasPixelStyle || missingAutoHeight;
};

/**
 * Turns a single image into a responsive one: no `width`/`height` attributes, a percentage
 * width and an automatic height.
 */
const normalizeElement = (editor: Editor, elm: HTMLElement): void => {
  const dom = editor.dom;
  const styleWidth = dom.getStyle(elm, 'width');

  if (!Sizing.isPercentage(styleWidth)) {
    getPixelWidth(editor, elm).each((pixels) => {
      const reference = Sizing.getReferenceWidth(editor, elm);
      dom.setStyle(elm, 'width', Sizing.toPercentString(editor, pixels, reference));
    });
  }

  if (Options.isHeightAuto(editor)) {
    dom.setStyle(elm, 'height', 'auto');
  } else {
    dom.setStyle(elm, 'height', '');
  }

  dom.setAttrib(elm, 'width', null);
  dom.setAttrib(elm, 'height', null);
};

const normalizeElements = (editor: Editor, elements: HTMLElement[]): void => {
  Arr.each(elements, (elm) => {
    if (needsNormalizing(editor, elm)) {
      normalizeElement(editor, elm);
    }
  });
};

/**
 * Normalizes every image of the editable area. Called after content is set, pasted or resized.
 */
const normalizeAll = (editor: Editor): void => {
  const body = editor.getBody();
  if (!Type.isNonNullable(body)) {
    return;
  }
  normalizeElements(editor, editor.dom.select(Options.getElementNames(editor), body) as HTMLElement[]);
};

export {
  getPixelWidth,
  needsNormalizing,
  normalizeElement,
  normalizeElements,
  normalizeAll
};
