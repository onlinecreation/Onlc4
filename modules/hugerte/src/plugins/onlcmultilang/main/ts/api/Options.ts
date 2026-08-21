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

  /**
   * Éléments qui contiennent des blocs sans en être un eux-mêmes.
   *
   * C'est ce qui décide jusqu'où remonte un marquage : un paragraphe dans une colonne est marqué
   * pour lui-même, la colonne reste intacte. Même valeur que `onlc_blocks_containers`, pour que
   * la barre d'outils des blocs et le marquage de langue s'arrêtent au même endroit.
   */
  registerOption('onlc_multilang_containers', {
    processor: 'string',
    default: '.row,.container,.container-fluid,section,article,aside,main,header,footer,[class*="col-"],.col,[data-onlc-lang]'
  });

  /**
   * Éléments à l'intérieur desquels seul le marquage **en ligne** a un sens.
   *
   * Le markup d'un bloc prédéfini — un bandeau, une visionneuse, un calendrier — appartient au
   * plugin qui le dessine : il a sa structure, ses classes, son placement. Y glisser un `div` de
   * section le disloque, et la prochaine relecture du bloc le reconstruit sans lui. À l'intérieur,
   * on peut donc donner une langue à **du texte sélectionné**, jamais à une tranche de la
   * structure.
   *
   * Le bloc lui-même n'est pas concerné : une section posée **autour** de lui ne touche à rien de
   * ce qu'il contient, et reste le moyen normal de réserver un bandeau entier à une langue.
   */
  registerOption('onlc_multilang_inline_only', {
    processor: 'string',
    default: '[data-onlc-widget]'
  });
};

const getLanguages = option<LanguageOption[]>('onlc_multilang_languages');
const getDefaultSyntax = option<Syntax>('onlc_multilang_default_syntax');
const getPreviewLanguage = option<string>('onlc_multilang_preview_language');
const shouldInjectStyles = option<boolean>('onlc_multilang_inject_styles');
const getContainerSelector = option<string>('onlc_multilang_containers');
const getInlineOnlySelector = option<string>('onlc_multilang_inline_only');

export {
  register,
  getLanguages,
  getDefaultSyntax,
  getPreviewLanguage,
  shouldInjectStyles,
  getContainerSelector,
  getInlineOnlySelector
};
