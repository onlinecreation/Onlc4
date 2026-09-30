import { Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import * as Http from 'hugerte/plugins/onlcshared/Http';

import * as Options from '../api/Options';

/**
 * Pont vers l'éditeur d'images.
 *
 * L'éditeur est affiché dans une fenêtre d'url et parle à HugeRTE par `window.postMessage`.
 * Online Création déploie [Pixie](https://pixie.vebto.com/) sous le nom **Pixel•OnlineCreation**,
 * mais ce module ne connaît que le contrat d'échange : n'importe quel éditeur qui le respecte
 * fonctionne. Les messages sont décrits dans `docs/api/onlc-pixie-editor.md` :
 *
 * - HugeRTE → éditeur : `{ mceAction: 'onlc:open', url, name }` (aussi en paramètres d'url)
 * - éditeur → HugeRTE : `{ mceAction: 'onlc:save', name, mime, data }`, `data` en data url
 * - éditeur → HugeRTE : `{ mceAction: 'close' }`
 *
 * Retoucher une image n'écrase jamais l'originale : le chemin du fichier d'origine repart avec
 * l'enregistrement (`replaces`), et l'api en fait une **version** de plus. Le rédacteur peut
 * revenir en arrière depuis la médiathèque, et l'adresse publiée ne change pas.
 */

export interface ImageEditorSaveResult {
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

export interface ImageEditorOpenSpec {
  /** Url of the image to edit, empty for a new image. */
  readonly url?: string;
  readonly name?: string;
  readonly title?: string;
  /** Chemin du fichier retouché : son contenu actuel deviendra une version antérieure. */
  readonly path?: string;
  readonly onSave: (result: ImageEditorSaveResult) => Promise<void> | void;
}

const defaultName = 'image.png';

const buildUrl = (editor: Editor, spec: ImageEditorOpenSpec): string => {
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

const guessName = (spec: ImageEditorOpenSpec, message: Record<string, unknown>): string => {
  if (Type.isString(message.name) && message.name !== '') {
    return message.name;
  } else if (Type.isString(spec.name) && spec.name !== '') {
    return spec.name;
  } else {
    return defaultName;
  }
};

const open = (editor: Editor, spec: ImageEditorOpenSpec): void => {
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

  // Indique à l'éditeur l'image à ouvrir, pour les intégrations qui lisent le message
  // plutôt que les paramètres d'url.
  api.sendMessage({ mceAction: 'onlc:open', url: spec.url ?? '', name: spec.name ?? '' });
};

export {
  open
};
