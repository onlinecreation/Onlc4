import { describe, it } from '@ephox/bedrock-client';
import { TinyHooks } from '@ephox/wrap-mcagar';
import { assert } from 'chai';

import Editor from 'hugerte/core/api/Editor';
import WidgetsPlugin from 'hugerte/plugins/onlcwidgets/Plugin';

/**
 * Les décorations de l'éditeur ne débordent pas de la page.
 *
 * Un jeton de script ou de code court est large de 100 % **plus** son retrait et son filet. Dans
 * un document dont la feuille de style ne pose pas de règle globale `border-box` — c'est-à-dire
 * la plupart — il dépassait donc de vingt-six pixels, et la zone d'écriture montrait une barre de
 * défilement horizontale dès que la fenêtre se resserrait.
 *
 * Le contenu de la page décide de son propre `box-sizing` ; les décorations décident du leur.
 * C'est ce que cette épreuve vérifie, sur le rendu réel et non sur le texte de la feuille.
 */
describe('browser.hugerte.plugins.onlcwidgets.DecorationWidthTest', () => {
  const hook = TinyHooks.bddSetupLight<Editor>({
    plugins: 'onlcwidgets',
    base_url: '/project/hugerte/js/hugerte'
  }, [ WidgetsPlugin ], true);

  const sizingOf = (editor: Editor, selector: string): string => {
    const element = editor.dom.select<HTMLElement>(selector, editor.getBody())[0];
    assert.isNotNull(element, `${selector} est absent de la zone d’écriture`);
    return editor.dom.getStyle(element, 'box-sizing', true);
  };

  it('le jeton d’un script compte son retrait dans sa largeur', () => {
    const editor = hook.editor();
    editor.setContent('<p>avant</p><script>var a = 1;<\/script>');
    assert.equal(sizingOf(editor, '.onlc-script'), 'border-box');
  });

  it('et son contenu aussi', () => {
    const editor = hook.editor();
    editor.setContent('<p>avant</p><script>var a = 1;<\/script>');
    assert.equal(sizingOf(editor, '.onlc-script__code'), 'border-box');
  });

  /**
   * Le jeton ne dépasse jamais la largeur utile du document, quelle que soit la longueur du code
   * qu'il montre : c'est la conséquence attendue, et c'est elle qu'on mesure.
   */
  it('reste dans la largeur du document, même avec une longue ligne', () => {
    const editor = hook.editor();
    const longue = 'var tres_longue_ligne = "' + 'x'.repeat(400) + '";';
    editor.setContent(`<p>avant</p><script>${longue}<\/script>`);

    const doc = editor.getDoc();
    assert.isAtMost(doc.documentElement.scrollWidth, doc.documentElement.clientWidth + 1,
      'la page ne déborde pas sur sa droite');
  });
});
