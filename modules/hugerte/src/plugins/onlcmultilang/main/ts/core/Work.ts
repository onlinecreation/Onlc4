import { Arr, Throttler, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

import * as Options from '../api/Options';
import * as Dom from './Dom';
import * as Languages from './Languages';
import * as Parse from './Parse';
import * as Sections from './Sections';
import * as View from './View';

/**
 * **Travailler dans une langue** : ne voir qu'elle, et n'écrire que dedans.
 *
 * Une page polyglotte montre tout à la fois — le français, l'anglais et le néerlandais empilés —
 * et c'est la bonne façon de la relire. Ce n'est pas la bonne façon de l'**écrire** : on rédige
 * dans une langue, et les deux autres versions, qu'on ne relit pas à cet instant, doublent la
 * hauteur de la page et brouillent la mise en forme.
 *
 * Ce mode n'est **jamais** actif au départ. On l'ouvre, on écrit, on le referme.
 *
 * ## Ce qu'il fait
 *
 * 1. **Il masque** ce qui appartient à une autre langue. Le masquage est entièrement en css —
 *    une classe sur le corps du document, des règles qui cachent les autres sections. Rien n'est
 *    déplacé ni retiré : refermer le mode n'a donc rien à reconstruire, et une fausse manœuvre
 *    ne peut pas faire disparaître un paragraphe.
 * 2. **Il marque** dans cette langue tout bloc nouvellement ajouté. Sans cela, écrire un
 *    paragraphe en mode « français » donnerait un paragraphe sans langue, publié dans les trois
 *    — l'inverse de ce qu'on venait de demander.
 *
 * ## Ce qu'il ne fait pas
 *
 * Il ne marque **que les blocs entiers ajoutés au document**, pas la frappe dans un bloc qui
 * existe déjà : le texte tapé dans un paragraphe anglais reste anglais, et c'est bien ainsi.
 * Rien n'est marqué non plus à l'intérieur d'une section de langue, qui a déjà la sienne.
 *
 * ## Comment « nouveau » est reconnu
 *
 * Les éléments présents à l'ouverture du mode sont retenus dans un `WeakSet`. Tout ce qui
 * apparaît ensuite, et dont le parent était déjà connu, est un ajout. C'est le seul moyen fiable :
 * l'éditeur ne dit pas quels nœuds une insertion a produits, et les chemins d'ajout sont
 * multiples — la barre des blocs, un collage, une touche Entrée, un bloc prédéfini.
 */

export const workClass = 'onlc-lang-work';

/**
 * L'intitulé de la langue en cours, posé sur le corps du document.
 *
 * Il sert au bandeau que la feuille de style dessine en haut de la zone d'écriture. Un attribut
 * du corps ne fait pas partie du contenu — `getContent` ne sérialise que ses enfants — et ne peut
 * donc pas se retrouver dans la page publiée.
 */
export const workAttribute = 'data-onlc-lang-work';

interface State {
  code: string;
  seen: WeakSet<Element>;
  busy: boolean;
  watcher: { throttle: () => void; cancel: () => void } | null;
}

interface Carrier {
  onlcLangWork?: State;
}

const stateOf = (editor: Editor): State => {
  const carrier = editor as Editor & Carrier;
  const existing = carrier.onlcLangWork;
  if (Type.isObject(existing)) {
    return existing;
  }
  const created: State = { code: '', seen: new WeakSet<Element>(), busy: false, watcher: null };
  carrier.onlcLangWork = created;
  return created;
};

/** Les éléments qu'on ne marque jamais : l'interface posée dans la page, et les nœuds fantômes. */
const isFurniture = (editor: Editor, element: Element): boolean =>
  Type.isNonNullable(editor.dom.getParent(element, '[data-onlc-ui],[data-mce-bogus]'));

const isSection = (editor: Editor, element: Element): boolean =>
  Type.isNonNullable(editor.dom.getParent(element, Dom.selector));

/** Tous les éléments du corps, pour amorcer ou rafraîchir la mémoire. */
const remember = (editor: Editor, state: State): void => {
  const body = editor.getBody();
  if (!Type.isNonNullable(body)) {
    return;
  }
  state.seen.add(body);
  Arr.each(Arr.from(body.querySelectorAll('*')), (element) => state.seen.add(element));
};

/**
 * Les blocs ajoutés depuis le dernier passage.
 *
 * Seul le plus **extérieur** est retenu : insérer `<div><p>…</p></div>` doit donner une section
 * autour du `div`, pas une par élément.
 */
const additions = (editor: Editor, state: State): HTMLElement[] => {
  const body = editor.getBody();
  if (!Type.isNonNullable(body)) {
    return [];
  }
  return Arr.filter(Arr.from(body.querySelectorAll('*')), (element) => {
    if (state.seen.has(element) || element.nodeType !== 1) {
      return false;
    }
    const parent = element.parentElement;
    // Le parent doit être connu : sinon c'est lui, l'ajout, et c'est lui qu'on marquera.
    if (!Type.isNonNullable(parent) || (parent !== body && !state.seen.has(parent))) {
      return false;
    }
    const html = element as HTMLElement;
    return !isFurniture(editor, html)
      && !isSection(editor, html)
      && editor.dom.isBlock(html)
      && editor.dom.isEditable(html);
  }) as HTMLElement[];
};

/**
 * Marque les ajouts, puis met la mémoire à jour.
 *
 * L'englobage passe par `wrapNodes` et **non** par `markElement`. Ce dernier commence par
 * chercher la portée du marquage — le bloc dont le parent est un conteneur — parce qu'il répond à
 * un clic de l'utilisateur, qui vise le paragraphe et veut le bloc. Ici on sait déjà quel élément
 * a été ajouté, et lui seul doit être englobé : à laisser faire la recherche de portée, un
 * paragraphe ajouté à la racine d'une page sans grille faisait remonter jusqu'à l'enrobage, et
 * c'est la page entière qui se retrouvait dans une section de langue.
 */
const sweep = (editor: Editor): void => {
  const state = stateOf(editor);
  if (state.code === '' || state.busy || editor.removed) {
    return;
  }

  const fresh = additions(editor, state);
  if (fresh.length > 0) {
    state.busy = true;
    try {
      const syntax = Options.getDefaultSyntax(editor);
      editor.undoManager.transact(() => {
        Arr.each(fresh, (element) => {
          // L'élément a pu être déplacé — ou retiré — par l'englobage du précédent.
          if (Type.isNonNullable(element.parentNode)) {
            Sections.wrapNodes(editor, [ element ], state.code, syntax);
          }
        });
      });
    } finally {
      state.busy = false;
    }
  }
  remember(editor, state);
};

const bodyOf = (editor: Editor): HTMLElement | null => editor.getBody();

/** La langue dans laquelle on travaille, ou la chaîne vide quand le mode est fermé. */
const current = (editor: Editor): string => stateOf(editor).code;

const stopWatching = (state: State): void => {
  if (Type.isNonNullable(state.watcher)) {
    state.watcher.cancel();
    state.watcher = null;
  }
};

/**
 * Ouvre — ou referme — le mode.
 *
 * Un code vide, ou inconnu, referme : mieux vaut tout remontrer que cacher du contenu sans que
 * personne sache comment le retrouver.
 */
const enter = (editor: Editor, code: string): void => {
  const body = bodyOf(editor);
  const state = stateOf(editor);
  if (!Type.isNonNullable(body)) {
    return;
  }

  const wanted = String(code ?? '').trim().toLowerCase();
  const known = Parse.isCode(wanted) && Languages.isKnown(editor, wanted);

  // On repart de zéro : le masquage de l'aperçu visiteur et celui-ci se servent des mêmes
  // classes, et les deux ne peuvent pas être ouverts en même temps.
  View.show(editor, '');
  body.classList.remove(workClass);
  body.removeAttribute(workAttribute);
  stopWatching(state);

  if (!known) {
    state.code = '';
    editor.nodeChanged();
    return;
  }

  state.code = wanted;
  state.seen = new WeakSet<Element>();
  remember(editor, state);

  body.classList.add(View.onlyClass(wanted));
  body.classList.add(workClass);
  body.setAttribute(workAttribute, Languages.displayOf(editor, wanted));

  const watcher = Throttler.last(() => sweep(editor), 150);
  state.watcher = { throttle: watcher.throttle, cancel: watcher.cancel };
  editor.nodeChanged();
};

/**
 * Branche la surveillance une fois pour toutes.
 *
 * Les écouteurs sont posés au démarrage plutôt qu'à l'ouverture du mode : les retirer et les
 * remettre à chaque bascule laisserait des doublons au moindre chemin d'erreur, et `sweep` ne
 * fait rien tant qu'aucune langue n'est choisie.
 */
const setup = (editor: Editor): void => {
  editor.on('SetContent NodeChange Undo Redo', () => {
    const state = stateOf(editor);
    if (state.code !== '' && Type.isNonNullable(state.watcher)) {
      state.watcher.throttle();
    }
  });

  editor.on('remove', () => stopWatching(stateOf(editor)));
};

export {
  current,
  enter,
  sweep,
  setup
};
