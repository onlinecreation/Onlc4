import { Arr, Optional, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

/**
 * Les blocs **insécables** : ceux qu'on manipule d'une pièce, et dont l'intérieur ne se manipule
 * pas.
 *
 * Un diaporama est fait d'une piste et de vues, toutes trois des `div` affichées en bloc. Rien
 * ne les distingue, pour l'espace de travail, d'une section et de ses paragraphes : la barre des
 * blocs se posait donc sur la section qui entoure le diaporama, jamais sur le diaporama
 * lui-même, et l'utilisateur n'avait aucun moyen de le désigner. Il aurait aussi pu, en
 * principe, tirer une vue hors de sa piste — ce qui casse le diaporama sans rien annoncer.
 *
 * Un plugin qui possède ce genre d'objet le déclare ici. L'espace de travail traite alors
 * l'élément comme un bloc à part entière — on le déplace, on le duplique, on le supprime — et
 * tout ce qu'il contient comme n'en faisant pas partie.
 *
 * ## Pourquoi une fonction et non un sélecteur
 *
 * Ces objets ne se reconnaissent pas toujours à une classe. Sur une page réelle, deux diaporamas
 * portent `.swiper` et le troisième `.swiper-reviews` : ce qui les définit, c'est d'avoir une
 * piste `.swiper-wrapper` pour enfant direct. Un sélecteur `:has(> .swiper-wrapper)` l'exprimerait,
 * mais `matches` lève une erreur là où `:has` n'existe pas, et cette erreur emporterait toute la
 * détection des blocs. Une fonction dit la même chose sans rien exiger du navigateur.
 *
 * ## Pourquoi un registre et non une option
 *
 * Le registre vit sur l'objet éditeur, que tous les plugins partagent, et il est consulté au
 * moment où l'on cherche un bloc — donc bien après que chacun s'est présenté. Une option, elle,
 * n'aurait pu être écrite que par un plugin chargé après celui qui la déclare : l'ordre des
 * plugins appartient au projet, et une déclaration qui en dépend échoue en silence.
 */

export interface BlockAtom {
  /** Identifiant unique. Une seconde déclaration du même nom remplace la première. */
  readonly id: string;
  /** Cet élément est-il un bloc insécable ? */
  readonly match: (editor: Editor, element: HTMLElement) => boolean;
}

interface Carrier {
  onlcBlockAtoms?: BlockAtom[];
}

const storeOf = (editor: Editor): BlockAtom[] => {
  const carrier = editor as Editor & Carrier;
  const existing = carrier.onlcBlockAtoms;
  if (Type.isArray(existing)) {
    return existing;
  }
  const created: BlockAtom[] = [];
  carrier.onlcBlockAtoms = created;
  return created;
};

/**
 * Déclare une famille de blocs insécables.
 *
 * Redéclarer le même identifiant remplace la déclaration précédente : rejouer l'initialisation
 * d'un plugin n'allonge pas la liste.
 */
const declare = (editor: Editor, atom: BlockAtom): void => {
  const store = storeOf(editor);
  Arr.findIndex(store, (candidate) => candidate.id === atom.id).fold(
    () => {
      store.push(atom);
    },
    (index) => {
      store[index] = atom;
    }
  );
};

/**
 * Cet élément est-il un bloc insécable ?
 *
 * Un plugin qui se trompe ne doit pas emporter la détection des blocs de la page entière : une
 * exception levée par son `match` vaut « non », et n'est comptée que pour lui.
 */
const isAtom = (editor: Editor, element: HTMLElement): boolean =>
  Arr.exists(storeOf(editor), (atom) => {
    try {
      return atom.match(editor, element);
    } catch (_err) {
      return false;
    }
  });

/**
 * Le bloc insécable qui contient ce nœud, le nœud lui-même compris — le plus **extérieur** quand
 * il y en a plusieurs, un diaporama pouvant en contenir un autre.
 */
const enclosing = (editor: Editor, node: Node | null): Optional<HTMLElement> => {
  if (storeOf(editor).length === 0 || !Type.isNonNullable(node)) {
    return Optional.none();
  }
  const body = editor.getBody();
  let current: Node | null = node.nodeType === 1 ? node : node.parentNode;
  let found: Optional<HTMLElement> = Optional.none();
  while (Type.isNonNullable(current) && current !== body) {
    if (current.nodeType === 1 && isAtom(editor, current as HTMLElement)) {
      found = Optional.some(current as HTMLElement);
    }
    current = current.parentNode;
  }
  return found;
};

/** Ce nœud est-il **à l'intérieur** d'un bloc insécable, sans en être un lui-même ? */
const isInside = (editor: Editor, node: Node | null): boolean =>
  Type.isNonNullable(node) && enclosing(editor, node.parentNode).isSome();

export {
  declare,
  isAtom,
  enclosing,
  isInside
};
