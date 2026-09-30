import { Arr, Obj, Optional, Type } from '@ephox/katamari';

/**
 * Lecture et écriture d'un **littéral objet javascript**, sans jamais l'exécuter.
 *
 * La configuration d'un diaporama Swiper est écrite à la main dans le script de la page :
 *
 * ```js
 * swiper = new Swiper('.mySwiper', {
 *   spaceBetween: 30,
 *   autoplay: { delay: 2500, disableOnInteraction: true },
 *   breakpoints: { '@1.5': { slidesPerView: 1.8 } }
 * });
 * ```
 *
 * Pour proposer un formulaire, il faut lire cet objet. `eval` et `new Function` sont exclus : le
 * script vient du contenu, et le contenu ne s'exécute jamais dans l'éditeur — c'est la règle qui
 * fait qu'un bloc collé ne peut rien atteindre. `JSON.parse` ne convient pas davantage : les clés
 * sont nues, les guillemets simples, et il y a des virgules finales et des commentaires.
 *
 * Ce module lit donc lui-même, caractère par caractère, ce que le langage autorise ici : objets,
 * tableaux, chaînes, nombres, `true`, `false`, `null`. **Tout le reste** — une fonction, un appel,
 * une variable, un calcul — est conservé sous forme de texte brut et réécrit à l'identique. Une
 * configuration dont le plugin ne comprend qu'une partie n'est donc jamais abîmée : ce qu'il ne
 * sait pas lire, il le recopie.
 *
 * ## Ce qui est garanti
 *
 * * une valeur lue puis réécrite sans modification produit un texte **équivalent** — pas forcément
 *   identique au caractère près : l'indentation et les guillemets sont normalisés ;
 * * une expression non littérale traverse la lecture et l'écriture **sans être touchée** ;
 * * une entrée illisible fait échouer la lecture proprement, et l'appelant laisse alors le script
 *   tel quel plutôt que d'en réécrire une version approximative.
 *
 * ## Ce qui est perdu, et pourquoi c'est assumé
 *
 * Les **commentaires placés dans l'objet** ne survivent pas à une réécriture. Un commentaire n'est
 * pas une donnée : il n'a pas de place dans la structure lue, et le réattacher à la bonne ligne
 * demanderait de mémoriser des positions qui ne veulent plus rien dire une fois l'objet modifié.
 * En pratique il s'agit presque toujours d'une option mise de côté entre commentaires — les
 * flèches de navigation, par exemple — que le formulaire propose désormais d'activer d'une case
 * à cocher.
 *
 * Le reste de la ligne, l'indentation d'origine et l'ordre des clés existantes sont conservés.
 */

/** Une expression que le lecteur n'interprète pas : son texte, réécrit tel quel. */
export interface RawExpression {
  readonly raw: string;
}

export type JsValue = string | number | boolean | null | RawExpression | JsValue[] | JsObjectValue;

export interface JsObjectValue {
  readonly [key: string]: JsValue;
}

/**
 * Cette valeur est-elle une expression laissée telle quelle ?
 *
 * Le seul objet qui n'a **que** la clé `raw`, portant une chaîne. Une configuration qui
 * contiendrait réellement une propriété nommée `raw` — Swiper n'en a pas — s'écrirait alors comme
 * l'expression qu'elle contient : le cas est signalé ici pour qu'il ne surprenne personne.
 */
const isRaw = (value: JsValue): value is RawExpression =>
  Type.isObject(value) && !Type.isArray(value)
  && Type.isString((value as RawExpression).raw)
  && Obj.keys(value as Record<string, unknown>).length === 1;

interface Cursor {
  readonly text: string;
  index: number;
  /** Profondeur d'imbrication en cours, pour ne pas descendre indéfiniment. */
  depth: number;
}

/**
 * Profondeur d'imbrication acceptée.
 *
 * La lecture est récursive : un littéral `{{{{…` de plusieurs milliers de niveaux épuiserait la
 * pile d'appels. Aucune configuration de diaporama n'atteint cinq niveaux ; en refuser au-delà de
 * trente coûte un test par accolade et ferme la question.
 */
const maxDepth = 30;

const isSpace = (character: string): boolean => /\s/.test(character);

/** Avance sur les espaces et les commentaires, qui n'ont de sens ni pour l'un ni pour l'autre. */
const skipTrivia = (cursor: Cursor): void => {
  for (;;) {
    while (cursor.index < cursor.text.length && isSpace(cursor.text[cursor.index])) {
      cursor.index += 1;
    }
    const two = cursor.text.substr(cursor.index, 2);
    if (two === '//') {
      const end = cursor.text.indexOf('\n', cursor.index);
      cursor.index = end === -1 ? cursor.text.length : end + 1;
    } else if (two === '/*') {
      const end = cursor.text.indexOf('*/', cursor.index);
      cursor.index = end === -1 ? cursor.text.length : end + 2;
    } else {
      return;
    }
  }
};

