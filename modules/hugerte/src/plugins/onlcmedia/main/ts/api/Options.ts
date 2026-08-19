import { Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import { EditorOptions } from 'hugerte/core/api/OptionTypes';

import { MediaHandlers } from './Types';

export interface PresetItem {
  readonly text: string;
  readonly value: string;
  readonly description?: string;
}

const option: {
  <K extends keyof EditorOptions>(name: K): (editor: Editor) => EditorOptions[K];
  <T>(name: string): (editor: Editor) => T;
} = (name: string) => (editor: Editor) =>
  editor.options.get(name);

const defaultPresets: PresetItem[] = [
  { text: 'Normale', value: '' },
  { text: 'Pleine largeur', value: 'onlc-image--fullwidth' },
  { text: 'Parallaxe', value: 'onlc-image--parallax' },
  { text: 'Ajustée à la taille de l\'écran', value: 'onlc-image--cover-screen' }
];

const defaultPositions: PresetItem[] = [
  { text: 'Haut gauche', value: 'top-left' },
  { text: 'Haut centre', value: 'top-center' },
  { text: 'Haut droite', value: 'top-right' },
  { text: 'Milieu gauche', value: 'middle-left' },
  { text: 'Centre', value: 'middle-center' },
  { text: 'Milieu droite', value: 'middle-right' },
  { text: 'Bas gauche', value: 'bottom-left' },
  { text: 'Bas centre', value: 'bottom-center' },
  { text: 'Bas droite', value: 'bottom-right' }
];

const defaultFonts: PresetItem[] = [
  { text: 'Police du site', value: '' },
  { text: 'Sans empattement', value: 'Arial, Helvetica, sans-serif' },
  { text: 'Avec empattement', value: 'Georgia, "Times New Roman", serif' },
  { text: 'Chasse fixe', value: '"Courier New", monospace' }
];

const register = (editor: Editor): void => {
  const registerOption = editor.options.register;

  registerOption('onlc_media_api_url', {
    processor: 'string',
    default: ''
  });

  registerOption('onlc_media_api_headers', {
    processor: 'object',
    default: {}
  });

  registerOption('onlc_media_api_credentials', {
    processor: 'string',
    default: 'same-origin'
  });

  registerOption('onlc_media_handlers', {
    processor: 'object',
    default: {}
  });

  registerOption('onlc_media_root_path', {
    processor: 'string',
    default: '/'
  });

  registerOption('onlc_media_accept', {
    processor: 'string',
    default: 'image/*'
  });

  registerOption('onlc_media_image_editor_url', {
    processor: 'string',
    default: 'https://pixel.onlinecreation.me'
  });

  registerOption('onlc_media_image_editor_origin', {
    processor: 'string',
    default: ''
  });

  registerOption('onlc_media_class_list', {
    processor: 'object[]',
    default: defaultPresets
  });

  registerOption('onlc_media_overlay_positions', {
    processor: 'object[]',
    default: defaultPositions
  });

  registerOption('onlc_media_font_list', {
    processor: 'object[]',
    default: defaultFonts
  });

  registerOption('onlc_media_default_width', {
    processor: 'string',
    default: '100%'
  });

  registerOption('onlc_media_inject_styles', {
    processor: 'boolean',
    default: true
  });

  registerOption('onlc_media_replace_image_plugin', {
    processor: 'boolean',
    default: true
  });

  registerOption('onlc_media_max_upload_size', {
    processor: (value) => {
      const valid = Type.isNumber(value) && value >= 0;
      return valid ? { value, valid } : { valid: false, message: 'Must be a positive number.' };
    },
    default: 0
  });

  // Types acceptés à l'envoi. Une entrée vaut soit un type complet (`image/png`), soit une
  // famille (`image/`), soit une extension (`.pdf`). La liste vide accepte tout, ce qui reste le
  // comportement d'origine. Le contrôle fait ici est un confort : c'est au serveur de trancher.
  registerOption('onlc_media_upload_mime_types', {
    processor: 'string[]',
    default: [ 'image/', 'application/pdf' ]
  });

  registerOption('onlc_media_quota', {
    processor: 'boolean',
    default: true
  });

  registerOption('onlc_media_versions', {
    processor: 'boolean',
    default: true
  });
};

const getApiUrl = option<string>('onlc_media_api_url');
const getApiHeaders = option<Record<string, string>>('onlc_media_api_headers');
const getApiCredentials = option<RequestCredentials>('onlc_media_api_credentials');
const getHandlers = option<MediaHandlers>('onlc_media_handlers');
const getRootPath = option<string>('onlc_media_root_path');
const getAccept = option<string>('onlc_media_accept');
const getImageEditorUrl = option<string>('onlc_media_image_editor_url');
const getImageEditorOrigin = option<string>('onlc_media_image_editor_origin');
const getClassList = option<PresetItem[]>('onlc_media_class_list');
const getOverlayPositions = option<PresetItem[]>('onlc_media_overlay_positions');
const getFontList = option<PresetItem[]>('onlc_media_font_list');
const getDefaultWidth = option<string>('onlc_media_default_width');
const shouldInjectStyles = option<boolean>('onlc_media_inject_styles');
const shouldReplaceImagePlugin = option<boolean>('onlc_media_replace_image_plugin');
const getMaxUploadSize = option<number>('onlc_media_max_upload_size');
const getUploadMimeTypes = option<string[]>('onlc_media_upload_mime_types');
const isQuotaEnabled = option<boolean>('onlc_media_quota');
const isVersioningEnabled = option<boolean>('onlc_media_versions');

export {
  register,
  defaultPresets,
  defaultPositions,
  defaultFonts,
  getApiUrl,
  getApiHeaders,
  getApiCredentials,
  getHandlers,
  getRootPath,
  getAccept,
  getImageEditorUrl,
  getImageEditorOrigin,
  getClassList,
  getOverlayPositions,
  getFontList,
  getDefaultWidth,
  shouldInjectStyles,
  shouldReplaceImagePlugin,
  getMaxUploadSize,
  getUploadMimeTypes,
  isQuotaEnabled,
  isVersioningEnabled
};
