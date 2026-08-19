import { Arr, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

import * as Options from '../../api/Options';
import { WidgetConfig, WidgetDefinition } from '../../api/Types';
import * as Cdn from '../Cdn';
import * as Embed from '../Embed';
import * as Html from '../Html';
import * as Preview from '../Preview';
import * as Common from './Common';

/**
 * Blocs média : image, vidéo, page intégrée, galerie et document pdf.
 *
 * Tous, sauf l'image, sont marqués `canonical` : leur code est reconstruit à partir de leur
 * configuration au moment de l'enregistrement. C'est indispensable, parce que dans l'éditeur ils
 * ne sont **pas** affichés sous leur forme définitive. Une iframe vivante dans la zone d'édition
 * capte les clics, se retrouve en bac à sable — d'où le fameux rectangle noir — et se superpose
 * aux blocs voisins ; à la place, `renderEditor` dessine une vignette inerte.
 */

export interface GalleryItem {
  readonly src: string;
  readonly title: string;
}

/** Cadre d'intégration proportionnel, utilisé par le code publié uniquement. */
const embedFrame = (src: string, ratio: string, title: string, extra: string): string =>
  `<div class="onlc-embed"${Html.style({ 'padding-bottom': ratio })}>` +
  `<iframe class="onlc-embed__frame"${Html.attr('src', src)}${Html.attr('title', title)}${extra} frameborder="0" loading="lazy" allowfullscreen></iframe></div>`;

const fixedFrame = (src: string, height: string, title: string, extra: string): string =>
  `<div class="onlc-embed onlc-embed--fixed">` +
  `<iframe class="onlc-embed__frame"${Html.attr('src', src)}${Html.attr('title', title)}${extra}` +
  `${Html.style({ height: Html.withUnit(height), width: '100%' })} frameborder="0" loading="lazy"></iframe></div>`;

/** Hauteur approchée d'une vignette pour un format donné, afin que l'aperçu ait la bonne allure. */
const previewHeight = (ratio: string): string => {
  const percent = Common.number(ratio.replace('%', ''), 56.25);
  return `${Math.round(Math.max(160, Math.min(420, 6.4 * percent)))}px`;
};

/* Image -------------------------------------------------------------------- */

const image: WidgetDefinition = {
  id: 'image',
  label: 'Image',
  description: 'Une image avec sa légende et un lien optionnel',
  category: 'Médias',
  icon: 'image',
  fields: [
    { name: 'src', label: 'Fichier', type: 'image' },
    { name: 'alt', label: 'Texte alternatif', type: 'text' },
    { name: 'caption', label: 'Légende', type: 'text' },
    { name: 'width', label: 'Largeur', type: 'text', half: true, placeholder: '100%' },
    { name: 'align', label: 'Alignement', type: 'select', items: Common.alignments, half: true },
    { name: 'url', label: 'Lien', type: 'url', tab: 'Lien' },
    { name: 'target', label: 'Ouvrir dans', type: 'select', items: Common.targets, tab: 'Lien' }
  ],
  defaults: { src: '', alt: '', caption: '', width: '100%', align: 'center', url: '', target: '' },
  render: (c) => {
    if (c.src === '') {
      return Common.missing('Choisissez une image');
    }
    const img = `<img${Html.attr('src', c.src)}${Html.attr('alt', c.alt)}${Html.style({ width: Html.withUnit(c.width, '%'), height: 'auto' })}>`;
    const linked = c.url === '' ? img : `<a${Common.linkAttributes(c.url, c.target, '')}>${img}</a>`;
    const caption = c.caption === '' ? '' : `<figcaption>${Html.escape(c.caption)}</figcaption>`;
    return `<figure class="onlc-widget__figure"${Html.style({ 'text-align': c.align })}>${linked}${caption}</figure>`;
  }
};

/* Vidéo -------------------------------------------------------------------- */

const video = (editor: Editor): WidgetDefinition => ({
  id: 'video',
  canonical: true,
  label: 'Vidéo',
  description: 'YouTube, Vimeo, Dailymotion ou toute autre adresse intégrable',
  category: 'Médias',
  icon: 'embed',
  fields: [
    { name: 'url', label: 'Adresse de la vidéo', type: 'url', placeholder: 'https://www.youtube.com/watch?v=…' },
    { name: 'title', label: 'Titre (accessibilité)', type: 'text' },
    { name: 'ratio', label: 'Format', type: 'select', items: Common.ratios, half: true },
    { name: 'autoplay', label: 'Lecture automatique', type: 'checkbox', half: true },
    { name: 'loop', label: 'Lecture en boucle', type: 'checkbox', half: true },
    { name: 'muted', label: 'Sans le son', type: 'checkbox', half: true }
  ],
  defaults: { url: '', title: 'Vidéo', ratio: Options.getVideoRatio(editor), autoplay: 'false', loop: 'false', muted: 'false' },
  render: (c) => Embed.videoUrl(c.url, {
    autoplay: Html.isTrue(c.autoplay),
    loop: Html.isTrue(c.loop),
    muted: Html.isTrue(c.muted)
  }).fold(
    () => Common.missing('Indiquez l’adresse de la vidéo'),
    (src) => embedFrame(src, c.ratio, c.title, ' allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"')
  ),
  renderEditor: (c) => c.url.trim() === ''
    ? Common.missing('Indiquez l’adresse de la vidéo')
    : Preview.card({
      kind: 'Vidéo',
      title: c.title.trim() === '' ? c.url : c.title,
      detail: c.url,
      height: previewHeight(c.ratio),
      poster: Embed.videoPoster(c.url).getOr(''),
      glyph: Preview.playGlyph
    })
});

/* Page intégrée ------------------------------------------------------------ */

const iframe: WidgetDefinition = {
  id: 'iframe',
  canonical: true,
  label: 'Page intégrée (iframe)',
  description: 'Affiche une autre page web à l’intérieur de la vôtre',
  category: 'Médias',
  icon: 'embed-page',
  fields: [
    { name: 'src', label: 'Adresse de la page', type: 'url' },
    { name: 'title', label: 'Titre (accessibilité)', type: 'text' },
    { name: 'mode', label: 'Dimension', type: 'select', half: true, items: [
      { text: 'Format proportionnel', value: 'ratio' },
      { text: 'Hauteur fixe', value: 'height' }
    ] },
    { name: 'ratio', label: 'Format', type: 'select', items: Common.ratios, half: true },
    { name: 'height', label: 'Hauteur', type: 'text', half: true, placeholder: '480px' },
    { name: 'scrolling', label: 'Défilement', type: 'checkbox', half: true }
  ],
  defaults: { src: '', title: '', mode: 'ratio', ratio: '56.25%', height: '480px', scrolling: 'true' },
  render: (c) => {
    if (c.src.trim() === '') {
      return Common.missing('Indiquez l’adresse de la page à intégrer');
    }
    const extra = Html.isTrue(c.scrolling) ? '' : ' scrolling="no"';
    return c.mode === 'height'
      ? fixedFrame(c.src, c.height, c.title, extra)
      : embedFrame(c.src, c.ratio, c.title, extra);
  },
  renderEditor: (c) => c.src.trim() === ''
    ? Common.missing('Indiquez l’adresse de la page à intégrer')
    : Preview.card({
      kind: 'Page intégrée',
      title: c.title.trim() === '' ? c.src : c.title,
      detail: c.src,
      height: c.mode === 'height' ? Html.withUnit(c.height) : previewHeight(c.ratio)
    })
};

/* Galerie ------------------------------------------------------------------ */

const galleryLayouts = [
  { text: 'Mosaïque carrée', value: 'square' },
  { text: 'Cascade (rangées justifiées)', value: 'cascade' },
  { text: 'Maçonnerie (colonnes)', value: 'masonry' }
];

/**
 * Les images sont conservées en json dans la configuration du bloc : une ligne par image, avec
 * son adresse et son intitulé, dans l'ordre choisi par le rédacteur.
 */
const readItems = (value: string | undefined): GalleryItem[] => {
  if (!Type.isString(value) || value.trim() === '') {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    if (!Type.isArray(parsed)) {
      return [];
    }
    return Arr.bind(parsed as unknown[], (entry) => {
      const item = entry as Partial<GalleryItem>;
      // Une adresse au schéma exécutable est écartée : elle finirait dans la configuration
      // javascript de la galerie, où elle n'aurait rien à faire.
      return Type.isString(item.src) && item.src.trim() !== '' && Html.isSafeUrl(item.src)
        ? [{ src: item.src.trim(), title: Type.isString(item.title) ? item.title : '' }]
        : [];
    });
  } catch (_err) {
    return [];
  }
};

const writeItems = (items: GalleryItem[]): string => JSON.stringify(items);

const galleryOptions = (c: WidgetConfig): Record<string, unknown> => {
  const gap = Common.integer(c.gap, 6, 0, 40);
  const size = Common.integer(c.size, 220, 80, 600);

  const shape: Record<string, unknown> = (() => {
    if (c.layout === 'cascade') {
      return { thumbnailHeight: size, thumbnailWidth: 'auto' };
    }
    if (c.layout === 'masonry') {
      return { thumbnailWidth: size, thumbnailHeight: 'auto' };
    }
    return { thumbnailWidth: size, thumbnailHeight: size };
  })();

  return {
    ...shape,
    thumbnailGutterWidth: gap,
    thumbnailGutterHeight: gap,
    thumbnailLabel: { display: Html.isTrue(c.showLabels), position: 'overImageOnBottom' },
    thumbnailHoverEffect2: 'imageScale150',
    viewerToolbar: { display: true },
    galleryDisplayMode: 'fullContent',
    locationHash: false
  };
};

const gallery = (editor: Editor): WidgetDefinition => ({
  id: 'gallery',
  canonical: true,
  label: 'Galerie d’images',
  description: 'Plusieurs photos présentées en mosaïque, avec agrandissement au clic',
  category: 'Médias',
  icon: 'gallery',
  assets: Cdn.nanogallery2(editor),
  fields: [
    { name: 'items', label: 'Images de la galerie', type: 'images' },
    { name: 'layout', label: 'Disposition', type: 'select', items: galleryLayouts, half: true },
    { name: 'size', label: 'Taille des vignettes (px)', type: 'number', half: true },
    { name: 'gap', label: 'Espace entre les vignettes (px)', type: 'number', half: true },
    { name: 'showLabels', label: 'Afficher les intitulés sur les vignettes', type: 'checkbox', half: true }
  ],
  defaults: { items: '[]', layout: 'square', size: '220', gap: '6', showLabels: 'true' },
  render: (c) => {
    const items = readItems(c.items);
    if (items.length === 0) {
      return Common.missing('Ajoutez au moins une image à la galerie');
    }

    const data = Arr.map(items, (item) => ({ src: item.src, srct: item.src, title: item.title }));
    const config = { ...galleryOptions(c), items: data };

    const script = `(function () {
  var element = document.currentScript && document.currentScript.previousElementSibling;
  if (!element || element.getAttribute('data-onlc-ready')) { return; }
  element.setAttribute('data-onlc-ready', '1');
  var options = ${Html.jsonForScript(config)};
  var start = function () {
    if (!window.jQuery || !window.jQuery.fn.nanogallery2) { return window.setTimeout(start, 150); }
    window.jQuery(element).nanogallery2(options);
  };
  start();
})();`;

    return `<div class="onlc-gallery"></div><script>${script}<\/script>`;
  },
  renderEditor: (c) => {
    const items = readItems(c.items);
    if (items.length === 0) {
      return Common.missing('Ajoutez au moins une image à la galerie');
    }
    const size = Common.integer(c.size, 220, 80, 600);
    const tiles = Arr.map(items.slice(0, 12), (item) =>
      `<span class="onlc-preview__thumb"${Html.style({
        'background-image': Html.cssUrl(item.src),
        width: `${Math.round(size / 2)}px`,
        height: `${Math.round(size / 2)}px`
      })}></span>`).join('');
    const layout = Arr.find(galleryLayouts, (entry) => entry.value === c.layout).map((entry) => entry.text).getOr('Mosaïque carrée');

    return Preview.card({
      kind: 'Galerie d’images',
      title: `${items.length} image${items.length > 1 ? 's' : ''}`,
      detail: layout,
      height: 'auto',
      body: `<span class="onlc-preview__grid">${tiles}</span>`,
      glyph: Preview.galleryGlyph
    });
  }
});

/* Document pdf ------------------------------------------------------------- */

const pdf = (editor: Editor): WidgetDefinition => ({
  id: 'pdf',
  canonical: true,
  label: 'Document PDF',
  description: 'Affiche un PDF directement dans la page, page après page',
  category: 'Médias',
  icon: 'document-properties',
  assets: Cdn.pdfjs(editor),
  fields: [
    { name: 'src', label: 'Fichier PDF', type: 'file', accept: 'application/pdf',
      placeholder: 'https://…/document.pdf',
      help: 'Choisissez un pdf dans votre médiathèque, ou donnez l’adresse d’un fichier hébergé ailleurs.' },
    { name: 'title', label: 'Titre affiché', type: 'text' },
    { name: 'height', label: 'Hauteur de la zone de lecture', type: 'text', half: true, placeholder: '720px' },
    { name: 'pages', label: 'Nombre de pages affichées (0 = toutes)', type: 'number', half: true },
    { name: 'download', label: 'Proposer le téléchargement du fichier', type: 'checkbox', half: true }
  ],
  defaults: { src: '', title: '', height: '720px', pages: '0', download: 'true' },
  render: (c) => {
    if (c.src.trim() === '' || !Html.isSafeUrl(c.src)) {
      return Common.missing('Choisissez le fichier PDF à afficher');
    }

    const settings = {
      url: c.src.trim(),
      worker: Cdn.pdfWorker(editor),
      limit: Common.integer(c.pages, 0, 0, 200)
    };

    const script = `(function () {
  var element = document.currentScript && document.currentScript.previousElementSibling;
  if (!element || element.getAttribute('data-onlc-ready')) { return; }
  element.setAttribute('data-onlc-ready', '1');
  var settings = ${Html.jsonForScript(settings)};
  var start = function () {
    var lib = window.pdfjsLib;
    if (!lib) { return window.setTimeout(start, 150); }
    lib.GlobalWorkerOptions.workerSrc = settings.worker;
    lib.getDocument(settings.url).promise.then(function (doc) {
      var total = settings.limit > 0 ? Math.min(settings.limit, doc.numPages) : doc.numPages;
      var draw = function (number) {
        if (number > total) { return; }
        doc.getPage(number).then(function (page) {
          var canvas = document.createElement('canvas');
          canvas.className = 'onlc-pdf__page';
          var width = element.clientWidth || 800;
          var base = page.getViewport({ scale: 1 });
          var viewport = page.getViewport({ scale: width / base.width });
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          element.appendChild(canvas);
          page.render({ canvasContext: canvas.getContext('2d'), viewport: viewport }).promise.then(function () {
            draw(number + 1);
          });
        });
      };
      draw(1);
    }).catch(function () {
      element.appendChild(document.createTextNode('Ce document n\\'a pas pu être affiché.'));
    });
  };
  start();
})();`;

    const heading = c.title.trim() === '' ? '' : `<p class="onlc-pdf__title">${Html.escape(c.title)}</p>`;
    const link = Html.isTrue(c.download)
      ? `<p class="onlc-pdf__download"><a${Html.attr('href', c.src)} target="_blank" rel="noopener">Télécharger le document</a></p>`
      : '';

    return heading +
      `<div class="onlc-pdf"${Html.style({ 'max-height': Html.withUnit(c.height) })}></div>` +
      `<script>${script}<\/script>` + link;
  },
  renderEditor: (c) => {
    if (c.src.trim() === '') {
      return Common.missing('Choisissez le fichier PDF à afficher');
    }
    const name = c.src.split(/[?#]/)[0].split('/').filter((part) => part !== '').pop() ?? c.src;
    return Preview.card({
      kind: 'Document PDF',
      title: c.title.trim() === '' ? name : c.title,
      detail: name,
      height: '260px',
      glyph: Preview.documentGlyph
    });
  }
});

const all = (editor: Editor): WidgetDefinition[] => [ image, video(editor), iframe, gallery(editor), pdf(editor) ];

export {
  embedFrame,
  fixedFrame,
  previewHeight,
  galleryLayouts,
  readItems,
  writeItems,
  image,
  video,
  iframe,
  gallery,
  pdf,
  all
};
