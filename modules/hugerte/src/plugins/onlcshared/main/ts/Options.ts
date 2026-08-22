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
};

const getSiteCss = (editor: Editor): string[] => {
  const value = editor.options.get('onlc_site_css');
  return Type.isArrayOf(value, Type.isString) ? value : [];
};

const getSiteCssProxy = (editor: Editor): string => {
  const value = editor.options.get('onlc_site_css_proxy');
  return Type.isString(value) ? value : '';
};

export {
  register,
  getSiteCss,
  getSiteCssProxy
};
