import { Arr, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import { Dialog } from 'hugerte/core/api/ui/Ui';

/**
 * Choix d'un mois, sur une grille.
 *
 * Taper « 2026-04 » suppose de connaître le format et de ne pas se tromper ; rien ne signale la
 * faute avant que le bloc s'affiche sur le mauvais mois. Le champ montre donc une **année et ses
 * douze mois**, comme la vue annuelle d'un agenda : on désigne, on ne saisit plus.
 *
 * Aucune bibliothèque n'est nécessaire pour douze boutons et deux flèches — et le résultat est
 * le même dans tous les navigateurs, ce que `<input type="month">` ne garantit pas : Chrome y
 * ouvre un calendrier, Firefox et Safari se contentent d'un champ de texte.
 *
 * La valeur échangée reste `AAAA-MM`, celle qu'attendent les blocs. Vide vaut « mois en cours ».
 */

export interface MonthFieldSpec {
  /** Noms des douze mois, dans l'ordre, dans la langue du contenu. */
  readonly monthNames: string[];
}

const styleId = 'onlc-month-field-styles';

const styles = `
/* Préfixé par .tox pour passer devant le reset très large du thème. */
.tox .onlc-month { display: block; width: 100%; border: 1px solid rgba(34, 47, 62, 0.2); border-radius: 6px; background: #ffffff; }
.tox .onlc-month__bar { display: flex; gap: 8px; align-items: center; justify-content: space-between; padding: 8px; border-bottom: 1px solid rgba(34, 47, 62, 0.12); }
.tox .onlc-month__year { font-size: 16px; font-weight: 600; color: #22303c; }
.tox .onlc-month__step {
  display: inline-flex; align-items: center; justify-content: center;
  width: 50px; height: 50px; padding: 0; border: 1px solid rgba(34, 47, 62, 0.18);
  border-radius: 8px; background: #ffffff; color: #22303c; cursor: pointer;
}
.tox .onlc-month__step:hover { background: #eef2f6; }
.tox .onlc-month__grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; padding: 8px; }
.tox .onlc-month__cell {
  display: flex; align-items: center; justify-content: center; min-height: 50px; padding: 0 6px;
  border: 1px solid rgba(34, 47, 62, 0.14); border-radius: 8px; background: #ffffff;
  font: inherit; color: #22303c; text-align: center; cursor: pointer;
}
.tox .onlc-month__cell:hover { background: #eef2f6; }
.tox .onlc-month__cell[aria-pressed="true"] { border-color: transparent; background: #006ce7; color: #ffffff; font-weight: 600; }
/* Le mois réel, pour se repérer quand on navigue loin dans l'année. */
.tox .onlc-month__cell[data-now="true"] { border-color: #006ce7; }
.tox .onlc-month__footer { display: flex; gap: 8px; align-items: center; justify-content: space-between; padding: 0 8px 8px; }
.tox .onlc-month__value { font-size: 12px; color: #5a6570; }
.tox .onlc-month__clear {
  min-height: 44px; padding: 0 14px; border: 1px solid rgba(34, 47, 62, 0.18); border-radius: 8px;
  background: #ffffff; font: inherit; color: #22303c; cursor: pointer;
}
.tox .onlc-month__clear:hover { background: #eef2f6; }
`;

const arrow = (direction: 'left' | 'right'): string =>
  '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" ' +
  `stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${
    direction === 'left' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'}"></path></svg>`;

const injectStyles = (doc: Document): void => {
  if (doc.getElementById(styleId) === null) {
    const style = doc.createElement('style');
    style.id = styleId;
    style.textContent = styles;
    doc.head.appendChild(style);
  }
};

const pattern = /^(\d{4})-(\d{2})$/;

/** `AAAA-MM` → `[année, mois de 0 à 11]`, ou `null` quand la valeur est vide ou illisible. */
const parse = (value: string): [number, number] | null => {
  const match = pattern.exec(String(value ?? '').trim());
  if (match === null) {
    return null;
  }
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  return month >= 1 && month <= 12 ? [ year, month - 1 ] : null;
};

const format = (year: number, month: number): string => `${year}-${String(month + 1).padStart(2, '0')}`;

const create = (editor: Editor, spec: MonthFieldSpec) => (element: HTMLElement): Promise<Dialog.CustomEditorInit> => {
  const doc = element.ownerDocument;
  injectStyles(doc);

  const t = (text: string): string => editor.translate(text) as string;
  const now = new Date();

  let value = '';
  // L'année parcourue, qui n'est pas forcément celle du mois choisi : on peut regarder 2027
  // sans avoir encore rien sélectionné.
  let shownYear = now.getFullYear();

  element.className = 'onlc-month';
  element.innerHTML = '';

  const bar = doc.createElement('div');
  bar.className = 'onlc-month__bar';

  const previous = doc.createElement('button');
  previous.type = 'button';
  previous.className = 'onlc-month__step';
  previous.innerHTML = arrow('left');
  previous.setAttribute('aria-label', t('Année précédente'));

  const yearLabel = doc.createElement('span');
  yearLabel.className = 'onlc-month__year';
  yearLabel.setAttribute('aria-live', 'polite');

  const next = doc.createElement('button');
  next.type = 'button';
  next.className = 'onlc-month__step';
  next.innerHTML = arrow('right');
  next.setAttribute('aria-label', t('Année suivante'));

  bar.appendChild(previous);
  bar.appendChild(yearLabel);
  bar.appendChild(next);

  const grid = doc.createElement('div');
  grid.className = 'onlc-month__grid';
  grid.setAttribute('role', 'group');

  const footer = doc.createElement('div');
  footer.className = 'onlc-month__footer';

  const summary = doc.createElement('span');
  summary.className = 'onlc-month__value';

  const clear = doc.createElement('button');
  clear.type = 'button';
  clear.className = 'onlc-month__clear';
  clear.textContent = t('Mois en cours');

  footer.appendChild(summary);
  footer.appendChild(clear);

  element.appendChild(bar);
  element.appendChild(grid);
  element.appendChild(footer);

  const cells = Arr.map(spec.monthNames, (name, index) => {
    const cell = doc.createElement('button');
    cell.type = 'button';
    cell.className = 'onlc-month__cell';
    cell.textContent = name;
    cell.addEventListener('click', () => {
      value = format(shownYear, index);
      render();
    });
    grid.appendChild(cell);
    return cell;
  });

  const render = () => {
    const selected = parse(value);
    yearLabel.textContent = String(shownYear);

    Arr.each(cells, (cell, index) => {
      const isSelected = selected !== null && selected[0] === shownYear && selected[1] === index;
      cell.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
      cell.dataset.now = now.getFullYear() === shownYear && now.getMonth() === index ? 'true' : 'false';
    });

    summary.textContent = selected === null
      ? t('Le mois en cours, quel qu’il soit au moment de l’affichage.')
      : `${spec.monthNames[selected[1]]} ${selected[0]}`;
  };

  previous.addEventListener('click', () => {
    shownYear -= 1;
    render();
  });
  next.addEventListener('click', () => {
    shownYear += 1;
    render();
  });
  clear.addEventListener('click', () => {
    value = '';
    render();
  });

  render();

  return Promise.resolve({
    getValue: () => value,
    setValue: (incoming: string) => {
      value = Type.isString(incoming) ? incoming.trim() : '';
      const parsed = parse(value);
      shownYear = parsed === null ? now.getFullYear() : parsed[0];
      render();
    },
    destroy: () => {
      element.innerHTML = '';
    }
  });
};

const field = (editor: Editor, name: string, spec: MonthFieldSpec): Dialog.CustomEditorSpec => ({
  type: 'customeditor',
  name,
  tag: 'div',
  init: create(editor, spec)
});

export {
  styles,
  parse,
  format,
  create,
  field
};
