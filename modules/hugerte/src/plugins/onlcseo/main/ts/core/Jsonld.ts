import { Arr, Obj, Optional, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

import * as Schema from './Schema';

/**
 * Les microdonnées de la page : leur forme dans l'éditeur, leur forme dans la page publiée, et
 * la règle qui veut qu'il n'y en ait **qu'une**, tout en haut.
 *
 * ## Ce qui est écrit sur le site
 *
 * ```html
 * <script type="application/ld+json">{"@context":"https://schema.org","@type":"Product",…}</script>
 * ```
 *
 * ## Ce qui est montré au rédacteur
 *
 * Un objet json n'apprend rien à personne. Le bloc affiche donc le type décrit, un résumé des
 * valeurs principales, et rappelle que rien de tout cela ne se verra sur la page. Les données
 * voyagent avec lui, encodées dans un attribut, ce qui permet de rouvrir le formulaire.
 *
 * ## Pourquoi en haut, et pourquoi une seule
 *
 * Une page décrit **une** chose. Deux fiches concurrentes obligent les moteurs à choisir, et ils
 * choisissent mal ; c'est la première cause de rejet dans leurs outils de test. Le bloc est donc
 * unique, et la commande d'insertion ouvre celui qui existe déjà plutôt que d'en créer un second.
 *
 * En haut, parce que ce sont des métadonnées : elles décrivent ce qui suit. Un lecteur qui ouvre
 * la source, un intégrateur qui cherche pourquoi Google affiche un prix périmé, doivent les
 * trouver sans dérouler la page. La position est rétablie à l'enregistrement, quel que soit
 * l'endroit où le bloc a pu être déplacé entre-temps.
 */

export type JsonldValue = string | JsonldObject | JsonldValue[];

export interface JsonldObject {
  readonly [key: string]: JsonldValue | undefined;
}

export const blockClass = 'onlc-jsonld';
export const dataAttribute = 'data-onlc-jsonld';
export const scriptType = 'application/ld+json';
export const defaultContext = 'https://schema.org';

const escape = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const icon =
  '<svg viewBox="0 0 24 24" width="26" height="26" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"' +
  ' fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round">' +
  '<path d="M4 4h8l8 8-8 8-8-8z"></path><circle cx="8.5" cy="8.5" r="1.4"></circle></svg>';

const encode = (data: JsonldObject): string => encodeURIComponent(JSON.stringify(data));

const decode = (value: string | null): JsonldObject => {
  if (!Type.isString(value) || value === '') {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(value));
    return Type.isObject(parsed) ? parsed as JsonldObject : {};
  } catch (_err) {
    return {};
  }
};

/** Le type décrit par une fiche, ou chaîne vide quand elle n'en porte pas. */
const typeOf = (data: JsonldObject): string => {
  const value = data['@type'];
  if (Type.isString(value)) {
    return value;
  }
  return Type.isArray(value) && value.length > 0 && Type.isString(value[0]) ? value[0] : '';
};

/** Une valeur lisible d'un coup d'œil, pour le résumé du bloc. */
const flatten = (value: JsonldValue | undefined): string => {
  if (Type.isString(value)) {
    return value;
  }
  if (Type.isArray(value)) {
    return Arr.map(value, flatten).join(', ');
  }
  if (Type.isObject(value)) {
    const record = value as JsonldObject;
    return Type.isString(record.name) ? record.name : flatten(record.value);
  }
  return '';
};

/**
 * Résumé affiché sous le nom du type.
 *
 * Les trois premières valeurs renseignées, `@type` et `@context` mis à part : c'est assez pour
 * reconnaître la fiche sans l'ouvrir, et assez court pour tenir sur une ligne.
 */
const summarize = (data: JsonldObject): string => {
  const parts: string[] = [];
  Obj.each(data, (value, key) => {
    if (key.indexOf('@') === 0 || parts.length >= 3) {
      return;
    }
    const flat = flatten(value).trim();
    if (flat !== '') {
      parts.push(flat.length > 40 ? `${flat.substring(0, 40)}…` : flat);
    }
  });
  return parts.join(' — ');
};

/** Nombre de propriétés renseignées, `@type` et `@context` exclus. */
const countProperties = (data: JsonldObject): number =>
  Arr.filter(Obj.keys(data), (key) => key.indexOf('@') !== 0).length;

