import { UiFinder, Waiter } from '@ephox/agar';
import { after, before, describe, it } from '@ephox/bedrock-client';
import { SugarBody } from '@ephox/sugar';
import { TinyHooks, TinyUiActions } from '@ephox/wrap-mcagar';
import { assert } from 'chai';

import Editor from 'hugerte/core/api/Editor';
import Plugin from 'hugerte/plugins/onlcwidgets/Plugin';

/**
 * L'éditeur de code, et la hauteur qu'il doit se donner lui-même.
 *
 * Les dialogues vivent dans le document de la page qui héberge l'éditeur, pas dans un cadre à
 * part : une règle de cette page écrite sur un **nom d'élément** les atteint. C'est exactement ce
 * qui est arrivé — la page de démonstration bornait ses blocs `pre` à 340 pixels pour son propre
 * panneau, et le code source d'une page s'y trouvait coupé à la dix-septième ligne, sans moyen de
 * défiler : la couche colorée était tronquée, et la zone de saisie posée dessus n'était pas plus
 * haute.
 *
 * Le test pose délibérément une règle hostile du même genre, puis vérifie que l'éditeur reste
 * entier et que son cadre défile.
 */
describe('browser.hugerte.plugins.onlcwidgets.CodeEditorTest', () => {
  const hook = TinyHooks.bddSetupLight<Editor>({
    plugins: 'onlcwidgets',
    toolbar: 'onlcsource',
    base_url: '/project/hugerte/js/hugerte'
  }, [ Plugin ], true);

  const styleId = 'onlc-essai-regle-hostile';

  before(() => {
    const style = document.createElement('style');
    style.id = styleId;
    // Ce qu'une page d'accueil écrit pour ses propres blocs de code, sans penser aux dialogues.
    style.textContent = 'pre { max-height: 40px; overflow: auto; } textarea { max-height: 40px; }';
    document.head.appendChild(style);
  });

  after(() => {
    const style = document.getElementById(styleId);
    if (style !== null && style.parentNode !== null) {
      style.parentNode.removeChild(style);
    }
  });

  const longContent = (lines: number): string => {
    const parts: string[] = [];
    for (let i = 0; i < lines; i++) {
      parts.push(`<p>Ligne numero ${i}</p>`);
    }
    return parts.join('');
  };

  const pOpen = async (editor: Editor) => {
    editor.execCommand('OnlcSourceCode');
    await TinyUiActions.pWaitForDialog(editor);
    return await Waiter.pTryUntil('l’éditeur de code doit apparaître', () => ({
      frame: UiFinder.findIn<HTMLElement>(SugarBody.body(), '.onlc-code').getOrDie().dom,
      view: UiFinder.findIn<HTMLElement>(SugarBody.body(), '.onlc-code__view').getOrDie().dom,
      input: UiFinder.findIn<HTMLTextAreaElement>(SugarBody.body(), '.onlc-code__input').getOrDie().dom
    }), 50, 5000);
  };

  it('ne laisse pas une règle de la page tronquer la couche colorée', async () => {
    const editor = hook.editor();
    editor.setContent(longContent(120));
    const { view, input } = await pOpen(editor);

    assert.equal(window.getComputedStyle(view).maxHeight, 'none', 'la couche colorée ne doit pas être bornée');
    assert.equal(window.getComputedStyle(view).overflow, 'visible', 'elle ne doit pas défiler pour son compte');
    assert.isAbove(view.getBoundingClientRect().height, 500, 'elle doit faire la hauteur de son texte');
    assert.equal(window.getComputedStyle(input).maxHeight, 'none', 'la zone de saisie non plus');

    editor.windowManager.close();
  });

  it('fait défiler le cadre jusqu’à la dernière ligne', async () => {
    const editor = hook.editor();
    editor.setContent(longContent(120));
    const { frame, view } = await pOpen(editor);

    assert.isAbove(frame.scrollHeight, frame.clientHeight + 1, 'le cadre doit avoir de quoi défiler');

    frame.scrollTop = frame.scrollHeight;
    const lines = view.querySelectorAll('.onlc-code__line');
    const last = lines[lines.length - 1];
    const frameRect = frame.getBoundingClientRect();
    const lastRect = last.getBoundingClientRect();

    assert.isAtLeast(lastRect.top, frameRect.top - 2, 'la dernière ligne doit être atteignable');
    assert.isAtMost(lastRect.bottom, frameRect.bottom + 2);

    editor.windowManager.close();
  });

  it('garde les deux couches exactement superposées', async () => {
    // Le curseur est dans la zone de saisie, le texte coloré est dessous : un décalage d'un pixel
    // et l'on n'écrit plus là où l'on croit.
    const editor = hook.editor();
    editor.setContent(longContent(40));
    const { view, input } = await pOpen(editor);

    const v = view.getBoundingClientRect();
    const i = input.getBoundingClientRect();
    assert.closeTo(i.top, v.top, 1, 'même haut');
    assert.closeTo(i.left, v.left, 1, 'même gauche');
    assert.closeTo(i.height, v.height, 1, 'même hauteur');

    editor.windowManager.close();
  });
});
