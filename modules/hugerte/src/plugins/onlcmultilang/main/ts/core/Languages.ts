import { Arr, Fun, Optional, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

import * as Options from '../api/Options';
import { Language, LanguageSpec } from '../api/Types';
import * as Parse from './Parse';

/**
 * Les langues du site, telles qu'on les montre au rédacteur.
 *
 * Le moteur du site ne connaît que deux lettres. Deux lettres ne disent rien à personne : la
 * pastille d'une section porte donc « Français », pas « fr ». Les noms usuels sont écrits dans
 * la langue qu'ils désignent — c'est ainsi qu'on les reconnaît sans les avoir appris, et c'est
 * la convention de tous les sélecteurs de langue.
 */

const names: Record<string, string> = {
  ar: 'العربية',
  ca: 'Català',
  cs: 'Čeština',
  da: 'Dansk',
  de: 'Deutsch',
  el: 'Ελληνικά',
  en: 'English',
  es: 'Español',
  et: 'Eesti',
  fi: 'Suomi',
  fr: 'Français',
  he: 'עברית',
  hu: 'Magyar',
  it: 'Italiano',
  ja: '日本語',
  ko: '한국어',
  lt: 'Lietuvių',
  lv: 'Latviešu',
  nl: 'Nederlands',
  no: 'Norsk',
  pl: 'Polski',
  pt: 'Português',
  ro: 'Română',
  ru: 'Русский',
  sk: 'Slovenčina',
  sv: 'Svenska',
  tr: 'Türkçe',
  uk: 'Українська',
  zh: '中文'
};

/** Intitulé d'un code, même inconnu : à défaut de nom, les deux lettres en capitales. */
const labelOf = (code: string): string => names[code] ?? code.toUpperCase();

const toLanguage = (entry: string | LanguageSpec): Optional<Language> => {
  const spec = Type.isString(entry) ? { code: entry } : entry;
  const code = String(spec.code ?? '').trim().toLowerCase();

  if (!Parse.isCode(code)) {
    return Optional.none();
  }

  const label = Type.isString(spec.label) && spec.label.trim() !== '' ? spec.label.trim() : labelOf(code);
  return Optional.some({ code, label });
};

/** Les langues autorisées, dans l'ordre de la configuration, sans doublon ni code invalide. */
const list = (editor: Editor): Language[] =>
  Arr.foldl(Options.getLanguages(editor), (languages: Language[], entry) =>
    toLanguage(entry)
      .filter((language) => !Arr.exists(languages, (kept) => kept.code === language.code))
      .fold(() => languages, (language) => languages.concat([ language ])), []);

const find = (editor: Editor, code: string): Optional<Language> => {
  const wanted = String(code ?? '').trim().toLowerCase();
  return Arr.find(list(editor), (language) => language.code === wanted);
};

const isKnown = (editor: Editor, code: string): boolean => find(editor, code).isSome();

/**
 * Intitulé à afficher pour un code, qu'il soit déclaré ou non.
 *
 * Un fichier peut porter une langue absente de la configuration — un site passé de quatre
 * langues à trois garde ses anciennes sections. Elles restent lisibles et modifiables ; c'est
 * la pastille qui signale qu'elles ne sont plus déclarées.
 */
const displayOf = (editor: Editor, code: string): string =>
  find(editor, code).fold(() => labelOf(code.toLowerCase()), (language) => language.label);

/** Langue par défaut : la première déclarée. Sans configuration valable, le français. */
const first = (editor: Editor): string =>
  Arr.head(list(editor)).fold(Fun.constant('fr'), (language) => language.code);

export {
  names,
  labelOf,
  toLanguage,
  list,
  find,
  isKnown,
  displayOf,
  first
};
