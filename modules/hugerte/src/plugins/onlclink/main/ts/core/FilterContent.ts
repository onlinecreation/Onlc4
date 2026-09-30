import { Arr, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import * as LinkActions from 'hugerte/plugins/onlcshared/link/LinkActions';

/**
 * L'action javascript au clic d'un lien, mise à l'abri le temps de l'écriture.
 *
 * Un `onclick` posé sur un lien de la zone d'écriture **s'exécute** : le rédacteur qui clique sur
 * son propre lien déclencherait son propre code, au milieu de l'éditeur. C'est exactement ce que
 * le bac à sable des scripts évite par ailleurs, et un lien n'a pas de raison d'y échapper.
 *
 * L'attribut voyage donc sous un nom inerte pendant l'écriture, et redevient `onclick` à
 * l'enregistrement. Le lien publié se comporte comme le rédacteur l'a demandé ; celui qu'il
 * manipule ne fait rien.
 */

const setup = (editor: Editor): void => {
  editor.on('PreInit', () => {
    // Sans cette déclaration, le schéma du cœur retirerait l'attribut à la sérialisation.
    editor.schema.addValidElements(`a[href|target|rel|title|class|style|id|name|onclick|${LinkActions.clickAttribute}]`);

    editor.parser.addAttributeFilter('onclick', (nodes) => {
      Arr.each(nodes, (node) => {
        if (node.name === 'a') {
          const action = node.attr('onclick');
          node.attr('onclick', null);
          if (Type.isString(action) && action !== '') {
            node.attr(LinkActions.clickAttribute, action);
          }
        }
      });
    });

    editor.serializer.addAttributeFilter(LinkActions.clickAttribute, (nodes) => {
      Arr.each(nodes, (node) => {
        const action = node.attr(LinkActions.clickAttribute);
        node.attr(LinkActions.clickAttribute, null);
        if (Type.isString(action) && action !== '') {
          node.attr('onclick', action);
        }
      });
    });
  });

  /**
   * Un clic dans la zone d'écriture ne suit jamais le lien.
   *
   * Le cœur l'empêche déjà pour un clic simple ; le navigateur, lui, ouvre l'adresse au
   * ctrl-clic et au clic du milieu, ce qui fait quitter le back-office sans prévenir.
   */
  editor.on('click', (e) => {
    const lien = editor.dom.getParent(e.target as Node, 'a[href]');
    if (Type.isNonNullable(lien) && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
    }
  });
};

export {
  setup
};
