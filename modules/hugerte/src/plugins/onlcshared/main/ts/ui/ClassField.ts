import { Arr, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import { Dialog } from 'hugerte/core/api/ui/Ui';

import * as SiteCss from '../SiteCss';

/**
 * Champ « classes css », avec les classes du site en suggestions.
 *
 * Les classes d'une page réelle ne s'inventent pas : `flex-v-center`, `screen0-new`,
 * `btn-outline-default` viennent de la feuille du design, et personne ne les retient. Un champ de
 * texte libre oblige donc à ouvrir la feuille dans un autre onglet pour y copier un nom — ou à
 * l'écrire de mémoire, et à ne rien voir se produire quand on se trompe d'un tiret.
 *
 * Le champ montre donc ce qui existe. Chaque classe posée devient une étiquette qu'on retire d'un
 * clic ; la saisie propose les classes de la feuille du site qui commencent par ce qu'on tape, et
 * n'empêche jamais d'écrire un nom absent — une classe peut venir d'ailleurs.
 *
 * Quand la feuille du site n'a pas pu être lue — elle est sur un autre domaine et ne s'ouvre pas
 * à la lecture — le champ le **dit**, au lieu de présenter une liste vide qu'on prendrait pour
 * « ce site n'a pas de classes ».
 */

export interface ClassFieldSpec {
  readonly placeholder?: string;
  /** Classes toujours proposées, en plus de celles relevées dans la feuille du site. */
  readonly extra?: string[];
}

const styleId = 'onlc-class-field-styles';

const styles = `
/* Préfixé par .tox pour passer devant le reset très large du thème. */
.tox .onlc-classfield { display: block; width: 100%; border: 1px solid rgba(34, 47, 62, 0.2); border-radius: 6px; background: #fff; }
.tox .onlc-classfield__chips { display: flex; flex-wrap: wrap; gap: 6px; padding: 8px; min-height: 24px; }
.tox .onlc-classfield__empty { color: #5a6570; font-size: 13px; }
.tox .onlc-classfield__chip {
  display: inline-flex; align-items: center; gap: 6px; padding: 4px 6px 4px 10px;
  border-radius: 999px; background: #eef2f6; color: #22303c; font-size: 13px;
}
.tox .onlc-classfield__chip code { font-family: ui-monospace, "SFMono-Regular", "Menlo", monospace; }
.tox .onlc-classfield__remove {
  display: inline-flex; align-items: center; justify-content: center;
  width: 22px; height: 22px; padding: 0; border: 0; border-radius: 999px;
  background: transparent; color: #5a6570; font: inherit; line-height: 1; cursor: pointer;
}
.tox .onlc-classfield__remove:hover { background: #d9e2ea; color: #b4241f; }
.tox .onlc-classfield__entry { display: flex; gap: 8px; padding: 0 8px 8px; }
.tox .onlc-classfield__input {
  box-sizing: border-box; flex: 1 1 auto; min-height: 44px; padding: 8px 10px;
  border: 1px solid rgba(34, 47, 62, 0.2); border-radius: 6px; font: inherit; color: #22303c;
}
.tox .onlc-classfield__add {
  min-width: 50px; min-height: 44px; padding: 0 14px; border: 1px solid rgba(34, 47, 62, 0.18);
  border-radius: 8px; background: #fff; font: inherit; color: #22303c; cursor: pointer;
}
.tox .onlc-classfield__add:hover { background: #eef2f6; }
.tox .onlc-classfield__suggestions { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 8px 8px; }
.tox .onlc-classfield__suggestion {
  padding: 4px 10px; border: 1px solid rgba(34, 47, 62, 0.18); border-radius: 999px;
  background: #fff; font: inherit; font-size: 13px; color: #006ce7; cursor: pointer;
}
.tox .onlc-classfield__suggestion:hover { background: #eef2f6; }
.tox .onlc-classfield__note { padding: 0 8px 8px; margin: 0; color: #5a6570; font-size: 12px; }
`;

const injectStyles = (doc: Document): void => {
  if (doc.getElementById(styleId) === null) {
    const style = doc.createElement('style');
    style.id = styleId;
    style.textContent = styles;
    doc.head.appendChild(style);
  }
};

/** Une classe css valide : ni espace, ni caractère qui refermerait l'attribut. */
const isValidName = (name: string): boolean => /^-?[_a-zA-Z][\w-]*$/.test(name);

const split = (value: string): string[] =>
  Arr.filter(value.split(/\s+/), (name) => name !== '');

/** Nombre de suggestions affichées d'un coup : au-delà, la liste cesse d'être lisible. */
const suggestionLimit = 12;

const create = (editor: Editor, spec: ClassFieldSpec) => (element: HTMLElement): Promise<Dialog.CustomEditorInit> => {
  const doc = element.ownerDocument;
  injectStyles(doc);

  const t = (text: string): string => editor.translate(text) as string;

  let value: string[] = [];
  let known: string[] = spec.extra ?? [];

  element.className = 'onlc-classfield';
  element.innerHTML = '';

  const chips = doc.createElement('div');
  chips.className = 'onlc-classfield__chips';

  const entry = doc.createElement('div');
  entry.className = 'onlc-classfield__entry';

  const input = doc.createElement('input');
  input.type = 'text';
  input.className = 'onlc-classfield__input';
  input.placeholder = t(spec.placeholder ?? 'Nom d’une classe, par exemple text-center');
  input.setAttribute('aria-label', t('Ajouter une classe'));

  const add = doc.createElement('button');
  add.type = 'button';
  add.className = 'onlc-classfield__add';
  add.textContent = t('Ajouter');

  entry.appendChild(input);
  entry.appendChild(add);

  const suggestions = doc.createElement('div');
  suggestions.className = 'onlc-classfield__suggestions';

  const note = doc.createElement('p');
  note.className = 'onlc-classfield__note';

  element.appendChild(chips);
  element.appendChild(entry);
  element.appendChild(suggestions);
  element.appendChild(note);

  const push = (name: string) => {
    const clean = name.trim();
    if (clean === '' || Arr.contains(value, clean) || !isValidName(clean)) {
      return;
    }
    value = value.concat([ clean ]);
    renderChips();
  };

  const renderChips = () => {
    chips.innerHTML = '';
    if (value.length === 0) {
      const empty = doc.createElement('span');
      empty.className = 'onlc-classfield__empty';
      empty.textContent = t('Aucune classe pour l’instant.');
      chips.appendChild(empty);
      return;
    }
    Arr.each(value, (name) => {
      const chip = doc.createElement('span');
      chip.className = 'onlc-classfield__chip';

      const label = doc.createElement('code');
      label.textContent = name;

      const remove = doc.createElement('button');
      remove.type = 'button';
      remove.className = 'onlc-classfield__remove';
      remove.textContent = '✕';
      remove.title = `${t('Retirer')} ${name}`;
      remove.setAttribute('aria-label', remove.title);
      remove.addEventListener('click', () => {
        value = Arr.filter(value, (candidate) => candidate !== name);
        renderChips();
        renderSuggestions();
      });

      chip.appendChild(label);
      chip.appendChild(remove);
      chips.appendChild(chip);
    });
  };

  const renderSuggestions = () => {
    const typed = input.value.trim().toLowerCase();
    const available = Arr.filter(known, (name) =>
      !Arr.contains(value, name) && (typed === '' || name.toLowerCase().indexOf(typed) === 0));

    suggestions.innerHTML = '';
    Arr.each(available.slice(0, suggestionLimit), (name) => {
      const button = doc.createElement('button');
      button.type = 'button';
      button.className = 'onlc-classfield__suggestion';
      button.textContent = name;
      button.addEventListener('click', () => {
        push(name);
        input.value = '';
        renderSuggestions();
      });
      suggestions.appendChild(button);
    });

    const hidden = available.length - Math.min(available.length, suggestionLimit);

    if (known.length === 0 && SiteCss.unreadable(editor).length > 0) {
      note.textContent = t(
        'Les classes de la feuille de style du site n’ont pas pu être lues : elle est servie par un ' +
        'autre domaine, qui n’en autorise pas la lecture. Écrivez le nom de la classe à la main.');
    } else if (known.length === 0) {
      note.textContent = t('Aucune feuille de style de site n’est déclarée : écrivez le nom de la classe à la main.');
    } else if (hidden > 0) {
      note.textContent = `${t('Classes du site.')} ${hidden} ${t('autres : continuez à écrire pour les filtrer.')}`;
    } else if (available.length === 0 && typed !== '') {
      note.textContent = t('Aucune classe du site ne commence ainsi. Vous pouvez tout de même l’ajouter.');
    } else {
      note.textContent = t('Classes de la feuille de style du site et des autres blocs de la page.');
    }
  };

  const commit = () => {
    Arr.each(split(input.value), push);
    input.value = '';
    renderSuggestions();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === ',') {
      e.preventDefault();
      commit();
    }
  };
  const onInput = () => renderSuggestions();

  add.addEventListener('click', commit);
  input.addEventListener('keydown', onKeyDown);
  input.addEventListener('input', onInput);

  renderChips();
  renderSuggestions();

  // Les classes de la feuille du site arrivent quand elles arrivent : le champ est utilisable
  // avant, et se garnit tout seul ensuite.
  SiteCss.load(editor).then(() => {
    known = Arr.unique((spec.extra ?? []).concat(SiteCss.classes(editor)));
    renderSuggestions();
  });

  return Promise.resolve({
    getValue: () => value.join(' '),
    setValue: (next: string) => {
      value = Type.isString(next) ? Arr.filter(split(next), isValidName) : [];
      renderChips();
      renderSuggestions();
    },
    destroy: () => {
      input.removeEventListener('keydown', onKeyDown);
      input.removeEventListener('input', onInput);
    }
  });
};

