/**
 * Types publics du plugin onlcseo — le vocabulaire schema.org tel que l'éditeur le présente.
 *
 * Ils décrivent aussi le contrat de `onlc_seo_schema_types`, par lequel un projet ajoute ses
 * propres types ou complète ceux d'origine.
 */

export type SchemaFieldType =
  | 'text'
  | 'textarea'
  | 'url'
  | 'image'
  | 'date'
  | 'datetime'
  | 'time'
  | 'number'
  | 'select'
  /** Un objet imbriqué : une adresse, une offre, une note. */
  | 'nested';

export interface SchemaFieldItem {
  readonly text: string;
  readonly value: string;
}

/**
 * Une propriété schema.org.
 *
 * `name` est le nom exact du vocabulaire — celui que Google lit, et qu'un intégrateur reconnaît.
 * `label` est ce qu'on affiche : une formulation ordinaire. Les deux sont montrés côte à côte
 * dans le formulaire, pour que le néophyte comprenne ce qu'on lui demande sans que l'expert ait
 * à deviner de quelle propriété il s'agit.
 */
export interface SchemaField {
  readonly name: string;
  readonly label: string;
  readonly type: SchemaFieldType;
  /** Phrase d'explication, en français courant. */
  readonly help?: string;
  readonly placeholder?: string;
  readonly items?: SchemaFieldItem[];
  /** Pour un objet imbriqué : les types acceptés, le premier faisant foi par défaut. */
  readonly of?: string[];
  /** La propriété accepte plusieurs valeurs : plusieurs images, plusieurs auteurs. */
  readonly many?: boolean;
}

export interface SchemaType {
  /** Nom exact du type dans le vocabulaire : `Product`, `LocalBusiness`. */
  readonly name: string;
  readonly label: string;
  readonly description: string;
  /** Type dont celui-ci hérite les propriétés. `Thing` est la racine. */
  readonly parent?: string;
  /** Rubrique de la liste de choix. Absent, le type n'est pas proposé à la racine. */
  readonly category?: string;
  /**
   * Propriétés exigées pour que la fiche soit exploitable par les moteurs. Elles sont affichées
   * d'emblée et ne peuvent pas être retirées.
   */
  readonly required?: string[];
  /** Propriétés vivement conseillées : affichées d'emblée, mais retirables. */
  readonly recommended?: string[];
  /** Propriétés déclarées par ce type. Celles des ancêtres s'y ajoutent. */
  readonly fields: SchemaField[];
}
