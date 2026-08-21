import { Arr, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import { EditorOptions } from 'hugerte/core/api/OptionTypes';
import * as PublishedCss from 'hugerte/plugins/onlcshared/PublishedCss';

import { ShortcodeDefinition } from './ShortcodeTypes';
import { PreviewValue, WidgetDefinition, WidgetFieldItem } from './Types';

const option: {
  <K extends keyof EditorOptions>(name: K): (editor: Editor) => EditorOptions[K];
  <T>(name: string): (editor: Editor) => T;
} = (name: string) => (editor: Editor) =>
  editor.options.get(name);

const defaultScriptPositions: WidgetFieldItem[] = [
  { text: 'À l’emplacement du curseur', value: 'inline' },
  { text: 'Fin de la page (avant </body>)', value: 'body-end' },
  { text: 'En-tête de la page (<head>)', value: 'head' }
];

const register = (editor: Editor): void => {
  const registerOption = editor.options.register;

  registerOption('onlc_widgets_custom', {
    processor: (value) => {
      const valid = Type.isArrayOf(value, Type.isObject);
      return valid ? { value, valid } : { valid: false, message: 'Must be an array of widget definitions.' };
    },
    default: []
  });

  registerOption('onlc_widgets_exclude', {
    processor: 'string[]',
    default: []
  });

  registerOption('onlc_widgets_class_prefix', {
    processor: 'string',
    default: 'onlc-widget'
  });

  registerOption('onlc_widgets_video_ratio', {
    processor: 'string',
    default: '56.25%'
  });

  // Adresse de base des bibliothèques externes (Leaflet, nanogallery2, pdf.js). Les projets qui
  // hébergent ces fichiers eux-mêmes remplacent simplement cette valeur.
  registerOption('onlc_widgets_cdn_base', {
    processor: 'string',
    default: 'https://cdnjs.cloudflare.com/ajax/libs'
  });

  // Service de géocodage utilisé par le bloc carte pour retrouver une adresse.
  registerOption('onlc_widgets_geocoder_url', {
    processor: 'string',
    default: 'https://nominatim.openstreetmap.org/search'
  });

  // Hôtes dont les iframes ne sont pas mises en bac à sable dans l'éditeur : sans cela, la
  // prévisualisation d'une carte ou d'un calendrier reste vide.
  registerOption('onlc_widgets_iframe_exclusions', {
    processor: 'string[]',
    default: [ 'openstreetmap.org', 'calendar.google.com' ]
  });

  registerOption('onlc_widgets_inject_styles', {
    processor: 'boolean',
    default: true
  });

  registerOption('onlc_script_default_type', {
    processor: 'string',
    default: 'text/javascript'
  });

  registerOption('onlc_script_positions', {
    processor: 'object[]',
    default: defaultScriptPositions
  });

  registerOption('onlc_script_allow_src', {
    processor: 'boolean',
    default: true
  });

  registerOption('onlc_code_tab_size', {
    processor: 'number',
    default: 2
  });

  registerOption('onlc_code_line_numbers', {
    processor: 'boolean',
    default: true
  });

  registerOption('onlc_source_pretty_print', {
    processor: 'boolean',
    default: true
  });

  /* Éléments du site (codes courts) --------------------------------------- */

  // Définitions supplémentaires, au format décrit dans `api/ShortcodeTypes.ts`.
  registerOption('onlc_shortcodes_custom', {
    processor: (value) => {
      const valid = Type.isArrayOf(value, Type.isObject);
      return valid ? { value, valid } : { valid: false, message: 'Must be an array of shortcode definitions.' };
    },
    default: []
  });

  registerOption('onlc_shortcodes_exclude', {
    processor: 'string[]',
    default: []
  });

  /**
   * Transforme aussi les codes que le plugin ne connaît pas. Ils deviennent une carte neutre,
   * réécrite telle quelle : c'est utile pour ne pas les abîmer par mégarde, mais cela peut
   * gêner si vos pages contiennent des crochets à d'autres fins.
   */
  registerOption('onlc_shortcodes_show_unknown', {
    processor: 'boolean',
    default: true
  });

  registerOption('onlc_shortcodes_inject_styles', {
    processor: 'boolean',
    default: true
  });

  /* Aperçu comme un visiteur ---------------------------------------------- */

  // Gabarit du site, donné tel quel. Prioritaire sur l'adresse ci-dessous.
  registerOption('onlc_preview_template', {
    processor: 'string',
    default: ''
  });

  // Adresse d'une api rendant le gabarit, en texte ou en `{ "template": "…" }`.
  registerOption('onlc_preview_template_url', {
    processor: 'string',
    default: ''
  });

  /**
   * Valeurs des codes courts dans l'aperçu, par nom : une chaîne, ou une fonction des attributs
   * du code. Un code sans valeur disparaît de l'aperçu — il n'a pas à s'afficher entre crochets
   * sous les yeux du rédacteur.
   */
  /**
   * Feuilles de style ajoutées à la page d'aperçu.
   *
   * Sans elles, l'aperçu ne montre le contenu qu'habillé par le gabarit — or c'est la feuille du
   * site, celle que l'éditeur charge dans sa zone d'écriture, qui donne aux blocs leur grille,
   * leurs marges et leurs polices. Deux rendus différents pour la même page, et l'aperçu ne vaut
   * plus grand-chose.
   *
   * Par défaut, exactement ce que l'éditeur charge lui-même : `content_css`. Les feuilles des
   * plugins ne sont pas reprises — elles dessinent les cartes et les cadres de l'écriture, qui
   * n'existent plus dans la page publiée.
   */
  registerOption('onlc_preview_css', {
    processor: (value) => {
      const valid = value === undefined || Type.isArrayOf(value, Type.isString);
      return valid ? { value, valid } : { valid: false, message: 'Must be an array of stylesheet urls.' };
    },
    default: undefined
  });

  registerOption('onlc_preview_values', {
    processor: 'object',
    default: {}
  });

};

const getCustomWidgets = option<WidgetDefinition[]>('onlc_widgets_custom');
const getExcludedWidgets = option<string[]>('onlc_widgets_exclude');
const getClassPrefix = option<string>('onlc_widgets_class_prefix');
const getVideoRatio = option<string>('onlc_widgets_video_ratio');
const getCdnBase = option<string>('onlc_widgets_cdn_base');
const getGeocoderUrl = option<string>('onlc_widgets_geocoder_url');
const getIframeExclusions = option<string[]>('onlc_widgets_iframe_exclusions');
const shouldInjectStyles = option<boolean>('onlc_widgets_inject_styles');
const getScriptType = option<string>('onlc_script_default_type');
const getScriptPositions = option<WidgetFieldItem[]>('onlc_script_positions');
const allowScriptSrc = option<boolean>('onlc_script_allow_src');
const getTabSize = option<number>('onlc_code_tab_size');
const hasLineNumbers = option<boolean>('onlc_code_line_numbers');
const shouldPrettyPrint = option<boolean>('onlc_source_pretty_print');

/**
 * Ajoute les hôtes de nos intégrations à la liste du cœur : sans cela, la prévisualisation
 * d'une carte ou d'un calendrier reste vide dans l'éditeur.
 */
const allowIframeHosts = (editor: Editor, hosts: string[]): void => {
  if (hosts.length === 0) {
    return;
  }
  const current = editor.options.get('sandbox_iframes_exclusions');
  editor.options.set('sandbox_iframes_exclusions', Arr.unique(current.concat(hosts)));
};

/**
 * Les feuilles à poser dans l'aperçu.
 *
 * Deux familles, dans l'ordre où la zone d'écriture les charge :
 *
 * 1. celles que **les plugins** déclarent nécessaires à la page publiée — l'allure d'un bandeau,
 *    la grille d'un calendrier, la taille d'un emoji. Le projet ne les nomme pas : elles sont
 *    livrées avec les plugins, et l'aperçu les reprend toujours ;
 * 2. celles du **site** : `onlc_preview_css` si le projet l'a réglée, sinon son `content_css`.
 *    Elles viennent en dernier, et ont donc le dernier mot, comme dans l'éditeur.
 *
 * Les adresses sont rendues absolues. Le cadre de l'aperçu reçoit son contenu par `srcdoc`, dans
 * une origine opaque : une adresse relative — ou même commençant par une barre — n'y a plus de
 * point de départ auquel se rapporter, et la feuille ne se charge pas.
 *
 * Un nom d'habillage (`default`, `dark`) est écarté : ce n'est pas une adresse, mais une
 * ressource interne de l'éditeur, qui ne décrit rien de la page publiée.
 */
const isSkinName = (url: string): boolean => /^[a-z0-9\-]+$/i.test(url);

const siteCss = (editor: Editor): string[] => {
  const chosen = editor.options.get('onlc_preview_css') as string[] | undefined;
  if (Type.isArray(chosen)) {
    return Arr.filter(chosen, Type.isString);
  }
  const content = editor.options.get('content_css');
  return Type.isArrayOf(content, Type.isString) ? content : [];
};

const getPreviewCss = (editor: Editor): string[] =>
  // Dédoublonné une fois les adresses résolues : la grille du site est souvent citée deux fois —
  // dans `content_css` et dans `onlc_blocks_grid_css` — et rien ne dit qu'elle l'est à l'identique.
  Arr.unique(Arr.map(
    Arr.filter(PublishedCss.sheets(editor).concat(siteCss(editor)), (url) => !isSkinName(url)),
    (url) => editor.documentBaseURI.toAbsolute(url)
  ));

/**
 * Les règles écrites à la volée par les plugins — ce qui dépend de la configuration et n'existe
 * dans aucun fichier, comme la classe choisie pour les espaceurs.
 */
const getPreviewRules = (editor: Editor): string[] => PublishedCss.rules(editor);

const getPreviewTemplate = option<string>('onlc_preview_template');
const getPreviewTemplateUrl = option<string>('onlc_preview_template_url');
const getPreviewValues = option<Record<string, PreviewValue>>('onlc_preview_values');

const getCustomShortcodes = option<ShortcodeDefinition[]>('onlc_shortcodes_custom');
const getExcludedShortcodes = option<string[]>('onlc_shortcodes_exclude');
const shouldShowUnknownShortcodes = option<boolean>('onlc_shortcodes_show_unknown');
const shouldInjectShortcodeStyles = option<boolean>('onlc_shortcodes_inject_styles');

export {
  register,
  getPreviewCss,
  getPreviewRules,
  getPreviewTemplate,
  getPreviewTemplateUrl,
  getPreviewValues,
  getCustomShortcodes,
  getExcludedShortcodes,
  shouldShowUnknownShortcodes,
  shouldInjectShortcodeStyles,
  defaultScriptPositions,
  getCustomWidgets,
  getExcludedWidgets,
  getClassPrefix,
  getVideoRatio,
  getCdnBase,
  getGeocoderUrl,
  getIframeExclusions,
  allowIframeHosts,
  shouldInjectStyles,
  getScriptType,
  getScriptPositions,
  allowScriptSrc,
  getTabSize,
  hasLineNumbers,
  shouldPrettyPrint
};