/**
 * Les classes déjà posées ailleurs dans la page.
 *
 * Elles sont proposées en plus de celles de la feuille du site : une page reprend souvent ses
 * propres conventions, et une classe utilisée trois fois plus haut est la suggestion la plus
 * juste qu'on puisse faire — même quand la feuille du site n'a pas pu être lue.
 */
const inPage = (editor: Editor): string[] => {
  const body = editor.getBody();
  if (!Type.isNonNullable(body)) {
    return [];
  }
  return Arr.unique(Arr.bind(editor.dom.select('*[class]', body), (element) =>
    Arr.filter(split(element.className), (name) =>
      // Les classes de l'interface d'écriture ne décrivent pas la page : les proposer inviterait
      // à les poser sur du contenu, où elles ne voudraient rien dire. Et un attribut `class` d'une
      // page réelle contient parfois autre chose qu'une classe — un marqueur de langue laissé là
      // par un gabarit : ce qui ne peut pas être un nom de classe n'est pas une suggestion.
      isValidName(name) && name.indexOf('onlc-') !== 0 && name.indexOf('mce-') !== 0))).sort();
};

/** Spec du composant, à placer dans un dialogue. */
const field = (editor: Editor, name: string, spec: ClassFieldSpec = {}): Dialog.CustomEditorSpec => ({
  type: 'customeditor',
  name,
  tag: 'div',
  init: create(editor, spec)
});

export {
  styles,
  isValidName,
  split,
  inPage,
  create,
  field
};
