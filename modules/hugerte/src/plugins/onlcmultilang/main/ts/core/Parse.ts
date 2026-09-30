import { Arr } from '@ephox/katamari';

/**
 * Lecture des deux écritures polyglottes des gabarits Online Création.
 *
 * ```
 * [LG="fr"]Bonjour[/LG]                         du texte, dans une langue
 * <multilang lang="fr"><h2>Bonjour</h2></multilang>   n'importe quoi, dans une langue
 * ```
 *
 * Les deux formes font la même chose — ne garder un passage que pour une langue — et les deux
 * peuvent encadrer aussi bien trois mots qu'une suite de blocs entiers. Elles ne sont donc pas
 * distinguées par ce qu'elles contiennent, mais seulement par la façon dont elles s'écrivent.
 *
 * ## Pourquoi les motifs sont si stricts
 *
 * Ils reproduisent **au caractère près** ceux du moteur de rendu du site (`page.inc.v3.php`) :
 *
 * ```php
 * preg_match_all("/\[LG=\"?'?([A-Za-z][A-Za-z])\"?'?\]([^\[]*)\[\/LG\]/ims", …);
 * preg_match_all("/(?<=\<multilang lang=\"([A-Za-z][A-Za-z])\">).*?(?=\<\/multilang\>)/ims", …);
 * ```
 *
 * Être plus tolérant ici serait un piège : l'éditeur montrerait une section bien reconnue là où
 * le site, lui, publierait les marqueurs en toutes lettres au milieu de la page. Un `[LG = "fr"]`
 * avec des espaces reste donc du texte ordinaire — dans l'éditeur comme sur le site.
 *
 * ## La limite du `[LG]`
 *
 * Le motif du site s'arrête au premier crochet ouvrant (`[^\[]*`) : un `[LG]` ne peut pas
 * contenir de code court. C'est une contrainte du site, pas un choix ; elle est reproduite telle
 * quelle à la lecture, et c'est `canUseLg` qui la fait respecter à l'écriture.
 */

export type Syntax = 'lg' | 'multilang';

export interface Section {
  readonly syntax: Syntax;
  /** Code de langue, en minuscules et sur deux lettres. */
  readonly code: string;
  /** Ce qui est encadré, tel quel. */
  readonly inner: string;
  readonly start: number;
  readonly end: number;
}

/** Éléments qui n'ont jamais de balise fermante : ils ne comptent pas dans l'équilibre. */
const voidElements = [
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr'
];

/** Éléments qui font passer une section du texte au bloc, et donc du `span` au `div`. */
const blockElements = [
  'address', 'article', 'aside', 'blockquote', 'div', 'dl', 'dd', 'dt', 'fieldset',
  'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'header', 'hr', 'li', 'main', 'nav', 'ol', 'p', 'pre', 'section', 'table',
  'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'ul'
];

const isCode = (value: string): boolean => /^[a-z]{2}$/.test(value);

