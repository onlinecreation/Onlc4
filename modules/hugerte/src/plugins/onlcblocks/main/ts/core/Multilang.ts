import { Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

/**
 * Le pont vers le plugin polyglotte, quand il est là.
 *
 * `onlcblocks` ne dépend pas de `onlcmultilang` : un site monolingue n'a aucune raison de le
 * charger, et la barre d'outils des blocs doit rester la même. Mais quand les deux sont là, la
 * langue d'un bloc se règle là où l'on règle déjà tout le reste du bloc — dans sa barre — plutôt
 * qu'en allant chercher un menu au-dessus de la page.
 *
 * Tout passe par l'interface publique du plugin, lue à travers `editor.plugins`, et chaque
 * fonction sait se taire quand il n'est pas chargé.
 */

interface MultilangPluginApi {
  readonly listLanguages: () => Array<{ code: string; label: string }>;
  readonly markElement: (element: HTMLElement, code: string) => void;
  readonly unmarkElement: (element: HTMLElement) => void;
  readonly codeOfElement: (element: HTMLElement) => string;
}

const apiOf = (editor: Editor): MultilangPluginApi | null => {
  const plugin = (editor.plugins as Record<string, unknown>).onlcmultilang;
  return Type.isObject(plugin) && Type.isFunction((plugin as MultilangPluginApi).markElement)
    ? plugin as MultilangPluginApi
    : null;
};

const isAvailable = (editor: Editor): boolean => apiOf(editor) !== null;

/** Les langues déclarées, ou rien du tout : la barre n'affiche alors pas le bouton. */
const languages = (editor: Editor): Array<{ code: string; label: string }> => {
  const api = apiOf(editor);
  return api === null ? [] : api.listLanguages();
};

/** Langue portée par la section qui contient ce bloc, ou chaîne vide. */
const codeOf = (editor: Editor, block: HTMLElement): string => {
  const api = apiOf(editor);
  return api === null ? '' : api.codeOfElement(block);
};

/** Une valeur vide retire le marquage : « aucune langue » veut dire « visible par tous ». */
const set = (editor: Editor, block: HTMLElement, code: string): void => {
  const api = apiOf(editor);
  if (api === null) {
    return;
  }
  if (code === '') {
    api.unmarkElement(block);
  } else {
    api.markElement(block, code);
  }
};

export {
  apiOf,
  isAvailable,
  languages,
  codeOf,
  set
};
