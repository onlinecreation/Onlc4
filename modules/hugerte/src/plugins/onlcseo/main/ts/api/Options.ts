import { Arr, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

import * as Catalog from '../core/Catalog';
import { SchemaType } from './Types';

const register = (editor: Editor): void => {
  const registerOption = editor.options.register;

  /**
   * Types ajoutés ou complétés par le projet.
   *
   * Un type dont le nom existe déjà **complète** celui d'origine plutôt que de le remplacer : on
   * peut ainsi ajouter une propriété à `Product` sans avoir à en recopier la définition entière.
   */
  registerOption('onlc_seo_schema_types', {
    processor: (value) => {
      const valid = Type.isArrayOf(value, Type.isObject);
      return valid ? { value, valid } : { valid: false, message: 'Must be an array of schema types.' };
    },
    default: []
  });

  /** Types retirés du choix, par leur nom schema.org. */
  registerOption('onlc_seo_schema_exclude', {
    processor: 'string[]',
    default: []
  });

  /**
   * Le contexte écrit en tête de la fiche.
   *
   * `https://schema.org` dans la quasi-totalité des cas. L'option existe pour les projets qui
   * publient un vocabulaire à eux.
   */
  registerOption('onlc_seo_context', {
    processor: 'string',
    default: 'https://schema.org'
  });
};

const getCustomTypes = (editor: Editor): SchemaType[] => {
  const value = editor.options.get('onlc_seo_schema_types');
  return Type.isArray(value) ? value as SchemaType[] : [];
};

const getExcludedTypes = (editor: Editor): string[] => {
  const value = editor.options.get('onlc_seo_schema_exclude');
  return Type.isArrayOf(value, Type.isString) ? value : [];
};

/** Le catalogue livré, moins ce que le projet a exclu. */
const getBuiltInTypes = (editor: Editor): SchemaType[] => {
  const excluded = getExcludedTypes(editor);
  return Arr.filter(Catalog.catalog, (type) => !Arr.contains(excluded, type.name));
};

const getContext = (editor: Editor): string => {
  const value = editor.options.get('onlc_seo_context');
  return Type.isString(value) && value !== '' ? value : 'https://schema.org';
};

/**
 * Les langues déclarées par le plugin polyglotte.
 *
 * `onlcseo` n'en dépend pas : sur un site monolingue l'option n'existe pas, et le formulaire
 * n'affiche alors aucune barre de langues. Lire l'option d'un autre plugin est sans danger —
 * contrairement à l'écrire, qui n'aboutirait que s'il avait été chargé avant : la lecture n'a
 * lieu qu'à l'ouverture du formulaire, donc bien après que tous se sont présentés.
 */
const getSiteLanguages = (editor: Editor): unknown[] => {
  const name = 'onlc_multilang_languages';
  if (!editor.options.isRegistered(name)) {
    return [];
  }
  const value = editor.options.get(name);
  return Type.isArray(value) ? value : [];
};

export {
  register,
  getCustomTypes,
  getExcludedTypes,
  getBuiltInTypes,
  getContext,
  getSiteLanguages
};
