import { Arr } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import * as PublishedCss from 'hugerte/plugins/onlcshared/PublishedCss';

import * as Options from '../api/Options';

/**
 * Chargement des polices d'icônes.
 *
 * Les deux familles sont **embarquées dans le plugin** : elles ne dépendent d'aucun service
 * extérieur, restent disponibles hors ligne et derrière un pare-feu, et surtout s'affichent
 * dès la première ouverture. Une police servie par un tiers arrivait parfois trop tard — ou
 * jamais — et le sélecteur d'icônes ne montrait alors que des carrés vides.
 *
 * Elles sont chargées dans deux documents :
 *
 * - celui de l'**interface** (`editor.ui.styleSheetLoader`), pour la grille du sélecteur ;
 * - celui du **contenu** (`editor.dom.styleSheetLoader`), pour la page en cours d'écriture.
 *
 * Le chargement a lieu après `init` : une feuille lente ne retarde jamais l'ouverture de
 * l'éditeur. Le site qui publie les pages doit inclure les mêmes feuilles.
 */

const stylesheetsOf = (editor: Editor, pluginUrl: string): string[] => {
  const families = Options.getFamilies(editor);
  const sheets: string[] = [];

  if (Arr.contains(families, 'material')) {
    sheets.push(`${pluginUrl}/css/material-icons.css`);
  }
  if (Arr.contains(families, 'fontawesome')) {
    sheets.push(`${pluginUrl}/css/fontawesome.css`);
  }

  // Feuille de styles des emojis et des icônes insérés dans la page.
  sheets.push(`${pluginUrl}/css/onlcicons.css`);

  const extra = Options.getStylesheetUrl(editor);
  if (extra !== '') {
    sheets.push(extra);
  }

  return sheets;
};

const load = (editor: Editor, pluginUrl: string): void => {
  const sheets = stylesheetsOf(editor, pluginUrl);

  // Ces feuilles décrivent ce qui est **inséré dans la page** : le dessin d'une icône, et la
  // taille d'un emoji. Sans elles, un emoji reprend la taille naturelle de son image — plusieurs
  // fois celle du texte — et les icônes ne sont que des carrés vides. L'aperçu visiteur et le
  // html rendu les reprennent donc, comme le fera le site.
  PublishedCss.declareSheets(editor, sheets);

  const warn = (url: string) => () => {
    // eslint-disable-next-line no-console
    console.warn(`[onlc] Impossible de charger la feuille de styles des icônes : ${url}`);
  };

  editor.on('init', () => {
    Arr.each(sheets, (url) => {
      editor.dom.styleSheetLoader.load(url).catch(warn(url));
      editor.ui.styleSheetLoader.load(url).catch(warn(url));
    });
  });
};

export {
  stylesheetsOf,
  load
};
