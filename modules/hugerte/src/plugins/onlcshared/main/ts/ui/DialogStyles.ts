import { Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

/**
 * Confort tactile des dialogues ONLC.
 *
 * Les commandes du thème sont dessinées pour la souris : un bouton d'action fait environ trente
 * pixels de haut, une vignette de collection vingt-quatre. Au doigt, on vise à côté. Ces règles
 * portent chaque cible cliquable à **50 × 50 pixels au minimum**, taille en dessous de laquelle
 * l'erreur de pointage devient fréquente sur un téléphone.
 *
 * Elles sont limitées aux dialogues (`.tox-dialog`) : la barre d'outils de l'éditeur garde sa
 * densité, qui reste utile sur un grand écran.
 *
 * Le préfixe `.tox` est nécessaire pour passer devant le reset très large du thème
 * (`.tox :not(svg):not(rect)`), qui gagnerait sinon par spécificité.
 */

const styleId = 'onlc-dialog-touch-styles';

const minimum = 50;

const styles =
  // L'en-tête et le pied ne doivent jamais rétrécir : le dialogue a une hauteur fixe, et des
  // boutons plus hauts feraient sinon déborder — puis rogner — la rangée de validation.
  '.tox .tox-dialog__header, .tox .tox-dialog__footer { flex-shrink: 0; }' +
  // Un conteneur flexible refuse par défaut de descendre sous la hauteur de son contenu
  // (`min-height: auto`). Sur un formulaire haut — une carte, un éditeur de code — la chaîne
  // contenu → corps → formulaire pousse alors le pied de dialogue hors du cadre. Chaque maillon
  // reçoit donc `min-height: 0`, et c'est le corps, qui défile déjà, qui absorbe le dépassement.
  '.tox .tox-dialog__content-js, .tox .tox-dialog .tox-form { min-height: 0; }' +
  `.tox .tox-dialog .tox-button { min-height: ${minimum}px; padding-top: 0; padding-bottom: 0; }` +
  `.tox .tox-dialog .tox-button--icon, .tox .tox-dialog .tox-button[data-mce-name] { min-width: ${minimum}px; }` +
  `.tox .tox-dialog__footer .tox-button { min-width: ${minimum}px; min-height: ${minimum}px; padding: 0 20px; }` +
  `.tox .tox-dialog .tox-browse-url { min-width: ${minimum}px; min-height: ${minimum}px; }` +
  `.tox .tox-dialog .tox-collection__item { min-height: ${minimum}px; }` +
  // Les champs ne sont pas des boutons, mais viser un champ de trente pixels au doigt est tout
  // aussi pénible : ils suivent la même règle, en un peu plus bas.
  '.tox .tox-dialog .tox-textfield, .tox .tox-dialog .tox-listbox, .tox .tox-dialog .tox-listboxfield > .tox-listbox--select { min-height: 44px; }' +
  '.tox .tox-dialog .tox-checkbox__icons { min-width: 44px; min-height: 44px; }' +
  '.tox .tox-dialog .tox-tab { min-height: 44px; }' +
  // Les composants qui dessinent eux-mêmes leur interface occupent toute la largeur offerte.
  '.tox .tox-dialog .tox-custom-editor { width: 100%; }' +
  // Explication d'un champ, affichée juste sous lui.
  '.tox .tox-dialog .onlc-field-help, .tox .tox-dialog .onlc-shortcode-help { margin: -4px 0 4px; font-size: 12px; line-height: 1.4; color: #5a6570; }' +
  '.tox .tox-dialog .onlc-shortcode-intro { margin: 0 0 8px; font-size: 13px; line-height: 1.45; color: #22303c; }';

/**
 * Injecte la feuille dans le document de l'interface, une seule fois par page. Appelée par
 * chaque plugin ONLC à son initialisation.
 */
const ensure = (editor: Editor): void => {
  const container = editor.getContainer();
  const doc = Type.isNonNullable(container) ? container.ownerDocument : document;

  if (doc.getElementById(styleId) === null) {
    const style = doc.createElement('style');
    style.id = styleId;
    style.textContent = styles;
    doc.head.appendChild(style);
  }
};

/** Branche l'injection sur l'initialisation de l'éditeur, quand le conteneur existe. */
const setup = (editor: Editor): void => {
  editor.on('init', () => ensure(editor));
};

export {
  minimum,
  styles,
  ensure,
  setup
};
