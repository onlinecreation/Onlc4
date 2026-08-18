import { Arr } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import { Dialog } from 'hugerte/core/api/ui/Ui';
import * as LinkFields from 'hugerte/plugins/onlcshared/link/LinkFields';
import { LinkContext } from 'hugerte/plugins/onlcshared/link/LinkTypes';
import * as TextStyle from 'hugerte/plugins/onlcshared/text/TextStyle';

import * as Options from '../api/Options';
import { ImageData } from '../api/Types';
import * as ImageHtml from '../core/ImageHtml';
import * as MediaApi from '../core/MediaApi';
import * as PixelEditor from '../core/PixelEditor';
import * as Explorer from './Explorer';

const listItems = (items: Options.PresetItem[]): Dialog.ListBoxItemSpec[] =>
  Arr.map(items, (item) => ({ text: item.text, value: item.value }));

const readString = (data: Record<string, unknown>, name: string): string =>
  LinkFields.readString(data, name);

const toImageData = (data: Record<string, unknown>): ImageData => ({
  src: readString(data, 'src'),
  alt: readString(data, 'alt'),
  title: readString(data, 'title'),
  preset: readString(data, 'preset'),
  width: readString(data, 'width'),
  customCss: readString(data, 'customCss'),
  overlay: {
    text: readString(data, 'overlayText'),
    position: readString(data, 'overlayPosition'),
    fontSize: readString(data, 'overlayFontSize'),
    fontFamily: readString(data, 'overlayFontFamily'),
    color: readString(data, 'overlayColor'),
    background: readString(data, 'overlayBackground'),
    margin: readString(data, 'overlayMargin'),
    padding: readString(data, 'overlayPadding'),
    textStyle: TextStyle.fromDialogData('overlay', data)
  },
  link: LinkFields.toAttributes(data)
});

const toDialogData = (editor: Editor, context: LinkContext, image: ImageData): Record<string, unknown> => ({
  src: image.src,
  alt: image.alt,
  title: image.title,
  preview: { url: image.src },
  preset: image.preset,
  width: image.width,
  customCss: image.customCss,
  overlayText: image.overlay.text,
  overlayPosition: image.overlay.position,
  overlayFontSize: image.overlay.fontSize,
  overlayFontFamily: image.overlay.fontFamily,
  overlayColor: image.overlay.color,
  overlayBackground: image.overlay.background,
  overlayMargin: image.overlay.margin,
  overlayPadding: image.overlay.padding,
  ...TextStyle.toDialogData('overlay', image.overlay.textStyle),
  ...LinkFields.getInitialData(editor, context, image.link)
});