/** Lit la chaîne ouverte au curseur, en tenant compte des échappements. */
const readString = (cursor: Cursor): Optional<string> => {
  const quote = cursor.text[cursor.index];
  const escapes: Record<string, string> = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', v: '\v' };
  let out = '';
  cursor.index += 1;

  while (cursor.index < cursor.text.length) {
    const character = cursor.text[cursor.index];
    if (character === '\\') {
      const next = cursor.text[cursor.index + 1] ?? '';
      out += escapes[next] ?? next;
      cursor.index += 2;
    } else if (character === quote) {
      cursor.index += 1;
      return Optional.some(out);
    } else {
      out += character;
      cursor.index += 1;
    }
  }
  return Optional.none();
};

const numberRegExp = /^-?(?:0[xX][\da-fA-F]+|\d+\.?\d*(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?)/;

/**
 * Avale une expression que le lecteur n'interprète pas.
 *
 * Les parenthèses, crochets et accolades sont équilibrés, et les chaînes traversées sans se
 * laisser tromper par les séparateurs qu'elles contiennent : `onSlideChange: function () { return
 * "a, b"; }` est repris d'un seul tenant. L'avancée s'arrête sur la virgule ou l'accolade qui
 * ferme le niveau courant.
 */
const readRaw = (cursor: Cursor): Optional<string> => {
  const start = cursor.index;
  let depth = 0;

  while (cursor.index < cursor.text.length) {
    const character = cursor.text[cursor.index];

    if (character === '"' || character === '\'' || character === '`') {
      if (readString(cursor).isNone()) {
        return Optional.none();
      }
      continue;
    }
    if (character === '(' || character === '[' || character === '{') {
      depth += 1;
    } else if (character === ')' || character === ']' || character === '}') {
      if (depth === 0) {
        break;
      }
      depth -= 1;
    } else if (character === ',' && depth === 0) {
      break;
    }
    cursor.index += 1;
  }

  const raw = cursor.text.substring(start, cursor.index).trim();
  return raw === '' ? Optional.none() : Optional.some(raw);
};

const readArray = (cursor: Cursor): Optional<JsValue[]> => {
  if (cursor.depth >= maxDepth) {
    return Optional.none();
  }
  cursor.index += 1;
  cursor.depth += 1;
  const out: JsValue[] = [];

  for (;;) {
    skipTrivia(cursor);
    if (cursor.text[cursor.index] === ']') {
      cursor.index += 1;
      cursor.depth -= 1;
      return Optional.some(out);
    }
    if (cursor.index >= cursor.text.length) {
      return Optional.none();
    }
    const value = readValue(cursor);
    if (value.isNone()) {
      return Optional.none();
    }
    out.push(value.getOrDie());
    skipTrivia(cursor);
    if (cursor.text[cursor.index] === ',') {
      cursor.index += 1;
    }
  }
};

/**
 * Lit le nom d'une propriété.
 *
 * Trois écritures, et les trois se rencontrent dans les configurations de diaporama :
 *
 * * un identifiant — `slidesPerView` ;
 * * une chaîne — `'@1.5'`, quand le nom ne peut pas s'écrire nu ;
 * * un **nombre** — `768: { slidesPerView: 2 }`, qui est la façon la plus répandue d'écrire un
 *   palier d'écran en pixels. Javascript l'accepte comme clé et le convertit en chaîne ; le
 *   refuser rendait illisibles la moitié des configurations réelles.
 */
const readKey = (cursor: Cursor): Optional<string> => {
  skipTrivia(cursor);
  const character = cursor.text[cursor.index];
  if (character === '"' || character === '\'') {
    return readString(cursor);
  }
  const nom = /^(?:[A-Za-z_$@][\w$@.-]*|\d+(?:\.\d+)?)/.exec(cursor.text.substring(cursor.index));
  if (nom === null) {
    return Optional.none();
  }
  cursor.index += nom[0].length;
  return Optional.some(nom[0]);
};

const readObject = (cursor: Cursor): Optional<JsObjectValue> => {
  if (cursor.depth >= maxDepth) {
    return Optional.none();
  }
  cursor.index += 1;
  cursor.depth += 1;
  const out: Record<string, JsValue> = {};

  for (;;) {
    skipTrivia(cursor);
    if (cursor.text[cursor.index] === '}') {
      cursor.index += 1;
      cursor.depth -= 1;
      return Optional.some(out);
    }
    if (cursor.index >= cursor.text.length) {
      return Optional.none();
    }

    const key = readKey(cursor);
    if (key.isNone()) {
      return Optional.none();
    }
    skipTrivia(cursor);
    if (cursor.text[cursor.index] !== ':') {
      return Optional.none();
    }
    cursor.index += 1;

    const value = readValue(cursor);
    if (value.isNone()) {
      return Optional.none();
    }
    out[key.getOrDie()] = value.getOrDie();

    skipTrivia(cursor);
    if (cursor.text[cursor.index] === ',') {
      cursor.index += 1;
    }
  }
};

const readValue = (cursor: Cursor): Optional<JsValue> => {
  skipTrivia(cursor);
  const character = cursor.text[cursor.index];

  if (!Type.isString(character)) {
    return Optional.none();
  }
  if (character === '"' || character === '\'') {
    return readString(cursor).map((value) => value as JsValue);
  }
  if (character === '{') {
    return readObject(cursor).map((value) => value as JsValue);
  }
  if (character === '[') {
    return readArray(cursor).map((value) => value as JsValue);
  }

  const rest = cursor.text.substring(cursor.index);
  if (/^true\b/.test(rest)) {
    cursor.index += 4;
    return Optional.some(true);
  }
  if (/^false\b/.test(rest)) {
    cursor.index += 5;
    return Optional.some(false);
  }
  if (/^null\b/.test(rest)) {
    cursor.index += 4;
    return Optional.some(null);
  }

  const number = numberRegExp.exec(rest);
  if (number !== null) {
    // Un nombre suivi d'un opérateur — `2 * 60` — n'est pas un littéral : il repart en brut, pour
    // que le calcul soit réécrit tel qu'il a été pensé plutôt que remplacé par son résultat.
    const after = rest.substring(number[0].length);
    if (after.trim() !== '' && !/^\s*[,}\]]/.test(after)) {
      return readRaw(cursor).map((raw) => ({ raw }) as JsValue);
    }
    cursor.index += number[0].length;
    return Optional.some(parseFloat(number[0]));
  }

  return readRaw(cursor).map((raw) => ({ raw }) as JsValue);
};

