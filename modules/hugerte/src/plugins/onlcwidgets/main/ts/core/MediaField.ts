import { Arr, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import { Dialog } from 'hugerte/core/api/ui/Ui';

/**
 * Champ « fichier », avec deux façons de le remplir.
 *
 * Le composant d'adresse livré avec l'éditeur est un champ de texte : pour désigner une image,
 * il faut en connaître l'adresse par cœur, ou l'avoir copiée ailleurs. Ce champ propose donc
 * d'abord ce qu'on attend — **parcourir la médiathèque** — et garde la saisie d'une adresse pour
 * les fichiers hébergés ailleurs, derrière un bouton qui le dit.
 *
 * L'aperçu montre ce qui est réellement sélectionné : sur une image, sa vignette ; sur un autre
 * fichier, son nom. On voit donc tout de suite si l'on s'est trompé de fichier.
 */

export interface MediaFieldSpec {
  /** `image` limite la médiathèque aux images et affiche une vignette. */
  readonly kind: 'image' | 'file';
  /** Types acceptés dans la médiathèque, par exemple `application/pdf`. */
  readonly accept?: string;
  readonly placeholder?: string;
}

const styleId = 'onlc-media-field-styles';

const styles = `
/* Préfixé par .tox pour passer devant le reset très large du thème. */
.tox .onlc-mediafield { display: block; width: 100%; border: 1px solid rgba(34, 47, 62, 0.2); border-radius: 6px; background: #ffffff; }
.tox .onlc-mediafield__current { display: flex; gap: 12px; align-items: center; padding: 10px; }
.tox .onlc-mediafield__thumb {
  display: flex; align-items: center; justify-content: center; flex: 0 0 auto;
  width: 64px; height: 64px; border-radius: 6px; background: #eef1f4 center/cover no-repeat;
  color: #8a949e; font-size: 11px; text-align: center;
}
.tox .onlc-mediafield__text { display: flex; flex-direction: column; gap: 2px; flex: 1 1 auto; min-width: 0; }
.tox .onlc-mediafield__name { font-weight: 600; color: #22303c; overflow-wrap: anywhere; }
.tox .onlc-mediafield__value { font-size: 12px; color: #5a6570; overflow-wrap: anywhere; }
.tox .onlc-mediafield__empty { font-size: 13px; color: #5a6570; }
.tox .onlc-mediafield__actions { display: flex; flex-wrap: wrap; gap: 8px; padding: 0 10px 10px; }
.tox .onlc-mediafield__button {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  min-width: 50px; min-height: 50px; padding: 0 16px; border: 1px solid rgba(34, 47, 62, 0.18);
  border-radius: 8px; background: #ffffff; font: inherit; color: #22303c; cursor: pointer;
}
.tox .onlc-mediafield__button:hover { background: #eef2f6; }
.tox .onlc-mediafield__button--primary { border-color: transparent; background: #006ce7; color: #ffffff; font-weight: 600; }
.tox .onlc-mediafield__button--primary:hover { background: #0059c1; }
.tox .onlc-mediafield__button--danger:hover { background: #fdecec; color: #b4241f; }
.tox .onlc-mediafield__custom { display: none; padding: 0 10px 10px; }
.tox .onlc-mediafield__custom[data-open="true"] { display: block; }
.tox .onlc-mediafield__input {
  box-sizing: border-box; width: 100%; min-height: 44px; padding: 8px 10px;
  border: 1px solid rgba(34, 47, 62, 0.2); border-radius: 6px; font: inherit; color: #22303c;
}
`;

const imageGlyph =
  '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6">' +
  '<rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="M3 16l5-5 4 4 3-3 6 6"></path></svg>';

const fileGlyph =
  '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6">' +
  '<path d="M6 3h8l4 4v14H6z"></path><path d="M14 3v4h4"></path></svg>';

const injectStyles = (doc: Document): void => {
  if (doc.getElementById(styleId) === null) {
    const style = doc.createElement('style');
    style.id = styleId;
    style.textContent = styles;
    doc.head.appendChild(style);
  }
};

/**
 * Adresse posée en fond d'un élément.
 *
 * Les caractères qui refermeraient la parenthèse ou la déclaration sont encodés : l'adresse
 * vient de la médiathèque ou de la saisie, elle n'a pas à pouvoir ajouter d'autres règles css.
 */
const backgroundUrl = (url: string): string => {
  const escapes: Record<string, string> = { '\\': '%5C', '"': '%22', '\'': '%27', '(': '%28', ')': '%29' };
  return /^\s*(javascript|vbscript)\s*:/i.test(url)
    ? ''
    : `url(${url.trim().replace(/[\\"'()]|\s/g, (character) => escapes[character] ?? '%20')})`;
};

const nameOf = (url: string): string => {
  const clean = url.split('?')[0].split('#')[0];
  const name = clean.substring(clean.lastIndexOf('/') + 1);
  return name === '' ? url : decodeURIComponent(name);
};

const create = (editor: Editor, spec: MediaFieldSpec) => (element: HTMLElement): Promise<Dialog.CustomEditorInit> => {
  const doc = element.ownerDocument;
  injectStyles(doc);

  const t = (text: string): string => editor.translate(text) as string;
  const isImage = spec.kind === 'image';

  let value = '';

  element.className = 'onlc-mediafield';
  element.innerHTML = '';

  const current = doc.createElement('div');
  current.className = 'onlc-mediafield__current';

  const thumb = doc.createElement('span');
  thumb.className = 'onlc-mediafield__thumb';

  const text = doc.createElement('span');
  text.className = 'onlc-mediafield__text';

  current.appendChild(thumb);
  current.appendChild(text);

  const actions = doc.createElement('div');
  actions.className = 'onlc-mediafield__actions';

  const custom = doc.createElement('div');
  custom.className = 'onlc-mediafield__custom';

  const input = doc.createElement('input');
  input.type = 'text';
  input.className = 'onlc-mediafield__input';
  input.placeholder = t(spec.placeholder ?? 'https://exemple.tld/fichier');
  input.setAttribute('aria-label', t('Adresse du fichier'));
  custom.appendChild(input);

  element.appendChild(current);
  element.appendChild(actions);
  element.appendChild(custom);

  const button = (label: string, variant: '' | 'primary' | 'danger', onClick: () => void): HTMLButtonElement => {
    const node = doc.createElement('button');
    node.type = 'button';
    node.className = `onlc-mediafield__button${variant === '' ? '' : ` onlc-mediafield__button--${variant}`}`;
    node.textContent = t(label);
    node.addEventListener('click', onClick);
    return node;
  };

  const render = () => {
    text.innerHTML = '';
    thumb.innerHTML = '';
    thumb.style.backgroundImage = '';

    if (value === '') {
      thumb.innerHTML = isImage ? imageGlyph : fileGlyph;
      const empty = doc.createElement('span');
      empty.className = 'onlc-mediafield__empty';
      empty.textContent = t(isImage
        ? 'Aucune image choisie.'
        : 'Aucun fichier choisi.');
      text.appendChild(empty);
      remove.disabled = true;
      return;
    }

    if (isImage) {
      thumb.style.backgroundImage = backgroundUrl(value);
    } else {
      thumb.innerHTML = fileGlyph;
    }

    const name = doc.createElement('span');
    name.className = 'onlc-mediafield__name';
    name.textContent = nameOf(value);

    const address = doc.createElement('span');
    address.className = 'onlc-mediafield__value';
    address.textContent = value;

    text.appendChild(name);
    text.appendChild(address);
    remove.disabled = false;
  };

  const setValue = (next: string) => {
    value = next;
    input.value = next;
    render();
  };

  const browse = () => {
    // L'explorateur appartient au plugin onlcmedia : on passe par sa commande, ce qui garde les
    // deux plugins indépendants. Quand il est absent, seule la saisie d'adresse reste, et le
    // bouton l'ouvre plutôt que de ne rien faire.
    const handled = editor.execCommand('OnlcPickMedia', false, {
      multiple: false,
      accept: spec.accept ?? (isImage ? 'image/' : undefined),
      onSelect: (files: Array<{ url: string }>) => {
        Arr.head(files).each((file) => setValue(file.url));
      }
    });
    if (handled === false) {
      custom.dataset.open = 'true';
      input.focus();
    }
  };

  const remove = button('Retirer', 'danger', () => setValue(''));

  actions.appendChild(button(isImage ? 'Choisir une image…' : 'Choisir un fichier…', 'primary', browse));
  actions.appendChild(button('Adresse personnalisée…', '', () => {
    const open = custom.dataset.open !== 'true';
    custom.dataset.open = open ? 'true' : 'false';
    if (open) {
      input.focus();
    }
  }));
  actions.appendChild(remove);

  const onInput = () => {
    value = input.value.trim();
    render();
  };
  input.addEventListener('input', onInput);

  render();

  return Promise.resolve({
    getValue: () => value,
    setValue: (next: string) => setValue(Type.isString(next) ? next : ''),
    destroy: () => input.removeEventListener('input', onInput)
  });
};

/** Spec du composant, à placer dans un dialogue. */
const field = (editor: Editor, name: string, spec: MediaFieldSpec): Dialog.CustomEditorSpec => ({
  type: 'customeditor',
  name,
  tag: 'div',
  init: create(editor, spec)
});

export {
  styles,
  backgroundUrl,
  nameOf,
  create,
  field
};
