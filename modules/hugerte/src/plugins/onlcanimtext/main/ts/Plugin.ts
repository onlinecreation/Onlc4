import PluginManager from 'hugerte/core/api/PluginManager';
import * as PublishedCss from 'hugerte/plugins/onlcshared/PublishedCss';
import * as DialogStyles from 'hugerte/plugins/onlcshared/ui/DialogStyles';

import * as Anim from './core/Anim';
import * as FilterContent from './core/FilterContent';
import * as Markup from './core/Markup';
import * as Styles from './core/Styles';
import * as Buttons from './ui/Buttons';
import * as Icons from './ui/Icons';

/**
 * Texte animé : clignotant, défilant, ou plusieurs mots qui se relaient à la même place.
 *
 * ## Ce que le module apporte à une page qui le faisait déjà
 *
 * Une page peut très bien animer un passage sans lui : quelques images-clés dans la feuille du
 * site, des mots superposés, et cela fonctionne — **sur le site**. Dans l'éditeur, rien ne bouge :
 * la feuille du site est chargée, mais les images-clés vivent souvent dans un bloc `style` que le
 * nettoyeur du cœur retire du contenu, et la largeur devinée du conteneur (`min-width: 5em`) fait
 * sauter la mise en page dès qu'un mot dépasse.
 *
 * Le module reprend donc ces passages à son compte : il **reconnaît l'écriture d'origine**, la
 * configure d'un double clic, et écrit la feuille dont elle a besoin en tête de la page
 * enregistrée. La même feuille habille la zone d'écriture : ce qui tourne sur le site tourne dans
 * l'éditeur, et à la même vitesse.
 *
 * @class hugerte.onlcanimtext.Plugin
 * @private
 */

export interface OnlcAnimTextApi {
  /** Ouvre le formulaire sur le passage animé qui contient ce nœud, ou en crée un. */
  readonly openDialog: (node?: Node) => void;
  /** Les passages animés de la page. */
  readonly list: () => HTMLElement[];
  /** La feuille que la page enregistrée portera, telle qu'elle est à cet instant. */
  readonly css: () => string;
}

export default (): void => {
  PluginManager.add('onlcanimtext', (editor): OnlcAnimTextApi => {
    DialogStyles.setup(editor);
    FilterContent.setup(editor);

    editor.ui.registry.addIcon('onlc-animtext', Icons.action);

    /**
     * La zone d'écriture reçoit toutes les rondes possibles jusqu'à huit mots.
     *
     * La page enregistrée, elle, ne porte que celles qu'elle emploie : là, chaque octet compte, et
     * la feuille est réécrite à chaque enregistrement. Ici la feuille est posée une fois pour
     * toutes, et le rédacteur peut ajouter un mot sans qu'on ait à la refaire.
     */
    const editionCounts = [ 2, 3, 4, 5, 6, 7, 8 ];
    editor.contentStyles.push(Styles.sheet(editionCounts));
    PublishedCss.declareRules(editor, Styles.sheet(editionCounts));

    editor.addCommand('OnlcAnimText', () => Buttons.openFor(editor, editor.selection.getNode()));

    Buttons.register(editor);

    return {
      openDialog: (node?: Node) => Buttons.openFor(editor, node ?? editor.selection.getNode()),
      list: () => Anim.all(editor),
      css: () => Styles.sheet(Markup.counts(editor))
    };
  });
};
