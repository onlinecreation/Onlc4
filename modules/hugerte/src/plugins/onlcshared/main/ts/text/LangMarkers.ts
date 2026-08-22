import { Arr, Fun, Type } from '@ephox/katamari';

/**
 * Les marqueurs de langue du moteur de site, lus et composés comme **valeur**.
 *
 * Le moteur d'Online Création publie une page dans une langue en ne gardant que ce qui porte la
 * bonne marque : `[LG=fr]Coque de clef[/LG][LG=en]Key case[/LG]`. C'est vrai du texte de la page,
 * et c'est vrai aussi de ce qui n'en est pas — le nom d'un produit dans une fiche de
 * microdonnées, par exemple, où la même chaîne se retrouve telle quelle.
 *
 * `onlcmultilang` transforme ces marqueurs en **sections**, parce que dans une page ce sont des
 * morceaux de contenu. Ici ce sont des **valeurs** : une chaîne dans un formulaire, à découper en
 * versions et à recomposer. D'où ce module, qui ne connaît que du texte.
 *
 * Les deux écritures du moteur sont lues ; une seule est écrite — `[LG]`, la plus courte, et
 * celle que les pages existantes emploient dans leurs données.
 */

export interface LangPart {
  /** Code à deux lettres, en minuscules. */
  readonly code: string;
  readonly text: string;
}

export interface LangValue {
  /**
   * Ce qui est hors marqueur : la version **internationale**, publiée quelle que soit la langue
   * demandée. C'est le cas ordinaire, et celui d'une valeur qui n'a jamais été traduite.
   */
  readonly common: string;
  /** Les versions propres à une langue, dans l'ordre où elles étaient écrites. */
  readonly parts: LangPart[];
}

/** `[LG=fr]…[/LG]`, avec ou sans guillemets, et `<multilang lang="fr">…</multilang>`. */
const bracketPattern = (): RegExp => /\[LG=["']?([A-Za-z]{2})["']?\]([\s\S]*?)\[\/LG\]/gi;
const tagPattern = (): RegExp => /<multilang\s+lang=["']?([A-Za-z]{2})["']?\s*>([\s\S]*?)<\/multilang\s*>/gi;

const isCode = (value: string): boolean => /^[A-Za-z]{2}$/.test(value);

/**
 * Découpe une valeur en version internationale et versions par langue.
 *
 * Une valeur sans marqueur ressort entièrement en `common` : c'est le cas de loin le plus
 * fréquent, et il ne doit rien coûter.
 */
const parse = (value: string): LangValue => {
  const text = Type.isString(value) ? value : '';
  if (text.indexOf('[LG=') === -1 && text.toLowerCase().indexOf('<multilang') === -1) {
    return { common: text, parts: [] };
  }

  const parts: LangPart[] = [];
  let rest = text;

  Arr.each([ bracketPattern(), tagPattern() ], (pattern) => {
    rest = rest.replace(pattern, (_all, code: string, inner: string) => {
      parts.push({ code: code.toLowerCase(), text: inner });
      return '';
    });
  });

  return { common: rest.trim(), parts };
};

/** La version d'une langue, ou la chaîne vide si elle n'est pas définie. */
const textOf = (value: LangValue, code: string): string =>
  Arr.find(value.parts, (part) => part.code === code.toLowerCase())
    .fold(Fun.constant(''), (part) => part.text);

/** Les langues pour lesquelles une version est écrite. */
const codesOf = (value: LangValue): string[] =>
  Arr.map(Arr.filter(value.parts, (part) => part.text.trim() !== ''), (part) => part.code);

/**
 * Pose — ou retire — la version d'une langue, en gardant l'ordre des autres.
 *
 * Un texte vide **retire** la version : c'est ainsi qu'on revient à l'international, sans avoir
 * à chercher un bouton « supprimer cette langue ».
 */
const withText = (value: LangValue, code: string, text: string): LangValue => {
  const wanted = code.toLowerCase();
  if (!isCode(wanted)) {
    return value;
  }
  const known = Arr.exists(value.parts, (part) => part.code === wanted);
  if (!known) {
    return text === '' ? value : { common: value.common, parts: value.parts.concat([{ code: wanted, text }]) };
  }
  return {
    common: value.common,
    parts: Arr.bind(value.parts, (part) => {
      if (part.code !== wanted) {
        return [ part ];
      }
      return text === '' ? [] : [{ code: wanted, text }];
    })
  };
};

const withCommon = (value: LangValue, common: string): LangValue => ({ common, parts: value.parts });

/**
 * Recompose la chaîne à écrire dans la fiche.
 *
 * La partie internationale vient d'abord : le moteur publie tout ce qui est hors marqueur, et la
 * lire en tête est plus naturel que de la trouver après trois versions traduites.
 */
const compose = (value: LangValue): string => {
  const marks = Arr.map(
    Arr.filter(value.parts, (part) => part.text.trim() !== ''),
    (part) => `[LG=${part.code}]${part.text}[/LG]`).join('');
  return `${value.common}${marks}`;
};

export {
  isCode,
  parse,
  textOf,
  codesOf,
  withText,
  withCommon,
  compose
};
