import { describe, it } from '@ephox/bedrock-client';
import { Arr } from '@ephox/katamari';
import { TinyAssertions, TinyHooks } from '@ephox/wrap-mcagar';
import { assert } from 'chai';

import Editor from 'hugerte/core/api/Editor';
import BlocksPlugin from 'hugerte/plugins/onlcblocks/Plugin';
import MultilangPlugin from 'hugerte/plugins/onlcmultilang/Plugin';

/**
 * La langue d'un bloc, réglée depuis la barre d'outils du bloc.
 *
 * C'est le chemin principal : on survole un bloc, sa barre apparaît, et la langue s'y règle comme
 * le déplacement ou la suppression. Aucune sélection n'entre en jeu — ce qui règle du même coup
 * le cas des blocs de média, qu'un clic ne parvient pas toujours à sélectionner.
 *
 * Les deux plugins ne dépendent pas l'un de l'autre : le bouton n'apparaît que si le plugin
 * polyglotte est chargé, et la barre reste identique sans lui.
 */
describe('browser.hugerte.plugins.onlcblocks.BlockLanguageTest', () => {
  const hook = TinyHooks.bddSetupLight<Editor>({
    plugins: 'onlcblocks onlcmultilang',
    onlc_multilang_languages: [ 'fr', 'en', 'nl' ],
    base_url: '/project/hugerte/js/hugerte'
  }, [ BlocksPlugin, MultilangPlugin ], true);

  interface LanguageApi {
    readonly markElement: (element: HTMLElement, code: string) => void;
    readonly unmarkElement: (element: HTMLElement) => void;
    readonly codeOfElement: (element: HTMLElement) => string;
  }

  const languages = (editor: Editor): LanguageApi => editor.plugins.onlcmultilang as unknown as LanguageApi;

  const first = (editor: Editor, selector: string): HTMLElement => editor.dom.select<HTMLElement>(selector)[0];

  it('pose la langue sur le bloc désigné, pas sur celui du curseur', () => {
    // Le bug d'origine : cliquer dans la barre fait passer l'éditeur par un `NodeChange` porteur
    // du bloc du curseur, et la langue partait sur ce bloc-là.
    const editor = hook.editor();
    editor.setContent('<p>Premier</p><p>Second</p>');

    languages(editor).markElement(editor.dom.select<HTMLElement>('p')[1], 'nl');

    const out = editor.getContent().replace(/\n/g, '');
    assert.equal(out, '<p>Premier</p><multilang lang="nl"><p>Second</p></multilang>');
  });

  it('marque un bloc de média entier', () => {
    const editor = hook.editor();
    editor.setContent('<p>Avant</p><div class="onlc-widget" data-onlc-widget="separator"><hr></div>');

    languages(editor).markElement(first(editor, '[data-onlc-widget]'), 'fr');

    assert.lengthOf(editor.dom.select('[data-onlc-lang] > [data-onlc-widget]'), 1);
    assert.include(editor.getContent(), '<multilang lang="fr">');
  });

  it('relit la langue posée sur un bloc', () => {
    const editor = hook.editor();
    editor.setContent('<p>Un</p>');

    assert.equal(languages(editor).codeOfElement(first(editor, 'p')), '');
    languages(editor).markElement(first(editor, 'p'), 'en');
    assert.equal(languages(editor).codeOfElement(first(editor, 'p')), 'en');
  });

  it('change la langue au lieu d’imbriquer une seconde section', () => {
    const editor = hook.editor();
    editor.setContent('<p>Un</p>');

    languages(editor).markElement(first(editor, 'p'), 'en');
    languages(editor).markElement(first(editor, 'p'), 'nl');

    assert.lengthOf(editor.dom.select('[data-onlc-lang]'), 1);
    assert.include(editor.getContent(), '<multilang lang="nl">');
  });

  it('retire le marquage sans toucher au bloc', () => {
    const editor = hook.editor();
    editor.setContent('<p>Un</p>');

    languages(editor).markElement(first(editor, 'p'), 'en');
    languages(editor).unmarkElement(first(editor, 'p'));

    TinyAssertions.assertContent(editor, '<p>Un</p>');
    assert.lengthOf(editor.dom.select('[data-onlc-lang]'), 0);
  });

  it('ajoute le bouton de langue à la barre des blocs', () => {
    const editor = hook.editor();
    editor.setContent('<p>Un</p>');
    editor.dispatch('mouseover', { target: first(editor, 'p') } as unknown as MouseEvent);

    assert.lengthOf(editor.dom.select('.onlc-blocks-toolbar'), 1, 'la barre des blocs doit exister');
    assert.lengthOf(editor.dom.select('.onlc-blocks-btn[data-onlc-action="lang"]'), 1);
  });

  it('donne aux boutons de la barre une cible de 50 pixels', () => {
    const editor = hook.editor();
    editor.setContent('<p>Un</p>');
    editor.dispatch('mouseover', { target: first(editor, 'p') } as unknown as MouseEvent);

    const buttons = editor.dom.select<HTMLElement>('.onlc-blocks-btn');
    assert.isAbove(buttons.length, 0);
    Arr.each(buttons, (button) => {
      const rect = button.getBoundingClientRect();
      assert.isAtLeast(Math.round(rect.width), 50, 'largeur du bouton ' + button.getAttribute('data-onlc-action'));
      assert.isAtLeast(Math.round(rect.height), 50, 'hauteur du bouton ' + button.getAttribute('data-onlc-action'));
    });
  });
});
