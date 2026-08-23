import { Arr, Optional, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

/**
 * Le texte animé : ce qu'il est, et comment on le reconnaît.
 *
 * Trois façons d'animer un passage de texte, et une seule mécanique derrière :
 *
 * * **clignotant** — le passage apparaît et disparaît ;
 * * **défilant** — il traverse son cadre, de droite à gauche ;
 * * **tournant** — plusieurs mots se relaient à la même place.
 *
 * ## Un seul mot occupe la place, mais la place est celle du plus long
 *
 * Le procédé habituel du texte tournant superpose les mots en `position: absolute` et donne au
 * conteneur une largeur devinée — `min-width: 5em`. La devinette est fausse dès qu'on ajoute un
 * mot plus long : il déborde, ou bien la réserve est trop grande et laisse un trou.
 *
 * Les mots sont donc empilés dans **une seule case de grille**. Le navigateur dimensionne alors
 * la case sur le plus large d'entre eux, sans qu'on ait rien à mesurer, et le texte qui suit ne
 * bouge plus quand les mots se relaient. C'est la seule différence de méthode avec des animations
 * croisées écrites à la main, et c'est elle qui fait tenir la mise en page.
 */

export const containerClass = 'onlc-animtext';
export const itemClass = 'onlc-animtext__item';
export const dataAttribute = 'data-onlc-animtext';

/**
 * L'écriture d'origine, reconnue telle quelle.
 *
 * Une page écrite avant ce module fait tourner ses mots avec des animations croisées et des
 * classes à elle. On la reconnaît pour pouvoir la configurer, plutôt que de demander au rédacteur
 * de la refaire.
 */
export const legacyContainerClass = 'alternate-brands-container';
export const legacyItemClass = 'alternate-brands';

export type AnimKind = 'blink' | 'scroll' | 'rotate';

export interface AnimSettings {
  readonly kind: AnimKind;
  /** Durée d'un cycle complet, en secondes. */
  readonly duration: number;
  /** Mots qui se relaient. Un seul pour le clignotant et le défilant. */
  readonly items: string[];
}

const kinds: AnimKind[] = [ 'blink', 'scroll', 'rotate' ];

const isKind = (value: unknown): value is AnimKind =>
  Type.isString(value) && Arr.contains(kinds, value as AnimKind);

/** Durée par défaut d'un cycle, par sorte d'animation. */
export const defaultDuration = (kind: AnimKind): number =>
  kind === 'scroll' ? 12 : (kind === 'blink' ? 1.4 : 6);

/**
 * Une durée utilisable : un nombre de secondes, borné.
 *
 * En dessous d'un dixième de seconde une animation devient un scintillement, que certaines
 * personnes ne supportent pas et qui peut déclencher une crise. Au-delà de cinq minutes, plus
 * personne ne voit qu'il se passe quelque chose.
 */
export const clampDuration = (value: number): number =>
  !Type.isNumber(value) || isNaN(value) ? 1 : Math.min(300, Math.max(0.1, value));

const hasClass = (element: Element, cls: string): boolean =>
  Arr.contains(element.className.split(/\s+/), cls);

/** Les mots d'un conteneur, dans l'ordre où ils se relaient. */
const itemsOf = (editor: Editor, element: HTMLElement, cls: string): string[] => {
  const found = Arr.map(editor.dom.select<HTMLElement>(`.${cls}`, element),
    (item) => (item.textContent ?? '').trim());
  const kept = Arr.filter(found, (text) => text !== '');
  return kept.length > 0 ? kept : [ (element.textContent ?? '').trim() ];
};

/** Les réglages écrits dans l'attribut de données, quand ils s'y trouvent et se lisent. */
const readAttribute = (editor: Editor, element: HTMLElement): Optional<AnimSettings> => {
  const raw = editor.dom.getAttrib(element, dataAttribute);
  if (raw === '') {
    return Optional.none();
  }
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as Partial<AnimSettings>;
    if (!isKind(parsed.kind)) {
      return Optional.none();
    }
    const items = Type.isArray(parsed.items) ? Arr.filter(parsed.items, Type.isString) : [];
    return Optional.some({
      kind: parsed.kind,
      duration: clampDuration(Number(parsed.duration)),
      items: items.length > 0 ? items : itemsOf(editor, element, itemClass)
    });
  } catch (_e) {
    // Un attribut illisible n'est pas une raison de perdre le passage : on repart de ce que le
    // html montre, et le formulaire réécrira l'attribut proprement.
    return Optional.none();
  }
};

/** Les réglages d'un conteneur, lus de son attribut ou déduits de son écriture. */
const settingsOf = (editor: Editor, element: HTMLElement): AnimSettings =>
  readAttribute(editor, element).getOrThunk(() => {
    const legacy = hasClass(element, legacyContainerClass);
    const items = itemsOf(editor, element, legacy ? legacyItemClass : itemClass);
    return { kind: 'rotate', duration: defaultDuration('rotate'), items };
  });

/** Un texte animé : le nôtre, ou celui qu'une page écrivait avant ce module. */
const isAnim = (node: Node): node is HTMLElement =>
  node.nodeName === 'SPAN'
  && (hasClass(node as HTMLElement, containerClass) || hasClass(node as HTMLElement, legacyContainerClass));

/** Le texte animé qui contient ce nœud, s'il y en a un. */
const at = (editor: Editor, node: Node | null): Optional<HTMLElement> => {
  if (!Type.isNonNullable(node)) {
    return Optional.none();
  }
  return Optional.from(editor.dom.getParent(node, isAnim, editor.getBody()));
};

/** Tous les textes animés de la page. */
const all = (editor: Editor): HTMLElement[] =>
  Arr.filter(editor.dom.select<HTMLElement>('span', editor.getBody()), isAnim);

export {
  kinds,
  isKind,
  isAnim,
  at,
  all,
  itemsOf,
  settingsOf
};
