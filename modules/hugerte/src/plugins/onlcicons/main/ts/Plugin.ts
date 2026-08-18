import PluginManager from 'hugerte/core/api/PluginManager';

import * as Options from './api/Options';
import { EmojiEntry, initDatabase as initEmojis } from './core/EmojiDatabase';
import * as FilterContent from './core/FilterContent';
import * as Insert from './core/Insert';
import { IconEntry, initDatabase as initIcons } from './core/MaterialIcons';
import * as Autocompletion from './ui/Autocompletion';
import * as Buttons from './ui/Buttons';
import * as Dialog from './ui/Dialog';

/**
 * Unicode emoji dictionary and Material Design icon picker, both searchable.
 *
 * @class hugerte.onlcicons.Plugin
 * @private
 */

export interface OnlcIconsApi {
  readonly openDialog: (tab?: 'emojis' | 'icons') => void;
  readonly getEmojis: () => Promise<EmojiEntry[]>;
  readonly getIcons: () => IconEntry[];
  readonly insertIcon: (name: string) => void;
  readonly insertEmoji: (char: string) => void;
}

export default (): void => {
  PluginManager.add('onlcicons', (editor, pluginUrl): OnlcIconsApi => {
    Options.register(editor, pluginUrl);

    FilterContent.setup(editor);

    const emojis = initEmojis(editor);
    const icons = initIcons(editor);

    // The icon webfont is needed both in the content and in the dialog previews. It is loaded
    // after the editor is ready rather than through `contentCSS`, so that a slow or unreachable
    // font provider never delays - or blocks - the initialization of the editor.
    const stylesheetUrl = Options.getStylesheetUrl(editor);
    if (stylesheetUrl !== '') {
      const warn = () => {
        // eslint-disable-next-line no-console
        console.warn(`[onlc] Impossible de charger la feuille de styles des icônes : ${stylesheetUrl}`);
      };

      editor.on('init', () => {
        editor.dom.styleSheetLoader.load(stylesheetUrl).catch(warn);
        editor.ui.styleSheetLoader.load(stylesheetUrl).catch(warn);
      });
    }

    editor.addCommand('OnlcIcons', () => Dialog.open(editor, emojis, icons, Dialog.emojiTab));
    editor.addCommand('OnlcEmojis', () => Dialog.open(editor, emojis, icons, Dialog.emojiTab));
    editor.addCommand('OnlcMaterialIcons', () => Dialog.open(editor, emojis, icons, Dialog.iconTab));
    editor.addCommand('OnlcInsertIcon', (_ui, value?: string) => {
      if (typeof value === 'string' && value !== '') {
        Insert.insertIcon(editor, value);
      }
    });

    Buttons.register(editor);
    Autocompletion.init(editor, emojis, icons);

    return {
      openDialog: (tab) => Dialog.open(editor, emojis, icons, tab === 'icons' ? Dialog.iconTab : Dialog.emojiTab),
      getEmojis: () => emojis.waitForLoad().then(() => emojis.listAll()),
      getIcons: () => icons.listAll(),
      insertIcon: (name: string) => Insert.insertIcon(editor, name),
      insertEmoji: (char: string) => Insert.insertEmoji(editor, char)
    };
  });
};
