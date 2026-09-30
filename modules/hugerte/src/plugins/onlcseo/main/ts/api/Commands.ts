import Editor from 'hugerte/core/api/Editor';

import * as Jsonld from '../core/Jsonld';
import * as Meta from '../core/Meta';
import * as JsonldDialog from '../ui/JsonldDialog';

/**
 * Commandes des aides au référencement.
 *
 * Toutes suivent la même règle : **ouvrir plutôt que dupliquer**. Une page n'a qu'une description
 * et qu'une fiche de microdonnées ; demander « ajouter » alors qu'il en existe déjà une revient à
 * demander à la modifier, et c'est ce qui se produit.
 */

const register = (editor: Editor): void => {
  editor.addCommand('OnlcSeoMicrodata', () => JsonldDialog.open(editor));

  editor.addCommand('OnlcSeoRemoveMicrodata', () => Jsonld.remove(editor));

  /**
   * Description et mots-clés pour les moteurs.
   *
   * Le code court appartient au catalogue de `onlcwidgets` : c'est lui qui sait le dessiner et le
   * réécrire. Cette commande ne fait que viser le bon — celui de la page s'il existe — et laisser
   * ce plugin ouvrir son formulaire. Sans `onlcwidgets`, l'entrée n'est pas proposée du tout.
   */
  editor.addCommand('OnlcSeoMeta', () => {
    Meta.existing(editor).fold(
      () => {
        editor.execCommand('OnlcInsertShortcode', false, Meta.shortcodeName);
      },
      (element) => {
        editor.selection.select(element);
        editor.execCommand('OnlcEditShortcode');
      }
    );
  });

  /**
   * Rend l'état des aides au référencement de la page, pour un tableau de bord de back-office.
   *
   * Ni jugement ni note : ce qui existe, ce qui manque. Ce sont deux choses différentes, et la
   * seconde n'est pas toujours une erreur — une page de mentions légales n'a que faire d'une
   * fiche de microdonnées.
   */
  editor.addCommand('OnlcSeoReport', () => {
    const microdata = Jsonld.existing(editor).map((element) => Jsonld.read(editor, element));
    editor.dispatch('OnlcSeoReport', {
      hasMeta: Meta.existing(editor).isSome(),
      hasMicrodata: microdata.isSome(),
      microdataType: microdata.map(Jsonld.typeOf).getOr(''),
      properties: microdata.map(Jsonld.countProperties).getOr(0)
    });
  });
};

export {
  register
};
