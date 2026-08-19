import { Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import * as Http from 'hugerte/plugins/onlcshared/Http';

import * as Options from '../api/Options';

/**
 * Integration with the Pixel image editor (https://pixel.onlinecreation.me).
 *
 * The editor is displayed in a url dialog and talks to HugeRTE with `window.postMessage`.
 * The exchanged messages are documented in `docs/api/onlc-pixel-editor.md`:
 *
 * - HugeRTE → Pixel : `{ mceAction: 'onlc:open', url, name }` (also passed as query parameters)
 * - Pixel → HugeRTE : `{ mceAction: 'onlc:save', name, mime, data }` where `data` is a data url
 * - Pixel → HugeRTE : `{ mceAction: 'close' }`
 *
 * Retoucher une image n'écrase jamais l'originale : le chemin du fichier d'origine repart avec
 * l'enregistrement (`replaces`), et l'api en fait une **version** de plus. Le rédacteur peut
 * revenir en arrière depuis la médiathèque, et l'adresse publiée ne change pas.
 */

export interface PixelSaveResult {
  readonly name: string;
  readonly mime: string;
  readonly data: string;
  /**
   * Ce que la retouche remplace : le chemin du fichier quand on le connaît, sinon l'adresse de
   * l'image d'origine. À l'api de dire si elle s'y reconnaît — une image venue d'ailleurs
   * donnera simplement un nouveau fichier.
   */
  readonly replaces?: string;
}

export interface PixelOpenSpec {
  /** Url of the image to edit, empty for a new image. */
  readonly url?: string;
  readonly name?: string;
  readonly title?: string;
  /** Chemin du fichier retouché : son contenu actuel deviendra une version antérieure. */
  readonly path?: string;
  readonly onSave: (result: PixelSaveResult) => Promise<void> | void;
}

const defaultName = 'image.png';

const buildUrl = (editor: Editor, spec: PixelOpenSpec): string => {
  const base = Options.getImageEditorUrl(editor);
  const params: Record<string, string> = {
    origin: window.location.origin,
    integration: 'onlc'
  };

  if (Type.isString(spec.url) && spec.url !== '') {
    params.image = spec.url;
  }
  if (Type.isString(spec.name) && spec.name !== '') {
    params.name = spec.name;
  }

  return Http.appendParams(base, params);
};

const guessName = (spec: PixelOpenSpec, message: Record<string, unknown>): string => {
  if (Type.isString(message.name) && message.name !== '') {
    return message.name;
  } else if (Type.isString(spec.name) && spec.name !== '') {
    return spec.name;
  } else {
    return defaultName;
  }
};

const open = (editor: Editor, spec: PixelOpenSpec): void => {
  const api = editor.windowManager.openUrl({
    title: spec.title ?? 'Éditeur d\'images',
    url: buildUrl(editor, spec),
    width: Math.min(1400, Math.round(window.innerWidth * 0.9)),
    height: Math.min(900, Math.round(window.innerHeight * 0.85)),
    onMessage: (dialogApi, message) => {
      const action = message.mceAction;

      if (action === 'onlc:save' || action === 'save') {
        const data = message.data ?? message.image ?? message.dataUrl;
        if (!Type.isString(data) || data === '') {
          return;
        }
        dialogApi.block('Enregistrement en cours...');
        Promise.resolve(spec.onSave({
          name: guessName(spec, message),
          mime: Type.isString(message.mime) ? message.mime : 'image/png',
          data,
          replaces: spec.path ?? spec.url
        })).then(() => {
          dialogApi.unblock();
          dialogApi.close();
        }, (err: unknown) => {
          dialogApi.unblock();
          editor.windowManager.alert(`L'enregistrement a échoué : ${err instanceof Error ? err.message : String(err)}`);
        });
      } else if (action === 'close' || action === 'onlc:close') {
        dialogApi.close();
      }
    }
  });

  // Let the editor know which image it should load, for integrations reading the message
  // instead of the query parameters.
  api.sendMessage({ mceAction: 'onlc:open', url: spec.url ?? '', name: spec.name ?? '' });
};

export {
  open
};
