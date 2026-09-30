import { UiFinder } from '@ephox/agar';
import { describe, it } from '@ephox/bedrock-client';
import { Arr } from '@ephox/katamari';
import { SugarBody } from '@ephox/sugar';
import { TinyHooks, TinyUiActions } from '@ephox/wrap-mcagar';
import { assert } from 'chai';

import Editor from 'hugerte/core/api/Editor';
import Plugin from 'hugerte/plugins/onlcwidgets/Plugin';

/**
 * Habillage des dialogues : onglets, bouton de fermeture, cibles tactiles.
 *
 * Ces règles corrigent le thème plutôt que de le remplacer, ce qui les rend fragiles : une
 * montée de version d'Oxide peut changer une spécificité et tout défaire en silence. Les tests
 * mesurent donc le rendu réel — largeur des onglets, centrage de la croix, hauteur des boutons —
 * et non la présence des règles.
 */
describe('browser.hugerte.plugins.onlcshared.DialogStylesTest', () => {
  const hook = TinyHooks.bddSetupLight<Editor>({
    plugins: 'onlcwidgets',
    toolbar: 'onlcwidget',
    // Ces épreuves portent sur la formulation **française** des intitulés. L'option « language »
    // vaut « en » par défaut, et l'éditeur charge alors le paquet anglais : il faut donc demander
    // le français pour que les clés s'affichent telles qu'elles sont écrites dans le code.
    language: 'fr',
    base_url: '/project/hugerte/js/hugerte'
  }, [ Plugin ], true);

  const pOpenLibrary = async (editor: Editor): Promise<void> => {
    editor.execCommand('OnlcWidgetLibrary');
    await TinyUiActions.pWaitForDialog(editor);
  };

  it('les onglets ont tous la même largeur et un vrai retrait', async () => {
    const editor = hook.editor();
    await pOpenLibrary(editor);

    const tabs = UiFinder.findAllIn<HTMLElement>(SugarBody.body(), '.tox-dialog__body-nav-item');
    assert.isAbove(tabs.length, 1);

    const widths = Arr.map(tabs, (tab) => Math.round(tab.dom.getBoundingClientRect().width));
    const first = widths[0];
    Arr.each(widths, (width, index) => {
      // Le thème laissait chaque onglet à la largeur de son texte : une colonne dépareillée.
      assert.equal(width, first, `l’onglet ${index} n’a pas la largeur des autres`);
    });

    const padding = window.getComputedStyle(tabs[0].dom).paddingLeft;
    assert.notEqual(padding, '0px', 'un onglet sans retrait se lit comme du texte nu');

    editor.windowManager.close();
  });

  it('l’onglet actif est rempli, pas seulement souligné', async () => {
    const editor = hook.editor();
    await pOpenLibrary(editor);

    const active = UiFinder.findIn<HTMLElement>(SugarBody.body(), '.tox-dialog__body-nav-item--active').getOrDie();
    const style = window.getComputedStyle(active.dom);

    assert.notEqual(style.backgroundColor, 'rgba(0, 0, 0, 0)', 'l’onglet actif doit être rempli');
    assert.equal(style.borderBottomWidth, '0px', 'le soulignement n’a pas de sens dans une liste verticale');

    editor.windowManager.close();
  });

  it('la croix de fermeture est centrée dans sa cible tactile', async () => {
    const editor = hook.editor();
    await pOpenLibrary(editor);

    const close = UiFinder.findIn<HTMLElement>(SugarBody.body(), '.tox-dialog__header .tox-button--icon').getOrDie();
    const icon = close.dom.querySelector('svg');
    assert.isNotNull(icon, 'la croix doit être là');

    const box = close.dom.getBoundingClientRect();
    const glyph = (icon as SVGSVGElement).getBoundingClientRect();

    // Portée à 50 px pour le doigt, la boîte laissait la croix en haut à gauche.
    assert.closeTo(glyph.left + glyph.width / 2, box.left + box.width / 2, 1, 'croix décentrée horizontalement');
    assert.closeTo(glyph.top + glyph.height / 2, box.top + box.height / 2, 1, 'croix décentrée verticalement');

    editor.windowManager.close();
  });

  it('les boutons de pied restent confortables au doigt', async () => {
    const editor = hook.editor();
    await pOpenLibrary(editor);

    const buttons = UiFinder.findAllIn<HTMLElement>(SugarBody.body(), '.tox-dialog__footer button');
    assert.isAbove(buttons.length, 0);
    Arr.each(buttons, (button) => {
      const rect = button.dom.getBoundingClientRect();
      assert.isAtLeast(Math.round(rect.height), 50, `« ${button.dom.textContent} » est trop bas`);
      assert.isAtLeast(Math.round(rect.width), 50, `« ${button.dom.textContent} » est trop étroit`);
    });

    editor.windowManager.close();
  });

  it('le pied du dialogue reste dans le cadre, quelle que soit la hauteur du formulaire', async () => {
    const editor = hook.editor();
    await pOpenLibrary(editor);

    const dialog = UiFinder.findIn<HTMLElement>(SugarBody.body(), '.tox-dialog').getOrDie();
    const footer = UiFinder.findIn<HTMLElement>(SugarBody.body(), '.tox-dialog__footer').getOrDie();

    const dialogBox = dialog.dom.getBoundingClientRect();
    const footerBox = footer.dom.getBoundingClientRect();

    // Sans `min-height: 0` sur la chaîne des conteneurs, un formulaire haut poussait le pied —
    // et ses boutons de validation — hors du cadre, où `overflow: hidden` le coupait.
    assert.isAtMost(Math.round(footerBox.bottom), Math.round(dialogBox.bottom) + 1);

    editor.windowManager.close();
  });

  it('l’intitulé d’un champ n’apparaît qu’une fois', async () => {
    const editor = hook.editor();
    editor.execCommand('OnlcInsertWidget', false, 'calendar');
    await TinyUiActions.pWaitForDialog(editor);

    const labels = Arr.map(
      UiFinder.findAllIn<HTMLElement>(SugarBody.body(), '.tox-label'),
      (label) => label.dom.textContent);

    // Un composant enveloppé dans un intitulé de groupe gardait aussi le sien.
    const mois = Arr.filter(labels, (label) => label === 'Mois affiché');
    assert.lengthOf(mois, 1, 'l’intitulé du mois est répété');

    editor.windowManager.close();
  });
});
