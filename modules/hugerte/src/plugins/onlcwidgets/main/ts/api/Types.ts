/**
 * Public types of the onlcwidgets plugin. They are also the contract used by the
 * `onlc_widgets_custom` option, which lets a project add its own predefined blocks.
 */

export type WidgetFieldType =
  | 'text'
  | 'textarea'
  | 'code'
  | 'url'
  | 'image'
  | 'select'
  | 'checkbox'
  | 'number'
  | 'color';

export type CodeLanguage = 'html' | 'javascript' | 'css';

export interface WidgetFieldItem {
  readonly text: string;
  readonly value: string;
}

export interface WidgetField {
  readonly name: string;
  readonly label: string;
  readonly type: WidgetFieldType;
  /** Options of a `select` field. */
  readonly items?: WidgetFieldItem[];
  readonly placeholder?: string;
  /** Language used to highlight a `code` field. */
  readonly language?: CodeLanguage;
  /** Tab the field belongs to. Fields without a tab go to the first one. */
  readonly tab?: string;
  /** Half width fields are paired two by two inside a grid. */
  readonly half?: boolean;
}

export interface WidgetConfig {
  readonly [key: string]: string;
}

/** Feuilles de style et scripts dont un bloc a besoin sur la page publiée. */
export interface WidgetAssets {
  readonly css?: string[];
  readonly js?: string[];
}

export interface WidgetDefinition {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  readonly category: string;
  /** Name of an editor icon, shown in the library. */
  readonly icon: string;
  readonly fields: WidgetField[];
  readonly defaults?: WidgetConfig;
  /**
   * Builds the html of the block. The returned markup is inserted inside the block wrapper,
   * which already carries the identifier and the serialized configuration.
   */
  readonly render: (config: WidgetConfig) => string;
  /**
   * Aperçu affiché dans l'éditeur, quand il doit différer de la page publiée : une carte
   * interactive, par exemple, ne peut pas s'exécuter dans la zone d'édition.
   */
  readonly renderEditor?: (config: WidgetConfig) => string;
  /**
   * Quand ce drapeau est levé, le contenu du bloc est reconstruit à partir de sa configuration
   * au moment de l'enregistrement. C'est indispensable pour les intégrations : l'éditeur ajoute
   * un attribut `sandbox` aux iframes, qui rendrait l'intégration inerte sur le site.
   */
  readonly canonical?: boolean;
  /** Dépendances chargées depuis un CDN, écrites en tête du bloc sur la page publiée. */
  readonly assets?: WidgetAssets;
  /**
   * Marks the block as containing free text edited directly in the page rather than in the
   * dialog. Such content is kept when the block is edited again.
   */
  readonly hasSlots?: boolean;
}

export interface ScriptData {
  readonly code: string;
  readonly src: string;
  readonly type: string;
  readonly async: boolean;
  readonly defer: boolean;
  readonly position: string;
}
