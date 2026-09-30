import { Arr } from '@ephox/katamari';

/**
 * Aperçu d'un code affiché dans la zone d'édition. Un bloc de code n'a pas à être lu en entier
 * dans la page : les premières lignes suffisent à le reconnaître, et une ligne « … » indique
 * qu'il continue. Le compte de lignes est le même pour un script et pour un widget html, de
 * sorte que les deux jetons se ressemblent.
 */

const defaultLines = 3;
const maxColumns = 90;

const ellipsis = '…';

const clip = (line: string): string =>
  line.length > maxColumns ? `${line.substring(0, maxColumns - 1)}${ellipsis}` : line;

/**
 * Renvoie les `count` premières lignes non vides du code, suivies d'une ligne `…` s'il en
 * reste. Les tabulations sont converties pour que l'indentation reste lisible.
 */
const lines = (code: string, count: number = defaultLines): string[] => {
  const all = code.replace(/\t/g, '  ').replace(/\r\n?/g, '\n').split('\n');
  const start = Arr.findIndex(all, (line) => line.trim() !== '').getOr(-1);

  if (start === -1) {
    return [];
  }

  const kept = Arr.map(all.slice(start, start + count), clip);
  const rest = all.slice(start + count);
  const hasMore = Arr.exists(rest, (line) => line.trim() !== '');

  return hasMore ? kept.concat([ ellipsis ]) : kept;
};

/** Même aperçu, sous forme de texte prêt à être inséré dans un élément `white-space: pre`. */
const text = (code: string, count: number = defaultLines): string => lines(code, count).join('\n');

export {
  defaultLines,
  ellipsis,
  lines,
  text
};
