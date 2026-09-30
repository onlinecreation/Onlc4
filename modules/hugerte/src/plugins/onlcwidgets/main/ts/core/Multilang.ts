import { Arr, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

/**
 * Le pont vers le plugin polyglotte, quand il est là.
 *
 * `onlcwidgets` ne dépend pas de `onlcmultilang` : une page monolingue n'a aucune raison de le
 * charger. Mais un aperçu visiteur qui montrerait le français, l'anglais et le néerlandais
 * empilés ne montrerait pas ce que verra un visiteur — c'est précisément ce que l'aperçu promet.
 *
 * Tout passe donc par l'interface publique du plugin, lue à travers `editor.plugins`, et chaque
 * fonction sait se taire quand il n'est pas chargé.
 */

interface MultilangPluginApi {
  readonly listLanguages: () => Array<{ code: string; label: string }>;
  readonly usedLanguages: () => string[];
  readonly resolveHtml: (html: string, code?: string) => string;
}

const apiOf = (editor: Editor): MultilangPluginApi | null => {
  const plugin = (editor.plugins as Record<string, unknown>).onlcmultilang;
  return Type.isObject(plugin) && Type.isFunction((plugin as MultilangPluginApi).resolveHtml)
    ? plugin as MultilangPluginApi
    : null;
};

/**
 * Les langues à proposer dans l'aperçu : celles qui sont déclarées **et** réellement employées
 * dans la page. Proposer une langue qui ne change rien à l'écran ne renseigne personne.
 */
const languagesOf = (editor: Editor): Array<{ code: string; label: string }> => {
  const api = apiOf(editor);
  if (api === null) {
    return [];
  }

  const used = api.usedLanguages();
  return Arr.filter(api.listLanguages(), (language) => Arr.contains(used, language.code));
};

/**
 * Une page réduite à une langue, ou telle quelle si le plugin polyglotte n'est pas chargé.
 *
 * La réduction porte sur la page **assemblée**, gabarit compris : c'est l'ordre du moteur du
 * site, et un gabarit d'Online Création place volontiers ses propres `[LG]` dans son en-tête.
 */
const resolvePage = (editor: Editor, html: string, code?: string): string => {
  const api = apiOf(editor);
  return api === null ? html : api.resolveHtml(html, code);
};

export {
  apiOf,
  languagesOf,
  resolvePage
};
