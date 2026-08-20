import { describe, it } from '@ephox/bedrock-client';
import { TinyApis, TinyAssertions, TinyHooks } from '@ephox/wrap-mcagar';
import { assert } from 'chai';

import Editor from 'hugerte/core/api/Editor';
import * as Dom from 'hugerte/plugins/onlcmultilang/core/Dom';
import Plugin from 'hugerte/plugins/onlcmultilang/Plugin';

/**
 * Ce que le marquage englobe.
 *
 * Une seule règle : du texte sélectionné dans un seul bloc reçoit un marquage **en ligne**, tout
 * le reste reçoit un **bloc englobant**. Ces cas sont ceux qui l'ont mise à l'épreuve — et trois
 * d'entre eux venaient de bugs signalés, pas d'une intention de couverture.
 *
 * Le plus important est celui de la colonne. La première version confiait l'englobage à
 * `editor.formatter` avec un format `wrapper` ; sur un `<div>` déjà présent, le formateur
 * **réécrit l'élément** au lieu de l'entourer, et une colonne Bootstrap marquée dans une langue
 * perdait son `col-sm-6`, c'est-à-dire sa raison d'être.
 */
describe('browser.hugerte.plugins.onlcmultilang.ScopeTest', () => {
  const hook = TinyHooks.bddSetupLight<Editor>({
    plugins: 'onlcmultilang',
    base_url: '/project/hugerte/js/hugerte'
  }, [ Plugin ], true);

  /** Sélectionne une plage de caractères dans le premier nœud texte d'un élément. */
  const selectText = (editor: Editor, element: Element, from: number, to: number): void => {
    const doc = editor.getDoc();
    const range = doc.createRange();
    const text = element.firstChild as Text;
    range.setStart(text, from);
    range.setEnd(text, to);
    editor.selection.setRng(range);
  };

  describe('en ligne', () => {
    it('entoure quelques mots sans couper le paragraphe', () => {
      const editor = hook.editor();
      editor.setContent('<p>Bonjour tout le monde</p>');
      selectText(editor, editor.dom.select('p')[0], 8, 12);
      editor.execCommand('OnlcMarkLanguage', false, 'en');

      TinyAssertions.assertContent(editor, '<p>Bonjour <multilang lang="en">tout</multilang> le monde</p>');
      assert.lengthOf(editor.dom.select(`span${Dom.selector}`), 1);
    });

    it('garde l’enrichissement du texte et ne coupe pas le paragraphe', () => {
      const editor = hook.editor();
      editor.setContent('<p>Bonjour <strong>toi</strong> et vous</p>');
      const paragraph = editor.dom.select('p')[0];
      const range = editor.getDoc().createRange();
      range.setStart(paragraph.firstChild as Text, 8);
      range.setEnd(paragraph.childNodes[1].firstChild as Text, 3);
      editor.selection.setRng(range);
      editor.execCommand('OnlcMarkLanguage', false, 'en');

      const out = editor.getContent();
      assert.lengthOf(editor.dom.select('p'), 1, 'le paragraphe reste entier');
      assert.lengthOf(editor.dom.select('strong'), 1, 'le gras est conservé');
      assert.lengthOf(editor.dom.select(`div${Dom.selector}`), 0, 'aucun bloc englobant');
      assert.include(out, '<multilang lang="en">');
      assert.include(out, 'toi');
      assert.include(out, 'et vous');
    });
  });

  describe('bloc englobant', () => {
    it('prend le paragraphe entier quand rien n’est sélectionné', () => {
      const editor = hook.editor();
      editor.setContent('<p>Un seul</p>');
      TinyApis(editor).setCursor([ 0, 0 ], 3);
      editor.execCommand('OnlcMarkLanguage', false, 'nl');

      assert.equal(editor.getContent().replace(/\n/g, ''), '<multilang lang="nl"><p>Un seul</p></multilang>');
    });

    it('prend les deux paragraphes d’une sélection qui les traverse', () => {
      const editor = hook.editor();
      editor.setContent('<p>Un</p><p>Deux</p><p>Trois</p>');
      const paragraphs = editor.dom.select('p');
      const range = editor.getDoc().createRange();
      range.setStart(paragraphs[0].firstChild as Text, 0);
      range.setEnd(paragraphs[1].firstChild as Text, 4);
      editor.selection.setRng(range);
      editor.execCommand('OnlcMarkLanguage', false, 'fr');

      const out = editor.getContent().replace(/\n/g, '');
      assert.equal(out, '<multilang lang="fr"><p>Un</p><p>Deux</p></multilang><p>Trois</p>');
    });

    it('n’est pas en ligne dès que la sélection contient un élément non modifiable', () => {
      // Une carte de code court est du contenu, pas du texte : l'entourer d'un `span` coupait le
      // marquage en deux morceaux de part et d'autre de la carte.
      const editor = hook.editor();
      editor.setContent('<p>Avant <span class="jeton" contenteditable="false">carte</span> apres</p>');
      const range = editor.getDoc().createRange();
      range.selectNodeContents(editor.dom.select('p')[0]);
      editor.selection.setRng(range);
      editor.execCommand('OnlcMarkLanguage', false, 'fr');

      assert.lengthOf(editor.dom.select(`div${Dom.selector}`), 1);
      assert.lengthOf(editor.dom.select(`span${Dom.selector}`), 0);
    });
  });

  describe('la colonne Bootstrap survit', () => {
    const grid = '<div class="row"><div class="col-sm-6"><p>Gauche</p></div>' +
      '<div class="col-sm-6"><p>Droite</p></div></div>';

    it('marque le paragraphe, pas la colonne', () => {
      const editor = hook.editor();
      editor.setContent(grid);
      TinyApis(editor).setCursor([ 0, 0, 0, 0 ], 2);
      editor.execCommand('OnlcMarkLanguage', false, 'fr');

      assert.lengthOf(editor.dom.select('.col-sm-6'), 2, 'les deux colonnes sont toujours là');
      assert.include(editor.getContent(), 'class="col-sm-6"');
      assert.lengthOf(editor.dom.select('.col-sm-6 [data-onlc-lang]'), 1);
    });

    it('entoure le contenu de la colonne quand c’est la colonne qui est désignée', () => {
      // Entourer la colonne elle-même casserait la grille : une ligne veut des colonnes pour
      // enfants directs, pas un `div` de langue entre les deux.
      const editor = hook.editor();
      editor.setContent(grid);
      editor.selection.select(editor.dom.select('.col-sm-6')[0]);
      editor.execCommand('OnlcMarkLanguage', false, 'fr');

      assert.lengthOf(editor.dom.select('.col-sm-6'), 2);
      assert.lengthOf(editor.dom.select('.row > [data-onlc-lang]'), 0, 'rien entre la ligne et ses colonnes');
      assert.lengthOf(editor.dom.select('.col-sm-6 > [data-onlc-lang]'), 1);
    });
  });

  describe('après le marquage', () => {
    it('laisse le curseur dans la section, prêt à la changer', () => {
      const editor = hook.editor();
      editor.setContent('<p>Un seul</p>');
      TinyApis(editor).setCursor([ 0, 0 ], 3);
      editor.execCommand('OnlcMarkLanguage', false, 'nl');
      editor.execCommand('OnlcMarkLanguage', false, 'en');

      assert.lengthOf(editor.dom.select(Dom.selector), 1, 'la seconde langue remplace, elle n’imbrique pas');
      assert.include(editor.getContent(), '<multilang lang="en">');
    });

    it('retire le marquage sans emporter le texte', () => {
      const editor = hook.editor();
      editor.setContent('<p>Un seul</p>');
      TinyApis(editor).setCursor([ 0, 0 ], 3);
      editor.execCommand('OnlcMarkLanguage', false, 'nl');
      editor.execCommand('OnlcUnmarkLanguage');

      TinyAssertions.assertContent(editor, '<p>Un seul</p>');
    });
  });
});
