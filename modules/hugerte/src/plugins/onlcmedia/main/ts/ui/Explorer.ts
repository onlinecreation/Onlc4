import { Arr, Fun, Singleton, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import { Dialog } from 'hugerte/core/api/ui/Ui';
import * as Destroy from 'hugerte/plugins/onlcshared/ui/Destroy';

import { MediaFile } from '../api/Types';
import * as MediaApi from '../core/MediaApi';
import * as PixelEditor from '../core/PixelEditor';
import * as FinderPanel from './FinderPanel';
import * as Prompts from './Prompts';

/**
 * Médiathèque : le dialogue qui accueille le navigateur de fichiers.
 *
 * Le contenu est dessiné par `FinderPanel`, qui reproduit les habitudes d'un gestionnaire de
 * fichiers de bureau. Le dialogue ne garde que ce qui lui revient : le titre, le bouton de
 * validation et le raccordement aux boîtes de dialogue de saisie et de confirmation.
 */

export interface ExplorerSpec {
  readonly path?: string;
  readonly title?: string;
  /** Autorise la sélection de plusieurs fichiers. */
  readonly multiple?: boolean;
  /** Restreint l'affichage, par exemple `image/`. */
  readonly accept?: string;
  readonly onSelect?: (file: MediaFile) => void;
  readonly onSelectMany?: (files: MediaFile[]) => void;
}

interface ExplorerData {
  readonly browser: string;
}

const open = (editor: Editor, api: MediaApi.MediaApi, spec: ExplorerSpec): void => {
  const dialog = Singleton.value<Dialog.DialogInstanceApi<ExplorerData>>();
  const finder = Singleton.value<FinderPanel.FinderInstance>();

  const confirmSelection = (files: MediaFile[]) => {
    if (files.length === 0) {
      return;
    }
    dialog.on((instance) => instance.close());
    spec.onSelectMany?.(files);
    spec.onSelect?.(files[0]);
  };

  const panel: Dialog.BodyComponentSpec = {
    type: 'customeditor',
    name: 'browser',
    tag: 'div',
    init: (element: HTMLElement) => {
      const instance = FinderPanel.create(editor, api, {
        path: MediaApi.normalizePath(spec.path ?? '/'),
        multiple: spec.multiple,
        accept: spec.accept,
        onSelectionChange: (files) => {
          dialog.on((current) => current.setEnabled('choose', files.length > 0));
        },
        onConfirm: confirmSelection,
        onEditImage: (file, done) => {
          PixelEditor.open(editor, {
            url: file.map((entry) => entry.url).getOrUndefined(),
            name: file.map((entry) => entry.name).getOrUndefined(),
            title: file.fold(Fun.constant('Créer une image'), (entry) => `Modifier « ${entry.name} »`),
            path: file.map((entry) => entry.path).getOrUndefined(),
            onSave: (result) => api.save(MediaApi.normalizePath(spec.path ?? '/'), result.name, result.data, {
              format: result.mime,
              replaces: result.replaces,
              label: 'Avant retouche'
            }).then(() => {
              done();
            })
          });
        },
        onPrompt: (promptSpec) => Prompts.open(editor, promptSpec),
        onDestroy: (what, detail, onConfirm) => Destroy.open(editor, { what, detail, onConfirm }),
        onError: (message) => editor.windowManager.alert(message)
      });

      element.appendChild(instance.element);
      finder.set(instance);

      return Promise.resolve({
        getValue: () => JSON.stringify(Arr.map(instance.selection(), (file) => file.path)),
        setValue: Fun.noop,
        destroy: () => instance.destroy()
      });
    }
  };

  const instance = editor.windowManager.open<ExplorerData>({
    title: spec.title ?? 'Médiathèque',
    size: 'large',
    body: { type: 'panel', items: [ panel ] },
    initialData: { browser: '' },
    buttons: [
      { type: 'cancel', name: 'cancel', text: 'Annuler' },
      { type: 'custom', name: 'choose', text: spec.multiple === true ? 'Utiliser ces fichiers' : 'Utiliser ce fichier', primary: true, enabled: false }
    ],
    onAction: (_current, details) => {
      if (details.name === 'choose') {
        finder.on((current) => confirmSelection(current.selection()));
      }
    },
    onClose: () => {
      finder.clear();
      dialog.clear();
    }
  });

  dialog.set(instance);
};

/** Ouvre la médiathèque et rend le ou les fichiers choisis, sans rien insérer dans la page. */
const pick = (editor: Editor, api: MediaApi.MediaApi, value: unknown): void => {
  const request = Type.isObject(value) ? value as Record<string, unknown> : {};
  const onSelect = request.onSelect;

  open(editor, api, {
    path: Type.isString(request.path) ? request.path : undefined,
    title: Type.isString(request.title) ? request.title : undefined,
    multiple: request.multiple === true,
    accept: Type.isString(request.accept) ? request.accept : undefined,
    onSelectMany: (files) => {
      if (Type.isFunction(onSelect)) {
        (onSelect as (files: MediaFile[]) => void)(files);
      }
    }
  });
};

export {
  open,
  pick
};
