import { Fun } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import { Dialog } from 'hugerte/core/api/ui/Ui';

import * as PagePreview from '../core/PagePreview';

/**
 * Fenêtre d'aperçu : la page entière, dans un cadre isolé.
 *
 * Le cadre porte `sandbox="allow-scripts"` **sans** `allow-same-origin`. Les deux jetons pris
 * ensemble annuleraient le bac à sable, puisque la page pourrait alors se dé-sandboxer
 * elle-même ; pris séparément, `allow-scripts` seul donne exactement ce qu'il faut : les
 * scripts du gabarit tournent — sans eux l'aperçu ne montrerait ni menu déroulant ni carrousel —
 * mais dans une origine opaque, d'où ils ne voient ni les cookies du back-office ni le document
 * qui les contient.
 *
 * Le contenu est passé par `srcdoc` : rien n'est écrit sur le serveur pour un simple aperçu.
 */

const styleId = 'onlc-preview-styles';

const styles = `
/* Préfixé par .tox pour passer devant le reset très large du thème. */
.tox .onlc-pagepreview { display: flex; flex-direction: column; width: 100%; height: 100%; min-height: 480px; }
.tox .onlc-pagepreview__bar { display: flex; gap: 8px; align-items: center; padding: 0 0 8px; font-size: 13px; color: #5a6570; }
.tox .onlc-pagepreview__device {
  display: inline-flex; align-items: center; justify-content: center; min-width: 50px; min-height: 44px;
  padding: 0 14px; border: 1px solid rgba(34, 47, 62, 0.18); border-radius: 8px;
  background: #ffffff; font: inherit; color: #22303c; cursor: pointer;
}
.tox .onlc-pagepreview__device:hover { background: #eef2f6; }
.tox .onlc-pagepreview__device[aria-pressed="true"] { border-color: transparent; background: #006ce7; color: #ffffff; font-weight: 600; }
.tox .onlc-pagepreview__stage { display: flex; flex: 1 1 auto; justify-content: center; min-height: 0; background: #eef1f4; border-radius: 8px; padding: 12px; }
.tox .onlc-pagepreview__frame { width: 100%; max-width: 100%; height: 100%; border: 0; border-radius: 6px; background: #ffffff; box-shadow: 0 1px 6px rgba(0, 0, 0, .18); }
.tox .onlc-pagepreview__message { margin: auto; padding: 24px; color: #5a6570; text-align: center; }
`;

/** Largeurs d'aperçu, en pixels. Zéro vaut « toute la place disponible ». */
const devices: Array<{ label: string; width: number }> = [
  { label: 'Ordinateur', width: 0 },
  { label: 'Tablette', width: 820 },
  { label: 'Téléphone', width: 390 }
];

const injectStyles = (doc: Document): void => {
  if (doc.getElementById(styleId) === null) {
    const style = doc.createElement('style');
    style.id = styleId;
    style.textContent = styles;
    doc.head.appendChild(style);
  }
};

const create = (editor: Editor) => (element: HTMLElement): Promise<Dialog.CustomEditorInit> => {
  const doc = element.ownerDocument;
  injectStyles(doc);

  const t = (text: string): string => editor.translate(text) as string;

  element.className = 'onlc-pagepreview';
  element.innerHTML = '';

  const bar = doc.createElement('div');
  bar.className = 'onlc-pagepreview__bar';

  const stage = doc.createElement('div');
  stage.className = 'onlc-pagepreview__stage';

  element.appendChild(bar);
  element.appendChild(stage);

  let width = 0;
  let frame: HTMLIFrameElement | null = null;

  const buttons = devices.map((device) => {
    const button = doc.createElement('button');
    button.type = 'button';
    button.className = 'onlc-pagepreview__device';
    button.textContent = t(device.label);
    button.addEventListener('click', () => {
      width = device.width;
      apply();
    });
    bar.appendChild(button);
    return button;
  });

  const apply = () => {
    if (frame !== null) {
      frame.style.maxWidth = width === 0 ? '100%' : `${width}px`;
    }
    buttons.forEach((button, index) => {
      button.setAttribute('aria-pressed', devices[index].width === width ? 'true' : 'false');
    });
  };

  const message = (text: string) => {
    frame = null;
    const paragraph = doc.createElement('p');
    paragraph.className = 'onlc-pagepreview__message';
    paragraph.textContent = t(text);
    stage.innerHTML = '';
    stage.appendChild(paragraph);
  };

  /**
   * Le cadre est construit **une fois la page prête**, avec son contenu déjà en place.
   *
   * Un iframe déplacé dans le dom recharge son document : lui poser `srcdoc` avant de l'attacher,
   * puis l'attacher une seule fois, évite d'avoir à deviner quand il est réellement en place.
   */
  const show = (html: string) => {
    const created = doc.createElement('iframe');
    created.className = 'onlc-pagepreview__frame';
    // `allow-scripts` sans `allow-same-origin` : les scripts du gabarit tournent, mais dans une
    // origine opaque, sans accès aux cookies ni au document du back-office.
    created.setAttribute('sandbox', 'allow-scripts');
    created.setAttribute('title', t('Aperçu de la page'));
    // Le gabarit charge ses feuilles et ses scripts depuis les serveurs du site : le référent
    // n'a pas à leur apprendre d'où l'on écrit.
    created.setAttribute('referrerpolicy', 'no-referrer');
    created.setAttribute('srcdoc', html);

    // Le gabarit charge ses feuilles de style avant de peindre quoi que ce soit : sur une
    // connexion lente, le cadre reste blanc plusieurs secondes. Le message d'attente est donc
    // gardé jusqu'à l'événement `load`, et le cadre monté par-dessous, invisible.
    created.style.visibility = 'hidden';
    created.style.position = 'absolute';
    created.addEventListener('load', () => {
      created.style.visibility = '';
      created.style.position = '';
      stage.innerHTML = '';
      stage.appendChild(created);
      frame = created;
      apply();
    }, { once: true });

    stage.appendChild(created);
  };

  message('Construction de l’aperçu…');

  PagePreview.render(editor).then(show, (err: unknown) => {
    message(`${t('L’aperçu n’a pas pu être construit')} : ${err instanceof Error ? err.message : String(err)}`);
  });

  return Promise.resolve({
    // La fenêtre ne renvoie rien : c'est un aperçu, pas un formulaire.
    getValue: Fun.constant(''),
    setValue: Fun.noop,
    destroy: () => {
      element.innerHTML = '';
    }
  });
};

const open = (editor: Editor): void => {
  editor.windowManager.open({
    title: 'Aperçu comme un visiteur',
    size: 'large',
    body: {
      type: 'panel',
      items: [
        { type: 'customeditor', name: 'preview', tag: 'div', init: create(editor) }
      ]
    },
    buttons: [
      { type: 'cancel', name: 'close', text: 'Fermer', primary: true }
    ]
  });
};

export {
  devices,
  styles,
  create,
  open
};