/** Lit un littéral objet complet. Rend `none` si le texte n'en est pas un. */
const parse = (text: string): Optional<JsObjectValue> => {
  const cursor: Cursor = { text, index: 0, depth: 0 };
  skipTrivia(cursor);
  if (cursor.text[cursor.index] !== '{') {
    return Optional.none();
  }
  return readObject(cursor);
};

/**
 * Fin du littéral objet qui commence à `start`, ou `-1`.
 *
 * Sert à remplacer la configuration **dans le script** sans toucher au reste : on connaît alors
 * l'intervalle exact à réécrire.
 */
const endOfObject = (text: string, start: number): number => {
  const cursor: Cursor = { text, index: start, depth: 0 };
  skipTrivia(cursor);
  if (cursor.text[cursor.index] !== '{') {
    return -1;
  }
  return readObject(cursor).fold(() => -1, () => cursor.index);
};

const quote = (value: string): string =>
  `'${value.replace(/\\/g, '\\\\').replace(/'/g, '\\\'').replace(/\n/g, '\\n').replace(/\r/g, '')}'`;

/** Une clé s'écrit nue quand elle est un identifiant, entre guillemets sinon (`'@1.5'`). */
const writeKey = (key: string): string =>
  /^[A-Za-z_$][\w$]*$/.test(key) ? key : quote(key);

const indentOf = (depth: number): string => '  '.repeat(depth);

const write = (value: JsValue, depth: number = 0): string => {
  if (Type.isString(value)) {
    return quote(value);
  }
  if (Type.isNumber(value) || Type.isBoolean(value)) {
    return String(value);
  }
  if (value === null) {
    return 'null';
  }
  if (Type.isArray(value)) {
    if (value.length === 0) {
      return '[]';
    }
    const items = Arr.map(value, (entry) => `${indentOf(depth + 1)}${write(entry, depth + 1)}`);
    return `[\n${items.join(',\n')}\n${indentOf(depth)}]`;
  }
  if (isRaw(value)) {
    return value.raw;
  }

  const record = value as JsObjectValue;
  const keys = Obj.keys(record);
  if (keys.length === 0) {
    return '{}';
  }
  const entries = Arr.map(keys, (key) =>
    `${indentOf(depth + 1)}${writeKey(key)}: ${write(record[key], depth + 1)}`);
  return `{\n${entries.join(',\n')}\n${indentOf(depth)}}`;
};

export {
  isRaw,
  parse,
  endOfObject,
  quote,
  writeKey,
  write
};
