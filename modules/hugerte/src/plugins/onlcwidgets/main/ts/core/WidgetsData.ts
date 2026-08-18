import Editor from 'hugerte/core/api/Editor';
import * as TextStyle from 'hugerte/plugins/onlcshared/text/TextStyle';

import * as Options from '../api/Options';
import { WidgetConfig, WidgetDefinition, WidgetField, WidgetFieldItem } from '../api/Types';
import * as Embed from './Embed';
import * as Html from './Html';

/**
 * The predefined blocks shipped with the plugin. `getBuiltIns` binds them to an editor so that
 * the renderers can read the options - video ratio, map provider and so on.
 */

const targets: WidgetFieldItem[] = [
  { text: 'Même onglet', value: '' },
  { text: 'Nouvel onglet', value: '_blank' }
];

const rels: WidgetFieldItem[] = [
  { text: 'Aucune', value: '' },
  { text: 'nofollow', value: 'nofollow' },
  { text: 'noopener', value: 'noopener' },
  { text: 'noopener noreferrer', value: 'noopener noreferrer' },
  { text: 'sponsored', value: 'sponsored' },
  { text: 'ugc', value: 'ugc' }
];

const alignments: WidgetFieldItem[] = [
  { text: 'Gauche', value: 'left' },
  { text: 'Centré', value: 'center' },
  { text: 'Droite', value: 'right' }
];

const ratios: WidgetFieldItem[] = [
  { text: '16:9 (paysage)', value: '56.25%' },
  { text: '4:3', value: '75%' },
  { text: '1:1 (carré)', value: '100%' },
  { text: '21:9 (cinéma)', value: '42.85%' },
  { text: '9:16 (vertical)', value: '177.77%' }
];

const textStyleTab = 'Style du texte';

/**
 * Réglages de couleur, de dégradé et d'ombre proposés par les blocs qui contiennent du texte.
 * Ils sont identiques à ceux du texte posé sur une image, dans `onlcmedia`.
 */
const textStyleFields: WidgetField[] = [
  { name: 'color', label: 'Couleur du texte', type: 'color', tab: textStyleTab, half: true },
  { name: 'gradientFrom', label: 'Dégradé : couleur de départ', type: 'color', tab: textStyleTab, half: true },
  { name: 'gradientTo', label: 'Dégradé : couleur d’arrivée', type: 'color', tab: textStyleTab, half: true },
  { name: 'gradientAngle', label: 'Dégradé : angle (°)', type: 'number', tab: textStyleTab, half: true },
  { name: 'shadowX', label: 'Ombre : décalage horizontal', type: 'number', tab: textStyleTab, half: true },
  { name: 'shadowY', label: 'Ombre : décalage vertical', type: 'number', tab: textStyleTab, half: true },
  { name: 'shadowBlur', label: 'Ombre : flou', type: 'number', tab: textStyleTab, half: true },
  { name: 'shadowColor', label: 'Ombre : couleur', type: 'color', tab: textStyleTab, half: true }
];

const textStyleDefaults: WidgetConfig = {
  color: '',
  gradientFrom: '',
  gradientTo: '',
  gradientAngle: '90',
  shadowX: '',
  shadowY: '',
  shadowBlur: '',
  shadowColor: ''
};

const textStyleOf = (c: WidgetConfig): Record<string, string> => TextStyle.toStyles({
  color: c.color ?? '',
  gradientFrom: c.gradientFrom ?? '',
  gradientTo: c.gradientTo ?? '',
  gradientAngle: c.gradientAngle ?? '90',
  shadowX: c.shadowX ?? '',
  shadowY: c.shadowY ?? '',
  shadowBlur: c.shadowBlur ?? '',
  shadowColor: c.shadowColor ?? ''
});

const linkAttributes = (url: string, target: string, rel: string): string => {
  const safeRel = rel === '' && target === '_blank' ? 'noopener' : rel;
  return Html.attr('href', url === '' ? '#' : url) + Html.attr('target', target) + Html.attr('rel', safeRel);
};

