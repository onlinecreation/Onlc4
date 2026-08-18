import { Arr, Fun, Obj, Optional, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

import * as Options from '../api/Options';
import { ImageData, OverlayData } from '../api/Types';

/**
 * Markup produced by the plugin:
 *
 * ```html
 * <figure class="onlc-image onlc-image--fullwidth" style="border-radius: 8px">
 *   <a href="/contact" target="_blank" rel="noopener">
 *     <img src="/media/photo.jpg" alt="…" title="…" style="width: 100%; height: auto;">
 *   </a>
 *   <figcaption class="onlc-image__overlay onlc-image__overlay--middle-center" style="…">Texte</figcaption>
 * </figure>
 * ```
 *
 * A plain `<img>` (optionally wrapped into a link) is produced when neither a preset, nor an
 * overlay, nor custom css is used, so that simple images stay simple.
 */

const figureClass = 'onlc-image';
const overlayClass = 'onlc-image__overlay';

const emptyOverlay: OverlayData = {
  text: '',
  position: 'middle-center',
  fontSize: '',
  fontFamily: '',
  color: '',
  background: '',
  margin: '',
  padding: ''
};

const emptyData = (editor: Editor): ImageData => ({
  src: '',
  alt: '',
  title: '',
  preset: '',
  width: Options.getDefaultWidth(editor),
  customCss: '',
  overlay: emptyOverlay,
  link: { href: '', title: '', target: '', rel: '', classes: '' }
});

const isFigure = (editor: Editor, node: Node | null): node is HTMLElement =>
  Type.isNonNullable(node) && editor.dom.is(node, `figure.${figureClass}`);

const needsFigure = (data: ImageData): boolean =>
  data.preset !== '' || data.customCss.trim() !== '' || data.overlay.text.trim() !== '';

const styleString = (editor: Editor, styles: Record<string, string>): string => {
  const cleaned: Record<string, string> = {};
  Obj.each(styles, (value, key) => {
    if (Type.isString(value) && value.trim() !== '') {
      cleaned[key] = value.trim();
    }
  });
  return editor.dom.serializeStyle(cleaned);
};

const overlayStyles = (editor: Editor, overlay: OverlayData): string => styleString(editor, {
  'font-size': overlay.fontSize,
  'font-family': overlay.fontFamily,
  color: overlay.color,
  'background-color': overlay.background,
  margin: overlay.margin,
  padding: overlay.padding
});

const attribute = (name: string, value: string): string =>
  value === '' ? '' : ` ${name}="${value.replace(/"/g, '&quot;')}"`;

const buildImg = (editor: Editor, data: ImageData): string => {
  const style = styleString(editor, { width: data.width, height: 'auto' });
  return '<img' +
    attribute('src', editor.dom.encode(data.src)) +
    attribute('alt', editor.dom.encode(data.alt)) +
    attribute('title', editor.dom.encode(data.title)) +
    attribute('style', style) +
    '>';
};

const buildLink = (editor: Editor, data: ImageData, inner: string): string => {
  if (data.link.href === '') {
    return inner;
  }
  return '<a' +
    attribute('href', editor.dom.encode(data.link.href)) +
    attribute('title', editor.dom.encode(data.link.title)) +
    attribute('target', data.link.target) +
    attribute('rel', data.link.rel) +
    attribute('class', data.link.classes) +
    `>${inner}</a>`;
};

const buildOverlay = (editor: Editor, overlay: OverlayData): string => {
  if (overlay.text.trim() === '') {
    return '';
  }
  const classes = `${overlayClass} ${overlayClass}--${overlay.position}`;
  return `<figcaption class="${classes}"${attribute('style', overlayStyles(editor, overlay))}>${editor.dom.encode(overlay.text)}</figcaption>`;
};

const toHtml = (editor: Editor, data: ImageData): string => {
  const img = buildLink(editor, data, buildImg(editor, data));

  if (!needsFigure(data)) {
    return img;
  }

  const classes = Arr.filter([ figureClass, data.preset ], (cls) => cls !== '').join(' ');
  const style = data.customCss.trim();
  return `<figure class="${classes}"${attribute('style', style)}>${img}${buildOverlay(editor, data.overlay)}</figure>`;
};

const readOverlay = (editor: Editor, figure: Optional<HTMLElement>): OverlayData =>
  figure.bind((elm) => Optional.from(editor.dom.select(`.${overlayClass}`, elm)[0]))
    .fold(Fun.constant(emptyOverlay), (caption) => {
      const position = Arr.foldl(caption.className.split(/\s+/), (acc, cls) =>
        cls.indexOf(`${overlayClass}--`) === 0 ? cls.substring(`${overlayClass}--`.length) : acc, 'middle-center');
      return {
        text: caption.textContent ?? '',
        position,
        fontSize: editor.dom.getStyle(caption, 'font-size') || '',
        fontFamily: editor.dom.getStyle(caption, 'font-family') || '',
        color: editor.dom.getStyle(caption, 'color') || '',
        background: editor.dom.getStyle(caption, 'background-color') || '',
        margin: editor.dom.getStyle(caption, 'margin') || '',
        padding: editor.dom.getStyle(caption, 'padding') || ''
      };
    });

const presetOf = (editor: Editor, figure: Optional<HTMLElement>): string =>
  figure.fold(Fun.constant(''), (elm) => {
    const known = Arr.map(Options.getClassList(editor), (preset) => preset.value);
    return Arr.foldl(elm.className.split(/\s+/), (acc, cls) =>
      cls !== '' && cls !== figureClass && (Arr.contains(known, cls) || acc === '') ? cls : acc, '');
  });

const customCssOf = (figure: Optional<HTMLElement>): string =>
  figure.fold(Fun.constant(''), (elm) => elm.getAttribute('style') ?? '');

/**
 * Reads back the data of an existing image, whether it is a bare `<img>` or a full figure.
 */
const readFromImage = (editor: Editor, img: HTMLImageElement): ImageData => {
  const dom = editor.dom;
  const figure = Optional.from(dom.getParent(img, `figure.${figureClass}`) as HTMLElement | null);
  const anchor = Optional.from(dom.getParent(img, 'a[href]') as HTMLAnchorElement | null);

  return {
    src: dom.getAttrib(img, 'src'),
    alt: dom.getAttrib(img, 'alt'),
    title: dom.getAttrib(img, 'title'),
    preset: presetOf(editor, figure),
    width: dom.getStyle(img, 'width') || Options.getDefaultWidth(editor),
    customCss: customCssOf(figure),
    overlay: readOverlay(editor, figure),
    link: anchor.fold(
      () => ({ href: '', title: '', target: '', rel: '', classes: '' }),
      (elm) => ({
        href: dom.getAttrib(elm, 'href'),
        title: dom.getAttrib(elm, 'title'),
        target: dom.getAttrib(elm, 'target'),
        rel: dom.getAttrib(elm, 'rel'),
        classes: dom.getAttrib(elm, 'class')
      })
    )
  };
};

const getSelectedImage = (editor: Editor): Optional<HTMLImageElement> => {
  const node = editor.selection.getNode();
  if (editor.dom.is<HTMLImageElement>(node, 'img')) {
    return Optional.some(node);
  }
  const inFigure = editor.dom.select<HTMLImageElement>('img', node)[0];
  return isFigure(editor, node) && Type.isNonNullable(inFigure) ? Optional.some(inFigure) : Optional.none();
};

/**
 * Replaces the selected image - or inserts a new one - with the markup described by `data`.
 */
const insertOrUpdate = (editor: Editor, data: ImageData): void => {
  const html = toHtml(editor, data);

  editor.undoManager.transact(() => {
    getSelectedImage(editor).fold(
      () => {
        editor.insertContent(html);
      },
      (img) => {
        const figure = editor.dom.getParent(img, `figure.${figureClass}`);
        const anchor = editor.dom.getParent(img, 'a[href]');
        const target = figure ?? anchor ?? img;
        editor.dom.setOuterHTML(target as HTMLElement, html);
      }
    );
  });

  editor.nodeChanged();
};

export {
  figureClass,
  overlayClass,
  emptyOverlay,
  emptyData,
  isFigure,
  toHtml,
  readFromImage,
  getSelectedImage,
  insertOrUpdate
};
