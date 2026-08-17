import { Arr, Optional } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import { InlineContent } from 'hugerte/core/api/ui/Ui';

import * as Options from '../api/Options';
import { EmojiDatabase } from '../core/EmojiDatabase';
import * as Insert from '../core/Insert';
import { IconDatabase } from '../core/MaterialIcons';
import * as Search from '../core/Search';

const maxResults = 15;

/**
 * Types `:mer` to complete an emoji and `::home` to complete a Material icon.
 */
const init = (editor: Editor, emojis: EmojiDatabase, icons: IconDatabase): void => {
  editor.ui.registry.addAutocompleter('onlcicons-emoji', {
    trigger: Options.getEmojiTrigger(editor),
    minChars: 2,
    columns: 'auto',
    highlightOn: [ 'char_name' ],
    onAction: (autocompleteApi, rng, value) => {
      editor.selection.setRng(rng);
      Insert.insertEmoji(editor, value);
      autocompleteApi.hide();
    },
    fetch: (pattern) => emojis.waitForLoad().then(() => {
      const results = Search.search(emojis.listAll(), pattern, Optional.some(maxResults));
      return Arr.map(results, (entry): InlineContent.AutocompleterItemSpec => ({
        type: 'autocompleteitem',
        value: entry.char,
        text: entry.title.replace(/_/g, ' '),
        icon: entry.char,
        meta: { char_name: entry.title }
      }));
    })
  });

  editor.ui.registry.addAutocompleter('onlcicons-material', {
    trigger: Options.getIconTrigger(editor),
    minChars: 2,
    columns: 'auto',
    onAction: (autocompleteApi, rng, value) => {
      editor.selection.setRng(rng);
      Insert.insertIcon(editor, value);
      autocompleteApi.hide();
    },
    fetch: (pattern) => Promise.resolve(
      Arr.map(Search.search(icons.listAll(), pattern, Optional.some(maxResults)), (entry): InlineContent.AutocompleterItemSpec => ({
        type: 'autocompleteitem',
        value: entry.name,
        text: entry.title,
        icon: Insert.toIconHtml(editor, entry.name)
      }))
    )
  });
};

export {
  init
};
