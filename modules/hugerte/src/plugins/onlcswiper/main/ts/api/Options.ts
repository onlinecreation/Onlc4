import { Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

const register = (editor: Editor): void => {
  const registerOption = editor.options.register;

  /**
   * Habiller la zone d'écriture pour que les diaporamas y soient lisibles.
   *
   * Swiper ne s'exécute pas dans l'éditeur — aucun script du contenu ne s'y exécute. Sans cette
   * feuille, les vues s'empilent verticalement sur toute la hauteur de la page : un diaporama de
   * huit photos occupe alors huit écrans, et le reste du contenu devient inatteignable.
   *
   * À mettre à `false` pour un projet dont la feuille de site prévoit déjà un rendu de repli.
   */
  registerOption('onlc_swiper_inject_styles', {
    processor: 'boolean',
    default: true
  });

  /**
   * Hauteur des vues dans la zone d'écriture.
   *
   * Elle n'a rien à voir avec celle du site : sur le site, c'est le contenu ou la feuille du
   * design qui décide. Ici, il s'agit seulement de montrer une bande lisible sans écraser la page.
   */
  registerOption('onlc_swiper_edit_height', {
    processor: 'string',
    default: '220px'
  });
};

const shouldInjectStyles = (editor: Editor): boolean =>
  editor.options.get('onlc_swiper_inject_styles') !== false;

const getEditHeight = (editor: Editor): string => {
  const value = editor.options.get('onlc_swiper_edit_height');
  return Type.isString(value) && value.trim() !== '' ? value.trim() : '220px';
};

export {
  register,
  shouldInjectStyles,
  getEditHeight
};
