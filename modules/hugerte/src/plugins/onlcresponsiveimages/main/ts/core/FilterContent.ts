import { Arr, Obj, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import AstNode from 'hugerte/core/api/html/Node';

import * as Options from '../api/Options';
import * as SchemaRules from './SchemaRules';
import * as Sizing from './Sizing';

const internalStyleName = 'data-mce-style';

/**
 * Reads the styles of an ast node. `data-mce-style` wins over `style` because that is the value
 * the core uses when it converts the node back to html.
 */
const readStyles = (editor: Editor, node: AstNode): Record<string, string> => {
  const internal = node.attr(internalStyleName);
  const style = Type.isString(internal) ? internal : node.attr('style');
  return Type.isString(style) ? editor.dom.parseStyle(style) : {};
};

const writeStyles = (editor: Editor, node: AstNode, styles: Record<string, string>): void => {
  const serialized = editor.dom.serializeStyle(styles, node.name);
  const value = serialized.length > 0 ? serialized : null;
  node.attr('style', value);
  if (Type.isString(node.attr(internalStyleName))) {
    node.attr(internalStyleName, value);
  }
};

/**
 * Replaces the `width`/`height` attributes of an ast node by a percentage width and an
 * automatic height.
 */
const applyResponsiveStyles = (editor: Editor, node: AstNode): void => {
  const styles = readStyles(editor, node);
  const reference = Sizing.getReferenceWidth(editor);

  if (!Sizing.isPercentage(styles.width)) {
    Sizing.parsePixels(node.attr('width'))
      .orThunk(() => Sizing.parsePixels(styles.width))
      .each((value) => {
        styles.width = Sizing.toPercentString(editor, value, reference);
      });
  }

  if (Options.isHeightAuto(editor) && Obj.has(styles, 'width')) {
    styles.height = 'auto';
  } else {
    delete styles.height;
  }

  Arr.each(SchemaRules.dimensionAttributes, (name) => node.attr(name, null));
  writeStyles(editor, node, styles);
};

const setup = (editor: Editor): void => {
  editor.on('PreInit', () => {
    const elementNames = Options.getElementNames(editor);
    const apply = (nodes: AstNode[]) => Arr.each(nodes, (node) => applyResponsiveStyles(editor, node));

    if (Options.shouldConvertExisting(editor)) {
      editor.parser.addNodeFilter(elementNames, apply);
    }

    editor.serializer.addNodeFilter(elementNames, apply);
  });
};

export {
  applyResponsiveStyles,
  setup
};
