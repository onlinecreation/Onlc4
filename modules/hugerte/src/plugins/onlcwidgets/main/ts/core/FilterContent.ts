import { Arr, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import AstNode from 'hugerte/core/api/html/Node';

import * as Options from '../api/Options';
import * as Script from './Script';
import * as WidgetDom from './WidgetDom';
import * as Widgets from './Widgets';

/**
 * Bridges the editable representation and the published html:
 *
 * - a `<script>` is shown as a chip and written back as a real script tag,
 * - the decorative parts of a predefined block are made non editable while editing only,
 * - the code of an html widget is displayed as a readable preview and restored on output.
 */

const hasClass = (node: AstNode, cls: string): boolean => {
  const className = node.attr('class');
  return Type.isString(className) && Arr.contains(className.split(/\s+/), cls);
};

const scriptRegExp = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;

const attributeOf = (attributes: string, name: string): string => {
  const match = new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s"'>]+))`, 'i').exec(attributes);
  if (match === null) {
    return '';
  }
  return match[2] ?? match[3] ?? match[4] ?? '';
};

const hasFlag = (attributes: string, name: string): boolean =>
  new RegExp(`(^|\\s)${name}(\\s|=|$)`, 'i').test(attributes);

/**
 * Replaces the script tags of an html string by their editing chip. Done on the raw string
 * because the sanitizer drops script elements long before any node filter could see them.
 *
 * Les types réclamés par un autre plugin sont laissés intacts : une fiche de microdonnées est un
 * `script` qui ne contient que des données, et `onlcseo` sait la présenter bien mieux qu'un jeton
 * de code (voir l'option `onlc_script_ignored_types`).
 */
const scriptsToPlaceholders = (editor: Editor, content: string): string => {
  const ignored = Options.getIgnoredScriptTypes(editor);

  return content.replace(scriptRegExp, (all: string, attributes: string, code: string) => {
    const type = attributeOf(attributes, 'type');
    if (Arr.contains(ignored, type.trim().toLowerCase())) {
      return all;
    }
    return Script.toPlaceholderHtml(editor, {
      code: code.trim(),
      src: attributeOf(attributes, 'src'),
      type: type || Options.getScriptType(editor),
      async: hasFlag(attributes, 'async'),
      defer: hasFlag(attributes, 'defer'),
      position: attributeOf(attributes, 'data-onlc-position') || 'inline'
    });
  });
};

const toScriptNode = (editor: Editor, node: AstNode): void => {
  const data = Script.decode(editor, node.attr(Script.dataAttribute) ?? null);

  node.name = 'script';
  node.attr('class', null);
  node.attr(Script.dataAttribute, null);
  node.attr('contenteditable', null);
  node.attr('type', data.type);
  node.attr('src', data.src === '' ? null : data.src);
  node.attr('async', data.async ? 'async' : null);
  node.attr('defer', data.defer ? 'defer' : null);
  node.attr('data-onlc-position', data.position === 'inline' ? null : data.position);
  node.empty();

  if (data.src === '' && data.code !== '') {
    const text = new AstNode('#text', 3);
    text.raw = true;
    text.value = data.code;
    node.append(text);
  }
};

const setRawContent = (node: AstNode, html: string): void => {
  node.empty();
  if (html !== '') {
    const text = new AstNode('#text', 3);
    text.raw = true;
    text.value = html;
    node.append(text);
  }
};

/**
 * Les blocs « canoniques » - intégrations, cartes, calendriers - sont réécrits à partir de leur
 * configuration : c'est le seul moyen d'obtenir sur le site exactement le code prévu, sans les
 * attributs que l'éditeur ajoute pour sa propre sécurité (`sandbox` sur les iframes).
 */
const restoreCanonicalWidget = (editor: Editor, node: AstNode, id: string): boolean =>
  Widgets.find(editor, id).exists((definition) => {
    if (definition.canonical !== true) {
      return false;
    }
    const config = Widgets.withDefaults(definition, WidgetDom.decode(node.attr(WidgetDom.configAttribute) ?? null));
    setRawContent(node, WidgetDom.renderPublished(definition, config));
    return true;
  });

/**
 * Chemin inverse : quand du contenu déjà publié est rechargé dans l'éditeur, le bloc est
 * redessiné à partir de sa configuration. Sans cela, l'éditeur afficherait le code destiné au
 * visiteur : des iframes en bac à sable, des scripts qui ne s'exécutent pas et des cadres noirs.
 *
 * Les blocs à zones libres (`hasSlots`) font exception : leur texte se modifie directement dans
 * la page, et le redessiner écraserait la mise en forme appliquée là. Pour eux, le html
 * enregistré fait foi ; leur configuration ne sert qu'à rouvrir le formulaire.
 */
const restoreEditingWidget = (editor: Editor, node: AstNode, id: string): void => {
  Widgets.find(editor, id).each((definition) => {
    if (definition.hasSlots === true && !Type.isFunction(definition.renderEditor)) {
      return;
    }
    const config = Widgets.withDefaults(definition, WidgetDom.decode(node.attr(WidgetDom.configAttribute) ?? null));
    setRawContent(node, WidgetDom.renderEditing(definition, config));
  });
};

const setup = (editor: Editor): void => {
  editor.on('BeforeSetContent', (e) => {
    if (Type.isString(e.content) && e.content.toLowerCase().indexOf('<script') !== -1) {
      e.content = scriptsToPlaceholders(editor, e.content);
    }
  });

  editor.on('PreInit', () => {
    editor.parser.addNodeFilter('span', (nodes) => {
      Arr.each(nodes, (node) => {
        if (hasClass(node, Script.placeholderClass)) {
          node.attr('contenteditable', 'false');
        }
      });
    });

    editor.parser.addNodeFilter('div', (nodes) => {
      Arr.each(nodes, (node) => {
        const widgetId = node.attr(WidgetDom.idAttribute);
        if (Type.isString(widgetId)) {
          restoreEditingWidget(editor, node, widgetId);
        }
      });
      // Les parties décoratives sont rendues non modifiables après la reconstruction, pour que
      // les éléments qui viennent d'être écrits soient traités eux aussi.
      Arr.each(nodes, (node) => {
        if (hasClass(node, WidgetDom.staticClass)) {
          node.attr('contenteditable', 'false');
        }
      });
    });

    editor.parser.addAttributeFilter(WidgetDom.slotAttribute, (nodes) => {
      Arr.each(nodes, (node) => node.attr('contenteditable', 'true'));
    });

    editor.serializer.addNodeFilter('span', (nodes) => {
      Arr.each(nodes, (node) => {
        if (hasClass(node, Script.placeholderClass)) {
          toScriptNode(editor, node);
        }
      });
    });

    editor.serializer.addNodeFilter('div', (nodes) => {
      Arr.each(nodes, (node) => {
        if (hasClass(node, WidgetDom.staticClass)) {
          node.attr('contenteditable', null);
        }
        const widgetId = node.attr(WidgetDom.idAttribute);
        if (Type.isString(widgetId)) {
          restoreCanonicalWidget(editor, node, widgetId);
        }
      });
    });

    editor.serializer.addAttributeFilter(WidgetDom.slotAttribute, (nodes) => {
      Arr.each(nodes, (node) => node.attr('contenteditable', null));
    });
  });
};

export {
  scriptsToPlaceholders,
  attributeOf,
  hasFlag,
  setup
};
