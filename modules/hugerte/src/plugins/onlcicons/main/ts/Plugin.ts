import { Fun } from '@ephox/katamari';

import PluginManager from 'hugerte/core/api/PluginManager';
import * as DialogStyles from 'hugerte/plugins/onlcshared/ui/DialogStyles';

import * as Options from './api/Options';
import { EmojiEntry, initDatabase as initEmojis } from './core/EmojiDatabase';
import * as EmojiRewrite from './core/EmojiRewrite';
import * as FilterContent from './core/FilterContent';
import * as Fonts from './core/Fonts';
import { IconEntry, initDatabase as initIcons } from './core/IconDatabase';
import * as Insert from './core/Insert';
import * as OpenMoji from './core/OpenMoji';
import * as Autocompletion from './ui/Autocompletion';
import * as Buttons from './ui/Buttons';
import * as Dialog from './ui/Dialog';

/**
 * Dictionnaire d'emojis Unicode et sélecteur d'icônes, tous deux avec moteur de recherche.
 *
 * Les emojis sont remplacés par les dessins OpenMoji embarqués : le rendu est alors le même sur
 * tous les appareils. Les icônes viennent de deux polices, elles aussi embarquées — Material
 * Design et Font Awesome Free — que l'on peut activer ou désactiver séparément.
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
  /** Adresse du dessin OpenMoji d'un emoji, quand il en existe un. */
  readonly emojiUrl: (char: string) => string;
}

export default (): void => {
  PluginManager.add('onlcicons', (editor, pluginUrl): OnlcIconsApi => {
    Options.register(editor, pluginUrl);

    DialogStyles.setup(editor);

    FilterContent.setup(editor);

    const emojis = initEmojis(editor);
    const icons = initIcons(editor);
    const openmoji = OpenMoji.initIndex(editor);

    Fonts.load(editor, pluginUrl);
    EmojiRewrite.setup(editor, openmoji);

    editor.addCommand('OnlcIcons', () => Dialog.open(editor, emojis, icons, openmoji, Dialog.emojiTab));
    editor.addCommand('OnlcEmojis', () => Dialog.open(editor, emojis, icons, openmoji, Dialog.emojiTab));
    editor.addCommand('OnlcMaterialIcons', () => Dialog.open(editor, emojis, icons, openmoji, Dialog.iconTab));
    editor.addCommand('OnlcInsertIcon', (_ui, value?: string) => {
      if (typeof value === 'string' && value !== '') {
        Insert.insertIcon(editor, value);
      }
    });

    Buttons.register(editor);
    Autocompletion.init(editor, emojis, icons, openmoji);

    return {
      openDialog: (tab) => Dialog.open(editor, emojis, icons, openmoji, tab === 'icons' ? Dialog.iconTab : Dialog.emojiTab),
      getEmojis: () => emojis.waitForLoad().then(() => emojis.listAll()),
      getIcons: () => icons.listAll(),
      insertIcon: (name: string) => Insert.insertIcon(editor, name),
      insertEmoji: (char: string) => Insert.insertEmoji(editor, char, openmoji),
      emojiUrl: (char: string) => openmoji.fileOf(char).fold(Fun.constant(''), (file) => OpenMoji.urlOf(editor, file))
    };
  });
};
