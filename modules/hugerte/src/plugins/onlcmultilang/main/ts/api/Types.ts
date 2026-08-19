import { Syntax } from '../core/Parse';

/**
 * Une langue autorisée, telle qu'on la déclare dans la configuration.
 *
 * La forme courte suffit presque toujours — `[ 'fr', 'en', 'nl' ]` — et l'intitulé est alors pris
 * dans la table des noms usuels. La forme longue sert aux langues absentes de cette table, ou
 * quand un site veut ses propres mots : « Néerlandais » plutôt que « Nederlands ».
 */
export interface LanguageSpec {
  /** Deux lettres, comme les attend le moteur du site. */
  readonly code: string;
  /** Ce qui est écrit sur la pastille et dans les menus. */
  readonly label?: string;
}

export type LanguageOption = string | LanguageSpec;

export interface Language {
  readonly code: string;
  readonly label: string;
}

export { Syntax };
