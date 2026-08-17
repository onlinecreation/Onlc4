import { Arr, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

const dimensionAttributes = [ 'width', 'height' ];

/**
 * Removes the `width` and `height` attributes from the schema rule of the given element name.
 *
 * HugeRTE decides between styling an element with attributes or with css by asking the schema
 * (see `ControlSelection.setSizeProp`). Making the attributes invalid is therefore enough to make
 * every core feature - resize handles included - use css instead. As a bonus the serializer drops
 * any `width`/`height` attribute coming from pasted or legacy content.
 */
const removeDimensionAttributes = (editor: Editor, elementName: string): void => {
  const rule = editor.schema.getElementRule(elementName);
  if (!Type.isNonNullable(rule)) {
    return;
  }

  Arr.each(dimensionAttributes, (name) => {
    delete rule.attributes[name];
    rule.attributesOrder = Arr.filter(rule.attributesOrder, (attrName) => attrName !== name);
  });

  // `required`/`removeEmptyAttrs` book keeping, only present on some rules
  if (Type.isNonNullable(rule.attributesRequired)) {
    rule.attributesRequired = Arr.filter(rule.attributesRequired, (attrName) => !Arr.contains(dimensionAttributes, attrName));
  }
};

const setup = (editor: Editor, elementNames: string[]): void => {
  Arr.each(elementNames, (name) => removeDimensionAttributes(editor, name));
};

export {
  dimensionAttributes,
  removeDimensionAttributes,
  setup
};
