import { Arr, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import { Dialog } from 'hugerte/core/api/ui/Ui';

/**
 * Liste modifiable utilisée par les blocs qui répètent une même ligne : les images d'une galerie,
 * les événements d'un calendrier.
 *
 * Les composants de dialogue livrés avec l'éditeur ne savent pas représenter une liste dont la
 * longueur varie ; ce module en construit une, branchée sur le dialogue par le composant
 * `customeditor`. La valeur échangée est du json, ce qui la range telle quelle dans la
 * configuration du bloc.
 *
 * Toutes les commandes sont des boutons de 50 × 50 pixels, taille minimale confortable au doigt.
 */

export type ListColumnType = 'text' | 'number' | 'time' | 'media';

export interface ListColumn {
  readonly name: string;
  readonly label: string;
  readonly type: ListColumnType;
  readonly placeholder?: string;
  /** Part de la largeur disponible, en unités de grille flexibles. */
  readonly grow?: number;
}

export interface ListEditorSpec {
  readonly columns: ListColumn[];
  /** Intitulé du bouton d'ajout. */
  readonly addLabel: string;
  /** Phrase affichée quand la liste est vide. */
  readonly emptyLabel: string;
  /** Ouvre l'explorateur de médias plutôt que d'ajouter une ligne vide. */
  readonly picker?: boolean;
  /** Colonne servant de vignette dans la liste. */
  readonly thumbnail?: string;
}

type Row = Record<string, string>;

const styleId = 'onlc-list-editor-styles';

const styles = `
/* Préfixé par .tox pour passer devant le reset très large du thème. */
.tox .onlc-list { display: block; width: 100%; border: 1px solid rgba(34, 47, 62, 0.2); border-radius: 6px; background: #ffffff; }
.tox .onlc-list__rows { display: block; max-height: 320px; overflow-y: auto; }
.tox .onlc-list__empty { display: block; padding: 24px 16px; color: #5a6570; text-align: center; }
.tox .onlc-list__row { display: flex; align-items: center; gap: 8px; padding: 8px; border-bottom: 1px solid rgba(34, 47, 62, 0.12); }
.tox .onlc-list__row:last-child { border-bottom: 0; }
.tox .onlc-list__thumb { flex: 0 0 auto; width: 50px; height: 50px; border-radius: 4px; background: #eef1f4 center/cover no-repeat; }
.tox .onlc-list__fields { display: flex; flex: 1 1 auto; flex-wrap: wrap; gap: 8px; min-width: 0; }
.tox .onlc-list__field { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.tox .onlc-list__field-label { font-size: 11px; color: #5a6570; text-transform: uppercase; letter-spacing: 0.02em; }
.tox .onlc-list__input { box-sizing: border-box; width: 100%; min-height: 34px; padding: 6px 8px; border: 1px solid rgba(34, 47, 62, 0.2); border-radius: 4px; font: inherit; color: #22303c; background: #ffffff; }
.tox .onlc-list__actions { display: flex; flex: 0 0 auto; gap: 4px; }
.tox .onlc-list__button { display: inline-flex; align-items: center; justify-content: center; width: 50px; height: 50px; padding: 0; border: 1px solid rgba(34, 47, 62, 0.2); border-radius: 6px; background: #ffffff; color: #22303c; cursor: pointer; }
.tox .onlc-list__button:hover { background: #f0f3f6; }
.tox .onlc-list__button:disabled { opacity: 0.35; cursor: default; }
.tox .onlc-list__button--danger:hover { background: #fdecec; color: #b4241f; }
.tox .onlc-list__footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px; border-top: 1px solid rgba(34, 47, 62, 0.12); }
.tox .onlc-list__add {
  display: inline-flex; align-items: center; justify-content: center; min-width: 50px;
  min-height: 50px; padding: 0 18px; border: 0; border-radius: 6px;
  background: #006ce7; color: #ffffff; font: inherit; font-weight: 600;
  cursor: pointer;
}
.tox .onlc-list__add:hover { background: #0059c1; }
.tox .onlc-list__count { font-size: 12px; color: #5a6570; }
`;

const arrowUp = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 19V6M6 12l6-6 6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>';
const arrowDown = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 5v13M6 12l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>';
const cross = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path></svg>';

const injectStyles = (doc: Document): void => {
  if (doc.getElementById(styleId) === null) {
    const style = doc.createElement('style');
    style.id = styleId;
    style.textContent = styles;
    doc.head.appendChild(style);
  }
};

const parse = (value: string): Row[] => {
  if (!Type.isString(value) || value.trim() === '') {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    return Type.isArray(parsed) ? Arr.map(parsed as unknown[], (entry) => {
      const row: Row = {};
      if (Type.isObject(entry)) {
        Arr.each(Object.keys(entry as object), (key) => {
          const cell = (entry as Record<string, unknown>)[key];
          row[key] = Type.isString(cell) ? cell : String(cell ?? '');
        });
      }
      return row;
    }) : [];
  } catch (_err) {
    return [];
  }
};

const inputType = (column: ListColumn): string => {
  switch (column.type) {
    case 'number':
      return 'number';
    case 'time':
      return 'time';
    default:
      return 'text';
  }
};

/**
 * Builds the `init` function expected by the `customeditor` dialog component.
 */
const create = (editor: Editor, spec: ListEditorSpec) => (element: HTMLElement): Promise<Dialog.CustomEditorInit> => {
  const doc = element.ownerDocument;
  injectStyles(doc);

  let rows: Row[] = [];

  element.className = 'onlc-list';
  element.innerHTML = '';

  const list = doc.createElement('div');
  list.className = 'onlc-list__rows';

  const footer = doc.createElement('div');
  footer.className = 'onlc-list__footer';

  const add = doc.createElement('button');
  add.type = 'button';
  add.className = 'onlc-list__add';
  add.textContent = editor.translate(spec.addLabel) as string;

  const count = doc.createElement('span');
  count.className = 'onlc-list__count';

  footer.appendChild(add);
  footer.appendChild(count);
  element.appendChild(list);
  element.appendChild(footer);

  const button = (label: string, markup: string, danger: boolean): HTMLButtonElement => {
    const element_ = doc.createElement('button');
    element_.type = 'button';
    element_.className = `onlc-list__button${danger ? ' onlc-list__button--danger' : ''}`;
    const text = editor.translate(label) as string;
    element_.title = text;
    element_.setAttribute('aria-label', text);
    element_.innerHTML = markup;
    return element_;
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= rows.length) {
      return;
    }
    const moved = rows[from];
    rows.splice(from, 1);
    rows.splice(to, 0, moved);
    render();
  };

  const render = () => {
    list.innerHTML = '';

    if (rows.length === 0) {
      const empty = doc.createElement('p');
      empty.className = 'onlc-list__empty';
      empty.textContent = editor.translate(spec.emptyLabel) as string;
      list.appendChild(empty);
    }

    Arr.each(rows, (row, index) => {
      const line = doc.createElement('div');
      line.className = 'onlc-list__row';

      if (Type.isString(spec.thumbnail)) {
        const thumb = doc.createElement('span');
        thumb.className = 'onlc-list__thumb';
        const url = row[spec.thumbnail] ?? '';
        if (url !== '') {
          // Les caractères qui refermeraient la parenthèse ou la déclaration css sont encodés :
          // l'adresse vient de la médiathèque, elle n'a pas à pouvoir injecter d'autres règles.
          const escapes: Record<string, string> = { '\\': '%5C', '"': '%22', '\'': '%27', '(': '%28', ')': '%29' };
          thumb.style.backgroundImage = /^\s*(javascript|vbscript)\s*:/i.test(url)
            ? ''
            : `url(${url.trim().replace(/[\\"'()]|\s/g, (character) => escapes[character] ?? '%20')})`;
        }
        line.appendChild(thumb);
      }

      const fields = doc.createElement('div');
      fields.className = 'onlc-list__fields';

      Arr.each(spec.columns, (column) => {
        const wrapper = doc.createElement('label');
        wrapper.className = 'onlc-list__field';
        wrapper.style.flex = `${column.grow ?? 1} 1 ${column.type === 'text' ? '160px' : '90px'}`;

        const caption = doc.createElement('span');
        caption.className = 'onlc-list__field-label';
        caption.textContent = editor.translate(column.label) as string;

        const input = doc.createElement('input');
        input.className = 'onlc-list__input';
        input.type = inputType(column);
        input.value = row[column.name] ?? '';
        if (Type.isString(column.placeholder)) {
          input.placeholder = editor.translate(column.placeholder) as string;
        }
        input.addEventListener('input', () => {
          rows[index] = { ...rows[index], [column.name]: input.value };
          if (column.name === spec.thumbnail) {
            render();
          }
        });

        wrapper.appendChild(caption);
        wrapper.appendChild(input);
        fields.appendChild(wrapper);
      });

      const actions = doc.createElement('div');
      actions.className = 'onlc-list__actions';

      const up = button('Monter', arrowUp, false);
      up.disabled = index === 0;
      up.addEventListener('click', () => move(index, index - 1));

      const down = button('Descendre', arrowDown, false);
      down.disabled = index === rows.length - 1;
      down.addEventListener('click', () => move(index, index + 1));

      const remove = button('Retirer', cross, true);
      remove.addEventListener('click', () => {
        rows.splice(index, 1);
        render();
      });

      actions.appendChild(up);
      actions.appendChild(down);
      actions.appendChild(remove);

      line.appendChild(fields);
      line.appendChild(actions);
      list.appendChild(line);
    });

    count.textContent = rows.length === 0
      ? ''
      : `${rows.length} ${editor.translate(rows.length > 1 ? 'éléments' : 'élément')}`;
  };

  const blank = (): Row => Arr.foldl(spec.columns, (acc: Row, column) => ({ ...acc, [column.name]: '' }), {});

  const onAdd = () => {
    if (spec.picker === true) {
      // L'explorateur de médias appartient au plugin onlcmedia : on passe par sa commande, ce
      // qui garde les deux plugins indépendants l'un de l'autre.
      const handled = editor.execCommand('OnlcPickMedia', false, {
        multiple: true,
        onSelect: (files: Array<{ url: string; name: string }>) => {
          rows = rows.concat(Arr.map(files, (file) => ({ ...blank(), src: file.url, title: file.name })));
          render();
        }
      });
      if (handled !== false) {
        return;
      }
    }
    rows = rows.concat([ blank() ]);
    render();
  };

  add.addEventListener('click', onAdd);
  render();

  return Promise.resolve({
    getValue: () => JSON.stringify(rows),
    setValue: (value: string) => {
      rows = parse(value);
      render();
    },
    destroy: () => {
      add.removeEventListener('click', onAdd);
      element.innerHTML = '';
    }
  });
};

const field = (editor: Editor, name: string, spec: ListEditorSpec): Dialog.BodyComponentSpec => ({
  type: 'customeditor',
  name,
  tag: 'div',
  init: create(editor, spec)
});

export {
  parse,
  create,
  field
};
