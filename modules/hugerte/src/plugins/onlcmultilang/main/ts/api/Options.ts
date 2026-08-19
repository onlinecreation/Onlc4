import { Arr, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import { EditorOptions } from 'hugerte/core/api/OptionTypes';

import { LanguageOption, LanguageSpec, Syntax } from './Types';

const option: {
  <K extends keyof EditorOptions>(name: K): (editor: Editor) => EditorOptions[K];
  <T>(name: string): (editor: Editor) => T;
} = (name: string) => (editor: Editor) =>
  editor.options.get(name);

const isLanguageOption = (value: unknown): boolean =>
  Type.isString(value) || (Type.isObject(value) && Type.isString((value as LanguageSpec).code));

const register = (editor: Editor): void => {
  const registerOption = editor.options.register;

  /**
   * Les langues du site. Ce sont elles qui peuplent les menus et qui décident de ce qu'un
   * aperçu peut montrer ; une langue rencontrée dans un fichier sans figurer ici est conservée
   * et signalée, jamais supprimée.
   */
  registerOption('onlc_multilang_languages', {
    processor: (value) => {
      const valid = Type.isArray(value) && Arr.forall(value, isLanguageOption);
      return valid
        ? { value: value as LanguageOption[], valid }
        : { valid: false, message: 'Must be an array of two-letter codes or { code, label } objects.' };
    },
    default: [ 'fr', 'en', 'nl' ]
  });

  /**
   * Écriture des sections créées dans l'éditeur.
   *
   * `multilang` par défaut : c'est la seule des deux qui accepte n'importe quel contenu, codes
   * courts compris. Un `[LG]` lu dans un fichier garde son écriture d'origine.
   */
  registerOption('onlc_multilang_default_syntax', {
    processor: (value) => {
      const valid = value === 'lg' || value === 'multilang';
      return valid ? { value: value as Syntax, valid } : { valid: false, message: 'Must be "lg" or "multilang".' };
    },
    default: 'multilang'
  });

  /** Langue affichée à l'ouverture. Vide : toutes les sections sont visibles. */
  registerOption('onlc_multilang_preview_language', {
    processor: 'string',
    default: ''
  });

  registerOption('onlc_multilang_inject_styles', {
    processor: 'boolean',
    default: true
  });
};

const getLanguages = option<LanguageOption[]>('onlc_multilang_languages');
const getDefaultSyntax = option<Syntax>('onlc_multilang_default_syntax');
const getPreviewLanguage = option<string>('onlc_multilang_preview_language');
const shouldInjectStyles = option<boolean>('onlc_multilang_inject_styles');

export {
  register,
  getLanguages,
  getDefaultSyntax,
  getPreviewLanguage,
  shouldInjectStyles
};
