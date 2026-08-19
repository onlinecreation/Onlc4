import { Arr, Fun, Optional, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

import * as Options from '../api/Options';
import { Syntax } from '../api/Types';
import * as Dom from './Dom';
import * as Languages from './Languages';
import * as Parse from './Parse';

/**
 * Ce qu'on fait d'une section pendant qu'on écrit : la poser, la changer de langue, la retirer,
 * et compléter les traductions qui manquent.
 *
 * Rien ici ne touche au texte : marquer un passage l'entoure, retirer le marquage rend son
 * contenu au document. Une manœuvre polyglotte ne doit jamais faire disparaître ce qui est écrit
 * — c'est le genre de perte qu'on ne remarque qu'une fois la page publiée.
 */

/**
 * Une sélection qui contient des blocs demande un `div` ; le reste tient dans un `span`.
 *
 * Une sélection vide compte comme un bloc : c'est le paragraphe courant qu'on veut marquer.
 */
const needsBlock = (selected: string): boolean => selected === '' || Parse.hasBlock(selected);

/**
 * Entoure la sélection d'une section.
 *
 * Sélection vide : c'est le bloc courant qui est marqué. Personne ne pose un curseur au milieu
 * d'une phrase pour marquer « rien » ; ce qu'on veut, c'est ce paragraphe-là.
 */
const wrapSelection = (editor: Editor, code: string, syntax: Syntax): void => {
  const selected = editor.selection.getContent({ format: 'html' });

  if (needsBlock(selected)) {
    const format = `onlcmultilang-block-${code}`;
    editor.formatter.register(format, {
      wrapper: true,
      block: 'div',
      classes: Dom.classesFor(true, Languages.isKnown(editor, code)).split(' '),
      attributes: {
        lang: code,
        [Dom.codeAttribute]: code,
        [Dom.syntaxAttribute]: syntax,
        [Dom.labelAttribute]: Languages.displayOf(editor, code)
      }
    });
    editor.formatter.apply(format);
    editor.formatter.unregister(format);
  } else {
    editor.selection.setContent(Dom.toHtml(editor, code, syntax, selected, false));
  }
};

const getSelected = (editor: Editor): Optional<HTMLElement> => Dom.getSelected(editor);

/**
 * Marque la sélection, ou change la langue de la section où l'on se trouve.
 *
 * Marquer une section déjà marquée ne l'imbrique pas dans une autre : les deux écritures du site
 * ne s'imbriquent pas, et l'imbrication tairait tout ce qu'elle contient. C'est donc la langue de
 * la section qui change.
 */
const mark = (editor: Editor, code: string, syntax?: Syntax): void => {
  const wanted = String(code ?? '').trim().toLowerCase();
  if (!Parse.isCode(wanted)) {
    return;
  }

  const writing = syntax ?? Options.getDefaultSyntax(editor);

  editor.undoManager.transact(() => {
    getSelected(editor).fold(
      () => wrapSelection(editor, wanted, writing),
      (element) => {
        Dom.mark(editor, element, wanted);
        Dom.setSyntax(editor, element, writing);
      }
    );
  });
  editor.nodeChanged();
};

/** Rend le contenu au document et fait disparaître la section. Le texte, lui, reste. */
const unmark = (editor: Editor): void => {
  getSelected(editor).each((element) => {
    editor.undoManager.transact(() => {
      editor.dom.remove(element, true);
    });
    editor.nodeChanged();
  });
};

const setSyntax = (editor: Editor, syntax: Syntax): void => {
  getSelected(editor).each((element) => {
    editor.undoManager.transact(() => {
      Dom.setSyntax(editor, element, syntax);
    });
  });
};

/**
 * Ajoute, à côté de la section courante, une copie pour chaque langue déclarée qui manque.
 *
 * C'est la façon dont on travaille réellement : on écrit le passage en français, puis il faut
 * la même chose en anglais et en néerlandais. Les copies partent avec le texte français dedans
 * — un point de départ à traduire, plutôt qu'un cadre vide à remplir de mémoire.
 *
 * Les langues déjà présentes dans le groupe voisin sont laissées tranquilles : relancer la
 * commande deux fois ne crée pas de doublon.
 */
const complete = (editor: Editor): number => {
  return getSelected(editor).fold(Fun.constant(0), (element) => {
    const group = Dom.groupOf(editor, element);
    const present = Arr.map(group, (section) => Dom.codeOf(editor, section));
    const missing = Arr.filter(Languages.list(editor), (language) => !Arr.contains(present, language.code));
    const last = group[group.length - 1];

    if (missing.length === 0) {
      return 0;
    }

    editor.undoManager.transact(() => {
      Arr.foldl(missing, (after: HTMLElement, language) => {
        // Toujours une copie de la section où l'on se trouve : c'est celle qu'on vient
        // d'écrire, et c'est d'elle qu'on attend une traduction.
        const copy = element.cloneNode(true) as HTMLElement;
        Dom.mark(editor, copy, language.code);
        after.parentNode?.insertBefore(copy, after.nextSibling);
        return copy;
      }, last);
    });
    editor.nodeChanged();

    return missing.length;
  });
};

/** Langue de la section courante, ou chaîne vide hors de toute section. */
const currentCode = (editor: Editor): string =>
  getSelected(editor).fold(Fun.constant(''), (element) => Dom.codeOf(editor, element));

const currentSyntax = (editor: Editor): Syntax =>
  getSelected(editor).fold(
    () => Options.getDefaultSyntax(editor),
    (element) => Dom.syntaxOf(editor, element)
  );

/** Langues réellement employées dans la page, y compris celles qui ne sont plus déclarées. */
const codesInUse = (editor: Editor): string[] =>
  Arr.foldl(editor.dom.select(Dom.selector), (codes: string[], element) => {
    const code = Dom.codeOf(editor, element as HTMLElement);
    return !Type.isString(code) || code === '' || Arr.contains(codes, code) ? codes : codes.concat([ code ]);
  }, []);

export {
  needsBlock,
  wrapSelection,
  getSelected,
  mark,
  unmark,
  setSyntax,
  complete,
  currentCode,
  currentSyntax,
  codesInUse
};
