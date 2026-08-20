import { Arr, Optional, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

import * as Options from '../api/Options';

/**
 * Ce que le marquage doit englober.
 *
 * Une seule règle, celle qu'on attend d'un traitement de texte :
 *
 * * **du texte sélectionné dans un seul bloc** — quelques mots au milieu d'une phrase — reçoit
 *   un marquage **en ligne**, qui ne coupe pas le paragraphe ;
 * * **tout le reste** reçoit un **bloc englobant** : un bloc entier, plusieurs blocs d'affilée,
 *   un bandeau, une carte de média, un simple curseur posé dans un paragraphe.
 *
 * ## Pourquoi pas le formateur de l'éditeur
 *
 * La première version confiait l'englobage à `editor.formatter` avec un format `wrapper`. C'est
 * l'outil des citations et des listes, et il fait deux choses qu'on ne veut pas ici : sur une
 * sélection posée dans un élément non modifiable — une carte de média — il n'agit pas du tout, et
 * sur un `<div>` déjà présent il **réécrit l'élément** au lieu de l'entourer. Une colonne
 * Bootstrap marquée dans une langue perdait ainsi son `col-sm-6`, c'est-à-dire sa raison d'être.
 *
 * L'englobage est donc fait à la main, en déplaçant des nœuds : ce qui existait avant existe
 * encore après, à la même place, avec les mêmes attributs.
 *
 * ## Où s'arrête un bloc
 *
 * On remonte depuis la sélection jusqu'à l'élément dont le **parent est un conteneur** — le corps
 * du document, une ligne ou une colonne de grille, une section. C'est la même frontière que celle
 * de la barre d'outils des blocs : cliquer un paragraphe dans une colonne marque le paragraphe,
 * pas la colonne, et la colonne reste intacte.
 */

export interface InlineScope {
  readonly kind: 'inline';
}

export interface BlockScope {
  readonly kind: 'block';
  /** Nœuds voisins à englober, dans l'ordre du document. */
  readonly nodes: Node[];
}

export type Scope = InlineScope | BlockScope;

const isElement = (node: Node | null): node is HTMLElement =>
  Type.isNonNullable(node) && node.nodeType === 1;

const isContainer = (editor: Editor, node: Node | null): boolean => {
  const body = editor.getBody();
  if (!Type.isNonNullable(node) || node === body) {
    return true;
  }
  return isElement(node) && editor.dom.is(node, Options.getContainerSelector(editor));
};

/**
 * Le plus haut ancêtre non modifiable, ou le nœud lui-même.
 *
 * Une carte de média est un élément `contenteditable="false"` : la sélection tombe sur un de ses
 * morceaux internes, jamais sur elle. Marquer ce morceau ne donnerait rien de visible et
 * abîmerait un contenu que le plugin reconstruit à chaque enregistrement.
 */
const outermostStatic = (editor: Editor, node: Node | null): Node | null => {
  const body = editor.getBody();
  let current: Node | null = node;
  let found: Node | null = node;

  while (Type.isNonNullable(current) && current !== body) {
    if (isElement(current) && editor.dom.getAttrib(current, 'contenteditable') === 'false') {
      found = current;
    }
    current = current.parentNode;
  }

  return found;
};

/**
 * Le bloc à englober, en partant d'un nœud quelconque de la sélection.
 *
 * Un conteneur n'est jamais retenu pour lui-même : marquer une colonne signifierait marquer la
 * colonne, or ce qu'on veut c'est marquer ce qu'elle contient.
 */
const blockFor = (editor: Editor, node: Node | null): Optional<HTMLElement> => {
  const body = editor.getBody();
  const start = outermostStatic(editor, node);

  let current: Node | null = isElement(start) ? start : start?.parentNode ?? null;
  let candidate = Optional.none<HTMLElement>();

  while (Type.isNonNullable(current) && current !== body) {
    if (isElement(current) && !isContainer(editor, current)) {
      candidate = Optional.some(current);
      if (isContainer(editor, current.parentNode)) {
        return candidate;
      }
    }
    current = current.parentNode;
  }

  return candidate;
};

/**
 * Le nœud réellement désigné par une extrémité de sélection.
 *
 * Une extrémité s'exprime souvent comme « le corps du document, position 4 » plutôt que comme le
 * nœud lui-même : c'est le cas dès qu'un élément entier est sélectionné, ce que fait un clic sur
 * une carte de média. Sans cette résolution, on remonterait depuis le corps et on ne trouverait
 * rien à marquer.
 */
const edgeNode = (container: Node, offset: number, end: boolean): Node => {
  if (container.nodeType !== 1) {
    return container;
  }

  const children = container.childNodes;
  if (children.length === 0) {
    return container;
  }

  const index = Math.min(Math.max(end ? offset - 1 : offset, 0), children.length - 1);
  return children[index];
};

/**
 * Le conteneur qui porte ce nœud — une colonne, une ligne, une section.
 *
 * Sert de repli quand rien d'autre ne convient : sélectionner une colonne ne peut pas vouloir
 * dire « entourer la colonne », qui casserait la grille, mais bien « entourer ce qu'elle
 * contient ». Le corps du document est écarté : une sélection dégénérée ne doit pas emporter la
 * page entière.
 */
const containerFor = (editor: Editor, node: Node | null): Optional<HTMLElement> => {
  const body = editor.getBody();
  let current: Node | null = isElement(node) ? node : node?.parentNode ?? null;

  while (Type.isNonNullable(current) && current !== body) {
    if (isElement(current) && isContainer(editor, current)) {
      return Optional.some(current);
    }
    current = current.parentNode;
  }

  return Optional.none();
};

/** Tous les nœuds voisins de `first` à `last` inclus — les blancs entre eux compris. */
const run = (first: Node, last: Node): Node[] => {
  const nodes: Node[] = [ first ];
  let current: Node | null = first;

  while (Type.isNonNullable(current) && current !== last) {
    current = current.nextSibling;
    if (Type.isNonNullable(current)) {
      nodes.push(current);
    }
  }

  // `last` n'a pas été atteint : les deux nœuds ne se suivent pas, on s'en tient au premier.
  return current === last ? nodes : [ first ];
};

/**
 * La sélection est-elle du texte tenant dans un seul bloc ?
 *
 * Trois conditions, et il les faut toutes : quelque chose est sélectionné, ce quelque chose ne
 * contient ni bloc ni élément non modifiable, et ses deux extrémités appartiennent au même bloc.
 */
const isInlineSelection = (editor: Editor, range: Range): boolean => {
  if (range.collapsed) {
    return false;
  }

  const fragment = range.cloneContents();

  if (fragment.querySelector('[contenteditable="false"]') !== null) {
    return false;
  }
  if (Arr.exists(Arr.from(fragment.querySelectorAll('*')), (element) => editor.dom.isBlock(element))) {
    return false;
  }

  const start = blockFor(editor, edgeNode(range.startContainer, range.startOffset, false));
  const end = blockFor(editor, edgeNode(range.endContainer, range.endOffset, true));

  return start.isSome() && start.map((block) => end.exists((other) => other === block)).getOr(false);
};

/**
 * Ce que la sélection courante désigne.
 *
 * `Optional.none` quand il n'y a rien à marquer : une sélection hors du corps, ou un document
 * vide. Mieux vaut ne rien faire que marquer au hasard.
 */
const resolve = (editor: Editor): Optional<Scope> => {
  const range = editor.selection.getRng();

  if (isInlineSelection(editor, range)) {
    return Optional.some<Scope>({ kind: 'inline' });
  }

  const startNode = edgeNode(range.startContainer, range.startOffset, false);
  const endNode = edgeNode(range.endContainer, range.endOffset, true);

  const first = blockFor(editor, startNode);
  const last = blockFor(editor, endNode);

  return first.fold(
    // Rien qui soit un bloc : on est dans un conteneur, et c'est son contenu qu'on entoure.
    () => containerFor(editor, startNode)
      .map((container) => ({ kind: 'block', nodes: Arr.from(container.childNodes) } as Scope)),
    (from) => {
      const to = last.getOr(from);
      const nodes = from.parentNode === to.parentNode ? run(from, to) : [ from ];
      return Optional.some({ kind: 'block', nodes } as Scope);
    }
  );
};

/** Le bloc désigné par un élément précis — la barre d'outils des blocs passe par là. */
const forElement = (editor: Editor, element: HTMLElement): Optional<Scope> =>
  blockFor(editor, element).map((block) => ({ kind: 'block', nodes: [ block ] } as Scope));

export {
  isContainer,
  outermostStatic,
  edgeNode,
  containerFor,
  blockFor,
  run,
  isInlineSelection,
  resolve,
  forElement
};
