import { Arr, Optional, Type } from '@ephox/katamari';

import { ShortcodeDefinition, ShortcodeValues } from '../../api/ShortcodeTypes';

/**
 * Lecture et écriture des codes courts.
 *
 * Trois formes coexistent dans les gabarits d'Online Création :
 *
 * ```
 * [Contact email="hello@exemple.fr"]                        attributs nommés
 * [SocialButtons Facebook Twitter]                          drapeaux sans valeur
 * [LogoSite;200;80]                                         paramètres positionnels
 * [Slideshow style="" class=""]…[/Slideshow]                code encadrant du contenu
 * ```
 *
 * L'analyse est volontairement tolérante : ce qui n'est pas reconnu est conservé tel quel, et le
 * texte d'origine est mémorisé avec le bloc pour être réécrit à l'identique.
 */

export interface ParsedShortcode {
  /** Texte exact du code, réécrit tel quel à l'enregistrement. */
  readonly raw: string;
  readonly name: string;
  readonly attributes: ShortcodeValues;
  /** Drapeaux présents, dans l'ordre où ils ont été écrits. */
  readonly flags: string[];
  /** Paramètres séparés par des points-virgules. */
  readonly positional: string[];
  /** Contenu encadré, pour les codes appariés. */
  readonly content: string;
  readonly start: number;
  readonly end: number;
}

/** Un nom de code : une lettre, puis lettres, chiffres, tirets et tirets bas. */
const namePattern = '[A-Za-z][A-Za-z0-9_-]*';

/**
 * Noms qu'un code court ne peut pas porter.
 *
 * `[LG="fr"]…[/LG]` s'écrit exactement comme un code court apparié — et n'en est pas un : c'est
 * un marqueur de langue, que `onlcmultilang` transforme en section traduisible. Sans cette
 * réserve les deux plugins se disputeraient le même texte, et le premier arrivé en ferait une
 * carte « code non reconnu » : le passage repartirait intact dans la page, mais il ne serait
 * plus ni reconnaissable ni traduisible dans l'éditeur.
 *
 * L'aperçu visiteur y gagne aussi : un `[LG]` écrit dans le **gabarit** n'est plus pris pour un
 * code sans valeur configurée, donc plus effacé avant que la langue ait été choisie.
 */
const reserved = [ 'lg' ];

const isReserved = (name: string): boolean => Arr.contains(reserved, name.toLowerCase());

