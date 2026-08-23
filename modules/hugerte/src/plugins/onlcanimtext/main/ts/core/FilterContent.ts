import { Arr, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import AstNode from 'hugerte/core/api/html/Node';

import * as Anim from './Anim';
import * as Styles from './Styles';

/**
 * La feuille des animations, posée en tête de la page enregistrée et retirée de la zone d'écriture.
 *
 * ## Pourquoi elle n'est pas conservée telle quelle
 *
 * Cette feuille est **entièrement déduite** du contenu : les sortes d'animation employées et le
 * nombre de mots de chaque ronde suffisent à l'écrire. La garder d'une fois sur l'autre
 * n'apporterait rien, et laisserait traîner les images-clés d'une ronde qu'on aurait supprimée.
 *
 * Elle est donc **retirée à l'ouverture** et **réécrite à l'enregistrement**. Le rédacteur ne la
 * voit jamais, elle ne peut pas dériver du contenu, et une page sans texte animé n'en porte
 * aucune.
 *
 * ## Pourquoi le cœur la laisse passer
 *
 * Le nettoyeur du cœur supprime les éléments `style` du contenu — c'est ce qui protège la zone
 * d'écriture d'une feuille venue d'ailleurs. Celle-ci n'est pas *reçue*, elle est **écrite par le
 * sérialiseur** à partir de ce que le module sait : elle n'existe qu'à la sortie, et n'a donc
 * jamais à traverser le nettoyeur.
 */

/** Le nombre de mots d'un conteneur, dans l'arbre du sérialiseur. */
const countOf = (node: AstNode): number => {
  const declared = Number(node.attr(Styles.countAttribute));
  if (!isNaN(declared) && declared > 0) {
    return declared;
  }
  return Arr.filter(node.children(), (child) =>
    child.name === 'span' && (child.attr('class') ?? '').indexOf(Anim.itemClass) !== -1).length;
};

const hasClass = (node: AstNode, cls: string): boolean =>
  Arr.contains((node.attr('class') ?? '').split(/\s+/), cls);

/** Retire de l'arbre les feuilles que ce module avait posées. */
const dropSheets = (nodes: AstNode[]): void => {
  Arr.each(nodes, (node) => {
    if (Type.isNonNullable(node.attr(Styles.marker))) {
      node.remove();
    }
  });
};

const setup = (editor: Editor): void => {
  /**
   * Les rondes rencontrées pendant la sérialisation en cours.
   *
   * Elle est vidée au début de chaque `getContent()` et lue à la fin : la feuille décrit alors
   * exactement ce que la page contient, ni plus ni moins.
   */
  let counts: number[] = [];

  editor.on('PreInit', () => {
    // À l'ouverture : la feuille précédente s'en va. La zone d'écriture a la sienne, posée par
    // `contentStyles`, et qui ne quitte jamais l'éditeur.
    editor.parser.addNodeFilter('style', dropSheets);

    editor.serializer.addNodeFilter('span', (nodes) => {
      Arr.each(nodes, (node) => {
        if (hasClass(node, Anim.containerClass)) {
          counts.push(countOf(node));
          // Le style du conteneur porte la durée, celui d'un mot son rang. La copie de travail
          // que le cœur garde en double n'a rien à faire dans la page.
          node.attr('data-mce-style', null);
        }
      });
    });
  });

  editor.on('PreProcess', (e) => {
    if (e.get === true) {
      counts = [];
    }
  });

  /**
   * La feuille est ajoutée **en tête** du contenu enregistré, et seulement s'il y a de quoi
   * l'employer : une page sans texte animé n'en porte aucune.
   */
  editor.on('PostProcess', (e) => {
    if (e.get !== true || !Type.isString(e.content) || counts.length === 0) {
      return;
    }
    // `</` est neutralisé : une feuille ne doit pas pouvoir refermer sa propre balise.
    const css = Styles.compact(counts).replace(/<\//g, '<\\/');
    e.content = `<style ${Styles.marker}="1">${css}</style>\n${e.content}`;
  });
};

export {
  countOf,
  setup
};
