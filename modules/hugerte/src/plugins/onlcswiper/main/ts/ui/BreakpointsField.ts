import { Arr, Fun } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import { Dialog } from 'hugerte/core/api/ui/Ui';

import { Breakpoint } from '../core/Settings';

/**
 * Les paliers d'écran : combien de vues montrer selon la largeur disponible.
 *
 * C'est le réglage le plus utile d'un diaporama et le plus difficile à écrire à la main. Swiper
 * accepte deux façons de désigner un palier, qui ne se ressemblent pas :
 *
 * * une **largeur en pixels** — `768` veut dire « à partir de 768 pixels de large » ;
 * * un **rapport** — `@1.5` veut dire « à partir d'une fenêtre une fois et demie plus large que
 *   haute », ce qui suit mieux les téléphones tenus à plat.
 *
 * Les deux sont proposées, avec leur signification écrite en toutes lettres, parce que les pages
 * réelles utilisent l'une comme l'autre — et qu'un rédacteur à qui l'on montrerait `@1.25` sans
 * explication ne saurait pas ce qu'il touche.
 *
 * Les paliers sont triés à l'affichage, du plus étroit au plus large : c'est l'ordre dans lequel
 * ils se déclenchent, et le seul dans lequel la liste se lit.
 */

const styleId = 'onlc-swiper-breakpoints-styles';

const styles = `
.tox .onlc-breaks { display: flex; flex-direction: column; gap: 10px; width: 100%; }
.tox .onlc-breaks__row {
  display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-end;
  padding: 10px; border: 1px solid rgba(34, 47, 62, 0.16); border-radius: 8px; background: #fff;
}
.tox .onlc-breaks__cell { display: flex; flex: 1 1 140px; flex-direction: column; gap: 4px; min-width: 0; }
.tox .onlc-breaks__label { font-size: 12px; font-weight: 600; color: #5a6570; }
.tox .onlc-breaks__input, .tox .onlc-breaks__select {
  box-sizing: border-box; width: 100%; min-height: 40px; padding: 6px 10px;
  border: 1px solid rgba(34, 47, 62, 0.2); border-radius: 6px; font: inherit; color: #22303c;
}
.tox .onlc-breaks__btn {
  min-width: 40px; min-height: 40px; padding: 0 10px; border: 1px solid rgba(34, 47, 62, 0.18);
  border-radius: 6px; background: #fff; font: inherit; color: #22303c; cursor: pointer;
}
.tox .onlc-breaks__btn--danger:hover { background: #fdecec; color: #b4241f; }
.tox .onlc-breaks__add {
  min-height: 44px; padding: 0 14px; border: 1px solid rgba(34, 47, 62, 0.18); border-radius: 8px;
  background: #fff; font: inherit; color: #22303c; cursor: pointer; align-self: flex-start;
}
.tox .onlc-breaks__add:hover { background: #eef2f6; }
.tox .onlc-breaks__empty {
  padding: 14px; border: 1px dashed rgba(34, 47, 62, 0.3); border-radius: 8px;
  color: #5a6570; font-size: 13px;
}
.tox .onlc-breaks__hint { margin: 0; color: #5a6570; font-size: 12px; line-height: 1.5; }
`;

const ensureStyles = (doc: Document): void => {
  if (doc.getElementById(styleId) === null) {
    const style = doc.createElement('style');
    style.id = styleId;
    style.textContent = styles;
    doc.head.appendChild(style);
  }
};

/** Une clé de palier est soit un nombre de pixels, soit un rapport préfixé d'une arobase. */
const isRatio = (key: string): boolean => key.trim().indexOf('@') === 0;

const numberOf = (key: string): number => {
  const value = parseFloat(key.replace('@', ''));
  return isNaN(value) ? 0 : value;
};

/** Du plus étroit au plus large ; les rapports après les pixels, faute de pouvoir les comparer. */
const sortBreakpoints = (points: Breakpoint[]): Breakpoint[] =>
  Arr.sort(points.slice(), (a, b) => {
    if (isRatio(a.key) !== isRatio(b.key)) {
      return isRatio(a.key) ? 1 : -1;
    }
    return numberOf(a.key) - numberOf(b.key);
  });

