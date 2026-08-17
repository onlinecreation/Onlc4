import { Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import * as LinkFields from 'hugerte/plugins/onlcshared/link/LinkFields';

import * as ImageHtml from '../core/ImageHtml';
import { MediaApi } from '../core/MediaApi';
import * as PixelEditor from '../core/PixelEditor';
import * as Explorer from '../ui/Explorer';
import * as ImageDialog from '../ui/ImageDialog';
import * as Options from './Options';
import { ImageData } from './Types';

const openImageDialog = (editor: Editor, api: MediaApi, data?: ImageData): void => {
  const image = data ?? ImageHtml.getSelectedImage(editor)
    .map((img) => ImageHtml.readFromImage(editor, img))
    .getOrThunk(() => ImageHtml.emptyData(editor));

  LinkFields.collectContext(editor).then((context) => {
    ImageDialog.open(editor, api, context, image);
  });
};

const register = (editor: Editor, api: MediaApi): void => {
  editor.addCommand('OnlcImage', () => {
    openImageDialog(editor, api);
  });

  // Opens the explorer on its own, the chosen image is inserted through the image dialog
  editor.addCommand('OnlcMediaExplorer', (_ui, value?: string) => {
    Explorer.open(editor, api, {
      path: Type.isString(value) ? value : undefined,
      onSelect: (file) => {
        openImageDialog(editor, api, {
          ...ImageHtml.emptyData(editor),
          src: file.url,
          alt: file.name
        });
      }
    });
  });

  editor.addCommand('OnlcEditImageInPixel', () => {
    ImageHtml.getSelectedImage(editor).each((img) => {
      const src = editor.dom.getAttrib(img, 'src');
      const name = src.substring(src.lastIndexOf('/') + 1);
      PixelEditor.open(editor, {
        url: src,
        name,
        title: `Modifier « ${name} »`,
        onSave: (result) => api.save(Options.getRootPath(editor), result.name, result.data).then((file) => {
          editor.undoManager.transact(() => {
            editor.dom.setAttrib(img, 'src', file.url);
          });
          editor.nodeChanged();
        })
      });
    });
  });

  // Inserts an image without any ui, for external integrations
  editor.addCommand('OnlcInsertImage', (_ui, value?: Partial<ImageData>) => {
    if (Type.isObject(value) && Type.isString(value.src)) {
      ImageHtml.insertOrUpdate(editor, { ...ImageHtml.emptyData(editor), ...value } as ImageData);
    }
  });
};

export {
  openImageDialog,
  register
};
