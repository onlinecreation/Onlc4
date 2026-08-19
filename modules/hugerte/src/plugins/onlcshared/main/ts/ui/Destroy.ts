import { Fun, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import { Dialog } from 'hugerte/core/api/ui/Ui';

/**
 * Confirmation d'une suppression, par maintien du bouton.
 *
 * Une boîte « Êtes-vous sûr ? » ne protège de rien : on répond oui sans lire, par réflexe. Le
 * geste demandé ici est **continu** — il faut garder le bouton enfoncé pendant six secondes — et
 * s'interrompt de lui-même : relâcher annule. Impossible à faire par mégarde, et impossible à
 * confondre avec un clic ordinaire.
 *
 * Le décompte est annoncé aux lecteurs d'écran par une zone `aria-live`, et le bouton
 * d'annulation est celui qui a le focus à l'ouverture : la touche Entrée ne détruit rien.
 *
 * ```ts
 * Destroy.open(editor, {
 *   what: 'le bloc',
 *   detail: 'Cette action ne peut pas être annulée.',
 *   onConfirm: () => editor.dom.remove(node)
 * });
 * ```
 */

export interface DestroySpec {
  /** Ce qui va disparaître, au complément d'objet : « le bloc », « le dossier “photos” ». */
  readonly what: string;
  /** Phrase supplémentaire affichée sous le titre. */
  readonly detail?: string;
  /** Durée du maintien, en secondes. */
  readonly seconds?: number;
  /** Intitulé du bouton destructeur. */
  readonly destroyLabel?: string;
  readonly onConfirm: () => void;
}

const styleId = 'onlc-destroy-styles';

const defaultSeconds = 6;

const styles = `
/* Préfixé par .tox pour passer devant le reset très large du thème. */
.tox .onlc-destroy { display: block; width: 100%; }
.tox .onlc-destroy__lead { margin: 0 0 4px; font-size: 15px; line-height: 1.45; color: #22303c; }
.tox .onlc-destroy__detail { margin: 0 0 16px; font-size: 13px; line-height: 1.45; color: #5a6570; }
.tox .onlc-destroy__hold {
  position: relative; display: flex; align-items: center; justify-content: center;
  box-sizing: border-box; width: 100%; min-height: 72px; padding: 0 20px; overflow: hidden;
  border: 2px solid #b4241f; border-radius: 8px; background: #ffffff; color: #b4241f;
  font: inherit; font-size: 16px; font-weight: 600; text-align: center; cursor: pointer;
  touch-action: none; user-select: none; -webkit-user-select: none;
}
.tox .onlc-destroy__hold:hover { background: #fdecec; }
.tox .onlc-destroy__hold:focus { outline: 0; box-shadow: 0 0 0 3px rgba(180, 36, 31, .35); }
.tox .onlc-destroy__hold[data-holding="true"] { background: #b4241f; color: #ffffff; }
/* La barre progresse sous le libellé : elle donne le temps restant sans qu'on ait à lire. */
.tox .onlc-destroy__fill {
  position: absolute; top: 0; bottom: 0; left: 0; width: 0%;
  background: rgba(180, 36, 31, .18); pointer-events: none;
}
.tox .onlc-destroy__hold[data-holding="true"] .onlc-destroy__fill { background: rgba(255, 255, 255, .28); }
.tox .onlc-destroy__label { position: relative; }
.tox .onlc-destroy__hint { margin: 10px 0 0; font-size: 13px; line-height: 1.4; color: #5a6570; text-align: center; }
`;

const injectStyles = (doc: Document): void => {
  if (doc.getElementById(styleId) === null) {
    const style = doc.createElement('style');
    style.id = styleId;
    style.textContent = styles;
    doc.head.appendChild(style);
  }
};

/**
 * Construit le corps de la boîte : le texte, le bouton à maintenir et le décompte.
 *
 * `onDone` est appelé quand le maintien va au bout ; c'est l'appelant qui referme la boîte, pour
 * que la fermeture et la suppression restent dans le même ordre.
 */
const createBody = (editor: Editor, spec: DestroySpec, onDone: () => void) =>
  (element: HTMLElement): Promise<Dialog.CustomEditorInit> => {
    const doc = element.ownerDocument;
    injectStyles(doc);

    const total = Math.max(1, Math.round(spec.seconds ?? defaultSeconds));
    const translate = (text: string): string => editor.translate(text) as string;

    element.className = 'onlc-destroy';
    element.innerHTML = '';

    const lead = doc.createElement('p');
    lead.className = 'onlc-destroy__lead';
    lead.textContent = `${translate('Maintenez le bouton enfoncé pour supprimer')} ${spec.what}.`;

    const detail = doc.createElement('p');
    detail.className = 'onlc-destroy__detail';
    detail.textContent = translate(spec.detail ?? 'Cette action est définitive.');

    const hold = doc.createElement('button');
    hold.type = 'button';
    hold.className = 'onlc-destroy__hold';

    const fill = doc.createElement('span');
    fill.className = 'onlc-destroy__fill';

    const label = doc.createElement('span');
    label.className = 'onlc-destroy__label';

    hold.appendChild(fill);
    hold.appendChild(label);

    const hint = doc.createElement('p');
    hint.className = 'onlc-destroy__hint';
    // Annoncé aux lecteurs d'écran, mais poliment : le décompte ne doit pas couper la lecture.
    hint.setAttribute('aria-live', 'polite');

    element.appendChild(lead);
    element.appendChild(detail);
    element.appendChild(hold);
    element.appendChild(hint);

    const idleLabel = translate(spec.destroyLabel ?? 'Tout détruire');
    const restText = translate('Maintenez enfoncé pendant {0} secondes.').replace('{0}', String(total));

    let timer: number | null = null;
    let startedAt = 0;

    const rest = () => {
      hold.dataset.holding = 'false';
      fill.style.width = '0%';
      label.textContent = idleLabel;
      hint.textContent = restText;
    };

    const stop = () => {
      if (timer !== null) {
        doc.defaultView?.clearInterval(timer);
        timer = null;
      }
    };

    const cancel = () => {
      if (timer === null) {
        return;
      }
      stop();
      rest();
    };

    const tick = () => {
      const elapsed = (Date.now() - startedAt) / 1000;
      const left = Math.max(0, total - elapsed);

      fill.style.width = `${Math.min(100, (elapsed / total) * 100)}%`;
      label.textContent = translate('Suppression dans {0} secondes')
        .replace('{0}', String(Math.ceil(left)));
      hint.textContent = translate('Lâchez pour annuler.');

      if (left <= 0) {
        stop();
        onDone();
      }
    };

    const start = () => {
      if (timer !== null) {
        return;
      }
      startedAt = Date.now();
      hold.dataset.holding = 'true';
      tick();
      timer = doc.defaultView?.setInterval(tick, 100) ?? null;
    };

    hold.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      // Le pointeur est capturé : sortir du bouton pendant le maintien ne fait pas perdre
      // l'événement de relâchement, qui doit toujours pouvoir annuler.
      //
      // La capture échoue quand le pointeur n'est plus actif — un relâchement arrivé entre
      // l'événement et son traitement, par exemple. C'est sans conséquence : on garde alors le
      // comportement par défaut. Ce qui ne serait pas acceptable, c'est que l'exception
      // remonte et laisse le bouton inerte.
      if (Type.isFunction(hold.setPointerCapture)) {
        try {
          hold.setPointerCapture(e.pointerId);
        } catch (_err) {
          // Le maintien fonctionne sans capture, simplement moins bien.
        }
      }
      hold.focus();
      start();
    });
    hold.addEventListener('pointerup', cancel);
    hold.addEventListener('pointercancel', cancel);
    hold.addEventListener('lostpointercapture', cancel);

    // Au clavier, la barre d'espace et Entrée jouent le même rôle : maintenir, puis relâcher.
    hold.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        start();
      }
    });
    hold.addEventListener('keyup', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        cancel();
      }
    });
    hold.addEventListener('blur', cancel);

    rest();

    return Promise.resolve({
      // Le composant ne porte aucune valeur : c'est le maintien du bouton qui décide, pas le
      // formulaire. La boîte n'a d'ailleurs pas de bouton de validation.
      getValue: Fun.constant(''),
      setValue: Fun.noop,
      destroy: stop
    });
  };

/** Ouvre la boîte. Rien n'est supprimé tant que le maintien n'est pas allé au bout. */
const open = (editor: Editor, spec: DestroySpec): void => {
  let close: (() => void) | null = null;
  let done = false;

  const confirm = () => {
    if (done) {
      return;
    }
    done = true;
    if (close !== null) {
      close();
    }
    spec.onConfirm();
  };

  const api = editor.windowManager.open({
    title: '⚠️ DESTRUCTION',
    size: 'normal',
    body: {
      type: 'panel',
      items: [
        { type: 'customeditor', name: 'destroy', tag: 'div', init: createBody(editor, spec, confirm) }
      ]
    },
    buttons: [
      // Le bouton d'annulation est le bouton principal : c'est lui qui prend le focus, et
      // Entrée ou Échap referment donc la boîte sans rien détruire.
      { type: 'cancel', name: 'cancel', text: 'Ne pas supprimer', primary: true }
    ]
  });

  close = () => api.close();
};

export {
  defaultSeconds,
  styles,
  open
};
