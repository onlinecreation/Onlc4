import { describe, it } from '@ephox/bedrock-client';
import { TinyHooks } from '@ephox/wrap-mcagar';
import { assert } from 'chai';

import Editor from 'hugerte/core/api/Editor';
import BlocksPlugin from 'hugerte/plugins/onlcblocks/Plugin';
import * as BlockActions from 'hugerte/plugins/onlcshared/BlockActions';
import * as Detect from 'hugerte/plugins/onlcswiper/core/Detect';
import SwiperPlugin from 'hugerte/plugins/onlcswiper/Plugin';
import WidgetsPlugin from 'hugerte/plugins/onlcwidgets/Plugin';

/**
 * Comment on **atteint** les réglages d'un diaporama.
 *
 * Le défaut d'origine : sur la page d'accueil d'un vrai site, aucun diaporama n'était accessible.
 * Deux raisons se cumulaient.
 *
 * 1. La page n'ayant pas de grille, ses sections tenaient dans un `div` d'enrobage : l'espace de
 *    travail ne voyait qu'un seul bloc, la page entière. Aucun diaporama n'était donc un bloc.
 * 2. La reconnaissance ne regardait que vers le haut. Un bloc qui *contient* un diaporama ne
 *    proposait pas son bouton — et la bulle contextuelle, elle, était tue parce que la barre des
 *    blocs existait. Il n'y avait plus aucune entrée.
 */
describe('browser.hugerte.plugins.onlcswiper.BlockAccessTest', () => {
  const hook = TinyHooks.bddSetupLight<Editor>({
    plugins: 'onlcswiper onlcblocks onlcwidgets',
    base_url: '/project/hugerte/js/hugerte'
  }, [ SwiperPlugin, BlocksPlugin, WidgetsPlugin ], true);

  const diaporama = (nom: string): string =>
    `<div class="${nom}"><div class="swiper-wrapper">` +
    '<div class="swiper-slide"><img src="a.jpg" alt="Un"></div>' +
    '<div class="swiper-slide"><img src="b.jpg" alt="Deux"></div>' +
    '</div></div>';

  /** Une page sans grille, comme celles qu'on reprend : des sections dans un enrobage. */
  const page =
    '<div class="home">' +
    '<div class="screen1"><p>Du texte</p></div>' +
    `<div class="screen2">${diaporama('swiper images-show')}</div>` +
    `<div class="screen3">${diaporama('swiper-reviews')}<p>Un mot après</p></div>` +
    '</div>';

  const un = (editor: Editor, selecteur: string): HTMLElement =>
    editor.dom.select<HTMLElement>(selecteur, editor.getBody())[0];

  const blocDe = (editor: Editor, node: Node): HTMLElement | null =>
    (editor.plugins as Record<string, { blockAt: (n: Node) => HTMLElement | null }>).onlcblocks.blockAt(node);

  const boutonsDe = (editor: Editor, bloc: HTMLElement): string[] =>
    BlockActions.forBlock(editor, bloc).map((resolue) => resolue.action.id);

  it('fait du diaporama un bloc, même sans classe « swiper »', () => {
    const editor = hook.editor();
    editor.setContent(page);

    assert.equal(blocDe(editor, un(editor, '.images-show')), un(editor, '.images-show'));
    assert.equal(blocDe(editor, un(editor, '.swiper-reviews')), un(editor, '.swiper-reviews'),
      'la piste suffit à le reconnaître, la classe n’est pas exigée');
  });

  it('rend le diaporama, et non la vue, quand on désigne une vue', () => {
    const editor = hook.editor();
    editor.setContent(page);

    const vue = un(editor, '.images-show .swiper-slide');
    assert.equal(blocDe(editor, vue), un(editor, '.images-show'),
      'une vue ne se déplace pas hors de sa piste');
  });

  it('propose le bouton sur le diaporama lui-même', () => {
    const editor = hook.editor();
    editor.setContent(page);

    assert.include(boutonsDe(editor, un(editor, '.images-show')), 'onlcswiper-edit');
  });

  it('propose le bouton sur la section qui n’en contient qu’un', () => {
    const editor = hook.editor();
    editor.setContent(page);

    // Le cas où la barre se pose plus haut que le diaporama : le bouton doit suivre.
    assert.include(boutonsDe(editor, un(editor, '.screen2')), 'onlcswiper-edit',
      'un bloc qui contient un seul diaporama sait lequel ouvrir');
  });

  it('ne propose rien sur un bloc qui n’en contient aucun', () => {
    const editor = hook.editor();
    editor.setContent(page);

    assert.notInclude(boutonsDe(editor, un(editor, '.screen1')), 'onlcswiper-edit');
  });

  it('ne choisit pas à la place de l’utilisateur quand il y en a plusieurs', () => {
    const editor = hook.editor();
    editor.setContent(
      `<div class="home"><div class="screen1"><p>a</p></div>` +
      `<div class="deux">${diaporama('swiper un')}${diaporama('swiper deux')}</div></div>`);

    // Rien n'est sélectionné : deux diaporamas, aucune raison d'en préférer un.
    editor.selection.select(un(editor, '.screen1 p'));
    assert.notInclude(boutonsDe(editor, un(editor, '.deux')), 'onlcswiper-edit',
      'mieux vaut pas de bouton qu’un bouton dont on ignore ce qu’il ouvrira');
  });

  it('suit la sélection quand un bloc en contient plusieurs', () => {
    const editor = hook.editor();
    editor.setContent(
      `<div class="home"><div class="screen1"><p>a</p></div>` +
      `<div class="deux">${diaporama('swiper un')}${diaporama('swiper deux')}</div></div>`);

    editor.selection.select(un(editor, '.deux .swiper.deux .swiper-slide'));
    const trouve = Detect.forBlock(editor, un(editor, '.deux'));

    assert.isTrue(trouve.isSome(), 'la sélection lève l’ambiguïté');
    assert.equal(trouve.getOrDie().container, un(editor, '.deux .swiper.deux'));
  });

  it('laisse la barre des blocs porter le bouton plutôt qu’une seconde bulle', () => {
    const editor = hook.editor();
    editor.setContent(page);

    assert.isTrue(BlockActions.hasToolbar(editor), 'la barre des blocs est déclarée');
    assert.isTrue(BlockActions.isHandledByToolbar(editor, un(editor, '.images-show')),
      'le diaporama est servi par la barre : sa bulle contextuelle se tait');
  });
});
