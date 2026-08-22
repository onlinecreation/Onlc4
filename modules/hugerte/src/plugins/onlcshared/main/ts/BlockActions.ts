import { Arr, Fun, Optional, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

/**
 * Les **propriétés** d'un bloc, déclarées par le plugin qui sait les modifier.
 *
 * Deux barres flottantes se disputaient le même espace au-dessus d'un bloc : celle qui le
 * manipule — déplacer, dupliquer, supprimer — et celle qui ouvre ses réglages. La seconde
 * s'ouvrant par-dessus la première, il fallait éloigner la souris pour retrouver la poignée de
 * déplacement, puis y revenir sans passer sur le bloc. Personne ne devine ce genre de chose.
 *
 * Il n'y a donc plus qu'une barre. Chaque plugin y range ses propres boutons ici, sans connaître
 * `onlcblocks` ni savoir s'il est chargé ; `onlcblocks`, de son côté, les affiche sans savoir ce
 * qu'ils font. Quand la barre des blocs n'existe pas — plugin absent, élément qui n'est pas un
 * bloc — chaque plugin garde sa barre contextuelle : c'est ce que `isHandledByToolbar` permet de
 * savoir.
 *
 * ## Pourquoi le registre vit sur l'éditeur
 *
 * Chaque plugin est un paquet à part : ce module y est recopié, et deux plugins n'en partagent
 * pas la mémoire. Un registre de portée module serait donc autant de registres que de plugins.
 * Il est posé sur l'objet éditeur, qui est, lui, le même pour tous.
 */

export interface BlockAction {
  /** Identifiant unique. Une seconde déclaration du même nom remplace la première. */
  readonly id: string;
  /** Intitulé de l'infobulle. Traduit à l'affichage. */
  readonly label: string;
  /** Dessin svg en ligne, dans une boîte de 24 × 24. */
  readonly icon: string;
  /**
   * Position dans la barre. Les boutons de manipulation occupent les dizaines basses ; les
   * propriétés viennent après, à partir de 100, dans l'ordre croissant.
   */
  readonly order?: number;
  /**
   * L'élément que ce bouton modifie, si le bloc donné le concerne — souvent le bloc lui-même,
   * parfois un morceau qu'il contient (l'image d'un paragraphe) ou un ancêtre.
   *
   * Rendre `Optional.none()` fait disparaître le bouton : c'est la seule façon pour un plugin de
   * dire « pas ici ».
   */
  readonly match: (editor: Editor, block: HTMLElement) => Optional<HTMLElement>;
  readonly run: (editor: Editor, element: HTMLElement) => void;
}

/** Un bouton et l'élément sur lequel il agira, pour un bloc donné. */
export interface ResolvedAction {
  readonly action: BlockAction;
  readonly target: HTMLElement;
}

interface Carrier {
  onlcBlockActions?: BlockAction[];
  onlcBlockToolbar?: boolean;
}

const storeOf = (editor: Editor): BlockAction[] => {
  const carrier = editor as Editor & Carrier;
  const existing = carrier.onlcBlockActions;
  if (Type.isArray(existing)) {
    return existing;
  }
  const created: BlockAction[] = [];
  carrier.onlcBlockActions = created;
  return created;
};

/**
 * Déclare un bouton de propriétés.
 *
 * Redéclarer le même identifiant remplace la déclaration précédente au lieu d'ajouter un
 * doublon : rejouer l'initialisation d'un plugin ne double pas la barre.
 */
const declare = (editor: Editor, action: BlockAction): void => {
  const store = storeOf(editor);
  Arr.findIndex(store, (candidate) => candidate.id === action.id).fold(
    () => {
      store.push(action);
    },
    (index) => {
      store[index] = action;
    }
  );
};

/** Tous les boutons déclarés, du plus petit `order` au plus grand. */
const list = (editor: Editor): BlockAction[] =>
  Arr.sort(storeOf(editor).slice(), (a, b) => (a.order ?? 100) - (b.order ?? 100));

/**
 * Les boutons qui s'appliquent à ce bloc, avec l'élément que chacun modifiera.
 *
 * Un plugin qui se trompe ne doit pas emporter la barre entière : une exception levée par un
 * `match` fait disparaître ce bouton-là, et lui seul.
 */
const forBlock = (editor: Editor, block: HTMLElement): ResolvedAction[] =>
  Arr.bind(list(editor), (action) => {
    try {
      return action.match(editor, block).fold(
        () => [] as ResolvedAction[],
        (target) => [{ action, target }]
      );
    } catch (_err) {
      return [] as ResolvedAction[];
    }
  });

/**
 * L'élément de ce genre que le bloc désigne, s'il y en a un sans ambiguïté.
 *
 * Un bouton de propriétés doit savoir sur **quoi** il agira avant de s'afficher, et la barre suit
 * le pointeur : elle ne peut donc pas se contenter de la sélection. Trois cas, dans cet ordre :
 *
 * 1. le bloc **est** cet élément — un bloc prédéfini, un code court : c'est le cas courant ;
 * 2. l'élément **sélectionné** en est un, et il est dans ce bloc — une image sur laquelle on
 *    vient de cliquer, dans un paragraphe qui en contient plusieurs ;
 * 3. le bloc n'en contient **qu'un** : il n'y a alors pas d'ambiguïté à lever.
 *
 * Un bloc qui en contient plusieurs sans qu'aucun ne soit sélectionné ne propose pas le bouton :
 * mieux vaut pas de bouton qu'un bouton dont on ne sait pas ce qu'il va ouvrir.
 */
const matchIn = (editor: Editor, block: HTMLElement, selector: string): Optional<HTMLElement> => {
  /** L'élément sélectionné, s'il est de ce genre et qu'il se trouve dans ce bloc. */
  const inSelection = (): Optional<HTMLElement> => {
    const selected: HTMLElement | null = editor.dom.getParent(editor.selection.getNode(), selector, editor.getBody());
    return Type.isNonNullable(selected) && block.contains(selected)
      ? Optional.some(selected)
      : Optional.none<HTMLElement>();
  };

  /** Le seul élément de ce genre dans le bloc, quand il n'y en a qu'un. */
  const onlyChild = (): Optional<HTMLElement> => {
    const all = editor.dom.select<HTMLElement>(selector, block);
    return all.length === 1 ? Optional.some(all[0]) : Optional.none<HTMLElement>();
  };

  // Le résultat passe par une variable typée : `dom.is` est un prédicat de type, et l'employer
  // directement dans une condition ferait croire au compilateur que le bloc n'est plus rien dans
  // la branche contraire.
  const isSelf = editor.dom.is(block, selector) as boolean;
  return isSelf ? Optional.some(block) : inSelection().orThunk(onlyChild);
};

/**
 * La barre des blocs est-elle en place ?
 *
 * `onlcblocks` le déclare au démarrage. Les autres plugins s'en servent pour décider si leur
 * barre contextuelle a encore lieu d'être : quand la réponse est oui, leurs boutons sont déjà
 * dans la barre du bloc, et une seconde bulle ne ferait que la masquer.
 */
const declareToolbar = (editor: Editor): void => {
  (editor as Editor & Carrier).onlcBlockToolbar = true;
};

const hasToolbar = (editor: Editor): boolean =>
  (editor as Editor & Carrier).onlcBlockToolbar === true;

/**
 * Ce nœud est-il déjà servi par la barre des blocs ?
 *
 * Vrai quand la barre existe **et** qu'un bloc manipulable entoure le nœud. Un morceau posé hors
 * de tout bloc — dans une cellule de tableau, dans un élément de liste — n'en a pas, et garde
 * donc sa bulle.
 */
/**
 * Ouvre la configuration de l'objet qu'on vient de désigner — c'est ce que fait un double clic.
 *
 * Le bloc est résolu par `onlcblocks`, puis ses boutons de propriétés sont passés en revue. Celui
 * dont la **cible est la plus profonde** l'emporte : un double clic sur une image dans un
 * paragraphe doit ouvrir l'image, pas les propriétés du paragraphe. À profondeur égale, le plus
 * petit `order` gagne.
 *
 * Rien ne s'ouvre sur un contenu **non modifiable** : un diaporama se manipule d'une pièce, et
 * l'image d'une de ses vues n'a pas à ouvrir le formulaire des images. C'est le bloc entier qui
 * répond, par son propre bouton.
 *
 * Rien ne s'ouvre non plus quand l'éditeur est **en lecture seule** : la barre des blocs se
 * retire déjà dans ce mode, et un double clic ne doit pas rouvrir par une autre porte des
 * formulaires qui écrivent dans le document.
 */
const openFor = (editor: Editor, node: Node | null): boolean => {
  if (!Type.isNonNullable(node) || !hasToolbar(editor) || editor.mode.isReadOnly()) {
    return false;
  }

  const plugin = (editor.plugins as Record<string, unknown>).onlcblocks as
    { readonly blockAt?: (node: Node) => HTMLElement | null } | undefined;
  if (!Type.isObject(plugin) || !Type.isFunction(plugin.blockAt)) {
    return false;
  }

  const block = plugin.blockAt(node);
  if (!Type.isNonNullable(block)) {
    return false;
  }

  const depth = (element: HTMLElement): number => {
    let steps = 0;
    let current: Node | null = element;
    while (Type.isNonNullable(current) && current !== block) {
      steps += 1;
      current = current.parentNode;
    }
    return steps;
  };

  // On ne retient que les boutons dont la cible **contient** le nœud désigné, ou le bloc entier :
  // sans cela, viser le titre d'une colonne ouvrirait l'image posée à côté.
  const candidates = Arr.filter(forBlock(editor, block), (resolved) =>
    resolved.target === block || resolved.target.contains(node));

  const best = Arr.foldl(candidates, (retenu: Optional<ResolvedAction>, resolved) =>
    retenu.forall((autre) => {
      const ecart = depth(resolved.target) - depth(autre.target);
      return ecart > 0 || (ecart === 0 && (resolved.action.order ?? 100) < (autre.action.order ?? 100));
    }) ? Optional.some(resolved) : retenu,
  Optional.none<ResolvedAction>());

  return best.fold(Fun.never, (chosen) => {
    chosen.action.run(editor, chosen.target);
    return true;
  });
};

const isHandledByToolbar = (editor: Editor, node: Node | null): boolean => {
  if (!hasToolbar(editor) || !Type.isNonNullable(node)) {
    return false;
  }
  const plugin = (editor.plugins as Record<string, unknown>).onlcblocks as
    { readonly blockAt?: (node: Node) => HTMLElement | null } | undefined;
  return Type.isObject(plugin) && Type.isFunction(plugin.blockAt)
    ? Type.isNonNullable(plugin.blockAt(node))
    : false;
};

export {
  declare,
  list,
  forBlock,
  matchIn,
  declareToolbar,
  hasToolbar,
  isHandledByToolbar,
  openFor
};
