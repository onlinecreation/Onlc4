import { Arr, Optional, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import AstNode from 'hugerte/core/api/html/Node';

import * as Options from '../../api/Options';
import * as Dom from './Dom';
import * as Parse from './Parse';
import * as Shortcodes from './Shortcodes';

/**
 * Passage d'une écriture à l'autre.
 *
 * - **à l'ouverture** : les codes courts trouvés dans le texte deviennent des cartes ;
 * - **à l'enregistrement** : chaque carte redevient exactement le texte qu'elle représente.
 *
 * La conversion d'entrée travaille sur la chaîne html, avant l'analyse : un code court n'est pas
 * un élément, aucun filtre de nœud ne pourrait donc le voir. Le balayage saute soigneusement
 * l'intérieur des balises — un attribut peut contenir des crochets sans être un code court.
 */

const hasClass = (node: AstNode, cls: string): boolean => {
  const className = node.attr('class');
  return Type.isString(className) && Arr.contains(className.split(/\s+/), cls);
};

/**
 * Éléments dont le contenu n'est pas du texte de page.
 *
 * Le corps d'un `<script>` est du javascript : `lignes[index]` y ressemble à s'y méprendre à un
 * code court, et le remplacer par la valeur configurée — le plus souvent rien du tout — casse le
 * script sans que rien ne le signale. Un `<style>` a le même problème avec ses sélecteurs, et le
 * contenu d'un `<textarea>` est du texte brut que personne n'a demandé de résoudre.
 *
 * Ces éléments s'arrêtent à leur balise fermante et à elle seule : c'est ainsi que le navigateur
 * les lit, et c'est pourquoi on peut la chercher directement.
 */
const rawTextElements = [ 'script', 'style', 'textarea', 'title' ];

const rawTextName = (tag: string): string => {
  const match = /^<([a-zA-Z][a-zA-Z0-9]*)/.exec(tag);
  const name = match === null ? '' : match[1].toLowerCase();
  return Arr.contains(rawTextElements, name) && !/\/>$/.test(tag) ? name : '';
};

/**
 * Découpe une chaîne html en segments de texte et segments de balise.
 *
 * Le contenu des éléments à texte brut est rendu avec leur balise ouvrante, en un seul segment
 * non textuel : il traverse ainsi les remplacements sans y être soumis.
 */
const segments = (html: string): Array<{ text: boolean; value: string }> => {
  const parts: Array<{ text: boolean; value: string }> = [];
  let index = 0;

  while (index < html.length) {
    const open = html.indexOf('<', index);
    if (open === -1) {
      parts.push({ text: true, value: html.substring(index) });
      break;
    }
    if (open > index) {
      parts.push({ text: true, value: html.substring(index, open) });
    }
    const close = html.indexOf('>', open);
    if (close === -1) {
      parts.push({ text: false, value: html.substring(open) });
      break;
    }

    const tag = html.substring(open, close + 1);
    const raw = rawTextName(tag);
    if (raw === '') {
      parts.push({ text: false, value: tag });
      index = close + 1;
      continue;
    }

    // Sans balise fermante, le reste de la chaîne appartient à l'élément : c'est aussi ce que
    // ferait le navigateur, et rien n'y est donc résolu.
    const end = new RegExp(`</${raw}\\s*>`, 'i').exec(html.substring(close + 1));
    const stop = end === null ? html.length : close + 1 + end.index + end[0].length;
    parts.push({ text: false, value: html.substring(open, stop) });
    index = stop;
  }

  return parts;
};

/**
 * Remplace les codes courts d'un texte par leur carte. Les codes inconnus ne sont convertis que
 * si `onlc_shortcodes_show_unknown` est activé.
 */
const rewriteText = (editor: Editor, text: string): string => {
  const codes = Parse.findAll(text);
  if (codes.length === 0) {
    return text;
  }

  const showUnknown = Options.shouldShowUnknownShortcodes(editor);
  let out = '';
  let cursor = 0;

  Arr.each(codes, (code) => {
    const definition = Shortcodes.find(editor, code.name);
    if (definition.isNone() && !showUnknown) {
      return;
    }
    out += text.substring(cursor, code.start) + Dom.toHtml(definition, code);
    cursor = code.end;
  });

  return out + text.substring(cursor);
};

const rewriteHtml = (editor: Editor, html: string): string =>
  Arr.map(segments(html), (part) => part.text ? rewriteText(editor, part.value) : part.value).join('');

/**
 * Remet le texte d'origine à la place de la carte.
 *
 * Le texte est écrit **sans échappement** : c'est la seule façon de restituer au caractère près
 * un code que le plugin ne sait pas relire. L'attribut qui le transporte étant du html comme un
 * autre, un contenu collé pourrait en porter un forgé ; il n'est donc réécrit tel quel que s'il
 * est bien un code court et rien d'autre. Dans le cas contraire il ressort en texte échappé :
 * rien n'est perdu, mais rien n'est injecté non plus.
 */
const toRawText = (node: AstNode): void => {
  const raw = Dom.decode(node.attr(Dom.rawAttribute) ?? null);
  const trusted = Parse.isShortcodeText(raw);
  node.empty();
  node.name = '#text';
  node.type = 3;
  node.raw = trusted;
  node.value = raw;
  Arr.each([ 'class', Dom.nameAttribute, Dom.rawAttribute, 'contenteditable', 'data-mce-selected' ], (name) => {
    node.attr(name, null);
  });
};

const setup = (editor: Editor): void => {
  editor.on('BeforeSetContent', (e) => {
    if (Type.isString(e.content) && e.content.indexOf('[') !== -1) {
      e.content = rewriteHtml(editor, e.content);
    }
  });

  editor.on('PreInit', () => {
    editor.parser.addNodeFilter('span', (nodes) => {
      Arr.each(nodes, (node) => {
        if (hasClass(node, Dom.blockClass)) {
          node.attr('contenteditable', 'false');
        }
      });
    });

    editor.serializer.addNodeFilter('span', (nodes) => {
      Arr.each(nodes, (node) => {
        if (hasClass(node, Dom.blockClass)) {
          toRawText(node);
        }
      });
    });
  });
};

/** Utilisé par la commande d'insertion manuelle et par les tests. */
const previewOf = (editor: Editor, raw: string): Optional<string> =>
  Arr.head(Parse.findAll(raw)).map((code) => Dom.toHtml(Shortcodes.find(editor, code.name), code));

export {
  segments,
  rewriteText,
  rewriteHtml,
  toRawText,
  previewOf,
  setup
};
