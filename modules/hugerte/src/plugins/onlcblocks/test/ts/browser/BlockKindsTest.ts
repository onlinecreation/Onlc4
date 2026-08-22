import { describe, it } from '@ephox/bedrock-client';
import { Fun } from '@ephox/katamari';
import { TinyHooks } from '@ephox/wrap-mcagar';
import { assert } from 'chai';

import Editor from 'hugerte/core/api/Editor';
import BlocksPlugin from 'hugerte/plugins/onlcblocks/Plugin';
import * as BlockKinds from 'hugerte/plugins/onlcshared/BlockKinds';
import * as KindIcons from 'hugerte/plugins/onlcshared/ui/KindIcons';

/**
 * Le **type** d'un bloc, celui qu'on lit dans l'angle de son contour.
 *
 * Une page de travail montre une vingtaine de rectangles pointillés qui se ressemblent tous.
 * Savoir lequel est un diaporama et lequel une ligne de grille demandait de cliquer dessus.
 *
 * Deux choses sont vérifiées ici : que les types du html ordinaire sont reconnus, et qu'un plugin
 * déclarant un type plus précis passe devant — c'est tout l'intérêt du rang.
 */
describe('browser.hugerte.plugins.onlcblocks.BlockKindsTest', () => {
  const hook = TinyHooks.bddSetupLight<Editor>({
    plugins: 'onlcblocks',
    base_url: '/project/hugerte/js/hugerte'
  }, [ BlocksPlugin ], true);

  const un = (editor: Editor, selecteur: string): HTMLElement =>
    editor.dom.select<HTMLElement>(selecteur, editor.getBody())[0];

  const typeDe = (editor: Editor, selecteur: string): string =>
    BlockKinds.kindOf(editor, un(editor, selecteur)).fold(Fun.constant('aucun'), (kind) => kind.id);

  it('reconnaît les types du html ordinaire', () => {
    const editor = hook.editor();
    editor.setContent(
      '<h2>Un titre</h2>' +
      '<p>Un paragraphe</p>' +
      '<ul><li>Un point</li></ul>' +
      '<blockquote><p>Une citation</p></blockquote>' +
      '<table><tbody><tr><td>Une cellule</td></tr></tbody></table>');

    assert.equal(typeDe(editor, 'h2'), 'onlcblocks-heading');
    assert.equal(typeDe(editor, 'p'), 'onlcblocks-paragraph');
    assert.equal(typeDe(editor, 'ul'), 'onlcblocks-list');
    assert.equal(typeDe(editor, 'blockquote'), 'onlcblocks-quote');
    assert.equal(typeDe(editor, 'table'), 'onlcblocks-table');
  });

  it('reconnaît une ligne et une colonne de grille', () => {
    const editor = hook.editor();
    editor.setContent('<div class="row"><div class="col-sm-6"><p>a</p></div></div>');

    assert.equal(typeDe(editor, '.row'), 'onlcblocks-row');
    assert.equal(typeDe(editor, '.col-sm-6'), 'onlcblocks-column');
  });

  it('voit une image dans un paragraphe qui n’a rien d’autre', () => {
    const editor = hook.editor();
    editor.setContent('<p><img src="a.jpg" alt="Une image"></p><p>Du texte</p>');

    assert.equal(typeDe(editor, 'p'), 'onlcblocks-image');
    assert.equal(typeDe(editor, 'p:last-of-type'), 'onlcblocks-paragraph',
      'un paragraphe de texte reste un paragraphe');
  });

  it('rend un type de repli plutôt que rien', () => {
    const editor = hook.editor();
    editor.setContent('<div class="section-a"><p>a</p></div>');

    assert.equal(typeDe(editor, '.section-a'), 'onlcblocks-section',
      'une section écrite à la main est le bloc qu’on déplace le plus : elle doit avoir un repère');
  });

  it('laisse un plugin plus précis passer devant', () => {
    const editor = hook.editor();
    BlockKinds.declare(editor, {
      id: 'test-objet',
      label: 'Mon objet',
      icon: KindIcons.widget,
      order: 20,
      match: (_target, element) => element.classList.contains('mon-objet')
    });
    editor.setContent('<div class="mon-objet"><p>a</p></div>');

    assert.equal(typeDe(editor, '.mon-objet'), 'test-objet',
      'le rang le plus bas l’emporte sur le repli');
  });

  it('ne laisse pas un match fautif priver la page de ses repères', () => {
    const editor = hook.editor();
    BlockKinds.declare(editor, {
      id: 'test-fautif',
      label: 'Fautif',
      icon: KindIcons.widget,
      order: 1,
      match: () => {
        throw new Error('déclaration fautive');
      }
    });
    editor.setContent('<p>Un paragraphe</p>');

    assert.equal(typeDe(editor, 'p'), 'onlcblocks-paragraph');
  });

  it('remplace une déclaration du même identifiant au lieu de l’ajouter', () => {
    const editor = hook.editor();
    const avant = BlockKinds.list(editor).length;
    BlockKinds.declare(editor, {
      id: 'test-objet',
      label: 'Mon objet, deuxième version',
      icon: KindIcons.widget,
      order: 20,
      match: (_target, element) => element.classList.contains('mon-objet')
    });

    assert.equal(BlockKinds.list(editor).length, avant, 'la liste ne s’allonge pas');
  });
});
