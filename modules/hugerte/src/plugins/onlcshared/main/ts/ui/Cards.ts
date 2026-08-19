import { Obj, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

/**
 * Les collections de HugeRTE n'affichent qu'une icône et un libellé court. La bibliothèque de
 * blocs a besoin de plus : un nom, une phrase d'explication et une icône lisible. Le contenu de
 * la vignette accepte du html : on y place donc une carte complète, et une feuille de style
 * injectée dans l'interface lui donne sa mise en page.
 *
 * Les règles sont préfixées par `.tox` : le thème applique un reset très large
 * (`.tox :not(svg):not(rect)`) qui gagnerait sinon par spécificité.
 */

const escape = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const styleId = 'onlc-cards-styles';

const styles =
  '.tox .tox-collection__item:has(.onlc-card) { flex: 1 1 260px; align-items: stretch; padding: 0; border-radius: 6px; }' +
  '.tox .tox-collection__item-icon:has(.onlc-card) { width: 100%; height: auto; justify-content: flex-start; }' +
  // Le thème limite une grille de collection à 208 px de haut : beaucoup trop court pour une
  // liste de blocs décrits par une carte. La liste s'étire, et c'est le corps du dialogue -
  // qui défile déjà - qui gère le dépassement, sans jamais rogner les boutons du bas.
  '.tox .tox-collection--grid .tox-collection__group:has(.onlc-card) { display: flex; flex-wrap: wrap; max-height: none; gap: 8px; padding: 4px; }' +
  '.tox .onlc-card { display: flex; width: 100%; padding: 10px 12px; gap: 12px; align-items: flex-start; text-align: left; }' +
  '.tox .onlc-card__icon { display: flex; flex: 0 0 auto; width: 34px; height: 34px; align-items: center; justify-content: center; color: #006ce7; background: rgba(0, 108, 231, 0.1); border-radius: 6px; }' +
  '.tox .onlc-card__icon svg { width: 20px; height: 20px; fill: currentColor; }' +
  // Un dessin au trait déclare `fill="none"` : sans cette règle, la couleur de remplissage
  // imposée juste au-dessus le transformerait en aplat.
  '.tox .onlc-card__icon svg[fill="none"] { fill: none; }' +
  // Le thème pose l'intitulé d'un groupe à gauche de son contenu : sur une grille de cartes,
  // cela ampute la première colonne. L'intitulé repasse au-dessus.
  '.tox .tox-form__group--collection { flex-direction: column; align-items: stretch; }' +
  '.tox .onlc-card__icon--wide { width: auto; min-width: 34px; padding: 4px 6px; background: transparent; }' +
  '.tox .onlc-card__icon--wide svg { width: auto; height: 26px; fill: none; }' +
  '.tox .onlc-card__body { display: block; min-width: 0; }' +
  '.tox .onlc-card__title { display: block; font-size: 14px; font-weight: 600; line-height: 1.3; }' +
  '.tox .onlc-card__description { display: block; margin-top: 2px; font-size: 12px; line-height: 1.35; color: #5a6570; white-space: normal; }';

const ensureStyles = (editor: Editor): void => {
  const container = editor.getContainer();
  const doc = Type.isNonNullable(container) ? container.ownerDocument : document;

  if (doc.getElementById(styleId) === null) {
    const style = doc.createElement('style');
    style.id = styleId;
    style.textContent = styles;
    doc.head.appendChild(style);
  }
};

/**
 * Icône de la carte : un nom d'icône enregistrée, du svg déjà prêt, ou à défaut la première
 * lettre du libellé.
 */
const iconMarkup = (editor: Editor, name: string, label: string): string => {
  if (name.indexOf('<svg') === 0) {
    return name;
  }
  const icons = editor.ui.registry.getAll().icons;
  if (Obj.has(icons, name)) {
    return icons[name];
  }
  return `<span aria-hidden="true">${escape(label.charAt(0).toUpperCase())}</span>`;
};

/**
 * Carte utilisée comme « icône » d'un élément de collection : nom du bloc et phrase qui
 * explique à quoi il sert.
 */
const render = (editor: Editor, spec: { icon: string; label: string; description: string; wide?: boolean }): string =>
  '<span class="onlc-card">' +
  `<span class="onlc-card__icon${spec.wide === true ? ' onlc-card__icon--wide' : ''}">${iconMarkup(editor, spec.icon, spec.label)}</span>` +
  '<span class="onlc-card__body">' +
  `<span class="onlc-card__title">${escape(spec.label)}</span>` +
  (spec.description === '' ? '' : `<span class="onlc-card__description">${escape(spec.description)}</span>`) +
  '</span></span>';

export {
  ensureStyles,
  iconMarkup,
  render
};
