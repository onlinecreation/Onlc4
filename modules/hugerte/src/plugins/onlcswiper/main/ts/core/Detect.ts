import { Arr, Optional, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

import * as JsObject from './JsObject';

/**
 * Reconnaissance des diaporamas Swiper dans une page écrite à la main.
 *
 * Un diaporama Swiper n'est pas un bloc de l'éditeur : c'est du html ordinaire, écrit par un
 * intégrateur, dont le comportement vient d'un appel javascript posé ailleurs dans la page. Pour
 * le rendre modifiable, il faut donc retrouver les deux moitiés et les rapprocher.
 *
 * ## Reconnaître le html
 *
 * Ni la classe `swiper` ni un préfixe ne suffisent : dans une page réelle on trouve
 * `class="swiper mySwiper"`, `class="swiper images-show"` mais aussi
 * `class="swiper-reviews overflow-hidden position-relative"`, qui ne porte pas `swiper` du tout.
 * Le seul signe constant est la **piste** : `.swiper-wrapper`, que la bibliothèque exige. Le
 * conteneur est son parent.
 *
 * ## Retrouver les réglages
 *
 * Les réglages sont dans un `new Swiper('<sélecteur>', { … })`, quelque part dans un script de la
 * page. On relève tous ces appels, puis on demande au conteneur s'il correspond au sélecteur. Un
 * diaporama peut donc être configuré depuis n'importe quel script, dans n'importe quel ordre — ce
 * qui est le cas dans les pages réelles, où tous les appels sont groupés dans un
 * `$(document).ready`.
 *
 * Le script n'est jamais exécuté : le littéral objet est **lu** (voir `JsObject`).
 */

/** Un appel `new Swiper(...)` relevé dans un script. */
export interface SwiperCall {
  /** Le sélecteur passé en premier argument, tel qu'il est écrit. */
  readonly selector: string;
  /** Les réglages lus, ou `none` si le littéral est illisible. */
  readonly settings: Optional<JsObject.JsObjectValue>;
  /** Position du `{` des réglages dans le code du script. */
  readonly start: number;
  /** Position juste après le `}` des réglages. */
  readonly end: number;
}

/** Un diaporama : son conteneur dans la page, et l'appel qui le configure s'il y en a un. */
export interface Swiper {
  readonly container: HTMLElement;
  readonly wrapper: HTMLElement;
  readonly call: Optional<SwiperCall>;
  /** Le jeton de script qui porte l'appel, pour pouvoir le réécrire. */
  readonly script: Optional<HTMLElement>;
}

export const wrapperClass = 'swiper-wrapper';
export const slideClass = 'swiper-slide';

/** Attribut posé par `onlcwidgets` sur le jeton qui remplace un script. */
export const scriptDataAttribute = 'data-onlc-script';
export const scriptSelector = '.onlc-script';

const callRegExp = /new\s+Swiper\s*\(\s*(['"])((?:[^'"\\]|\\.)*)\1\s*,\s*/g;

/**
 * Relève les appels `new Swiper(sélecteur, { … })` d'un fragment de code.
 *
 * Un appel dont le premier argument n'est pas une chaîne littérale — une variable, un nœud
 * retrouvé auparavant — est ignoré : on ne saurait pas à quel conteneur le rattacher, et deviner
 * serait pire que ne rien proposer.
 */
const callsIn = (code: string): SwiperCall[] => {
  const found: SwiperCall[] = [];
  const pattern = new RegExp(callRegExp.source, 'g');

  let match = pattern.exec(code);
  while (match !== null) {
    const start = match.index + match[0].length;
    const end = JsObject.endOfObject(code, start);
    if (end !== -1) {
      found.push({
        selector: match[2],
        settings: JsObject.parse(code.substring(start, end)),
        start,
        end
      });
      pattern.lastIndex = end;
    }
    match = pattern.exec(code);
  }

  return found;
};

/** Le code javascript porté par un jeton de script. */
const codeOf = (editor: Editor, script: HTMLElement): string => {
  const raw = editor.dom.getAttrib(script, scriptDataAttribute);
  if (raw === '') {
    return '';
  }
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(raw));
    return Type.isObject(parsed) && Type.isString((parsed as { code?: string }).code)
      ? (parsed as { code: string }).code
      : '';
  } catch (_err) {
    return '';
  }
};

/** Réécrit le code d'un jeton de script, en gardant tous ses autres réglages. */
const setCode = (editor: Editor, script: HTMLElement, code: string): boolean => {
  const raw = editor.dom.getAttrib(script, scriptDataAttribute);
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(raw));
    if (!Type.isObject(parsed)) {
      return false;
    }
    const updated = { ...parsed as Record<string, unknown>, code };
    editor.dom.setAttrib(script, scriptDataAttribute, encodeURIComponent(JSON.stringify(updated)));
    return true;
  } catch (_err) {
    return false;
  }
};