const create = (editor: Editor, initial: Breakpoint[], onChange: (points: Breakpoint[]) => void) =>
  (element: HTMLElement): Promise<Dialog.CustomEditorInit> => {
    const doc = element.ownerDocument;
    ensureStyles(doc);

    const t = (text: string): string => editor.translate(text) as string;

    let points: Breakpoint[] = sortBreakpoints(initial);

    element.className = 'onlc-breaks';

    const hint = doc.createElement('p');
    hint.className = 'onlc-breaks__hint';
    hint.textContent = t('Chaque palier s’applique à partir de la largeur indiquée, et jusqu’au ' +
      'palier suivant. En dessous du premier palier, ce sont les réglages de l’onglet « Affichage » ' +
      'qui s’appliquent.');

    const list = doc.createElement('div');
    list.className = 'onlc-breaks';

    element.appendChild(hint);
    element.appendChild(list);

    const publish = () => onChange(points);

    const update = (index: number, changes: Partial<Breakpoint>) => {
      points = Arr.map(points, (point, at) => at === index ? { ...point, ...changes } : point);
      publish();
    };

    const cell = (label: string, control: HTMLElement): HTMLElement => {
      const box = doc.createElement('div');
      box.className = 'onlc-breaks__cell';
      const caption = doc.createElement('span');
      caption.className = 'onlc-breaks__label';
      caption.textContent = t(label);
      box.appendChild(caption);
      box.appendChild(control);
      return box;
    };

    const input = (value: string, placeholder: string, onInput: (next: string) => void): HTMLInputElement => {
      const node = doc.createElement('input');
      node.type = 'text';
      node.className = 'onlc-breaks__input';
      node.value = value;
      node.placeholder = placeholder;
      node.addEventListener('input', () => onInput(node.value));
      return node;
    };

    const renderRow = (point: Breakpoint, index: number): HTMLElement => {
      const row = doc.createElement('div');
      row.className = 'onlc-breaks__row';

      const kind = doc.createElement('select');
      kind.className = 'onlc-breaks__select';
      Arr.each([
        { text: 'Largeur en pixels', value: 'px' },
        { text: 'Rapport largeur / hauteur', value: 'ratio' }
      ], (option) => {
        const node = doc.createElement('option');
        node.value = option.value;
        node.textContent = t(option.text);
        kind.appendChild(node);
      });
      kind.value = isRatio(point.key) ? 'ratio' : 'px';
      kind.addEventListener('change', () => {
        const bare = point.key.replace('@', '');
        update(index, { key: kind.value === 'ratio' ? `@${bare}` : bare });
        render();
      });

      const key = input(point.key.replace('@', ''), '768', (next) => {
        update(index, { key: isRatio(point.key) ? `@${next.trim()}` : next.trim() });
      });

      const perView = input(point.slidesPerView, '3', (next) => update(index, { slidesPerView: next }));
      const space = input(point.spaceBetween, '20', (next) => update(index, { spaceBetween: next }));

      const remove = doc.createElement('button');
      remove.type = 'button';
      remove.className = 'onlc-breaks__btn onlc-breaks__btn--danger';
      remove.textContent = '✕';
      remove.title = t('Retirer ce palier');
      remove.setAttribute('aria-label', remove.title);
      remove.addEventListener('click', () => {
        points = Arr.filter(points, (_point, at) => at !== index);
        publish();
        render();
      });

      row.appendChild(cell('À partir de', kind));
      row.appendChild(cell(isRatio(point.key) ? 'Rapport' : 'Pixels', key));
      row.appendChild(cell('Vues affichées', perView));
      row.appendChild(cell('Espace entre les vues (px)', space));
      row.appendChild(remove);
      return row;
    };

    const render = () => {
      list.innerHTML = '';
      if (points.length === 0) {
        const empty = doc.createElement('p');
        empty.className = 'onlc-breaks__empty';
        empty.textContent = t('Aucun palier : le diaporama montre le même nombre de vues sur tous les écrans.');
        list.appendChild(empty);
      } else {
        Arr.each(points, (point, index) => list.appendChild(renderRow(point, index)));
      }

      const add = doc.createElement('button');
      add.type = 'button';
      add.className = 'onlc-breaks__add';
      add.textContent = t('Ajouter un palier');
      add.addEventListener('click', () => {
        points = points.concat([{ key: '768', slidesPerView: '2', spaceBetween: '' }]);
        publish();
        render();
      });
      list.appendChild(add);
    };

    render();
    publish();

    // Comme la liste des vues, les paliers passent par `onChange` : voir `SlidesField`.
    return Promise.resolve({
      getValue: () => String(points.length),
      setValue: Fun.noop,
      destroy: () => {
        element.innerHTML = '';
      }
    });
  };

/** Spec du composant, à placer dans un dialogue. */
const field = (
  editor: Editor,
  name: string,
  initial: Breakpoint[],
  onChange: (points: Breakpoint[]) => void
): Dialog.CustomEditorSpec => ({
  type: 'customeditor',
  name,
  tag: 'div',
  init: create(editor, initial, onChange)
});

export {
  styles,
  ensureStyles,
  isRatio,
  numberOf,
  sortBreakpoints,
  create,
  field
};
