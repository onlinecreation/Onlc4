import { Arr, Obj, Type } from '@ephox/katamari';

/**
 * Markup helpers shared by the built-in widget definitions.
 */

const escape = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * Attributs qui désignent une ressource, et dont le schéma doit être vérifié.
 *
 * Les blocs « canoniques » sont réécrits **après** le nettoyage du cœur : leur code part vers la
 * page sans repasser par le désinfectant, et l'option `allow_script_urls` ne les protège donc
 * pas. Un `javascript:` glissé dans l'adresse d'un lien ou d'une intégration s'exécuterait chez
 * le visiteur. Le contrôle est fait ici, au plus près de l'écriture.
 */
const urlAttributes = [ 'href', 'src', 'action', 'formaction', 'poster', 'data', 'srcset', 'background' ];

const dangerousScheme = /^\s*(javascript|vbscript|livescript|mocha)\s*:/i;

/**
 * Adresse acceptable dans un attribut. Les schémas exécutables sont refusés, ainsi que les
 * `data:` autres qu'une image — une page `data:text/html` s'ouvre avec les droits du site.
 */
const isSafeUrl = (value: string): boolean => {
  const trimmed = value.trim().replace(/[\u0000-\u001F\u007F]/g, '');
  if (dangerousScheme.test(trimmed)) {
    return false;
  }
  return !/^\s*data\s*:/i.test(trimmed) || /^\s*data\s*:\s*image\//i.test(trimmed);
};

/** Renders `name="value"`, or nothing when the value is empty. */
const attr = (name: string, value: string | undefined | null): string => {
  if (!Type.isString(value) || value === '') {
    return '';
  }
  if (Arr.contains(urlAttributes, name.toLowerCase()) && !isSafeUrl(value)) {
    return '';
  }
  return ` ${name}="${escape(value)}"`;
};

/** Renders a boolean attribute. */
const boolAttr = (name: string, value: boolean): string => value ? ` ${name}` : '';

const classes = (...values: Array<string | undefined | false>): string => {
  const list = Arr.filter(values, (value) => Type.isString(value) && value.trim() !== '') as string[];
  return list.length === 0 ? '' : ` class="${escape(list.join(' ').replace(/\s+/g, ' ').trim())}"`;
};

const style = (declarations: Record<string, string | undefined>): string => {
  const parts: string[] = [];
  Obj.each(declarations, (value, key) => {
    if (Type.isString(value) && value.trim() !== '') {
      parts.push(`${key}: ${value.trim()}`);
    }
  });
  return parts.length === 0 ? '' : ` style="${escape(parts.join('; '))}"`;
};

/** Adds a unit to a bare number, so that `320` and `320px` both work in the dialogs. */
const withUnit = (value: string | undefined, unit = 'px'): string => {
  if (!Type.isString(value) || value.trim() === '') {
    return '';
  }
  const trimmed = value.trim();
  return /^-?[\d.]+$/.test(trimmed) ? `${trimmed}${unit}` : trimmed;
};

const isTrue = (value: string | undefined): boolean => value === 'true' || value === '1' || value === 'on';

/**
 * Adresse utilisable dans une déclaration `url(...)`.
 *
 * Deux précautions : n'accepter que des schémas inoffensifs — une image ne se charge pas depuis
 * `javascript:` — et neutraliser les caractères qui refermeraient la parenthèse ou la
 * déclaration, ce qui permettrait d'ajouter d'autres règles css par-dessous.
 */
const cssUrl = (value: string | undefined): string => {
  if (!Type.isString(value)) {
    return '';
  }
  const trimmed = value.trim();
  if (trimmed === '' || /^\s*(javascript|vbscript)\s*:/i.test(trimmed)) {
    return '';
  }
  // `encodeURIComponent` laisse passer les parenthèses et l'apostrophe : la table est explicite.
  const escapes: Record<string, string> = {
    '\\': '%5C', '"': '%22', '\'': '%27', '(': '%28', ')': '%29'
  };
  const safe = trimmed.replace(/[\\"'()]|\s/g, (character) => escapes[character] ?? '%20');
  return `url("${safe}")`;
};

/**
 * Sérialise une valeur pour l'insérer dans un `<script>`.
 *
 * `JSON.stringify` seul ne suffit pas : une chaîne contenant `</script>` refermerait la balise
 * et le reste serait interprété comme du html. Les caractères `<`, `>` et `&` sont donc écrits
 * sous forme d'échappements unicode, de même que les séparateurs de ligne U+2028 et U+2029 qui
 * sont des fins d'instruction en javascript.
 */
const jsonForScript = (value: unknown): string =>
  JSON.stringify(value)
    .replace(/</g, '\\u003C')
    .replace(/>/g, '\\u003E')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

const paragraphs = (value: string): string => {
  const blocks = value.split(/\n{2,}/);
  return Arr.map(blocks, (block) => `<p>${escape(block).replace(/\n/g, '<br>')}</p>`).join('');
};

export {
  escape,
  urlAttributes,
  isSafeUrl,
  attr,
  boolAttr,
  classes,
  style,
  withUnit,
  isTrue,
  cssUrl,
  jsonForScript,
  paragraphs
};
