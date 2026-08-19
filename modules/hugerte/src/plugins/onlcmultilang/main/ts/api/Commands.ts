import { Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

import * as Sections from '../core/Sections';
import * as View from '../core/View';
import * as Dialog from '../ui/Dialog';

const register = (editor: Editor): void => {
  /** Marque la sélection dans une langue. La valeur est un code à deux lettres. */
  editor.addCommand('OnlcMarkLanguage', (_ui, value?: string) => {
    if (Type.isString(value)) {
      Sections.mark(editor, value);
    }
  });

  /** Rend le contenu de la section au document, sans rien supprimer. */
  editor.addCommand('OnlcUnmarkLanguage', () => {
    Sections.unmark(editor);
  });

  editor.addCommand('OnlcEditLanguageSection', () => {
    Dialog.open(editor, Sections.getSelected(editor));
  });

  /** Ajoute les traductions manquantes à côté de la section courante. */
  editor.addCommand('OnlcCompleteLanguages', () => {
    Sections.complete(editor);
  });

  /** N'affiche plus qu'une langue. Une valeur vide les rend toutes. */
  editor.addCommand('OnlcViewLanguage', (_ui, value?: string) => {
    View.show(editor, Type.isString(value) ? value : '');
  });
};

const registerQuery = (editor: Editor): void => {
  editor.addQueryValueHandler('OnlcCurrentLanguage', () => Sections.currentCode(editor));
  editor.addQueryValueHandler('OnlcViewedLanguage', () => View.current(editor));
};

export {
  register,
  registerQuery
};
