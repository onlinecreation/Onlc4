import { Arr, Optional, Strings } from '@ephox/katamari';

/**
 * Small scoring search used by both the emoji and the icon lists: an exact match comes first,
 * then a match at the beginning of the name, then a keyword match.
 */

export interface Searchable {
  readonly title: string;
  readonly keywords: string[];
}

const normalize = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    // Search without accents: "café" and "cafe" find the same entries
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const scoreOf = (item: Searchable, pattern: string): Optional<number> => {
  const title = normalize(item.title);

  if (title === pattern) {
    return Optional.some(0);
  } else if (Strings.startsWith(title, pattern)) {
    return Optional.some(1);
  } else if (title.indexOf(pattern) !== -1) {
    return Optional.some(2);
  }

  const keywordScore = Arr.foldl(item.keywords, (acc: Optional<number>, keyword) => {
    const normalized = normalize(keyword);
    if (normalized === pattern) {
      return Optional.some(Math.min(acc.getOr(3), 3));
    } else if (Strings.startsWith(normalized, pattern)) {
      return Optional.some(Math.min(acc.getOr(4), 4));
    } else if (normalized.indexOf(pattern) !== -1) {
      return Optional.some(Math.min(acc.getOr(5), 5));
    } else {
      return acc;
    }
  }, Optional.none<number>());

  return keywordScore;
};

const search = <T extends Searchable>(items: T[], rawPattern: string, limit: Optional<number>): T[] => {
  const pattern = normalize(rawPattern);

  const matched = pattern.length === 0
    ? Arr.map(items, (item) => ({ item, score: 0 }))
    : Arr.bind(items, (item) => scoreOf(item, pattern).map((score) => ({ item, score })).toArray());

  const sorted = pattern.length === 0
    ? matched
    : Arr.sort(matched, (a, b) => a.score - b.score);

  const limited = limit.fold(() => sorted, (max) => sorted.slice(0, max));
  return Arr.map(limited, (entry) => entry.item);
};

export {
  normalize,
  search
};
