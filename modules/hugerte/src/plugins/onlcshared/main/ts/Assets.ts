import Editor from 'hugerte/core/api/Editor';

import * as Options from './Options';

/**
 * Adresse des **ressources statiques** d'un plugin ONLC : ses feuilles de style, ses polices
 * d'icônes, ses dessins d'emoji, ses dictionnaires.
 *
 * Par défaut, un plugin sert ces fichiers depuis son propre dossier, celui que l'éditeur lui a
 * passé au chargement (`pluginUrl`). Un projet qui pose l'éditeur sur son serveur mais confie ces
 * 20 Mo à un CDN règle `onlc_cdn_url`, et c'est cette base-là qui est employée.
 *
 * **La bascule ne réarrange rien.** Elle remplace la base de l'adresse et garde tout ce qui suit
 * `plugins/` :
 *
 * ```
 *   https://exemple.fr/editeur/plugins/onlcicons/openmoji
 *   https://cdn.exemple.fr/onlc4/1.0.12/plugins/onlcicons/openmoji
 * ```
 *
 * C'est l'arborescence que produit `tools/cdn/build.js` : déposer le paquet et indiquer où il est
 * suffit, sans avoir à déplacer un fichier ni à connaître le nom des plugins.
 *
 * Une adresse dont la forme n'est pas celle-là — un plugin chargé d'un emplacement inhabituel —
 * est laissée telle quelle : mieux vaut le dossier d'origine, qui fonctionne, qu'une adresse
 * recomposée au jugé.
 */

/** Ce qui sépare la base de l'éditeur du dossier d'un plugin, dans le paquet comme dans le dépôt. */
const marker = '/plugins/';

const baseOf = (editor: Editor, pluginUrl: string): string => {
  // La lecture peut précéder l'appel du plugin à `register` : `registerOnce` rend l'appel
  // gratuit s'il a déjà eu lieu, et évite un avertissement sur une option non déclarée.
  Options.register(editor);

  const cdn = Options.getCdnUrl(editor);
  if (cdn === '') {
    return pluginUrl;
  }
  const at = pluginUrl.lastIndexOf(marker);
  return at === -1 ? pluginUrl : cdn + pluginUrl.substring(at);
};

/**
 * @param pluginUrl le dossier du plugin, tel que l'éditeur le lui a passé
 * @param path le chemin de la ressource dans ce dossier, par exemple `css/onlcicons.css`
 */
const urlOf = (editor: Editor, pluginUrl: string, path: string): string =>
  `${baseOf(editor, pluginUrl)}/${path.replace(/^\/+/, '')}`;

export {
  baseOf,
  urlOf
};
