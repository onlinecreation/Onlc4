import PluginManager from 'hugerte/core/api/PluginManager';
import * as LinkOptions from 'hugerte/plugins/onlcshared/link/Options';
import * as PublishedCss from 'hugerte/plugins/onlcshared/PublishedCss';
import * as DialogStyles from 'hugerte/plugins/onlcshared/ui/DialogStyles';

import * as Commands from './api/Commands';
import * as Options from './api/Options';
import { ImageData, MediaFile } from './api/Types';
import * as FilterContent from './core/FilterContent';
import * as ImageHtml from './core/ImageHtml';
import * as MediaApi from './core/MediaApi';
import * as Buttons from './ui/Buttons';
import * as Explorer from './ui/Explorer';

/**
 * Image management: file explorer backed by the ONLC media API, image editor bridge, css presets,
 * custom css, alternative text, overlay text and link.
 *
 * @class hugerte.onlcmedia.Plugin
 * @private
 */

export interface OnlcMediaApi {
  readonly openImageDialog: () => void;
  readonly openExplorer: (path?: string, onSelect?: (file: MediaFile) => void) => void;
  readonly insertImage: (data: Partial<ImageData>) => void;
  readonly api: MediaApi.MediaApi;
}

export default (): void => {
  PluginManager.add('onlcmedia', (editor, pluginUrl): OnlcMediaApi => {
    Options.register(editor);

    DialogStyles.setup(editor);
    LinkOptions.register(editor);

    const api = MediaApi.create(editor);

    FilterContent.setup(editor);
    Commands.register(editor, api);
    Buttons.register(editor);

    // La parallaxe, les légendes posées sur l'image et les cadres d'intégration sont du décor de
    // page, pas d'éditeur : la feuille suit le contenu jusqu'à l'aperçu et au html rendu.
    if (Options.shouldInjectStyles(editor)) {
      editor.contentCSS.push(`${pluginUrl}/css/onlcmedia.css`);
      PublishedCss.declareSheets(editor, [ `${pluginUrl}/css/onlcmedia.css` ]);
    }

    // Take over the image button of the core so that `image` toolbars keep working
    if (Options.shouldReplaceImagePlugin(editor)) {
      editor.on('PreInit', () => {
        editor.addCommand('mceImage', () => editor.execCommand('OnlcImage'));
      });
    }

    return {
      openImageDialog: () => editor.execCommand('OnlcImage'),
      openExplorer: (path, onSelect) => Explorer.open(editor, api, { path, onSelect }),
      insertImage: (data) => ImageHtml.insertOrUpdate(editor, { ...ImageHtml.emptyData(editor), ...data } as ImageData),
      api
    };
  });
};
