import { Arr, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

/**
 * Les styles dont la **page publiée** a besoin, déclarés par les plugins qui les emploient.
 *
 * `editor.contentCSS` mélange deux choses très différentes : les feuilles qui décrivent le site —
 * l'allure d'un bandeau, la grille d'un calendrier, la taille d'un emoji — et celles qui ne
 * servent qu'à écrire : le pointillé d'un bloc survolé, la pastille d'une section de langue, les
 * hachures d'un espaceur vide. Les premières doivent suivre le contenu partout où il est montré,
 * les secondes ne doivent jamais en sortir.
 *
 * Chaque plugin range donc lui-même ses feuilles de publication ici, en plus de les charger dans
 * la zone d'écriture. L'aperçu visiteur et le html rendu les reprennent telles quelles, dans le
 * même ordre : c'est ce qui fait qu'un calendrier ressemble à un calendrier ailleurs que dans
 * l'éditeur.
 *
 * ## Pourquoi la liste vit sur l'éditeur
 *
 * Chaque plugin est un paquet à part : ce module y est recopié, et deux plugins n'en partagent
 * pas la mémoire. Une liste de portée module serait donc trois listes, chacune ignorant les
 * autres. Elle est posée sur l'objet éditeur, qui est, lui, le même pour tous.
 */

interface Store {
  readonly sheets: string[];
  readonly rules: string[];
}

/**
 * Nom de la propriété portée par l'éditeur. Il est lu et écrit par plusieurs paquets : c'est un
 * point de rendez-vous, il ne change pas.
 */
interface Carrier {
  onlcPublishedStyles?: Store;
}

const storeOf = (editor: Editor): Store => {
  const carrier = editor as Editor & Carrier;
  const existing = carrier.onlcPublishedStyles;
  if (Type.isObject(existing) && Type.isArray(existing.sheets) && Type.isArray(existing.rules)) {
    return existing;
  }
  const created: Store = { sheets: [], rules: [] };
  carrier.onlcPublishedStyles = created;
  return created;
};

const add = (target: string[], value: string): void => {
  const trimmed = value.trim();
  if (trimmed !== '' && !Arr.contains(target, trimmed)) {
    target.push(trimmed);
  }
};

/**
 * Déclare une ou plusieurs feuilles nécessaires à la page publiée.
 *
 * Les doublons sont ignorés : deux plugins peuvent citer la même grille sans que la page la
 * charge deux fois. L'ordre de déclaration est conservé, c'est celui dans lequel la page les
 * recevra.
 */
const declareSheets = (editor: Editor, urls: string[]): void => {
  const store = storeOf(editor);
  Arr.each(urls, (url) => {
    if (Type.isString(url)) {
      add(store.sheets, url);
    }
  });
};

/**
 * Déclare des règles écrites à la volée, pour ce qui dépend de la configuration et n'existe donc
 * dans aucun fichier — la classe d'un espaceur, par exemple.
 */
const declareRules = (editor: Editor, css: string): void => {
  if (Type.isString(css)) {
    add(storeOf(editor).rules, css);
  }
};

/** Les feuilles déclarées, dans l'ordre de déclaration. */
const sheets = (editor: Editor): string[] => storeOf(editor).sheets.slice();

/** Les règles déclarées, dans l'ordre de déclaration. */
const rules = (editor: Editor): string[] => storeOf(editor).rules.slice();

export {
  declareSheets,
  declareRules,
  sheets,
  rules
};
