import { Arr, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import { EditorOptions } from 'hugerte/core/api/OptionTypes';

import { ShortcodeDefinition } from './ShortcodeTypes';
import { WidgetDefinition, WidgetFieldItem } from './Types';

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

const getCustomShortcodes = option<ShortcodeDefinition[]>('onlc_shortcodes_custom');
const getExcludedShortcodes = option<string[]>('onlc_shortcodes_exclude');
const shouldShowUnknownShortcodes = option<boolean>('onlc_shortcodes_show_unknown');
const shouldInjectShortcodeStyles = option<boolean>('onlc_shortcodes_inject_styles');

export {
  register,
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
