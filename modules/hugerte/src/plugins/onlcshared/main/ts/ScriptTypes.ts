import { Arr, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

/**
 * Les types de `script` qu'un plugin **revendique**.
 *
 * `onlcwidgets` remplace chaque `script` d'une page par un jeton de code : c'est ce qui empêche
 * qu'il s'exécute dans l'éditeur, et ce qui permet d'en modifier le contenu. Mais tous les
 * `script` ne sont pas du code. Une fiche de microdonnées `application/ld+json` ne contient que
 * des données, que personne n'exécute jamais, et `onlcseo` sait la présenter en formulaire
 * plutôt qu'en pavé de texte. Ce registre est la façon dont il le dit.
 *
 * ## Pourquoi un registre et non une option
 *
 * Un plugin ne peut écrire l'option d'un autre que si celui-ci l'a déjà déclarée, donc que s'il
 * a été chargé avant lui — et l'ordre des plugins appartient au projet, pas à nous. Une
 * revendication qui dépend de cet ordre échoue en silence, et la fiche de microdonnées revient
 * en jeton de code sans que rien ne l'explique. Le registre, lui, vit sur l'objet éditeur, que
 * les deux plugins partagent quel que soit leur ordre de chargement, et il est lu au moment où
 * le contenu arrive — donc après que tous les plugins se sont présentés.
 *
 * Il **s'ajoute** à l'option `onlc_script_ignored_types` sans la remplacer : celle-ci reste la
 * façon dont un projet ajoute ses propres types.
 */

interface Carrier {
  onlcClaimedScriptTypes?: string[];
}

const storeOf = (editor: Editor): string[] => {
  const carrier = editor as Editor & Carrier;
  const existing = carrier.onlcClaimedScriptTypes;
  if (Type.isArray(existing)) {
    return existing;
  }
  const created: string[] = [];
  carrier.onlcClaimedScriptTypes = created;
  return created;
};

/** Revendique un type de `script`. Le nom est comparé sans tenir compte de la casse. */
const claim = (editor: Editor, type: string): void => {
  const normalised = type.trim().toLowerCase();
  if (normalised === '') {
    return;
  }
  const store = storeOf(editor);
  if (!Arr.contains(store, normalised)) {
    store.push(normalised);
  }
};

/** Les types revendiqués, en minuscules. */
const claimed = (editor: Editor): string[] => storeOf(editor).slice();

/** Ce type est-il revendiqué par un plugin ? */
const isClaimed = (editor: Editor, type: string): boolean =>
  Arr.contains(storeOf(editor), type.trim().toLowerCase());

export {
  claim,
  claimed,
  isClaimed
};