const scripts = (editor: Editor): HTMLElement[] => {
  const body = editor.getBody();
  return Type.isNonNullable(body) ? editor.dom.select<HTMLElement>(scriptSelector, body) : [];
};

/**
 * Le conteneur correspond-il au sélecteur de l'appel ?
 *
 * Un sélecteur invalide — ou d'une forme que le navigateur refuse — ne fait pas échouer la
 * recherche entière : ce diaporama-là reste simplement sans réglages.
 */
const matches = (editor: Editor, container: HTMLElement, selector: string): boolean => {
  try {
    return editor.dom.is(container, selector) as boolean;
  } catch (_err) {
    return false;
  }
};

/** Tous les diaporamas de la page, dans l'ordre du document. */
const all = (editor: Editor): Swiper[] => {
  const body = editor.getBody();
  if (!Type.isNonNullable(body)) {
    return [];
  }

  const declared = Arr.bind(scripts(editor), (script) =>
    Arr.map(callsIn(codeOf(editor, script)), (call) => ({ script, call })));

  return Arr.bind(editor.dom.select<HTMLElement>(`.${wrapperClass}`, body), (wrapper) => {
    const container = wrapper.parentNode as HTMLElement | null;
    if (!Type.isNonNullable(container) || container.nodeType !== 1) {
      return [];
    }
    const owner = Arr.find(declared, (entry) => matches(editor, container, entry.call.selector));
    return [{
      container,
      wrapper,
      call: owner.map((entry) => entry.call),
      script: owner.map((entry) => entry.script)
    }];
  });
};

/** Le diaporama qui contient ce nœud, s'il y en a un. */
const at = (editor: Editor, node: Node | null): Optional<Swiper> => {
  if (!Type.isNonNullable(node)) {
    return Optional.none();
  }
  return Arr.find(all(editor), (swiper) => swiper.container === node || swiper.container.contains(node));
};

/**
 * Le diaporama qu'un **bloc** désigne, quand il n'y a pas d'ambiguïté.
 *
 * `at` ne regarde que vers le haut : il répond pour un nœud pris dans un diaporama. Mais la barre
 * des blocs se pose parfois sur un élément qui *contient* le diaporama — une section entière qui
 * n'en porte qu'un — et il faut alors regarder vers le bas. Trois cas, dans cet ordre, les mêmes
 * que pour les autres boutons de propriétés (voir `BlockActions.matchIn`) :
 *
 * 1. le bloc est un diaporama, ou se trouve dans un diaporama ;
 * 2. la sélection est dans un diaporama que ce bloc contient ;
 * 3. le bloc ne contient qu'un seul diaporama.
 *
 * Un bloc qui en contient plusieurs sans qu'aucun ne soit désigné ne propose pas le bouton :
 * mieux vaut pas de bouton qu'un bouton dont on ignore lequel il ouvrira.
 */
const forBlock = (editor: Editor, block: HTMLElement): Optional<Swiper> => {
  const swipers = all(editor);

  const inSelection = (): Optional<Swiper> => {
    const selected = editor.selection.getNode();
    return Arr.find(swipers, (swiper) =>
      block.contains(swiper.container)
      && (swiper.container === selected || swiper.container.contains(selected)));
  };

  const onlyOne = (): Optional<Swiper> => {
    const inside = Arr.filter(swipers, (swiper) => block.contains(swiper.container));
    return inside.length === 1 ? Optional.some(inside[0]) : Optional.none<Swiper>();
  };

  return at(editor, block).orThunk(inSelection).orThunk(onlyOne);
};

/** Ce nœud est-il un conteneur de diaporama ? */
const isContainer = (editor: Editor, node: Node | null): node is HTMLElement =>
  Type.isNonNullable(node) && node.nodeType === 1
  && Arr.exists(Arr.from((node as HTMLElement).children), (child) =>
    editor.dom.hasClass(child as HTMLElement, wrapperClass));

export {
  callRegExp,
  callsIn,
  codeOf,
  setCode,
  scripts,
  matches,
  all,
  at,
  forBlock,
  isContainer
};
