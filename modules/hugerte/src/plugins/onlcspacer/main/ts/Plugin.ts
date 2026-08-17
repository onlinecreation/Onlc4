import PluginManager from 'hugerte/core/api/PluginManager';

import * as Commands from './api/Commands';
import * as Options from './api/Options';
import * as FilterContent from './core/FilterContent';
import * as Spacer from './core/Spacer';
import * as Buttons from './ui/Buttons';

/**
 * Vertical white spaces of a configurable height, inserted as plain block elements so that they
 * survive outside of the editor.
 *
 * @class hugerte.onlcspacer.Plugin
 * @private
 */

export interface OnlcSpacerApi {
  readonly insert: (height?: string) => void;
  readonly getSelectedHeight: () => string;
}

export default (): void => {
  PluginManager.add('onlcspacer', (editor): OnlcSpacerApi => {
    Options.register(editor);
    FilterContent.setup(editor);
    Commands.register(editor);
    Commands.registerQuery(editor);
    Buttons.register(editor);

    return {
      insert: (height?: string) => editor.execCommand('OnlcInsertSpacer', false, height),
      getSelectedHeight: () => Commands.getSelected(editor)
        .map((elm) => Spacer.sizeToString(Spacer.getHeight(editor, elm)))
        .getOr('')
    };
  });
};