const variantClass = (style: string): string => {
  if (style === 'outline') {
    return 'btn-outline-primary';
  }
  return style === 'link' ? 'btn-link' : `btn-${style}`;
};

const buttonClasses = (style: string, size: string, fullWidth: boolean): string => {
  const variant = variantClass(style);
  const scale = size === 'md' ? '' : `btn-${size}`;
  return Html.classes('onlc-btn', 'btn', variant, scale, fullWidth ? 'w-100' : '');
};

const embedFrame = (src: string, ratio: string, title: string, extra: string): string =>
  `<div class="onlc-widget__static onlc-embed"${Html.style({ 'padding-bottom': ratio })}>` +
  `<iframe class="onlc-embed__frame"${Html.attr('src', src)}${Html.attr('title', title)}${extra} frameborder="0" loading="lazy" allowfullscreen></iframe></div>`;

const missing = (message: string): string =>
  `<div class="onlc-widget__static onlc-widget__empty">${Html.escape(message)}</div>`;

const getBuiltIns = (editor: Editor): WidgetDefinition[] => [
  {
    id: 'cta',
    label: 'Bouton d’appel à l’action',
    description: 'Un bouton qui met en avant l’action principale',
    category: 'Actions',
    icon: 'link',
    fields: [
      { name: 'label', label: 'Texte du bouton', type: 'text' },
      { name: 'url', label: 'Lien', type: 'url' },
      { name: 'target', label: 'Ouvrir dans', type: 'select', items: targets, half: true },
      { name: 'rel', label: 'Relation (rel)', type: 'select', items: rels, half: true },
      { name: 'variant', label: 'Style', type: 'select', half: true, items: [
        { text: 'Principal', value: 'primary' },
        { text: 'Secondaire', value: 'secondary' },
        { text: 'Contour', value: 'outline' },
        { text: 'Lien', value: 'link' }
      ] },
      { name: 'size', label: 'Taille', type: 'select', half: true, items: [
        { text: 'Petite', value: 'sm' },
        { text: 'Normale', value: 'md' },
        { text: 'Grande', value: 'lg' }
      ] },
      { name: 'align', label: 'Alignement', type: 'select', items: alignments, half: true },
      { name: 'fullWidth', label: 'Pleine largeur', type: 'checkbox', half: true }
    ],
    defaults: { label: 'En savoir plus', url: '', target: '', rel: '', variant: 'primary', size: 'md', align: 'center', fullWidth: 'false' },
    render: (c) =>
      `<div class="onlc-widget__inner"${Html.style({ 'text-align': c.align })}>` +
      `<a${buttonClasses(c.variant, c.size, Html.isTrue(c.fullWidth))}${linkAttributes(c.url, c.target, c.rel)}>${Html.escape(c.label)}</a>` +
      `</div>`
  },
  {
    id: 'hero',
    label: 'Hero',
    description: 'Bandeau d’introduction avec titre, texte et bouton',
    category: 'Mise en avant',
    icon: 'gallery',
    hasSlots: true,
    fields: [
      { name: 'title', label: 'Titre', type: 'text' },
      { name: 'subtitle', label: 'Sous-titre', type: 'textarea' },
      { name: 'image', label: 'Image de fond', type: 'image' },
      { name: 'height', label: 'Hauteur', type: 'text', half: true, placeholder: '420px' },
      { name: 'overlay', label: 'Voile sombre (0 à 100)', type: 'number', half: true },
      { name: 'align', label: 'Alignement', type: 'select', items: alignments, half: true },
      { name: 'buttonLabel', label: 'Texte du bouton', type: 'text', tab: 'Bouton' },
      { name: 'buttonUrl', label: 'Lien du bouton', type: 'url', tab: 'Bouton' },
      { name: 'buttonTarget', label: 'Ouvrir dans', type: 'select', items: targets, tab: 'Bouton' }
    ].concat(textStyleFields as never[]) as WidgetField[],
    defaults: {
      title: 'Un titre accrocheur',
      subtitle: 'Décrivez votre offre en une phrase.',
      image: '',
      height: '420px',
      overlay: '35',
      align: 'center',
      buttonLabel: '',
      buttonUrl: '',
      buttonTarget: '',
      ...textStyleDefaults,
      color: '#ffffff'
    },
    render: (c) => {
      const overlay = Math.min(100, Math.max(0, parseInt(c.overlay, 10) || 0)) / 100;
      const button = c.buttonLabel.trim() === ''
        ? ''
        : `<a${buttonClasses('primary', 'lg', false)}${linkAttributes(c.buttonUrl, c.buttonTarget, '')}>${Html.escape(c.buttonLabel)}</a>`;
      return `<section class="onlc-hero"${Html.style({
        'min-height': Html.withUnit(c.height),
        'background-image': c.image === '' ? '' : `url(${c.image})`,
        'text-align': c.align
      })}>` +
        `<div class="onlc-hero__overlay onlc-widget__static"${Html.style({ 'background-color': `rgba(0, 0, 0, ${overlay})` })}></div>` +
        `<div class="onlc-hero__content"${Html.style(textStyleOf(c))}>` +
        `<h2 class="onlc-hero__title" data-onlc-slot="title">${Html.escape(c.title)}</h2>` +
        `<div class="onlc-hero__subtitle" data-onlc-slot="subtitle">${Html.paragraphs(c.subtitle)}</div>` +
        button +
        `</div></section>`;
    }
  },
  {
    id: 'text',
    label: 'Bloc de texte',
    description: 'Un titre et un texte éditables directement dans la page',
    category: 'Contenu',
    icon: 'paragraph',
    hasSlots: true,
    fields: ([
      { name: 'title', label: 'Titre', type: 'text' },
      { name: 'content', label: 'Texte', type: 'textarea' },
      { name: 'align', label: 'Alignement', type: 'select', items: alignments, half: true },
      { name: 'width', label: 'Largeur maximale', type: 'text', half: true, placeholder: '720px' }
    ] as WidgetField[]).concat(textStyleFields),
    defaults: { title: '', content: 'Votre texte…', align: 'left', width: '', ...textStyleDefaults },
    render: (c) =>
      `<div class="onlc-widget__inner"${Html.style({
        'text-align': c.align,
        'max-width': Html.withUnit(c.width),
        margin: c.width === '' ? '' : '0 auto',
        ...textStyleOf(c)
      })}>` +
      (c.title.trim() === '' ? '' : `<h3 data-onlc-slot="title">${Html.escape(c.title)}</h3>`) +
      `<div data-onlc-slot="content">${Html.paragraphs(c.content)}</div>` +
      `</div>`
  },
  {
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
      { name: 'align', label: 'Alignement', type: 'select', items: alignments, half: true },
      { name: 'url', label: 'Lien', type: 'url', tab: 'Lien' },
      { name: 'target', label: 'Ouvrir dans', type: 'select', items: targets, tab: 'Lien' }
    ],
    defaults: { src: '', alt: '', caption: '', width: '100%', align: 'center', url: '', target: '' },
    render: (c) => {
      if (c.src === '') {
        return missing('Choisissez une image');
      }
      const img = `<img${Html.attr('src', c.src)}${Html.attr('alt', c.alt)}${Html.style({ width: Html.withUnit(c.width, '%'), height: 'auto' })}>`;
      const linked = c.url === '' ? img : `<a${linkAttributes(c.url, c.target, '')}>${img}</a>`;
      const caption = c.caption === '' ? '' : `<figcaption>${Html.escape(c.caption)}</figcaption>`;
      return `<figure class="onlc-widget__figure"${Html.style({ 'text-align': c.align })}>${linked}${caption}</figure>`;
    }
  },
  {
    id: 'video',
    label: 'Vidéo',
    description: 'YouTube, Vimeo, Dailymotion ou toute autre url intégrable',
    category: 'Médias',
    icon: 'embed',
    fields: [
      { name: 'url', label: 'Adresse de la vidéo', type: 'url', placeholder: 'https://www.youtube.com/watch?v=…' },
      { name: 'title', label: 'Titre (accessibilité)', type: 'text' },
      { name: 'ratio', label: 'Format', type: 'select', items: ratios, half: true },
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
      () => missing('Indiquez l’adresse de la vidéo'),
      (src) => embedFrame(src, c.ratio, c.title, ' allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"')
    )
  },
  {
    id: 'iframe',
    label: 'Iframe',
    description: 'Intègre une page externe',
    category: 'Médias',
    icon: 'embed-page',
    fields: [
      { name: 'src', label: 'Adresse de la page', type: 'url' },
      { name: 'title', label: 'Titre (accessibilité)', type: 'text' },
      { name: 'mode', label: 'Dimension', type: 'select', half: true, items: [
        { text: 'Format proportionnel', value: 'ratio' },
        { text: 'Hauteur fixe', value: 'height' }
      ] },
      { name: 'ratio', label: 'Format', type: 'select', items: ratios, half: true },
      { name: 'height', label: 'Hauteur', type: 'text', half: true, placeholder: '480px' },
      { name: 'scrolling', label: 'Défilement', type: 'checkbox', half: true }
    ],
    defaults: { src: '', title: '', mode: 'ratio', ratio: '56.25%', height: '480px', scrolling: 'true' },
    render: (c) => {
      if (c.src.trim() === '') {
        return missing('Indiquez l’adresse de la page à intégrer');
      }
      const extra = Html.isTrue(c.scrolling) ? '' : ' scrolling="no"';
      return c.mode === 'height'
        ? `<div class="onlc-widget__static onlc-embed onlc-embed--fixed">` +
          `<iframe class="onlc-embed__frame"${Html.attr('src', c.src)}${Html.attr('title', c.title)}${extra}` +
          `${Html.style({ height: Html.withUnit(c.height), width: '100%' })} frameborder="0" loading="lazy"></iframe></div>`
        : embedFrame(c.src, c.ratio, c.title, extra);
    }
  },
  {
    id: 'html',
    label: 'Widget HTML',
    description: 'Colle un code d’intégration fourni par un service tiers',
    category: 'Avancé',
    icon: 'sourcecode',
    fields: [
      { name: 'code', label: 'Code HTML', type: 'code', language: 'html' },
      { name: 'title', label: 'Nom du widget', type: 'text' }
    ],
    defaults: { code: '', title: 'Widget HTML' },
    render: (c) =>
      `<div class="onlc-widget__static onlc-widget__html">` +
      `<div class="onlc-widget__html-name">${Html.escape(c.title === '' ? 'Widget HTML' : c.title)}</div>` +
      `<pre class="onlc-widget__html-code">${Html.escape(c.code.substring(0, 400))}</pre></div>`
  },
  {
    id: 'map',
    label: 'Carte',
    description: 'Une carte centrée sur une adresse ou des coordonnées',
    category: 'Médias',
    icon: 'home',
    fields: [
      { name: 'place', label: 'Adresse ou coordonnées', type: 'text', placeholder: '10 rue de la Paix, Paris' },
      { name: 'zoom', label: 'Zoom', type: 'number', half: true },
      { name: 'height', label: 'Hauteur', type: 'text', half: true, placeholder: '360px' },
      { name: 'title', label: 'Titre (accessibilité)', type: 'text' }
    ],
    defaults: { place: '', zoom: '14', height: '360px', title: 'Carte' },
    render: (c) => Embed.mapUrl(c.place, c.zoom, Options.getMapProvider(editor), Options.getGoogleMapsKey(editor)).fold(
      () => missing('Indiquez une adresse ou des coordonnées'),
      (src) =>
        `<div class="onlc-widget__static onlc-embed onlc-embed--fixed">` +
        `<iframe class="onlc-embed__frame"${Html.attr('src', src)}${Html.attr('title', c.title)}` +
        `${Html.style({ height: Html.withUnit(c.height), width: '100%' })} frameborder="0" loading="lazy"></iframe></div>`
    )
  },
  {
    id: 'calendar',
    label: 'Calendrier',
    description: 'Un calendrier partagé (Google Agenda ou autre)',
    category: 'Médias',
    icon: 'insert-time',
    fields: [
      { name: 'url', label: 'Adresse du calendrier', type: 'url' },
      { name: 'mode', label: 'Affichage', type: 'select', half: true, items: [
        { text: 'Mois', value: 'month' },
        { text: 'Semaine', value: 'week' },
        { text: 'Planning', value: 'agenda' }
      ] },
      { name: 'height', label: 'Hauteur', type: 'text', half: true, placeholder: '600px' },
      { name: 'title', label: 'Titre (accessibilité)', type: 'text' }
    ],
    defaults: { url: '', mode: 'month', height: '600px', title: 'Calendrier' },
    render: (c) => Embed.calendarUrl(c.url, c.mode).fold(
      () => c.url.trim() === ''
        ? missing('Indiquez l’adresse du calendrier')
        : `<p class="onlc-widget__inner"><a${linkAttributes(c.url, '_blank', 'noopener')}>${Html.escape(c.title || 'Ouvrir le calendrier')}</a></p>`,
      (src) =>
        `<div class="onlc-widget__static onlc-embed onlc-embed--fixed">` +
        `<iframe class="onlc-embed__frame"${Html.attr('src', src)}${Html.attr('title', c.title)}` +
        `${Html.style({ height: Html.withUnit(c.height), width: '100%' })} frameborder="0" loading="lazy"></iframe></div>`
    )
  },
  {
    id: 'separator',
    label: 'Séparateur',
    description: 'Un espace vertical ou un filet de séparation',
    category: 'Contenu',
    icon: 'horizontal-rule',
    fields: [
      { name: 'height', label: 'Hauteur', type: 'text', half: true, placeholder: '30px' },
      { name: 'variant', label: 'Type', type: 'select', half: true, items: [
        { text: 'Espace', value: 'space' },
        { text: 'Filet', value: 'line' }
      ] },
      { name: 'color', label: 'Couleur du filet', type: 'color', half: true },
      { name: 'width', label: 'Largeur du filet', type: 'text', half: true, placeholder: '100%' }
    ],
    defaults: { height: '30px', variant: 'space', color: '#dddddd', width: '100%' },
    render: (c) => c.variant === 'line'
      ? `<hr class="onlc-widget__rule"${Html.style({
        'margin-top': Html.withUnit(c.height),
        'margin-bottom': Html.withUnit(c.height),
        width: Html.withUnit(c.width, '%'),
        'border-top-color': c.color
      })}>`
      : `<div class="onlc-spacer"${Html.attr('data-onlc-spacer', Html.withUnit(c.height))}${Html.style({ height: Html.withUnit(c.height) })} aria-hidden="true"></div>`
  },
  {
    id: 'quote',
    label: 'Citation',
    description: 'Une citation mise en avant avec son auteur',
    category: 'Contenu',
    icon: 'quote',
    hasSlots: true,
    fields: [
      { name: 'text', label: 'Citation', type: 'textarea' },
      { name: 'author', label: 'Auteur', type: 'text', half: true },
      { name: 'source', label: 'Source (lien)', type: 'url', half: true }
    ],
    defaults: { text: 'Une phrase qui marque les esprits.', author: '', source: '' },
    render: (c) => {
      const author = c.author === '' ? '' : `<figcaption class="onlc-quote__author">${Html.escape(c.author)}</figcaption>`;
      const source = c.source === '' ? '' : `<figcaption class="onlc-quote__source"><a${linkAttributes(c.source, '_blank', 'noopener')}>${Html.escape(c.source)}</a></figcaption>`;
      return `<figure class="onlc-quote"><blockquote data-onlc-slot="text">${Html.paragraphs(c.text)}</blockquote>${author}${source}</figure>`;
    }
  }
];

export {
  targets,
  rels,
  alignments,
  ratios,
  getBuiltIns
};
