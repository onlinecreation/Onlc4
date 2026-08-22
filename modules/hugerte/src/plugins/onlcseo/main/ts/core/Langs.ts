import { Arr, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

import * as Options from '../api/Options';

/**
 * Les langues du site, telles que le plugin polyglotte les déclare.
 *
 * `onlcseo` ne dépend pas de `onlcmultilang` : sur un site monolingue, l'option n'existe pas et
 * le formulaire n'affiche aucune barre de langues. Lire l'option d'un autre plugin est sans
 * danger — contrairement à l'écrire — parce que la lecture n'a lieu qu'à l'ouverture du
 * formulaire, donc bien après que tous les plugins se sont présentés.
 */

export interface SiteLanguage {
  readonly code: string;
  readonly label: string;
}

/** Noms usuels, pour une déclaration courte — `[ 'fr', 'en', 'nl' ]`. */
const usual: Record<string, string> = {
  fr: 'Français', en: 'English', es: 'Español', de: 'Deutsch', it: 'Italiano',
  nl: 'Nederlands', pt: 'Português', ca: 'Català', eu: 'Euskara', br: 'Brezhoneg'
};

const toLanguage = (entry: unknown): SiteLanguage[] => {
  if (Type.isString(entry)) {
    const code = entry.trim().toLowerCase();
    return /^[a-z]{2}$/.test(code) ? [{ code, label: usual[code] ?? code.toUpperCase() }] : [];
  }
  if (Type.isObject(entry)) {
    const record = entry as { code?: unknown; label?: unknown };
    const code = Type.isString(record.code) ? record.code.trim().toLowerCase() : '';
    if (!/^[a-z]{2}$/.test(code)) {
      return [];
    }
    const label = Type.isString(record.label) && record.label !== ''
      ? record.label
      : usual[code] ?? code.toUpperCase();
    return [{ code, label }];
  }
  return [];
};

/** Les langues déclarées, ou une liste vide si le site est monolingue. */
const list = (editor: Editor): SiteLanguage[] =>
  Arr.bind(Options.getSiteLanguages(editor), toLanguage);

export {
  usual,
  list
};
