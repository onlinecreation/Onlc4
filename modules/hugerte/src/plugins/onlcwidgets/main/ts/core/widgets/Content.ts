import { WidgetDefinition, WidgetField } from '../../api/Types';
import * as Html from '../Html';
import * as Common from './Common';

/**
 * Blocs de contenu : ceux dont le rédacteur écrit lui-même le texte. Ils n'ont besoin d'aucune
 * dépendance et s'affichent dans l'éditeur exactement comme sur la page publiée.
 */

const cta: WidgetDefinition = {
  id: 'cta',
  label: 'Bouton d’appel à l’action',
  description: 'Un bouton qui met en avant l’action principale',
  category: 'Actions',
  icon: 'link',
  fields: [
    { name: 'label', label: 'Texte du bouton', type: 'text' },
    { name: 'url', label: 'Lien', type: 'url' },
    { name: 'target', label: 'Ouvrir dans', type: 'select', items: Common.targets, half: true },
    { name: 'rel', label: 'Relation (rel)', type: 'select', items: Common.rels, half: true },
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
    { name: 'align', label: 'Alignement', type: 'select', items: Common.alignments, half: true },
    { name: 'fullWidth', label: 'Pleine largeur', type: 'checkbox', half: true }
  ],
  defaults: { label: 'En savoir plus', url: '', target: '', rel: '', variant: 'primary', size: 'md', align: 'center', fullWidth: 'false' },
  render: (c) =>
    `<div class="onlc-widget__inner"${Html.style({ 'text-align': c.align })}>` +
    `<a${Common.buttonClasses(c.variant, c.size, Html.isTrue(c.fullWidth))}${Common.linkAttributes(c.url, c.target, c.rel)}>${Html.escape(c.label)}</a>` +
    `</div>`
};

const hero: WidgetDefinition = {
  id: 'hero',
  label: 'Hero',
  description: 'Bandeau d’introduction avec titre, texte et bouton',
  category: 'Mise en avant',
  icon: 'gallery',
  hasSlots: true,
  fields: ([
    { name: 'title', label: 'Titre', type: 'text' },
    { name: 'subtitle', label: 'Sous-titre', type: 'textarea' },
    { name: 'image', label: 'Image de fond', type: 'image' },
    { name: 'height', label: 'Hauteur', type: 'text', half: true, placeholder: '420px' },
    { name: 'overlay', label: 'Voile sombre (0 à 100)', type: 'number', half: true },
    { name: 'align', label: 'Alignement', type: 'select', items: Common.alignments, half: true },
    { name: 'buttonLabel', label: 'Texte du bouton', type: 'text', tab: 'Bouton' },
    { name: 'buttonUrl', label: 'Lien du bouton', type: 'url', tab: 'Bouton' },
    { name: 'buttonTarget', label: 'Ouvrir dans', type: 'select', items: Common.targets, tab: 'Bouton' }
  ] as WidgetField[]).concat(Common.textStyleFields),
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
    ...Common.textStyleDefaults,
    color: '#ffffff'
  },
  render: (c) => {
    const overlay = Common.integer(c.overlay, 0, 0, 100) / 100;
    const button = c.buttonLabel.trim() === ''
      ? ''
      : `<a${Common.buttonClasses('primary', 'lg', false)}${Common.linkAttributes(c.buttonUrl, c.buttonTarget, '')}>${Html.escape(c.buttonLabel)}</a>`;
    return `<section class="onlc-hero"${Html.style({
      'min-height': Html.withUnit(c.height),
      'background-image': Html.cssUrl(c.image),
      'text-align': c.align
    })}>` +
      `<div class="onlc-hero__overlay onlc-widget__static"${Html.style({ 'background-color': `rgba(0, 0, 0, ${overlay})` })}></div>` +
      `<div class="onlc-hero__content"${Html.style(Common.textStyleOf(c))}>` +
      `<h2 class="onlc-hero__title" data-onlc-slot="title">${Html.escape(c.title)}</h2>` +
      `<div class="onlc-hero__subtitle" data-onlc-slot="subtitle">${Html.paragraphs(c.subtitle)}</div>` +
      button +
      `</div></section>`;
  }
};

const text: WidgetDefinition = {
  id: 'text',
  label: 'Bloc de texte',
  description: 'Un titre et un texte éditables directement dans la page',
  category: 'Contenu',
  icon: 'paragraph',
  hasSlots: true,
  fields: ([
    { name: 'title', label: 'Titre', type: 'text' },
    { name: 'content', label: 'Texte', type: 'textarea' },
    { name: 'align', label: 'Alignement', type: 'select', items: Common.alignments, half: true },
    { name: 'width', label: 'Largeur maximale', type: 'text', half: true, placeholder: '720px' }
  ] as WidgetField[]).concat(Common.textStyleFields),
  defaults: { title: '', content: 'Votre texte…', align: 'left', width: '', ...Common.textStyleDefaults },
  render: (c) =>
    `<div class="onlc-widget__inner"${Html.style({
      'text-align': c.align,
      'max-width': Html.withUnit(c.width),
      margin: c.width === '' ? '' : '0 auto',
      ...Common.textStyleOf(c)
    })}>` +
    (c.title.trim() === '' ? '' : `<h3 data-onlc-slot="title">${Html.escape(c.title)}</h3>`) +
    `<div data-onlc-slot="content">${Html.paragraphs(c.content)}</div>` +
    `</div>`
};

/**
 * Texte déployable. `<details>` et `<summary>` sont pris en charge par tous les navigateurs
 * courants : aucun script n'est nécessaire pour ouvrir et refermer le bloc.
 */
const details: WidgetDefinition = {
  id: 'details',
  label: 'Texte déployable',
  description: 'Un titre cliquable qui déplie un texte : idéal pour une foire aux questions',
  category: 'Contenu',
  icon: 'chevron-down',
  hasSlots: true,
  fields: [
    { name: 'summary', label: 'Titre cliquable', type: 'text', placeholder: 'Comment passer commande ?' },
    { name: 'content', label: 'Texte déplié', type: 'textarea' },
    { name: 'open', label: 'Déplié au chargement de la page', type: 'checkbox', half: true },
    { name: 'variant', label: 'Présentation', type: 'select', half: true, items: [
      { text: 'Encadré', value: 'boxed' },
      { text: 'Filet simple', value: 'plain' }
    ] }
  ],
  defaults: {
    summary: 'Un titre à déplier',
    content: 'Le texte caché derrière le titre. Le visiteur le découvre en cliquant.',
    open: 'false',
    variant: 'boxed'
  },
  render: (c) =>
    `<details class="onlc-details onlc-details--${c.variant === 'plain' ? 'plain' : 'boxed'}"${Html.isTrue(c.open) ? ' open' : ''}>` +
    `<summary class="onlc-details__summary" data-onlc-slot="summary">${Html.escape(c.summary)}</summary>` +
    `<div class="onlc-details__body" data-onlc-slot="content">${Html.paragraphs(c.content)}</div>` +
    `</details>`
};

const separator: WidgetDefinition = {
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
};

const quote: WidgetDefinition = {
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
    const source = c.source === '' ? '' : `<figcaption class="onlc-quote__source"><a${Common.linkAttributes(c.source, '_blank', 'noopener')}>${Html.escape(c.source)}</a></figcaption>`;
    return `<figure class="onlc-quote"><blockquote data-onlc-slot="text">${Html.paragraphs(c.text)}</blockquote>${author}${source}</figure>`;
  }
};

const all: WidgetDefinition[] = [ cta, hero, text, details, separator, quote ];

export {
  cta,
  hero,
  text,
  details,
  separator,
  quote,
  all
};
