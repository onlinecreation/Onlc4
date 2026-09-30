import { Arr, Fun, Optional, Singleton, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import Resource from 'hugerte/core/api/Resource';

import * as Options from '../api/Options';

/**
 * Emojis dessinés par OpenMoji (https://openmoji.org, licence CC BY-SA 4.0).
 *
 * Un emoji tapé au clavier s'affiche différemment sur chaque système : gris et anguleux sous
 * Windows, rond et coloré sous Apple, encore autrement sous Android. Un visiteur ne voit donc
 * jamais ce que le rédacteur a vu. Le plugin remplace donc chaque emoji par le dessin OpenMoji
 * correspondant, servi en svg : le rendu devient le même partout, y compris à l'impression.
 *
 * ```html
 * <img class="onlc-emoji" src="…/openmoji/1F600.svg" alt="😀" data-onlc-emoji="1F600">
 * ```
 *
 * Le texte alternatif porte l'emoji d'origine : un copier-coller depuis la page publiée redonne
 * le caractère, et les lecteurs d'écran l'annoncent normalement.
 *
 * **Attribution obligatoire** : la licence CC BY-SA impose de créditer OpenMoji sur les pages
 * qui affichent ces dessins (voir `main/LICENCES.md`).
 */

export const emojiClass = 'onlc-emoji';
export const emojiAttribute = 'data-onlc-emoji';

const resourceId = 'onlc.plugins.onlcicons.openmoji';

export interface OpenMojiIndex {
  readonly hasLoaded: () => boolean;
  readonly waitForLoad: () => Promise<boolean>;
  /** Nom de fichier du dessin correspondant à un emoji, s'il en existe un. */
  readonly fileOf: (char: string) => Optional<string>;
  /** Nom de fichier attendu pour une suite de points de code déjà normalisée. */
  readonly hasFile: (name: string) => boolean;
}

const codePoints = (value: string): string[] =>
  Arr.map(Array.from(value), (character) => {
    const point = character.codePointAt(0) ?? 0;
    return point.toString(16).toUpperCase().padStart(4, '0');
  });

/**
 * Suites d'emojis reconnues dans un texte : drapeaux régionaux, séquences avec jointure de
 * largeur nulle, modificateurs de teinte, touches numériques.
 */
const sequenceRegExp = (): RegExp => new RegExp(
  '\\p{RI}\\p{RI}' +
  '|[0-9#*]\\uFE0F?\\u20E3' +
  '|\\p{Extended_Pictographic}(\\p{Emoji_Modifier}|\\uFE0F)?' +
  '(\\u200D(\\p{Extended_Pictographic}|\\p{Emoji})(\\p{Emoji_Modifier}|\\uFE0F)?)*',
  'gu');

/**
 * Charge la liste des dessins disponibles. Elle est produite à la compilation par
 * `tools/openmoji/build-openmoji.js` et pèse une centaine de kilo-octets.
 */
const initIndex = (editor: Editor): OpenMojiIndex => {
  const state = Singleton.value<Record<string, string>>();

  const build = (names: string[]): Record<string, string> => {
    const map: Record<string, string> = {};
    Arr.each(names, (name) => {
      map[name] = name;
      // Beaucoup de claviers omettent le sélecteur de variante : la version sans FE0F est
      // enregistrée comme second nom, sans jamais écraser un nom exact.
      const stripped = Arr.filter(name.split('-'), (part) => part !== 'FE0F').join('-');
      if (stripped !== '' && !Object.prototype.hasOwnProperty.call(map, stripped)) {
        map[stripped] = name;
      }
    });
    return map;
  };

  const loaded = Resource.load<string[]>(resourceId, Options.getOpenMojiIndexUrl(editor))
    .then((names) => {
      state.set(build(Type.isArray(names) ? names : []));
      return true;
    })
    .catch(() => {
      // eslint-disable-next-line no-console
      console.warn('[onlc] Liste des dessins OpenMoji indisponible : les emojis restent en texte.');
      state.set({});
      return false;
    });

  const lookup = (name: string): Optional<string> =>
    state.get().bind((map) => Optional.from(map[name]));

  return {
    hasLoaded: () => state.isSet(),
    waitForLoad: Fun.constant(loaded),
    hasFile: (name) => lookup(name).isSome(),
    fileOf: (char) => {
      const points = codePoints(char);
      return lookup(points.join('-'))
        .orThunk(() => lookup(Arr.filter(points, (point) => point !== 'FE0F').join('-')));
    }
  };
};

const urlOf = (editor: Editor, file: string): string =>
  `${Options.getOpenMojiUrl(editor).replace(/\/+$/, '')}/${file}.svg`;

/** Markup d'un emoji dessiné. */
const toHtml = (editor: Editor, char: string, file: string): string =>
  `<img class="${emojiClass}"` +
  ` src="${editor.dom.encode(urlOf(editor, file))}"` +
  ` alt="${editor.dom.encode(char)}"` +
  ` ${emojiAttribute}="${editor.dom.encode(file)}"` +
  ` loading="lazy" draggable="false">`;

export {
  codePoints,
  sequenceRegExp,
  initIndex,
  urlOf,
  toHtml
};
