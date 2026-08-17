import { Optional, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

import * as Options from '../api/Options';

const pxOrNumberRegExp = /^\s*(-?[\d.]+)\s*(px)?\s*$/i;
const percentRegExp = /^\s*(-?[\d.]+)\s*%\s*$/;

/**
 * Parses a css or attribute value that represents a pixel length, for example `120`, `120px` or ` 120 px `.
 * Percentage values and other units (em, vw...) are intentionally not handled, they are already responsive.
 */
const parsePixels = (value: string | number | null | undefined): Optional<number> => {
  if (Type.isNumber(value)) {
    return Optional.some(value);
  } else if (Type.isString(value)) {
    const matches = pxOrNumberRegExp.exec(value);
    return matches === null ? Optional.none<number>() : Optional.some(parseFloat(matches[1]));
  } else {
    return Optional.none();
  }
};

const isPercentage = (value: string | null | undefined): boolean =>
  Type.isString(value) && percentRegExp.test(value);

const round = (value: number, precision: number): number => {
  const factor = Math.pow(10, Math.max(0, precision));
  return Math.round(value * factor) / factor;
};

/**
 * Converts a pixel width into a percentage of the given container width, clamped to the
 * `onlc_responsive_images_max_percent` option.
 */
const toPercentString = (editor: Editor, pixels: number, containerWidth: number): string => {
  const maxPercent = Options.getMaxPercent(editor);
  const precision = Options.getPrecision(editor);
  const raw = containerWidth > 0 ? (pixels / containerWidth) * 100 : maxPercent;
  const clamped = Math.min(maxPercent, Math.max(1, raw));
  return round(clamped, precision) + '%';
};

/**
 * Width used as the 100% reference. Either the configured width or the width available
 * in the editable area for the given element.
 */
const getReferenceWidth = (editor: Editor, element?: HTMLElement | null): number => {
  const configured = Options.getContainerWidth(editor);
  if (Type.isNumber(configured)) {
    return configured;
  }

  const parent = Type.isNonNullable(element) ? element.parentElement : null;
  const parentWidth = Type.isNonNullable(parent) ? parent.clientWidth : 0;
  if (parentWidth > 0) {
    return parentWidth;
  }

  const body = editor.getBody();
  return Type.isNonNullable(body) && body.clientWidth > 0 ? body.clientWidth : 0;
};

export {
  parsePixels,
  isPercentage,
  round,
  toPercentString,
  getReferenceWidth
};
