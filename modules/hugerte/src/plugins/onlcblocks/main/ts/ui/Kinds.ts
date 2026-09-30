import { Fun } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import * as BlockKinds from 'hugerte/plugins/onlcshared/BlockKinds';
import * as KindIcons from 'hugerte/plugins/onlcshared/ui/KindIcons';

import * as Options from '../api/Options';
import * as Columns from '../core/Columns';

/**
 * Les types de blocs du html ordinaire.
 *
 * Ce sont les repères de repli : chaque plugin déclare les siens, plus précis, avec un `order`
 * plus bas. Un diaporama est reconnu par `onlcswiper` avant d'être vu ici comme une section.
 *
 * L'ordre entre eux compte aussi : une ligne de grille est un `div`, une colonne également, et
 * une section d'enrobage encore. Le plus précis passe d'abord.
 */

const declare = (editor: Editor): void => {
  const add = (
    id: string,
    label: string,
    icon: string,
    order: number,
    match: (target: Editor, element: HTMLElement) => boolean
  ): void => {
    BlockKinds.declare(editor, { id, label, icon, order, match });
  };

  add('onlcblocks-row', 'Ligne de grille', KindIcons.row, 200,
    (target, element) => target.dom.hasClass(element, Options.getRowClass(target)));

  add('onlcblocks-column', 'Colonne', KindIcons.column, 205,
    (_target, element) => Columns.isColumnElement(element));

  add('onlcblocks-heading', 'Titre', KindIcons.heading, 210,
    (_target, element) => BlockKinds.isTag(element, [ 'h1', 'h2', 'h3', 'h4', 'h5', 'h6' ]));

  add('onlcblocks-list', 'Liste', KindIcons.list, 215,
    (_target, element) => BlockKinds.isTag(element, [ 'ul', 'ol', 'dl' ]));

  add('onlcblocks-table', 'Tableau', KindIcons.table, 220,
    (_target, element) => BlockKinds.isTag(element, [ 'table' ]));

  add('onlcblocks-quote', 'Citation', KindIcons.quote, 225,
    (_target, element) => BlockKinds.isTag(element, [ 'blockquote' ]));

  // Une figure ou un paragraphe qui ne contient qu'une image est, pour le rédacteur, une image.
  add('onlcblocks-image', 'Image', KindIcons.image, 230,
    (target, element) => BlockKinds.isTag(element, [ 'figure' ])
      || (target.dom.select('img', element).length === 1 && element.textContent?.trim() === ''));

  add('onlcblocks-paragraph', 'Paragraphe', KindIcons.paragraph, 240,
    (_target, element) => BlockKinds.isTag(element, [ 'p' ]));

  // Le repli : tout le reste est un bloc d'enrobage. Sans cette entrée, une section écrite à la
  // main n'aurait aucun repère, alors que c'est justement le bloc qu'on déplace le plus.
  add('onlcblocks-section', 'Bloc', KindIcons.section, 900, Fun.always);
};

export {
  declare
};
