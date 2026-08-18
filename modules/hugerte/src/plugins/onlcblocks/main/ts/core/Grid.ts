import { Arr, Optional, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

import * as Options from '../api/Options';
import * as Actions from './Actions';
import * as Columns from './Columns';

/**
 * Bootstrap grid support: rows made of columns whose width is expressed in grid units
 * (`col-md-6`, `col-lg-4`...). Only the class names are handled, the grid itself comes from the
 * bootstrap stylesheet loaded in the content.
 */

const isRow = (editor: Editor, element: Node | null): element is HTMLElement =>
  Type.isNonNullable(element) && editor.dom.is(element, `.${Options.getRowClass(editor)}`);

const isColumn = (_editor: Editor, element: Node | null): element is HTMLElement =>
  Columns.isColumnElement(element);

const getColumns = (editor: Editor, row: HTMLElement): HTMLElement[] =>
  Arr.filter(Arr.from(row.childNodes), (node) => isColumn(editor, node)) as HTMLElement[];

const getWidth = (editor: Editor, column: HTMLElement): number =>
  Columns.widthOf(column, Options.getGridColumns(editor));

const setWidth = (editor: Editor, column: HTMLElement, width: number): void => {
  const prefix = Options.getColumnClassPrefix(editor);
  const kept = Arr.filter(column.className.split(/\s+/), (cls) => cls !== '' && !Columns.columnClassRegExp.test(cls));
  editor.dom.setAttrib(column, 'class', kept.concat([ `${prefix}${width}` ]).join(' '));
};

const columnHtml = (editor: Editor, width: number, content: string): string =>
  `<div class="${Options.getColumnClassPrefix(editor)}${width}">${content}</div>`;

const rowHtml = (editor: Editor, widths: number[]): string => {
  const columns = Arr.map(widths, (width) => columnHtml(editor, width, '<p>Contenu de la colonne</p>')).join('');
  return `<div class="${Options.getRowClass(editor)}">${columns}</div>`;
};

const insertRow = (editor: Editor, widths: number[], reference: Optional<HTMLElement>, position: Actions.InsertPosition): void => {
  Actions.insertHtml(editor, rowHtml(editor, widths), reference, position);
};

const getParentRow = (editor: Editor, element: HTMLElement): Optional<HTMLElement> =>
  Optional.from(editor.dom.getParent(element, `.${Options.getRowClass(editor)}`) as HTMLElement | null);

const getParentColumn = (editor: Editor, element: HTMLElement): Optional<HTMLElement> => {
  let current: Node | null = element;
  while (Type.isNonNullable(current) && current !== editor.getBody()) {
    if (isColumn(editor, current)) {
      return Optional.some(current as HTMLElement);
    }
    current = current.parentNode;
  }
  return Optional.none();
};

/**
 * Widens or narrows a column, taking the difference from - or giving it back to - the next
 * column of the row, so that the row always adds up to the same total.
 */
const resizeColumn = (editor: Editor, column: HTMLElement, delta: number): void => {
  getParentRow(editor, column).each((row) => {
    const columns = getColumns(editor, row);
    const index = Arr.findIndex(columns, (candidate) => candidate === column);

    index.each((i) => {
      const neighbourIndex = i < columns.length - 1 ? i + 1 : i - 1;
      if (neighbourIndex < 0 || neighbourIndex >= columns.length) {
        return;
      }

      const neighbour = columns[neighbourIndex];
      const width = getWidth(editor, column);
      const neighbourWidth = getWidth(editor, neighbour);
      const nextWidth = width + delta;
      const nextNeighbourWidth = neighbourWidth - delta;

      if (nextWidth < 1 || nextNeighbourWidth < 1) {
        return;
      }

      editor.undoManager.transact(() => {
        setWidth(editor, column, nextWidth);
        setWidth(editor, neighbour, nextNeighbourWidth);
      });
      editor.nodeChanged();
    });
  });
};

/**
 * Applique une disposition à une ligne existante. Les colonnes en trop sont vidées dans la
 * dernière colonne conservée - rien n'est perdu - et les colonnes manquantes sont ajoutées.
 */
const applyLayout = (editor: Editor, row: HTMLElement, widths: number[]): void => {
  if (widths.length === 0) {
    return;
  }

  editor.undoManager.transact(() => {
    const columns = getColumns(editor, row);

    // Trop de colonnes : leur contenu rejoint la dernière colonne conservée
    if (columns.length > widths.length) {
      const kept = columns[widths.length - 1];
      Arr.each(columns.slice(widths.length), (column) => {
        while (column.firstChild !== null) {
          kept.appendChild(column.firstChild);
        }
        editor.dom.remove(column);
      });
    }

    // Pas assez de colonnes : on complète
    for (let index = columns.length; index < widths.length; index++) {
      row.appendChild(editor.dom.createFragment(columnHtml(editor, widths[index], '<p>Contenu de la colonne</p>')));
    }

    Arr.each(getColumns(editor, row), (column, index) => {
      setWidth(editor, column, widths[index] ?? widths[widths.length - 1]);
    });
  });

  editor.nodeChanged();
};

/** Disposition actuelle d'une ligne, exprimée en unités de grille. */
const layoutOf = (editor: Editor, row: HTMLElement): number[] =>
  Arr.map(getColumns(editor, row), (column) => getWidth(editor, column));

const addColumn = (editor: Editor, row: HTMLElement): void => {
  const total = Options.getGridColumns(editor);
  const columns = getColumns(editor, row);
  const count = columns.length + 1;
  const width = Math.max(1, Math.floor(total / count));

  editor.undoManager.transact(() => {
    Arr.each(columns, (column) => setWidth(editor, column, width));
    const fragment = editor.dom.createFragment(columnHtml(editor, total - width * columns.length, '<p>Contenu de la colonne</p>'));
    row.appendChild(fragment);
  });
  editor.nodeChanged();
};

const removeColumn = (editor: Editor, column: HTMLElement): void => {
  getParentRow(editor, column).each((row) => {
    const columns = Arr.filter(getColumns(editor, row), (candidate) => candidate !== column);
    const total = Options.getGridColumns(editor);

    editor.undoManager.transact(() => {
      editor.dom.remove(column);
      if (columns.length === 0) {
        editor.dom.remove(row);
      } else {
        const width = Math.max(1, Math.floor(total / columns.length));
        Arr.each(columns, (candidate, index) => {
          setWidth(editor, candidate, index === columns.length - 1 ? total - width * (columns.length - 1) : width);
        });
      }
    });
    editor.nodeChanged();
  });
};

export {
  applyLayout,
  layoutOf,
  isRow,
  isColumn,
  getColumns,
  getWidth,
  setWidth,
  rowHtml,
  insertRow,
  getParentRow,
  getParentColumn,
  resizeColumn,
  addColumn,
  removeColumn
};
