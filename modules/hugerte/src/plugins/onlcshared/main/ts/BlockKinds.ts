import { Arr, Optional, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

/**
 * Le **type** d'un bloc : ce qu'on lit dans l'angle haut gauche de son contour.
 *
 * Une page de travail montre une vingtaine de rectangles pointillés qui se ressemblent tous.
 * Savoir lequel est un diaporama, lequel une ligne de grille, lequel une fiche de microdonnées
 * demandait de cliquer dessus pour voir ce que la barre proposait. Un dessin de seize pixels
 * répond à la question sans qu'on ait rien à faire.
 *
 * ## Qui déclare quoi
 *
 * Le plugin qui possède l'objet déclare son type ; `onlcblocks` déclare ceux du html ordinaire —
 * paragraphe, titre, liste, tableau — avec un `order` élevé, pour qu'un plugin qui reconnaît
 * mieux passe devant. Le premier `order` gagnant l'emporte.
 *
 * Comme les autres registres partagés, celui-ci vit sur l'objet éditeur et n'est consulté qu'au
 * moment de dessiner : **l'ordre de chargement des plugins n'a aucun effet**.
 */

export interface BlockKind {
  /** Identifiant unique. Une seconde déclaration du même nom remplace la première. */
  readonly id: string;
  /** Ce que dit l'infobulle : « Diaporama », « Ligne de grille ». Traduit à l'affichage. */
  readonly label: string;
  /** Dessin svg en ligne, dans une boîte de 24 × 24 rendue en 16 × 16. */
  readonly icon: string;
  /**
   * Ordre d'examen, du plus petit au plus grand. Les types du html ordinaire occupent les
   * centaines ; un plugin qui reconnaît un objet précis se déclare en dessous.
   */
  readonly order?: number;
  readonly match: (editor: Editor, element: HTMLElement) => boolean;
}

interface Carrier {
  onlcBlockKinds?: BlockKind[];
}

const storeOf = (editor: Editor): BlockKind[] => {
  const carrier = editor as Editor & Carrier;
  const existing = carrier.onlcBlockKinds;
  if (Type.isArray(existing)) {
    return existing;
  }
  const created: BlockKind[] = [];
  carrier.onlcBlockKinds = created;
  return created;
};

/** Déclare un type de bloc. Redéclarer le même identifiant remplace la déclaration précédente. */
const declare = (editor: Editor, kind: BlockKind): void => {
  const store = storeOf(editor);
  Arr.findIndex(store, (candidate) => candidate.id === kind.id).fold(
    () => {
      store.push(kind);
    },
    (index) => {
      store[index] = kind;
    }
  );
};

/** Tous les types déclarés, du plus précis au plus général. */
const list = (editor: Editor): BlockKind[] =>
  Arr.sort(storeOf(editor).slice(), (a, b) => (a.order ?? 100) - (b.order ?? 100));

/**
 * Le type de cet élément, s'il en a un de déclaré.
 *
 * Un plugin qui se trompe ne doit pas priver toute la page de son repère : une exception levée
 * par un `match` vaut « non », et n'est comptée que pour lui.
 */
const kindOf = (editor: Editor, element: HTMLElement): Optional<BlockKind> =>
  Arr.find(list(editor), (kind) => {
    try {
      return kind.match(editor, element);
    } catch (_err) {
      return false;
    }
  });

/** Petit utilitaire : l'élément porte-t-il l'un de ces noms de balise ? */
const isTag = (element: HTMLElement, names: string[]): boolean =>
  Arr.contains(names, element.nodeName.toLowerCase());

export {
  declare,
  list,
  kindOf,
  isTag
};
