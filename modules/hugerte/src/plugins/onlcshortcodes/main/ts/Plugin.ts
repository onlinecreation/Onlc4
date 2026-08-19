import PluginManager from 'hugerte/core/api/PluginManager';
import * as DialogStyles from 'hugerte/plugins/onlcshared/ui/DialogStyles';

import * as Commands from './api/Commands';
import * as Options from './api/Options';
import { ShortcodeDefinition } from './api/Types';
import * as FilterContent from './core/FilterContent';
import * as Shortcodes from './core/Shortcodes';
import * as Buttons from './ui/Buttons';

/**
 * Prise en charge des codes courts des gabarits Online Création.
 *
 * Un code court est un raccourci écrit entre crochets — `[MenuSite …]`, `[Contact email="…"]` —
 * que le serveur remplace par du vrai contenu au moment d'afficher la page. Dans l'éditeur, il
 * n'a aucune raison d'être visible sous cette forme : le plugin l'affiche comme un bloc, avec un
 * dessin, un nom et une explication, et le réécrit à l'identique à l'enregistrement.
 *
 * @class hugerte.onlcshortcodes.Plugin
 * @private
 */

export interface OnlcShortcodesApi {
  readonly list: () => ShortcodeDefinition[];
  readonly insert: (name: string) => void;
}

export default (): void => {
  PluginManager.add('onlcshortcodes', (editor, pluginUrl): OnlcShortcodesApi => {
    Options.register(editor);

    DialogStyles.setup(editor);

    if (Options.shouldInjectStyles(editor)) {
      editor.contentCSS.push(`${pluginUrl}/css/onlcshortcodes.css`);
    }

    FilterContent.setup(editor);
    Commands.register(editor);
    Buttons.register(editor);

    return {
      list: () => Shortcodes.list(editor),
      insert: (name: string) => editor.execCommand('OnlcInsertShortcode', false, name)
    };
  });
};
