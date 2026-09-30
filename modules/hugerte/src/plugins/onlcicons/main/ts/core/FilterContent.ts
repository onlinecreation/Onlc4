import { Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

/**
 * Une icône de police est un élément vide : `<i class="fa-solid fa-star"></i>`.
 *
 * Le schéma de HugeRTE supprime les éléments en ligne vides et renomme `<i>` en `<em>` : sans la
 * mise au point ci-dessous, l'icône disparaîtrait dès la première lecture du contenu.
 */

const iconTag = 'i';

const protectIconElement = (editor: Editor): void => {
  const rule = editor.schema.getElementRule(iconTag);
  if (Type.isNonNullable(rule)) {
    rule.removeEmpty = false;
    delete rule.outputName;
  }
  editor.schema.getNonEmptyElements()[iconTag] = {};
};

const setup = (editor: Editor): void => {
  editor.on('PreInit', () => {
    protectIconElement(editor);
  });
};

export {
  iconTag,
  protectIconElement,
  setup
};
