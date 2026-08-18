import { Optional } from '@ephox/katamari';

import PluginManager from 'hugerte/core/api/PluginManager';

import * as Commands from './api/Commands';
import * as Options from './api/Options';
import * as Blocks from './core/Blocks';
import * as Controller from './core/Controller';
import * as Grid from './core/Grid';
import * as Buttons from './ui/Buttons';

/**
 * Block based workspace: every element behaving as a block gets a toolbar to move, duplicate or
 * delete it, and blocks can be added at the beginning, between two blocks or at the end of the
 * page. Bootstrap rows and columns are handled as first class citizens.
 *
 * @class hugerte.onlcblocks.Plugin
 * @private
 */

export interface OnlcBlocksApi {
  readonly isEnabled: () => boolean;
  readonly toggle: () => void;
  readonly getActiveBlock: () => Optional<HTMLElement>;
  readonly listBlocks: () => HTMLElement[];
  readonly insertRow: (widths: number[]) => void;
}

export default (): void => {
  PluginManager.add('onlcblocks', (editor, pluginUrl): OnlcBlocksApi => {
    Options.register(editor);

    if (Options.shouldInjectStyles(editor)) {
      editor.contentCSS.push(`${pluginUrl}/css/onlcblocks.css`);
    }

    // Grille du site (Bootstrap par exemple) : sans elle, les lignes et les colonnes
    // s'empilent dans l'éditeur alors qu'elles seront côte à côte sur la page publiée.
    const gridCss = Options.getGridCss(editor);
    if (gridCss !== '') {
      editor.contentCSS.push(gridCss);
    }

    const controller = Controller.setup(editor);

    Commands.register(editor, controller);
    Buttons.register(editor, controller);

    return {
      isEnabled: () => controller.isEnabled(),
      toggle: () => controller.toggle(),
      getActiveBlock: () => controller.getActive(),
      listBlocks: () => Blocks.listAll(editor),
      insertRow: (widths: number[]) => Grid.insertRow(editor, widths, controller.getActive(), 'after')
    };
  });
};
