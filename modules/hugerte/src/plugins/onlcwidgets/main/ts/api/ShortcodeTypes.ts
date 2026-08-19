/**
 * Types publics du plugin onlcshortcodes. Ils décrivent aussi le contrat de l'option
 * `onlc_shortcodes_custom`, par laquelle un projet ajoute ses propres codes.
 */

export type ShortcodeFieldType =
  | 'text'
  | 'textarea'
  | 'email'
  | 'url'
  | 'number'
  | 'date'
  | 'time'
  | 'timezone'
  | 'select';

export interface ShortcodeFieldItem {
  readonly text: string;
  readonly value: string;
}

export interface ShortcodeField {
  readonly name: string;
  readonly label: string;
  readonly type: ShortcodeFieldType;
  readonly items?: ShortcodeFieldItem[];
  readonly placeholder?: string;
  /** Phrase d'explication affichée sous le champ. */
  readonly help?: string;
  /** Deux champs de demi-largeur se placent côte à côte. */
  readonly half?: boolean;
}

/** Drapeau optionnel écrit sans valeur : `[SocialButtons Facebook Twitter]`. */
export interface ShortcodeFlag {
  readonly name: string;
  readonly label: string;
}

export interface ShortcodeValues {
  readonly [key: string]: string;
}

export interface ShortcodeDefinition {
  /** Nom exact du code, tel qu'il est écrit entre crochets. */
  readonly name: string;
  readonly label: string;
  readonly description: string;
  readonly category: string;
  /** Dessin affiché dans le bloc et dans la bibliothèque : un svg en ligne. */
  readonly icon: string;
  readonly fields: ShortcodeField[];
  /** Attributs toujours écrits, jamais proposés au rédacteur. */
  readonly fixed?: ShortcodeValues;
  readonly flags?: ShortcodeFlag[];
  /** Paramètres séparés par des points-virgules : `[LogoSite;200;80]`. */
  readonly positional?: ShortcodeField[];
  /** Le code encadre du contenu : `[Slideshow]…[/Slideshow]`. */
  readonly paired?: boolean;
  readonly defaults?: ShortcodeValues;
  /** Ligne de résumé affichée dans le bloc, sous la description. */
  readonly summary?: (values: ShortcodeValues) => string;
}
