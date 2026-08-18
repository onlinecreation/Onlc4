import { Arr, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import AstNode from 'hugerte/core/api/html/Node';

import * as Options from '../api/Options';
import * as Script from './Script';
import * as WidgetDom from './WidgetDom';

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
 */
const scriptsToPlaceholders = (editor: Editor, content: string): string =>
  content.replace(scriptRegExp, (_all, attributes: string, code: string) =>
    Script.toPlaceholderHtml(editor, {
      code: code.trim(),
      src: attributeOf(attributes, 'src'),
      type: attributeOf(attributes, 'type') || Options.getScriptType(editor),
      async: hasFlag(attributes, 'async'),
      defer: hasFlag(attributes, 'defer'),
      position: attributeOf(attributes, 'data-onlc-position') || 'inline'
    }));

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

const restoreHtmlWidget = (node: AstNode): void => {
  const config = WidgetDom.decode(node.attr(WidgetDom.configAttribute) ?? null);
  const code = WidgetDom.rawCodeOf(config);
  node.empty();

  if (code !== '') {
    const text = new AstNode('#text', 3);
    text.raw = true;
    text.value = code;
    node.append(text);
  }
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
        if (node.attr(WidgetDom.idAttribute) === 'html') {
          restoreHtmlWidget(node);
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
