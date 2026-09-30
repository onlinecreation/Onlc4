import PluginManager from 'hugerte/core/api/PluginManager';

import * as Commands from './api/Commands';
import * as Options from './api/Options';
import * as FilterContent from './core/FilterContent';
import * as Normalize from './core/Normalize';
import * as ResizeHandler from './core/ResizeHandler';
import * as SchemaRules from './core/SchemaRules';

/**
 * Keeps images fluid: no `width`/`height` attributes in the html, a percentage width and an
 * automatic height instead, so that the content stays responsive.
 *
 * @class hugerte.onlcresponsiveimages.Plugin
 * @private
 */

export interface OnlcResponsiveImagesApi {
  readonly normalize: () => void;
  readonly normalizeElement: (element: HTMLElement) => void;
}

export default (): void => {
  PluginManager.add('onlcresponsiveimages', (editor): OnlcResponsiveImagesApi => {
    Options.register(editor);

    if (Options.isEnabled(editor)) {
      FilterContent.setup(editor);
      ResizeHandler.setup(editor);
      Commands.register(editor);

      if (Options.shouldLockSchema(editor)) {
        editor.on('PreInit', () => {
          SchemaRules.setup(editor, Options.getElementNames(editor).split(','));
        });
      }
    }

    return {
      normalize: () => Normalize.normalizeAll(editor),
      normalizeElement: (element: HTMLElement) => Normalize.normalizeElement(editor, element)
    };
  });
};
