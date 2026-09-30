import Editor from 'hugerte/core/api/Editor';

import * as Detect from '../core/Detect';
import * as SwiperDialog from '../ui/SwiperDialog';

/**
 * Commandes des diaporamas.
 *
 * `OnlcSwiper` ouvre le formulaire du diaporama où se trouve le curseur. Sans diaporama sous le
 * curseur, elle ne fait rien plutôt que d'en créer un : un diaporama Swiper suppose que la
 * bibliothèque soit chargée par le gabarit du site, ce que l'éditeur ne peut ni vérifier ni
 * décider.
 */

const register = (editor: Editor): void => {
  editor.addCommand('OnlcSwiper', () => {
    Detect.at(editor, editor.selection.getNode()).each((swiper) => SwiperDialog.open(editor, swiper));
  });
};

export {
  register
};
