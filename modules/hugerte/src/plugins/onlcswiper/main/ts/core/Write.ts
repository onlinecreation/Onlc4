import { Arr, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

import * as Detect from './Detect';
import * as JsObject from './JsObject';
import * as Settings from './Settings';

/**
 * Réécriture des réglages **dans le script de la page**.
 *
 * C'est le point délicat du plugin. Les réglages d'un diaporama vivent au milieu d'un script écrit
 * par quelqu'un d'autre — souvent une centaine de lignes qui font aussi tout autre chose. Il n'est
 * donc pas question de régénérer le script : on remplace **exactement** l'intervalle occupé par le
 * littéral objet, celui que la lecture a délimité, et pas un caractère de plus.
 *
 * ```js
 * swiper = new Swiper(".mySwiper", {   <- début
 *   spaceBetween: 30,
 *   autoplay: { delay: 2500 }
 * });                                  <- fin
 * ```
 *
 * L'indentation du nouvel objet reprend celle de la ligne où l'appel commence : sans cela, une
 * configuration réécrite se retrouverait collée à gauche au milieu d'un script indenté, et le
 * prochain qui l'ouvrirait croirait à une erreur.
 */

/** L'indentation de la ligne où commence l'objet, pour réécrire au même niveau. */
const indentAt = (code: string, index: number): string => {
  const lineStart = code.lastIndexOf('\n', index) + 1;
  const match = /^[ \t]*/.exec(code.substring(lineStart, index));
  return match === null ? '' : match[0];
};

/** Réindente un littéral écrit à plat pour qu'il s'insère dans un script indenté. */
const reindent = (text: string, indent: string): string =>
  indent === '' ? text : text.split('\n').join(`\n${indent}`);

/**
 * Remplace le littéral de réglages dans le code, et rend le nouveau code.
 *
 * Rend `null` quand l'intervalle n'est plus celui qu'on croit — le script a changé entre la
 * lecture et l'écriture. Mieux vaut ne rien écrire que réécrire au mauvais endroit.
 */
const replaceSettings = (code: string, start: number, end: number, config: JsObject.JsObjectValue): string | null => {
  if (start < 0 || end > code.length || start >= end || code[start] !== '{') {
    return null;
  }
  const written = reindent(JsObject.write(config), indentAt(code, start));
  return code.substring(0, start) + written + code.substring(end);
};

/**
 * Applique les réglages du formulaire au script qui configure ce diaporama.
 *
 * L'appel est **relocalisé** au moment de l'écriture plutôt que réutilisé tel qu'il avait été lu :
 * le rédacteur a pu modifier le script entre l'ouverture du formulaire et sa validation, et les
 * positions relevées à l'ouverture ne désigneraient plus rien de juste.
 */
const applySettings = (
  editor: Editor,
  swiper: Detect.Swiper,
  original: JsObject.JsObjectValue,
  settings: Settings.Settings
): boolean =>
  swiper.script.exists((script) => {
    const code = Detect.codeOf(editor, script);
    return Arr.find(Detect.callsIn(code), (candidate) =>
      Detect.matches(editor, swiper.container, candidate.selector)
    ).exists((found) => {
      const updated = replaceSettings(code, found.start, found.end, Settings.toConfig(original, settings));
      return Type.isNonNullable(updated) && Detect.setCode(editor, script, updated);
    });
  });

/**
 * Un sélecteur qui désigne ce diaporama et lui seul.
 *
 * L'identifiant d'abord, s'il en a un : c'est ce qu'il y a de plus sûr. Sinon la première classe
 * qui n'est ni `swiper` ni une classe de l'éditeur — c'est ainsi que les pages réelles les nomment
 * (`mySwiper`, `images-show`). En dernier recours, un identifiant est **posé** sur le conteneur :
 * il faut bien pouvoir le désigner.
 */
const selectorFor = (editor: Editor, container: HTMLElement): string => {
  const id = editor.dom.getAttrib(container, 'id');
  if (id !== '') {
    return `#${id}`;
  }

  return Arr.find(container.className.split(/\s+/), (name) =>
    name !== '' && name !== 'swiper' && name.indexOf('mce-') !== 0 && name.indexOf('onlc-') !== 0
  ).fold(
    () => {
      const created = `onlc-swiper-${Math.random().toString(36).substring(2, 8)}`;
      editor.dom.setAttrib(container, 'id', created);
      return `#${created}`;
    },
    (name) => `.${name}`
  );
};

/** Le code d'un appel neuf. */
const newCallCode = (selector: string, config: JsObject.JsObjectValue): string =>
  `new Swiper(${JsObject.quote(selector)}, ${JsObject.write(config)});`;

/**
 * Les réglages de départ d'un diaporama qui n'en avait pas.
 *
 * Ils ne sont pas vides : les commandes déjà présentes dans le html — flèches, points, barre —
 * sont activées. C'est ce que quelqu'un qui a écrit ce html attendait, et découvrir un diaporama
 * inerte alors que ses flèches sont dessinées n'apprend rien à personne.
 */
const startingConfig = (editor: Editor, container: HTMLElement): JsObject.JsObjectValue => {
  const config: Record<string, JsObject.JsValue> = {};

  if (editor.dom.select('.swiper-button-next, .swiper-button-prev', container).length > 0) {
    config.navigation = { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' };
  }
  if (editor.dom.select('.swiper-pagination', container).length > 0) {
    config.pagination = { el: '.swiper-pagination', clickable: true };
  }
  if (editor.dom.select('.swiper-scrollbar', container).length > 0) {
    config.scrollbar = { el: '.swiper-scrollbar', draggable: true };
  }

  return config;
};

/**
 * Ajoute une configuration à un diaporama qui n'en a pas.
 *
 * Le script est posé **à la fin de la page**, comme le sont les scripts d'initialisation : la
 * bibliothèque et le html du diaporama doivent tous deux exister quand il s'exécute.
 *
 * Il passe par la commande de `onlcwidgets` quand elle est là : c'est ce plugin qui sait poser un
 * jeton plutôt qu'un élément exécutable. Sans lui, rien n'est écrit et la fonction rend `false` —
 * un `<script>` posé directement dans la zone d'écriture serait supprimé par le nettoyeur du cœur,
 * et le rédacteur croirait avoir réglé quelque chose.
 */
const addConfiguration = (editor: Editor, swiper: Detect.Swiper): boolean => {
  if (!editor.hasPlugin('onlcwidgets')) {
    return false;
  }

  const code = newCallCode(selectorFor(editor, swiper.container), startingConfig(editor, swiper.container));

  editor.undoManager.transact(() => {
    editor.selection.select(swiper.container);
    editor.selection.collapse(false);
    editor.execCommand('OnlcInsertScript', false, { code, position: 'body-end' });
  });
  editor.nodeChanged();
  return true;
};

export {
  indentAt,
  reindent,
  replaceSettings,
  applySettings,
  selectorFor,
  newCallCode,
  startingConfig,
  addConfiguration
};
