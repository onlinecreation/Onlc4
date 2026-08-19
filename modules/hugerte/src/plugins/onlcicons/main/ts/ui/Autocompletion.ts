import { Arr, Optional } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import { InlineContent } from 'hugerte/core/api/ui/Ui';

import * as Options from '../api/Options';
import { EmojiDatabase } from '../core/EmojiDatabase';
import { IconDatabase } from '../core/IconDatabase';
import * as Insert from '../core/Insert';
import * as OpenMoji from '../core/OpenMoji';
import * as Search from '../core/Search';

const maxResults = 15;

/**
 * Types `:mer` to complete an emoji and `::home` to complete an icon.
 */
const init = (editor: Editor, emojis: EmojiDatabase, icons: IconDatabase, index: OpenMoji.OpenMojiIndex): void => {
  editor.ui.registry.addAutocompleter('onlcicons-emoji', {
    trigger: Options.getEmojiTrigger(editor),
    minChars: 2,
    columns: 'auto',
    highlightOn: [ 'char_name' ],
    onAction: (autocompleteApi, rng, value) => {
      editor.selection.setRng(rng);
      Insert.insertEmoji(editor, value, index);
      autocompleteApi.hide();
    },
    fetch: (pattern) => emojis.waitForLoad().then(() => {
      const results = Search.search(emojis.listAll(), pattern, Optional.some(maxResults));
      return Arr.map(results, (entry): InlineContent.AutocompleterItemSpec => ({
        type: 'autocompleteitem',
        value: entry.char,
        text: entry.title.replace(/_/g, ' '),
        icon: index.fileOf(entry.char).fold(
          () => entry.char,
          (file) => `<img src="${editor.dom.encode(OpenMoji.urlOf(editor, file))}" alt="${editor.dom.encode(entry.char)}">`
        ),
        meta: { char_name: entry.title }
      }));
    })
  });

  editor.ui.registry.addAutocompleter('onlcicons-icons', {
    trigger: Options.getIconTrigger(editor),
    minChars: 2,
    columns: 'auto',
    onAction: (autocompleteApi, rng, value) => {
      editor.selection.setRng(rng);
      Arr.find(icons.listAll(), (entry) => `${entry.family}:${entry.name}` === value)
        .fold(() => Insert.insertIcon(editor, value), (entry) => Insert.insertEntry(editor, entry));
      autocompleteApi.hide();
    },
    fetch: (pattern) => Promise.resolve(
      Arr.map(Search.search(icons.listAll(), pattern, Optional.some(maxResults)), (entry): InlineContent.AutocompleterItemSpec => ({
        type: 'autocompleteitem',
        value: `${entry.family}:${entry.name}`,
        text: entry.title,
        icon: Insert.toHtml(editor, entry)
      }))
    )
  });
};

export {
  init
};
