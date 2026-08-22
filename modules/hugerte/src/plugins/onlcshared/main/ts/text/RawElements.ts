import { Arr } from '@ephox/katamari';

/**
 * Les zones d'une chaîne html où le texte n'est **pas** du html : le corps d'un `script`, celui
 * d'un `style`.
 *
 * Plusieurs plugins réécrivent la chaîne html brute avant que l'éditeur ne l'analyse, faute de
 * pouvoir faire autrement : un code court n'est pas un élément, aucun filtre de nœud ne pourrait
 * le voir. Ces réécritures doivent s'arrêter aux portes d'un `script`, où le même motif ne veut
 * plus dire la même chose.
 *
 * L'exemple qui a révélé le besoin : une fiche de microdonnées dont le nom du produit valait
 * `[LG=fr]Coque de clef[/LG][LG=en]Key case[/LG]`. Le plugin des langues, voyant le motif, le
 * remplaçait par un élément — dont les attributs portent des guillemets. Ces guillemets tombaient
 * au milieu d'une chaîne json, la fiche devenait illisible, et l'éditeur affichait une fiche
 * vide. Le contenu du site, lui, était parfaitement correct : c'est bien nous qui le cassions.
 */

/** Un intervalle `[start, end[` de la chaîne, en indices de caractères. */
export interface Span {
  readonly start: number;
  readonly end: number;
}

const bodyRegExp = /<(script|style)\b[^>]*>([\s\S]*?)<\/\1\s*>/gi;

/**
 * Les corps de `script` et de `style` d'une chaîne html.
 *
 * Seul le **contenu** est retenu, pas la balise : un code court écrit dans un attribut de la
 * balise ouvrante reste, lui, du html, et continue d'être traité comme tel.
 */
const spansOf = (html: string): Span[] => {
  const spans: Span[] = [];
  const pattern = new RegExp(bodyRegExp.source, 'gi');
  let match = pattern.exec(html);
  while (match !== null) {
    const start = match.index + match[0].indexOf('>') + 1;
    spans.push({ start, end: start + match[2].length });
    match = pattern.exec(html);
  }
  return spans;
};

/**
 * Les **balises** d'une chaîne html : de leur `<` à leur `>` compris.
 *
 * Ce qui est écrit là n'est pas du contenu, c'est de la structure. Une page réelle porte
 * `class="screen6 [LG=fr]label-fr[/LG][LG=en]label-en[/LG]"` : le moteur du site choisit la
 * classe selon la langue demandée, exactement comme il choisit un morceau de texte. Le plugin
 * des langues, lui, y voyait des sections à transformer en éléments — et posait un `span` **au
 * milieu d'une balise ouvrante**, qui n'en était plus une.
 *
 * Les guillemets sont suivis : un `>` dans une valeur d'attribut ne ferme pas la balise.
 */
const tagSpansOf = (html: string): Span[] => {
  const spans: Span[] = [];
  let index = 0;

  while (index < html.length) {
    const open = html.indexOf('<', index);
    if (open === -1) {
      break;
    }
    let cursor = open + 1;
    let quote = '';
    while (cursor < html.length) {
      const ch = html.charAt(cursor);
      if (quote !== '') {
        if (ch === quote) {
          quote = '';
        }
      } else if (ch === '"' || ch === '\'') {
        quote = ch;
      } else if (ch === '>') {
        break;
      }
      cursor += 1;
    }
    // Une balise qui ne se referme pas emporte le reste de la chaîne, comme pour un navigateur.
    const end = cursor >= html.length ? html.length : cursor + 1;
    spans.push({ start: open, end });
    index = end;
  }

  return spans;
};

/**
 * Tout ce qui n'est pas du texte de contenu : les balises, et le corps des `script` et `style`.
 *
 * Les intervalles sont rendus dans l'ordre du document ; ils ne se chevauchent pas, un corps de
 * `script` étant par construction situé entre deux balises.
 */
const nonTextSpansOf = (html: string): Span[] =>
  Arr.sort(spansOf(html).concat(tagSpansOf(html)), (a, b) => a.start - b.start);

/**
 * Cette position est-elle **strictement à l'intérieur** de l'un de ces intervalles ?
 *
 * La nuance compte pour les balises. `<multilang lang="fr">` **est** un marqueur de langue : sa
 * position de départ est celle du chevron, et l'exclure reviendrait à ne plus jamais reconnaître
 * cette écriture. `class="a [LG=fr]b[/LG]"`, lui, commence après le chevron : il est bien dans
 * la balise, et n'est pas du contenu.
 */
const strictlyInside = (spans: Span[], index: number): boolean =>
  Arr.exists(spans, (span) => index > span.start && index < span.end);

/** Cette position tombe-t-elle dans l'un de ces intervalles ? */
const contains = (spans: Span[], index: number): boolean =>
  Arr.exists(spans, (span) => index >= span.start && index < span.end);

/** Cet intervalle touche-t-il l'un de ces intervalles ? */
const overlaps = (spans: Span[], start: number, end: number): boolean =>
  Arr.exists(spans, (span) => start < span.end && end > span.start);

export {
  spansOf,
  tagSpansOf,
  nonTextSpansOf,
  strictlyInside,
  contains,
  overlaps
};