const open = (editor: Editor, api: MediaApi.MediaApi, context: LinkContext, image: ImageData): void => {
  // Choisir le fichier passe d'abord par la médiathèque : l'adresse en ligne reste possible,
  // mais en second, pour ceux qui collent une url externe.
  const imageTab: Dialog.TabSpec = {
    title: 'Image',
    name: 'image',
    items: [
      { type: 'imagepreview', name: 'preview', height: '150px' },
      {
        type: 'label',
        label: 'Fichier de l’image',
        items: [
          {
            type: 'bar',
            items: [
              // Sans icône : un bouton de dialogue n'affiche que son icône dès qu'il en a une,
              // et le libellé est ici ce qui rend l'action compréhensible.
              { type: 'button', name: 'browse', text: 'Choisir ou téléverser un média…', buttonType: 'primary' },
              { type: 'button', name: 'editImage', text: 'Retoucher cette image…', buttonType: 'secondary' }
            ]
          }
        ]
      },
      {
        type: 'input',
        name: 'src',
        label: 'Ou adresse d’une image en ligne (https://…)',
        placeholder: 'https://exemple.tld/photo.jpg'
      },
      {
        type: 'grid',
        columns: 2,
        items: [
          { type: 'input', name: 'alt', label: 'Texte alternatif (lu par les lecteurs d’écran)' },
          { type: 'input', name: 'title', label: 'Titre affiché au survol' }
        ]
      }
    ]
  };

  const appearanceTab: Dialog.TabSpec = {
    title: 'Apparence',
    name: 'appearance',
    items: [
      { type: 'listbox', name: 'preset', label: 'Style prédéfini', items: listItems(Options.getClassList(editor)) },
      { type: 'input', name: 'width', label: 'Largeur (%, rem, vw...)' },
      { type: 'textarea', name: 'customCss', label: 'CSS personnalisé (appliqué au bloc image)', placeholder: 'border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,.2);' }
    ]
  };

  const overlayTab: Dialog.TabSpec = {
    title: 'Texte par-dessus',
    name: 'overlay',
    items: [
      { type: 'textarea', name: 'overlayText', label: 'Texte affiché par-dessus l’image' },
      {
        type: 'grid',
        columns: 2,
        items: [
          { type: 'listbox', name: 'overlayPosition', label: 'Position sur l’image', items: listItems(Options.getOverlayPositions(editor)) },
          { type: 'listbox', name: 'overlayFontFamily', label: 'Typographie', items: listItems(Options.getFontList(editor)) },
          { type: 'input', name: 'overlayFontSize', label: 'Taille du texte (ex : 1.5rem)' },
          { type: 'colorinput', name: 'overlayBackground', label: 'Couleur de fond' },
          { type: 'input', name: 'overlayMargin', label: 'Marge extérieure (ex : 0 0 1rem)' },
          { type: 'input', name: 'overlayPadding', label: 'Marge intérieure (ex : .5rem 1rem)' }
        ]
      }
    ]
  };

  const overlayStyleTab: Dialog.TabSpec = {
    title: 'Style du texte',
    name: 'overlaystyle',
    items: TextStyle.getItems('overlay')
  };

  const linkTab: Dialog.TabSpec = {
    title: 'Lien',
    name: 'link',
    items: LinkFields.getItems(editor, context)
  };

  const body: Dialog.TabPanelSpec = {
    type: 'tabpanel',
    tabs: [ imageTab, appearanceTab, overlayTab, overlayStyleTab, linkTab ]
  };

  editor.windowManager.open({
    title: image.src === '' ? 'Insérer une image' : 'Propriétés de l\'image',
    size: 'large',
    body,
    initialData: toDialogData(editor, context, image),
    onChange: (dialog, details) => {
      if (details.name === 'src') {
        dialog.setData({ preview: { url: readString(dialog.getData() as Record<string, unknown>, 'src') }});
      }
      LinkFields.onChange(context)(dialog, details);
    },
    onAction: (dialog, details) => {
      if (details.name === 'browse') {
        Explorer.open(editor, api, {
          onSelect: (file) => {
            dialog.setData({
              src: file.url,
              preview: { url: file.url },
              alt: readString(dialog.getData() as Record<string, unknown>, 'alt') === '' ? file.name : readString(dialog.getData() as Record<string, unknown>, 'alt')
            });
          }
        });
      } else if (details.name === 'editImage') {
        const src = readString(dialog.getData() as Record<string, unknown>, 'src');
        const name = src.substring(src.lastIndexOf('/') + 1);
        PixelEditor.open(editor, {
          url: src,
          name,
          title: src === '' ? 'Créer une image' : `Modifier « ${name} »`,
          // The edited image is saved back through the media api, then used as the new source
          onSave: (result) => api.save(Options.getRootPath(editor), result.name, result.data).then((file) => {
            dialog.setData({ src: file.url, preview: { url: file.url }});
          })
        });
      }
    },
    buttons: [
      { type: 'cancel', name: 'cancel', text: 'Annuler' },
      { type: 'submit', name: 'save', text: 'Enregistrer', primary: true }
    ],
    onSubmit: (dialog) => {
      const data = toImageData(dialog.getData() as Record<string, unknown>);
      if (data.src === '') {
        editor.windowManager.alert('Choisissez une image avant d\'enregistrer.');
        return;
      }
      ImageHtml.insertOrUpdate(editor, data);
      dialog.close();
    }
  });
};

export {
  open,
  toImageData,
  toDialogData
};