const toBlockHtml = (editor: Editor, data: JsonldObject): string => {
  const type = typeOf(data);
  const label = type === ''
    ? (editor.translate('Microdonnées incomplètes') as string)
    : `${editor.translate('Microdonnées') as string} — ${Schema.labelOf(editor, type)}`;
  const summary = summarize(data);
  const count = countProperties(data);

  const description = editor.translate(
    'Décrivent le contenu de cette page pour les moteurs de recherche. Rien n’en paraît sur le site.') as string;

  const detail = summary === ''
    ? (editor.translate('Aucune propriété renseignée pour l’instant.') as string)
    : `${summary} · ${count} ${editor.translate(count > 1 ? 'propriétés' : 'propriété') as string}`;

  return `<div class="${blockClass}" ${dataAttribute}="${escape(encode(data))}" contenteditable="false">` +
    `<span class="${blockClass}__icon">${icon}</span>` +
    `<span class="${blockClass}__body">` +
    `<span class="${blockClass}__label">${escape(label)}</span>` +
    `<span class="${blockClass}__description">${escape(description)}</span>` +
    `<span class="${blockClass}__summary">${escape(detail)}</span>` +
    '</span></div>';
};

/** Le json écrit sur le site, avec son contexte et son type en tête. */
const toJson = (data: JsonldObject, vocabulary: string = defaultContext): string => {
  const ordered: Record<string, JsonldValue> = { '@context': vocabulary };
  const type = typeOf(data);
  if (type !== '') {
    ordered['@type'] = type;
  }
  Obj.each(data, (value, key) => {
    if (key !== '@context' && key !== '@type' && Type.isNonNullable(value)) {
      ordered[key] = value;
    }
  });
  return JSON.stringify(ordered, null, 2);
};

const selector = `div.${blockClass}`;

const isBlock = (editor: Editor, node: Node | null): node is HTMLElement =>
  Type.isNonNullable(node) && (editor.dom.is(node, selector) as boolean);

/** La fiche de la page, s'il y en a une. La première trouvée fait foi. */
const existing = (editor: Editor): Optional<HTMLElement> =>
  Arr.head(editor.dom.select<HTMLElement>(selector, editor.getBody()));

const read = (editor: Editor, element: HTMLElement): JsonldObject =>
  decode(editor.dom.getAttrib(element, dataAttribute));

/**
 * Le premier nœud du corps qui appartient au contenu.
 *
 * Le tout premier peut appartenir à l'interface d'écriture — la zone « Ajouter un bloc au début »
 * de l'espace de travail en blocs. La fiche se glisse **après** elle : ces zones sont remises en
 * première position à chaque rafraîchissement, et s'insérer avant reviendrait à se faire
 * repousser au coup suivant.
 */
const firstContentNode = (editor: Editor): Node | null => {
  const body = editor.getBody();
  if (!Type.isNonNullable(body)) {
    return null;
  }
  return Arr.find(Arr.from(body.childNodes), (node) =>
    !(node.nodeType === 1 && Type.isNonNullable((node as HTMLElement).getAttribute('data-mce-bogus')))
  ).getOrNull();
};

/** Pose la fiche en tête du document, ou met à jour celle qui existe. */
const write = (editor: Editor, data: JsonldObject): void => {
  editor.undoManager.transact(() => {
    const html = toBlockHtml(editor, data);
    existing(editor).fold(
      () => {
        const block = editor.dom.createFragment(html).firstChild as HTMLElement;
        const body = editor.getBody();
        const reference = firstContentNode(editor);
        if (Type.isNonNullable(reference)) {
          body.insertBefore(block, reference);
        } else {
          body.appendChild(block);
        }
      },
      (element) => editor.dom.setOuterHTML(element, html)
    );
  });
  editor.nodeChanged();
};

const remove = (editor: Editor): void => {
  existing(editor).each((element) => {
    editor.undoManager.transact(() => editor.dom.remove(element));
    editor.nodeChanged();
  });
};

export {
  escape,
  icon,
  encode,
  decode,
  typeOf,
  flatten,
  summarize,
  countProperties,
  toBlockHtml,
  toJson,
  selector,
  isBlock,
  existing,
  read,
  firstContentNode,
  write,
  remove
};
