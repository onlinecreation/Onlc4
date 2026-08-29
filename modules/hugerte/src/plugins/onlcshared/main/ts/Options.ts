import { Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

/**
 * Réglages **communs à plusieurs plugins ONLC**.
 *
 * Une option appartient d'ordinaire au plugin qui s'en sert. Celles-ci décrivent le site lui-même
 * plutôt qu'un outil : la feuille de style qui l'habille sert à l'écriture, à l'aperçu et aux
 * suggestions de classes, c'est-à-dire à trois plugins différents. Les faire déclarer par l'un
 * d'eux obligerait les deux autres à en dépendre.
 *
 * Chaque plugin appelle donc `register` au démarrage, et la déclaration ne se fait qu'une fois :
 * l'éditeur refuse une option déclarée deux fois, et l'ordre de chargement des plugins n'a pas à
 * être connu de celui qui écrit la configuration.
 */

/**
 * Déclare l'option seulement si personne ne l'a fait.
 *
 * La déclaration est passée sous forme de fonction plutôt que de description : l'éditeur choisit
 * la forme de `register` d'après ce qu'on lui donne, et faire transiter la description par une
 * variable lui ferait perdre ce choix.
 */
const registerOnce = (editor: Editor, name: string, declare: () => void): void => {
  if (!editor.options.isRegistered(name)) {
    declare();
  }
};

const register = (editor: Editor): void => {
  /**
   * Feuilles de style du site publié — celles du design choisi par le client.
   *
   * Elles habillent la zone d'écriture et l'aperçu, et leurs classes sont proposées dans les
   * formulaires. Les adresses peuvent être relatives au back-office ou absolues.
   */
  registerOnce(editor, 'onlc_site_css', () => editor.options.register('onlc_site_css', {
    processor: 'string[]',
    default: []
  }));

  /**
   * Relais du back-office pour lire une feuille hébergée ailleurs.
   *
   * Le navigateur affiche sans difficulté une feuille d'un autre domaine, mais refuse d'en lire
   * le texte : les suggestions de classes seraient donc vides pour un site servi depuis son
   * propre domaine. Ce relais va la chercher côté serveur.
   *
   * `{url}` est remplacé par l'adresse encodée ; sans marqueur, elle est ajoutée en paramètre
   * `url`. Laissé vide, seules les feuilles lisibles directement fournissent des suggestions.
   */
  registerOnce(editor, 'onlc_site_css_proxy', () => editor.options.register('onlc_site_css_proxy', {
    processor: 'string',
    default: ''
  }));

  /**
   * Adresse de base des **ressources statiques des plugins ONLC**, sur un serveur tiers.
   *
   * Les plugins servent leurs polices d'icônes, leurs dessins d'emoji, leurs dictionnaires et
   * leurs feuilles de style depuis le dossier d'où l'éditeur a été chargé. Un projet qui pose
   * l'éditeur sur son propre serveur mais veut faire porter ces fichiers — 20 Mo, dont 13 Mo de
   * dessins — par un CDN indique ici l'adresse où il a déposé le paquet :
   *
   * ```js
   * hugerte.init({ onlc_cdn_url: 'https://cdn.exemple.fr/onlc4/1.0.12' });
   * ```
   *
   * L'arborescence est celle du paquet : chaque adresse garde son `plugins/<nom>/…`, seule la
   * base change. Il n'y a donc rien à réarranger sur le CDN, et les options par ressource
   * (`onlc_icons_openmoji_url`, `onlc_icons_emoji_database_url`…) restent prioritaires pour qui
   * range ses fichiers autrement.
   *
   * **Ce que cela ne couvre pas.** Le cœur va chercher son thème, son habillage et ses langues
   * tout seul, à côté du fichier d'où il a été chargé ; c'est `base_url` qui commande cela, pas
   * cette option.
   */
  registerOnce(editor, 'onlc_cdn_url', () => editor.options.register('onlc_cdn_url', {
    processor: 'string',
    default: ''
  }));
};

/**
 * Une base d'adresse utilisable, ou une chaîne vide.
 *
 * Cette valeur finit dans un `href` de feuille de style et dans le `src` des emojis dessinés,
 * c'est-à-dire dans le html enregistré. On n'accepte donc que ce qui désigne un serveur : `http`,
 * `https`, une adresse sans protocole (`//cdn.exemple.fr/…`) ou un chemin (`/onlc4/…`). Un
 * `javascript:` ou un `data:` n'aurait aucun sens ici, et vaut mieux être écarté à la source que
 * recopié dans les pages du client.
 */
const safeBase = (value: string): string => {
  const trimmed = value.trim().replace(/\/+$/, '');
  if (trimmed === '') {
    return '';
  }
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(trimmed);
  if (scheme !== null && !/^https?$/i.test(scheme[1])) {
    // eslint-disable-next-line no-console
    console.warn(`[onlc] onlc_cdn_url ignorée : « ${trimmed} » n'est ni http, ni https, ni un chemin.`);
    return '';
  }
  return trimmed;
};

const getSiteCss = (editor: Editor): string[] => {
  const value = editor.options.get('onlc_site_css');
  return Type.isArrayOf(value, Type.isString) ? value : [];
};

const getSiteCssProxy = (editor: Editor): string => {
  const value = editor.options.get('onlc_site_css_proxy');
  return Type.isString(value) ? value : '';
};

const getCdnUrl = (editor: Editor): string => {
  const value = editor.options.get('onlc_cdn_url');
  return Type.isString(value) ? safeBase(value) : '';
};

export {
  register,
  safeBase,
  getSiteCss,
  getSiteCssProxy,
  getCdnUrl
};
