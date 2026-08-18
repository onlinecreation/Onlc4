import PluginManager from 'hugerte/core/api/PluginManager';

import * as Commands from './api/Commands';
import * as Options from './api/Options';
import { WidgetConfig, WidgetDefinition } from './api/Types';
import * as FilterContent from './core/FilterContent';
import * as WidgetDom from './core/WidgetDom';
import * as Widgets from './core/Widgets';
import * as Buttons from './ui/Buttons';
import * as SourceDialog from './ui/SourceDialog';

/**
 * Three tools built on the same base: a javascript snippet editor with syntax highlighting, an
 * html source editor, and a library of predefined blocks that stay editable after insertion.
 *
 * @class hugerte.onlcwidgets.Plugin
 * @private
 */

export interface OnlcWidgetsApi {
  readonly listWidgets: () => WidgetDefinition[];
  readonly insertWidget: (id: string, config?: WidgetConfig) => void;
  readonly getSource: () => string;
  readonly setSource: (value: string) => void;
}

export default (): void => {
  PluginManager.add('onlcwidgets', (editor, pluginUrl): OnlcWidgetsApi => {
    Options.register(editor);

    if (Options.shouldInjectStyles(editor)) {
      editor.contentCSS.push(`${pluginUrl}/css/onlcwidgets.css`);
    }

    FilterContent.setup(editor);
    Commands.register(editor);
    Buttons.register(editor);

    return {
      listWidgets: () => Widgets.list(editor),
      insertWidget: (id: string, config?: WidgetConfig) => {
        Widgets.find(editor, id).each((definition) => {
          WidgetDom.insert(editor, definition, config ?? {});
        });
      },
      getSource: () => SourceDialog.getSource(editor),
      setSource: (value: string) => SourceDialog.setSource(editor, value)
    };
  });
};