const attributePattern = /([A-Za-z][\w:.-]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'\]]+))|([A-Za-z][\w-]*)/g;

const readParameters = (body: string): { attributes: ShortcodeValues; flags: string[] } => {
  const attributes: Record<string, string> = {};
  const flags: string[] = [];
  const pattern = new RegExp(attributePattern.source, 'g');
  let match = pattern.exec(body);

  while (match !== null) {
    if (Type.isString(match[1])) {
      attributes[match[1]] = match[3] ?? match[4] ?? match[5] ?? '';
    } else if (Type.isString(match[6])) {
      flags.push(match[6]);
    }
    match = pattern.exec(body);
  }

  return { attributes, flags };
};

/** Tous les codes présents dans un texte, dans l'ordre où ils apparaissent. */
const findAll = (text: string): ParsedShortcode[] => {
  const pattern = new RegExp(
    `\\[(${namePattern})((?:;[^\\];]*)*)((?:[^\\]"']|"[^"]*"|'[^']*')*)\\]`, 'g');

  const found: ParsedShortcode[] = [];
  let match = pattern.exec(text);

  while (match !== null) {
    const [ whole, name, semicolons, body ] = match;
    const { attributes, flags } = readParameters(body ?? '');
    const positional = (semicolons ?? '') === ''
      ? []
      : Arr.map((semicolons ?? '').split(';').slice(1), (part) => part.trim());

    // Un code apparié consomme aussi son contenu et sa balise fermante.
    const closing = new RegExp(`\\[\\/${name}\\s*\\]`, 'i');
    const rest = text.substring(match.index + whole.length);
    const close = closing.exec(rest);
    const paired = close !== null && rest.substring(0, close.index).indexOf(`[${name}`) === -1;

    const content = paired ? rest.substring(0, close?.index ?? 0) : '';
    const end = paired
      ? match.index + whole.length + (close?.index ?? 0) + (close?.[0].length ?? 0)
      : match.index + whole.length;

    if (isReserved(name)) {
      // Le balayage reprend juste après le marqueur : ce qu'il encadre peut, lui, contenir de
      // vrais codes courts.
      pattern.lastIndex = match.index + whole.length;
    } else {
      found.push({
        raw: text.substring(match.index, end),
        name,
        attributes,
        flags,
        positional,
        content,
        start: match.index,
        end
      });

      pattern.lastIndex = end;
    }
    match = pattern.exec(text);
  }

  return found;
};

/**
 * Le texte est-il **exactement** un code court, et rien d'autre ?
 *
 * À l'enregistrement, le texte d'origine d'une carte est réécrit sans échappement : c'est la
 * seule façon de restituer au caractère près un code que le plugin ne sait pas relire. Mais
 * l'attribut qui le transporte est du html comme un autre, et un contenu collé peut en porter
 * un forgé. Sans cette vérification, un tel attribut ferait sortir n'importe quel markup dans
 * la page enregistrée.
 *
 * La condition est donc double : aucun chevron, et un unique code couvrant toute la chaîne.
 */
const isShortcodeText = (text: string): boolean => {
  if (text === '' || /[<>]/.test(text)) {
    return false;
  }
  const found = findAll(text);
  return found.length === 1 && found[0].start === 0 && found[0].end === text.length;
};

/**
 * Valeur d'attribut prête à être écrite entre guillemets.
 *
 * Les crochets sont retirés : ils refermeraient le code court au milieu d'un attribut, et tout
 * ce qui suit serait alors lu comme du texte ordinaire par le gabarit. Les guillemets sont
 * remplacés par leur entité, comme le font déjà les gabarits d'Online Création.
 */
const quote = (value: string): string =>
  `"${value.replace(/[[\]]/g, '').replace(/"/g, '&quot;')}"`;

/**
 * Réécrit un code à partir des valeurs saisies dans le dialogue. L'ordre des attributs suit
 * celui de la définition : les gabarits qui lisent ces codes avec des expressions régulières
 * strictes continuent donc de les reconnaître.
 */
const build = (definition: ShortcodeDefinition, values: ShortcodeValues, content?: string): string => {
  const parts: string[] = [];

  if (Type.isArray(definition.positional) && definition.positional.length > 0) {
    // Le point-virgule sépare les paramètres et le crochet ferme le code : ni l'un ni l'autre
    // ne peut apparaître dans une valeur.
    const positional = Arr.map(definition.positional, (field) =>
      (values[field.name] ?? '').trim().replace(/[;[\]]/g, ''));
    return `[${definition.name};${positional.join(';')}]`;
  }

  Arr.each(definition.flags ?? [], (flag) => {
    if (values[flag.name] === 'true') {
      parts.push(flag.name);
    }
  });

  Arr.each(definition.fields, (field) => {
    const value = values[field.name];
    if (Type.isString(value) && value !== '') {
      parts.push(`${field.name}=${quote(value)}`);
    }
  });

  Object.keys(definition.fixed ?? {}).forEach((key) => {
    parts.push(`${key}=${quote((definition.fixed ?? {})[key])}`);
  });

  const head = parts.length === 0 ? `[${definition.name}]` : `[${definition.name} ${parts.join(' ')}]`;

  return definition.paired === true
    ? `${head}${content ?? ''}[/${definition.name}]`
    : head;
};

/** Valeurs à afficher dans le dialogue, à partir d'un code déjà présent dans la page. */
const toValues = (definition: ShortcodeDefinition, parsed: Optional<ParsedShortcode>): ShortcodeValues => {
  const values: Record<string, string> = { ...definition.defaults };

  parsed.each((code) => {
    Arr.each(definition.positional ?? [], (field, order) => {
      if (Type.isString(code.positional[order])) {
        values[field.name] = code.positional[order];
      }
    });
    Arr.each(definition.fields, (field) => {
      const value = code.attributes[field.name];
      if (Type.isString(value)) {
        values[field.name] = value;
      }
    });
    Arr.each(definition.flags ?? [], (flag) => {
      values[flag.name] = Arr.exists(code.flags, (name) => name.toLowerCase() === flag.name.toLowerCase()) ? 'true' : 'false';
    });
  });

  Arr.each(definition.fields, (field) => {
    if (!Type.isString(values[field.name])) {
      values[field.name] = '';
    }
  });
  Arr.each(definition.flags ?? [], (flag) => {
    if (!Type.isString(values[flag.name])) {
      values[flag.name] = 'false';
    }
  });

  return values;
};

export {
  isShortcodeText,
  namePattern,
  reserved,
  isReserved,
  readParameters,
  findAll,
  build,
  toValues
};
