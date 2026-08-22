import { describe, it } from '@ephox/bedrock-client';
import { TinyHooks } from '@ephox/wrap-mcagar';
import { assert } from 'chai';

import Editor from 'hugerte/core/api/Editor';
import BlocksPlugin from 'hugerte/plugins/onlcblocks/Plugin';
import * as BlockAtoms from 'hugerte/plugins/onlcshared/BlockAtoms';

/**
 * Quel bloc l'éditeur désigne, et pourquoi celui-là.
 *
 * Une page écrite à la main ne porte pas de grille : ses sections tiennent dans un `div`
 * d'enrobage, et c'est lui, seul, qui a le corps du document pour parent. La règle d'origine ne
 * rendait donc que lui : la page entière ne comptait que pour un bloc, et plus rien n'y était
 * manipulable. C'est le défaut que ces cas gardent fermé.
 */
describe('browser.hugerte.plugins.onlcblocks.BlockResolutionTest', () => {
  const hook = TinyHooks.bddSetupLight<Editor>({
    plugins: 'onlcblocks',
    base_url: '/project/hugerte/js/hugerte'
  }, [ BlocksPlugin ], true);

  const api = (editor: Editor) =>
    (editor.plugins as Record<string, { blockAt: (node: Node) => HTMLElement | null }>).onlcblocks;

  const noeud = (editor: Editor, selecteur: string): HTMLElement =>
    editor.dom.select<HTMLElement>(selecteur, editor.getBody())[0];

  const blocDe = (editor: Editor, selecteur: string): HTMLElement | null =>
    api(editor).blockAt(noeud(editor, selecteur));

  it('rend la section, et non l’enrobage qui la contient', () => {
    const editor = hook.editor();
    editor.setContent(
      '<div class="home">' +
      '<div class="section-a"><p>Un</p></div>' +
      '<div class="section-b"><p>Deux</p></div>' +
      '</div>');

    assert.equal(blocDe(editor, '.section-a'), noeud(editor, '.section-a'),
      'une section parmi ses semblables est le bloc, pas l’enrobage');
  });

  it('remonte depuis le contenu jusqu’à la section quand le contenu est seul', () => {
    const editor = hook.editor();
    editor.setContent(
      '<div class="home">' +
      '<div class="section-a"><div class="inner"><p>Un</p></div></div>' +
      '<div class="section-b"><p>Deux</p></div>' +
      '</div>');

    // `p` est seul dans `.inner`, `.inner` est seul dans `.section-a` : ni l’un ni l’autre ne se
    // distingue de son parent. La section, elle, a une voisine.
    assert.equal(blocDe(editor, '.inner p'), noeud(editor, '.section-a'),
      'un bloc seul dans son parent ne fait pas un bloc à part');
  });

  it('s’arrête au plus bas de ceux qui ont des voisins', () => {
    const editor = hook.editor();
    editor.setContent(
      '<div class="home">' +
      '<div class="section-a"><p>Un</p><p>Deux</p></div>' +
      '<div class="section-b"><p>Trois</p></div>' +
      '</div>');

    assert.equal(blocDe(editor, '.section-a p'), noeud(editor, '.section-a p'),
      'un paragraphe parmi d’autres est lui-même un bloc');
  });

  it('rend le bloc dont le parent est un conteneur, comme avant', () => {
    const editor = hook.editor();
    editor.setContent(
      '<div class="container"><div class="row"><div class="col-sm-12"><p>Un</p></div></div></div>');

    assert.equal(blocDe(editor, '.col-sm-12 p'), noeud(editor, '.col-sm-12 p'),
      'dans une grille, le paragraphe reste le bloc');
    assert.equal(blocDe(editor, '.row'), noeud(editor, '.row'),
      'la ligne reste un bloc');
  });

  it('rend l’enrobage quand il est vraiment le seul bloc de la page', () => {
    const editor = hook.editor();
    editor.setContent('<div class="home"><div class="only"><p>Un</p></div></div>');

    assert.equal(blocDe(editor, '.only p'), noeud(editor, '.home'),
      'sans voisin nulle part, l’enrobage reste le seul choix');
  });

  it('rend le bloc insécable, et jamais son contenu', () => {
    const editor = hook.editor();
    BlockAtoms.declare(editor, {
      id: 'test-piste',
      match: (_target, element) => element.className === 'piste'
    });
    editor.setContent(
      '<div class="home">' +
      '<div class="section-a"><div class="piste"><div class="vue">Un</div><div class="vue">Deux</div></div></div>' +
      '<div class="section-b"><p>Deux</p></div>' +
      '</div>');

    assert.equal(blocDe(editor, '.vue'), noeud(editor, '.piste'),
      'une vue désigne la piste qui la porte');
    assert.equal(blocDe(editor, '.piste'), noeud(editor, '.piste'),
      'la piste se désigne elle-même');

    const blocs = (editor.plugins as Record<string, { listBlocks: () => HTMLElement[] }>).onlcblocks.listBlocks();
    assert.isFalse(blocs.indexOf(noeud(editor, '.vue')) !== -1,
      'le contenu d’un bloc insécable n’est jamais un bloc déplaçable');
    assert.isTrue(blocs.indexOf(noeud(editor, '.piste')) !== -1,
      'le bloc insécable, lui, en est un');
  });

  it('ne laisse pas un match fautif emporter la détection', () => {
    const editor = hook.editor();
    BlockAtoms.declare(editor, {
      id: 'test-fautif',
      match: () => {
        throw new Error('déclaration fautive');
      }
    });
    editor.setContent(
      '<div class="home"><div class="section-a"><p>Un</p></div><div class="section-b"><p>Deux</p></div></div>');

    assert.equal(blocDe(editor, '.section-a'), noeud(editor, '.section-a'),
      'la page reste manipulable malgré un plugin qui lève');
  });
});
