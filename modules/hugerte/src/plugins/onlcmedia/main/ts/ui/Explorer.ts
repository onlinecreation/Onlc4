import { Arr, Optional, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import { Dialog } from 'hugerte/core/api/ui/Ui';

import * as Options from '../api/Options';
import { MediaFile, MediaListing } from '../api/Types';
import * as MediaApi from '../core/MediaApi';
import * as PixelEditor from '../core/PixelEditor';
import * as Prompts from './Prompts';

/**
 * File explorer: folder browsing, upload, folder creation and deletion, copy, move, rename,
 * image creation and edition with the Pixel editor.
 */

export interface ExplorerSpec {
  readonly path?: string;
  readonly title?: string;
  readonly onSelect?: (file: MediaFile) => void;
}

interface ImagePreviewData {
  readonly url: string;
  readonly zoom?: number;
}

interface ExplorerData {
  readonly path: string;
  readonly selection: string;
  readonly folders: Dialog.CollectionItem[];
  readonly files: Dialog.CollectionItem[];
  readonly preview: ImagePreviewData;
  readonly upload: File[];
}

const emptyListing = (path: string): MediaListing => ({ path, parent: null, folders: [], files: [] });

const thumbnailIcon = (editor: Editor, file: MediaFile): string => {
  const url = editor.dom.encode(file.thumbnailUrl ?? file.url);
  const alt = editor.dom.encode(file.name);
  return `<img src="${url}" alt="${alt}" loading="lazy" style="max-width: 100%; max-height: 100%; object-fit: contain;">`;
};

const open = (editor: Editor, api: MediaApi.MediaApi, spec: ExplorerSpec): void => {
  let path = MediaApi.normalizePath(spec.path ?? Options.getRootPath(editor));
  let listing = emptyListing(path);
  let selected = Optional.none<MediaFile>();

  const toFolderItems = (): Dialog.CollectionItem[] => {
    const parent = listing.parent;
    const up: Dialog.CollectionItem[] = Type.isString(parent) && parent !== ''
      ? [ { value: parent, text: 'Dossier parent', icon: 'action-prev' } ]
      : [];
    return up.concat(Arr.map(listing.folders, (folder) => ({
      value: folder.path,
      text: folder.name,
      icon: 'browse'
    })));
  };

  const toFileItems = (): Dialog.CollectionItem[] =>
    Arr.map(listing.files, (file) => ({
      value: file.path,
      text: file.name,
      icon: thumbnailIcon(editor, file)
    }));

  const currentData = (): Partial<ExplorerData> => ({
    path,
    selection: selected.map((file) => file.name).getOr(''),
    folders: toFolderItems(),
    files: toFileItems(),
    preview: { url: selected.map((file) => file.url).getOr('') }
  });

  const fileActions = [ 'edit', 'rename', 'copy', 'move', 'delete', 'insert' ];

  const updateSelectionState = (dialogApi: Dialog.DialogInstanceApi<ExplorerData>) => {
    const enabled = selected.isSome();
    Arr.each(fileActions, (name) => dialogApi.setEnabled(name, enabled));
  };

  const reportError = (dialogApi: Dialog.DialogInstanceApi<ExplorerData>, err: unknown) => {
    dialogApi.unblock();
    const message = err instanceof Error ? err.message : String(err);
    editor.windowManager.alert(message);
  };

  const refresh = (dialogApi: Dialog.DialogInstanceApi<ExplorerData>, nextPath?: string): Promise<void> => {
    const target = MediaApi.normalizePath(nextPath ?? path);
    dialogApi.block('Chargement du dossier...');
    return api.list(target).then((result) => {
      path = result.path;
      listing = result;
      selected = Optional.none();
      dialogApi.setData(currentData());
      updateSelectionState(dialogApi);
      dialogApi.unblock();
    }, (err) => {
      listing = emptyListing(target);
      dialogApi.setData(currentData());
      reportError(dialogApi, err);
    });
  };

  const selectFile = (dialogApi: Dialog.DialogInstanceApi<ExplorerData>, filePath: string) => {
    selected = Arr.find(listing.files, (file) => file.path === filePath);
    dialogApi.setData(currentData());
    updateSelectionState(dialogApi);
  };

  const uploadFiles = (dialogApi: Dialog.DialogInstanceApi<ExplorerData>, files: File[]) => {
    const maxSize = Options.getMaxUploadSize(editor);
    const tooBig = Arr.find(files, (file) => maxSize > 0 && file.size > maxSize);

    if (tooBig.isSome()) {
      editor.windowManager.alert(`Le fichier « ${tooBig.getOrDie().name} » dépasse la taille maximale autorisée.`);
      return;
    }

    dialogApi.block('Téléversement en cours...');
    Promise.all(Arr.map(files, (file) => api.upload(path, file)))
      .then(() => {
        dialogApi.setData({ upload: [] });
        dialogApi.unblock();
        refresh(dialogApi);
      }, (err) => {
        dialogApi.setData({ upload: [] });
        reportError(dialogApi, err);
      });
  };

  const transferTo = (dialogApi: Dialog.DialogInstanceApi<ExplorerData>, mode: 'copy' | 'move') => {
    selected.each((file) => {
      Prompts.open(editor, {
        title: mode === 'copy' ? 'Copier vers' : 'Déplacer vers',
        label: 'Dossier de destination',
        initialValue: path,
        submitText: mode === 'copy' ? 'Copier' : 'Déplacer',
        onSubmit: (target) => {
          dialogApi.block('Traitement en cours...');
          const operation = mode === 'copy' ? api.copy : api.move;
          operation([ file.path ], MediaApi.normalizePath(target)).then(() => {
            dialogApi.unblock();
            refresh(dialogApi);
          }, (err) => reportError(dialogApi, err));
        }
      });
    });
  };

  const saveFromPixelEditor = (dialogApi: Dialog.DialogInstanceApi<ExplorerData>) => (result: PixelEditor.PixelSaveResult): Promise<void> =>
    api.save(path, result.name, result.data).then(() => {
      refresh(dialogApi);
    });

  const body: Dialog.PanelSpec = {
    type: 'panel',
    items: [
      {
        type: 'bar',
        items: [
          { type: 'button', name: 'up', text: 'Dossier parent', icon: 'action-prev', borderless: true },
          { type: 'button', name: 'refresh', text: 'Actualiser', icon: 'reload', borderless: true },
          { type: 'button', name: 'newfolder', text: 'Nouveau dossier', icon: 'plus', borderless: true },
          { type: 'button', name: 'deletefolder', text: 'Supprimer le dossier', icon: 'remove', borderless: true },
          { type: 'button', name: 'newimage', text: 'Créer une image', icon: 'edit-image', borderless: true }
        ]
      },
      {
        type: 'grid',
        columns: 2,
        items: [
          { type: 'input', name: 'path', label: 'Dossier' },
          { type: 'input', name: 'selection', label: 'Fichier sélectionné', enabled: false }
        ]
      },
      { type: 'collection', name: 'folders', label: 'Dossiers' },
      { type: 'collection', name: 'files', label: 'Fichiers' },
      { type: 'imagepreview', name: 'preview', height: '220px' },
      {
        type: 'bar',
        items: [
          { type: 'button', name: 'edit', text: 'Modifier dans Pixel', icon: 'edit-image', borderless: true },
          { type: 'button', name: 'rename', text: 'Renommer', icon: 'edit-block', borderless: true },
          { type: 'button', name: 'copy', text: 'Copier vers', icon: 'copy', borderless: true },
          { type: 'button', name: 'move', text: 'Déplacer vers', icon: 'drag', borderless: true },
          { type: 'button', name: 'delete', text: 'Supprimer', icon: 'remove', borderless: true }
        ]
      },
      { type: 'dropzone', name: 'upload', label: 'Téléverser des fichiers' }
    ]
  };

  const dialogApi = editor.windowManager.open<ExplorerData>({
    title: spec.title ?? 'Explorateur de fichiers',
    size: 'large',
    body,
    initialData: {
      path,
      selection: '',
      folders: [],
      files: [],
      preview: { url: '' },
      upload: []
    },
    buttons: [
      { type: 'cancel', name: 'cancel', text: 'Fermer' },
      { type: 'custom', name: 'insert', text: 'Utiliser cette image', primary: true }
    ],
    onChange: (dialog, details) => {
      if (details.name === 'upload') {
        const files = dialog.getData().upload;
        if (Type.isArray(files) && files.length > 0) {
          uploadFiles(dialog, files);
        }
      } else if (details.name === 'path') {
        // Typing a path and leaving the field navigates to it
        const typed = MediaApi.normalizePath(dialog.getData().path);
        if (typed !== path) {
          refresh(dialog, typed);
        }
      }
    },
    onAction: (dialog, details) => {
      switch (details.name) {
        case 'folders':
          refresh(dialog, String(details.value));
          break;
        case 'files':
          selectFile(dialog, String(details.value));
          break;
        case 'up':
          refresh(dialog, Type.isString(listing.parent) ? listing.parent : MediaApi.parentOf(path));
          break;
        case 'refresh':
          refresh(dialog);
          break;
        case 'newfolder':
          Prompts.open(editor, {
            title: 'Nouveau dossier',
            label: 'Nom du dossier',
            submitText: 'Créer',
            onSubmit: (name) => {
              dialog.block('Création en cours...');
              api.createFolder(path, name).then(() => {
                dialog.unblock();
                refresh(dialog);
              }, (err) => reportError(dialog, err));
            }
          });
          break;
        case 'deletefolder':
          Prompts.confirm(editor, `Supprimer le dossier « ${path} » et tout son contenu ?`, () => {
            const parent = Type.isString(listing.parent) ? listing.parent : MediaApi.parentOf(path);
            dialog.block('Suppression en cours...');
            api.deleteFolder(path).then(() => {
              dialog.unblock();
              refresh(dialog, parent);
            }, (err) => reportError(dialog, err));
          });
          break;
        case 'newimage':
          PixelEditor.open(editor, {
            title: 'Créer une image',
            onSave: saveFromPixelEditor(dialog)
          });
          break;
        case 'edit':
          selected.each((file) => {
            PixelEditor.open(editor, {
              url: file.url,
              name: file.name,
              title: `Modifier « ${file.name} »`,
              onSave: saveFromPixelEditor(dialog)
            });
          });
          break;
        case 'rename':
          selected.each((file) => {
            Prompts.open(editor, {
              title: 'Renommer',
              label: 'Nouveau nom',
              initialValue: file.name,
              submitText: 'Renommer',
              onSubmit: (name) => {
                dialog.block('Renommage en cours...');
                api.rename(file.path, name).then(() => {
                  dialog.unblock();
                  refresh(dialog);
                }, (err) => reportError(dialog, err));
              }
            });
          });
          break;
        case 'copy':
          transferTo(dialog, 'copy');
          break;
        case 'move':
          transferTo(dialog, 'move');
          break;
        case 'delete':
          selected.each((file) => {
            Prompts.confirm(editor, `Supprimer le fichier « ${file.name} » ?`, () => {
              dialog.block('Suppression en cours...');
              api.deleteFile(file.path).then(() => {
                dialog.unblock();
                refresh(dialog);
              }, (err) => reportError(dialog, err));
            });
          });
          break;
        case 'insert':
          selected.each((file) => {
            dialog.close();
            spec.onSelect?.(file);
          });
          break;
        default:
          break;
      }
    }
  });

  updateSelectionState(dialogApi);
  refresh(dialogApi);
};

export {
  open
};
