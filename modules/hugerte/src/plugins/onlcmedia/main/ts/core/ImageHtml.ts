import { Arr, Fun, Obj, Optional, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import * as TextStyle from 'hugerte/plugins/onlcshared/text/TextStyle';

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
  padding: '',
  textStyle: TextStyle.empty
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
  padding: overlay.padding,
  // Le dégradé et l'ombre sont écrits en dernier : ils remplacent la couleur simple
  ...TextStyle.toStyles(overlay.textStyle)
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

export const parallaxClass = 'onlc-image--parallax';

/**
 * L'effet parallaxe ne peut pas être obtenu avec l'image en flux : `position: fixed` sur un
 * `<img>` se retrouve piégé par le premier ancêtre qui crée un bloc conteneur, et l'image se
 * cale alors dans un coin du cadre au lieu de rester immobile pendant le défilement.
 *
 * Le rendu passe donc par le fond de la figure, avec `background-attachment: fixed`, seule
 * technique fiable dans tous les navigateurs de bureau. L'`<img>` reste présent, masqué
 * visuellement, pour que son texte alternatif continue d'être lu.
 */
const presetStyles = (data: ImageData): Record<string, string> =>
  data.preset === parallaxClass && data.src !== ''
    ? { 'background-image': `url(${editorSafeUrl(data.src)})` }
    : {};

/** Adresse débarrassée des caractères qui refermeraient la parenthèse d'un `url(...)`. */
const editorSafeUrl = (src: string): string =>
  src.trim().replace(/[\\"'()\s]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')}`);

const toHtml = (editor: Editor, data: ImageData): string => {
  const img = buildLink(editor, data, buildImg(editor, data));

  if (!needsFigure(data)) {
    return img;
  }

  const classes = Arr.filter([ figureClass, data.preset ], (cls) => cls !== '').join(' ');
  const extra = styleString(editor, presetStyles(data));
  const custom = data.customCss.trim().replace(/;\s*$/, '');
  const style = Arr.filter([ custom, extra ], (part) => part !== '').join('; ');
  return `<figure class="${classes}"${attribute('style', style)}>${img}${buildOverlay(editor, data.overlay)}</figure>`;
};

const readOverlay = (editor: Editor, figure: Optional<HTMLElement>): OverlayData =>
  figure.bind((elm) => Optional.from(editor.dom.select(`.${overlayClass}`, elm)[0]))
    .fold(Fun.constant(emptyOverlay), (caption) => {
      const position = Arr.foldl(caption.className.split(/\s+/), (acc, cls) =>
        cls.indexOf(`${overlayClass}--`) === 0 ? cls.substring(`${overlayClass}--`.length) : acc, 'middle-center');
      const styles = editor.dom.parseStyle(caption.getAttribute('style') ?? '');
      const textStyle = TextStyle.fromStyles(styles);

      return {
        text: caption.textContent ?? '',
        position,
        fontSize: editor.dom.getStyle(caption, 'font-size') || '',
        fontFamily: editor.dom.getStyle(caption, 'font-family') || '',
        color: textStyle.color,
        background: editor.dom.getStyle(caption, 'background-color') || '',
        margin: editor.dom.getStyle(caption, 'margin') || '',
        padding: editor.dom.getStyle(caption, 'padding') || '',
        textStyle
      };
    });

const presetOf = (editor: Editor, figure: Optional<HTMLElement>): string =>
  figure.fold(Fun.constant(''), (elm) => {
    const known = Arr.map(Options.getClassList(editor), (preset) => preset.value);
    return Arr.foldl(elm.className.split(/\s+/), (acc, cls) =>
      cls !== '' && cls !== figureClass && (Arr.contains(known, cls) || acc === '') ? cls : acc, '');
  });

/**
 * Css personnalisé de la figure. Le fond ajouté par le rendu parallaxe en est retiré : il est
 * recalculé à chaque écriture et n'a rien à faire dans le champ que le rédacteur remplit.
 */
const customCssOf = (editor: Editor, figure: Optional<HTMLElement>, preset: string): string =>
  figure.fold(Fun.constant(''), (elm) => {
    const raw = elm.getAttribute('style') ?? '';
    if (preset !== parallaxClass || raw === '') {
      return raw;
    }
    const styles = editor.dom.parseStyle(raw);
    delete styles['background-image'];
    return editor.dom.serializeStyle(styles);
  });

/**
 * Reads back the data of an existing image, whether it is a bare `<img>` or a full figure.
 */
const readFromImage = (editor: Editor, img: HTMLImageElement): ImageData => {
  const dom = editor.dom;
  const figure = Optional.from(dom.getParent(img, `figure.${figureClass}`) as HTMLElement | null);
  const anchor = Optional.from(dom.getParent(img, 'a[href]') as HTMLAnchorElement | null);
  const preset = presetOf(editor, figure);

  return {
    src: dom.getAttrib(img, 'src'),
    alt: dom.getAttrib(img, 'alt'),
    title: dom.getAttrib(img, 'title'),
    preset,
    width: dom.getStyle(img, 'width') || Options.getDefaultWidth(editor),
    customCss: customCssOf(editor, figure, preset),
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

/**
 * Image visée par les actions. Le curseur peut se trouver sur l'image, sur la figure, ou dans
 * le texte posé par-dessus : dans tous les cas, c'est l'image de cette figure qui est ouverte.
 */
const getSelectedImage = (editor: Editor): Optional<HTMLImageElement> => {
  const node = editor.selection.getNode();
  if (editor.dom.is<HTMLImageElement>(node, 'img')) {
    return Optional.some(node);
  }

  const figure = editor.dom.getParent(node, `figure.${figureClass}`);
  if (Type.isNonNullable(figure)) {
    return Optional.from(editor.dom.select<HTMLImageElement>('img', figure)[0]);
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
