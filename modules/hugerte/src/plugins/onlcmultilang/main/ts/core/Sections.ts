import { Arr, Fun, Optional, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

import * as Options from '../api/Options';
import { Syntax } from '../api/Types';
import * as Dom from './Dom';
import * as Languages from './Languages';
import * as Parse from './Parse';
import * as Scope from './Scope';

/**
 * Ce qu'on fait d'une section pendant qu'on écrit : la poser, la changer de langue, la retirer,
 * et compléter les traductions qui manquent.
 *
 * Rien ici ne touche au texte. Marquer un passage l'entoure, retirer le marquage rend son contenu
 * au document, et l'englobage déplace des nœuds existants plutôt que de réécrire du markup : une
 * manœuvre polyglotte ne doit jamais faire disparaître ce qui est écrit — c'est le genre de perte
 * qu'on ne remarque qu'une fois la page publiée.
 */

const getSelected = (editor: Editor): Optional<HTMLElement> => Dom.getSelected(editor);

/** Attributs d'une section, posés d'un seul geste pour qu'ils ne puissent pas se contredire. */
const attributesFor = (editor: Editor, code: string, syntax: Syntax): Record<string, string> => ({
  class: Dom.classesFor(true, Languages.isKnown(editor, code)),
  lang: code,
  [Dom.codeAttribute]: code,
  [Dom.syntaxAttribute]: syntax,
  [Dom.labelAttribute]: Languages.displayOf(editor, code)
});

/**
 * Entoure des nœuds voisins d'un `div` de section.
 *
 * Les nœuds sont **déplacés**, pas recopiés : les blocs de média, dont l'aperçu est reconstruit à
 * partir de leur configuration, gardent leur identité, et rien de ce qui les accompagne — une
 * classe de colonne, un style en ligne, un état de sélection — n'est perdu en route.
 */
const wrapNodes = (editor: Editor, nodes: Node[], code: string, syntax: Syntax): Optional<HTMLElement> => {
  const first = Arr.head(nodes);

  return first.bind((node) => {
    const parent = node.parentNode;
    if (!Type.isNonNullable(parent)) {
      return Optional.none<HTMLElement>();
    }

    const wrapper = editor.dom.create('div', attributesFor(editor, code, syntax));
    parent.insertBefore(wrapper, node);
    Arr.each(nodes, (child) => wrapper.appendChild(child));
    return Optional.some(wrapper);
  });
};

/** Entoure la sélection de texte courante d'une section en ligne. */
const wrapInline = (editor: Editor, code: string, syntax: Syntax): void => {
  const selected = editor.selection.getContent({ format: 'html' });
  editor.selection.setContent(Dom.toHtml(editor, code, syntax, selected, false));
};

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
      () => {
        Scope.resolve(editor).each((scope) => {
          if (scope.kind === 'inline') {
            wrapInline(editor, wanted, writing);
          } else {
            // Le curseur repart **dans** la section : le menu doit montrer la langue qu'on vient
            // de poser, et un second passage doit la changer plutôt qu'en imbriquer une autre.
            wrapNodes(editor, scope.nodes, wanted, writing).each((wrapper) => {
              editor.selection.setCursorLocation(wrapper, 0);
            });
          }
        });
      },
      (element) => {
        Dom.mark(editor, element, wanted);
        Dom.setSyntax(editor, element, writing);
      }
    );
  });
  editor.nodeChanged();
};

/**
 * La section qui porte cet élément, s'il y en a une.
 *
 * L'élément lui-même compte : la barre d'outils des blocs s'attache au `div` de section dès qu'il
 * en existe un, et changer sa langue ne doit pas en créer un second par-dessus.
 */
const sectionOf = (editor: Editor, element: HTMLElement): Optional<HTMLElement> =>
  Optional.from(editor.dom.getParent<HTMLElement>(element, Dom.selector));

/** Marque un élément précis — c'est par là que passe la barre d'outils des blocs. */
const markElement = (editor: Editor, element: HTMLElement, code: string): void => {
  const wanted = String(code ?? '').trim().toLowerCase();
  if (!Parse.isCode(wanted)) {
    return;
  }

  editor.undoManager.transact(() => {
    sectionOf(editor, element).fold(
      () => {
        Scope.forElement(editor, element).each((scope) => {
          if (scope.kind === 'block') {
            wrapNodes(editor, scope.nodes, wanted, Options.getDefaultSyntax(editor));
          }
        });
      },
      (section) => Dom.mark(editor, section, wanted)
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

/** Même chose, à partir d'un élément précis. */
const unmarkElement = (editor: Editor, element: HTMLElement): void => {
  sectionOf(editor, element).each((section) => {
    editor.undoManager.transact(() => {
      editor.dom.remove(section, true);
    });
    editor.nodeChanged();
  });
};

/**
 * Ajoute, à côté de la section courante, une copie pour chaque langue déclarée qui manque.
 *
 * C'est la façon dont on travaille réellement : on écrit le passage en français, puis il faut la
 * même chose en anglais et en néerlandais. Les copies partent avec le texte d'origine dedans — un
 * point de départ à traduire, plutôt qu'un cadre vide à remplir de mémoire.
 *
 * Les langues déjà présentes dans le groupe voisin sont laissées tranquilles : relancer la
 * commande deux fois ne crée pas de doublon.
 */
const completeFrom = (editor: Editor, element: HTMLElement): number => {
  const group = Dom.groupOf(editor, element);
  const present = Arr.map(group, (section) => Dom.codeOf(editor, section));
  const missing = Arr.filter(Languages.list(editor), (language) => !Arr.contains(present, language.code));

  if (missing.length === 0) {
    return 0;
  }

  editor.undoManager.transact(() => {
    Arr.foldl(missing, (after: HTMLElement, language) => {
      // Toujours une copie de la section où l'on se trouve : c'est celle qu'on vient d'écrire,
      // et c'est d'elle qu'on attend une traduction.
      const copy = element.cloneNode(true) as HTMLElement;
      Dom.mark(editor, copy, language.code);
      after.parentNode?.insertBefore(copy, after.nextSibling);
      return copy;
    }, group[group.length - 1]);
  });
  editor.nodeChanged();

  return missing.length;
};

const complete = (editor: Editor): number =>
  getSelected(editor).fold(Fun.constant(0), (element) => completeFrom(editor, element));

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
  getSelected,
  sectionOf,
  attributesFor,
  wrapNodes,
  wrapInline,
  mark,
  markElement,
  unmark,
  unmarkElement,
  complete,
  completeFrom,
  currentCode,
  currentSyntax,
  codesInUse
};
