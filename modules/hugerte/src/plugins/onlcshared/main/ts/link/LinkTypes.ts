/**
 * Types shared by every ONLC feature that can produce a link (link plugin, media plugin, blocks).
 */

export interface LinkListEntry {
  readonly title: string;
  readonly url?: string;
  readonly value?: string;
  readonly menu?: LinkListEntry[];
  readonly children?: LinkListEntry[];
}

export interface LinkListItem {
  readonly text: string;
  readonly value: string;
}

export interface LinkListGroup {
  readonly text: string;
  readonly items: LinkListItem[];
}

export type LinkListOption = LinkListItem | LinkListGroup;

export interface LinkAttributes {
  readonly href: string;
  readonly title: string;
  readonly target: string;
  readonly rel: string;
  readonly classes: string;
  /** Styles écrits à même l'élément, pour un lien qui doit sortir du lot sans classe dédiée. */
  readonly style: string;
  /**
   * Action javascript au clic.
   *
   * Elle n'est **jamais** posée en `onclick` dans la zone d'écriture : le navigateur l'exécuterait
   * au premier clic du rédacteur. Elle voyage dans un attribut de données, et redevient un
   * `onclick` à l'enregistrement. Voir `onlclink/core/FilterContent`.
   */
  readonly click: string;
}

export interface LinkContext {
  /** Predefined links coming from the api or from the `onlc_link_list` option. */
  readonly links: LinkListOption[];
  /** Anchors found in the current document. */
  readonly anchors: LinkListItem[];
}
