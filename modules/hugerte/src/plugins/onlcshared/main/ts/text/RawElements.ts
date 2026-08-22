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

/** Cette position tombe-t-elle dans l'un de ces intervalles ? */
const contains = (spans: Span[], index: number): boolean =>
  Arr.exists(spans, (span) => index >= span.start && index < span.end);

/** Cet intervalle touche-t-il l'un de ces intervalles ? */
const overlaps = (spans: Span[], start: number, end: number): boolean =>
  Arr.exists(spans, (span) => start < span.end && end > span.start);

export {
  spansOf,
  contains,
  overlaps
};