/** Motifs neufs à chaque appel : `lastIndex` est mutable, et un motif partagé se souviendrait. */
const lgPattern = (): RegExp => /\[LG=["']?([A-Za-z]{2})["']?\]([^[]*)\[\/LG\]/gi;
const multilangPattern = (): RegExp => /<multilang lang="([A-Za-z]{2})">([\s\S]*?)<\/multilang>/gi;

const tagPattern = (): RegExp => /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;

const collect = (html: string, pattern: RegExp, syntax: Syntax): Section[] => {
  const found: Section[] = [];
  let match = pattern.exec(html);

  while (match !== null) {
    found.push({
      syntax,
      code: match[1].toLowerCase(),
      inner: match[2],
      start: match.index,
      end: match.index + match[0].length
    });
    match = pattern.exec(html);
  }

  return found;
};

/**
 * Toutes les sections d'une chaîne html, dans l'ordre où elles apparaissent.
 *
 * Les deux écritures sont relevées séparément puis fusionnées. Une section qui en chevauche une
 * autre est écartée : les deux motifs du site ne s'imbriquent pas, et une écriture qui prétend
 * le contraire est plus sûrement une coïncidence dans du texte qu'une intention.
 */
const sections = (html: string): Section[] => {
  const all = collect(html, lgPattern(), 'lg').concat(collect(html, multilangPattern(), 'multilang'));
  const ordered = all.slice().sort((a, b) => a.start - b.start);

  return Arr.foldl(ordered, (kept: Section[], section) => {
    const last = kept[kept.length - 1];
    return last !== undefined && section.start < last.end ? kept : kept.concat([ section ]);
  }, []);
};

/**
 * Les balises de ce fragment se referment-elles toutes, et dans l'ordre ?
 *
 * Une section dont les marqueurs tombent de part et d'autre d'une balise — le `[LG]` dans un
 * paragraphe, le `[/LG]` dans le suivant — ne peut pas devenir un élément sans déplacer du
 * contenu. Elle est laissée telle quelle, en toutes lettres : illisible, mais intacte.
 */
const isBalanced = (html: string): boolean => {
  const pattern = tagPattern();
  const stack: string[] = [];
  let match = pattern.exec(html);

  while (match !== null) {
    const closing = match[1] === '/';
    const name = match[2].toLowerCase();
    const selfClosing = match[3].slice(-1) === '/';

    if (Arr.contains(voidElements, name) || selfClosing) {
      // Rien à empiler.
    } else if (closing) {
      if (stack.pop() !== name) {
        return false;
      }
    } else {
      stack.push(name);
    }
    match = pattern.exec(html);
  }

  return stack.length === 0;
};

/** Ce fragment contient-il un élément de bloc ? Un `span` ne pourrait pas l'encadrer. */
const hasBlock = (html: string): boolean => {
  const pattern = tagPattern();
  let match = pattern.exec(html);

  while (match !== null) {
    if (Arr.contains(blockElements, match[2].toLowerCase())) {
      return true;
    }
    match = pattern.exec(html);
  }

  return false;
};

/**
 * Le contenu peut-il s'écrire en `[LG]` ?
 *
 * Non dès qu'il porte un crochet ouvrant : le moteur du site s'arrêterait là, et la page
 * publierait les marqueurs au lieu de les interpréter.
 */
const canUseLg = (inner: string): boolean => inner.indexOf('[') === -1;

const openTag = (syntax: Syntax, code: string): string =>
  syntax === 'lg' ? `[LG="${code}"]` : `<multilang lang="${code}">`;

const closeTag = (syntax: Syntax): string =>
  syntax === 'lg' ? '[/LG]' : '</multilang>';

const wrap = (syntax: Syntax, code: string, inner: string): string =>
  openTag(syntax, code) + inner + closeTag(syntax);

/**
 * Ne garde que ce qui s'adresse à une langue, comme le fait le site.
 *
 * Les sections des autres langues disparaissent, marqueurs compris ; le texte hors section reste
 * intact — il est commun à toutes les langues.
 */
const resolve = (html: string, code: string): string => {
  const wanted = code.toLowerCase();

  return Arr.foldr(sections(html), (result: string, section) => {
    const replacement = section.code === wanted ? section.inner : '';
    return result.slice(0, section.start) + replacement + result.slice(section.end);
  }, html);
};

/** Codes de langue présents dans une chaîne, sans doublon et dans l'ordre d'apparition. */
const codesOf = (html: string): string[] =>
  Arr.foldl(sections(html), (codes: string[], section) =>
    Arr.contains(codes, section.code) ? codes : codes.concat([ section.code ]), []);

export {
  voidElements,
  blockElements,
  isCode,
  sections,
  isBalanced,
  hasBlock,
  canUseLg,
  openTag,
  closeTag,
  wrap,
  resolve,
  codesOf
};
