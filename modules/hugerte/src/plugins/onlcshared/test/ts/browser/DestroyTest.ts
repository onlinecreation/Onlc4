import { UiFinder, Waiter } from '@ephox/agar';
import { describe, it } from '@ephox/bedrock-client';
import { SugarBody, SugarElement } from '@ephox/sugar';
import { TinyHooks, TinyUiActions } from '@ephox/wrap-mcagar';
import { assert } from 'chai';

import Editor from 'hugerte/core/api/Editor';
import * as Destroy from 'hugerte/plugins/onlcshared/ui/Destroy';
import Plugin from 'hugerte/plugins/onlcwidgets/Plugin';

/**
 * Confirmation d'une suppression par maintien du bouton.
 *
 * Le geste demandé est **continu** : garder le bouton enfoncé jusqu'au bout du décompte.
 * Relâcher avant la fin ne doit rien supprimer — c'est toute la raison d'être du composant, et
 * c'est ce que ces tests vérifient en premier.
 *
 * Le décompte est raccourci à une seconde : la durée est un réglage, pas une propriété du
 * mécanisme, et six secondes par cas rendraient la suite inutilement lente.
 */
describe('browser.hugerte.plugins.onlcshared.DestroyTest', () => {
  const hook = TinyHooks.bddSetupLight<Editor>({
    plugins: 'onlcwidgets',
    // Ces épreuves portent sur la formulation **française** des intitulés. L'option « language »
    // vaut « en » par défaut, et l'éditeur charge alors le paquet anglais : il faut donc demander
    // le français pour que les clés s'affichent telles qu'elles sont écrites dans le code.
    language: 'fr',
    base_url: '/project/hugerte/js/hugerte'
  }, [ Plugin ], true);

  const pOpen = async (editor: Editor, onConfirm: () => void, seconds = 1): Promise<SugarElement<HTMLElement>> => {
    Destroy.open(editor, { what: 'le bloc', seconds, onConfirm });
    await TinyUiActions.pWaitForDialog(editor);
    return UiFinder.findIn<HTMLElement>(SugarBody.body(), '.onlc-destroy__hold').getOrDie();
  };

  /** La fenêtre qui porte le bouton : c'est d'elle que viennent les constructeurs d'événements. */
  const viewOf = (element: SugarElement<HTMLElement>): Window & typeof globalThis =>
    element.dom.ownerDocument.defaultView as Window & typeof globalThis;

  const press = (button: SugarElement<HTMLElement>, type: 'pointerdown' | 'pointerup'): void => {
    const view = viewOf(button);
    button.dom.dispatchEvent(new view.PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1 }));
  };

  const key = (button: SugarElement<HTMLElement>, type: 'keydown' | 'keyup'): void => {
    const view = viewOf(button);
    button.dom.dispatchEvent(new view.KeyboardEvent(type, { key: ' ', bubbles: true, cancelable: true }));
  };

  const close = (editor: Editor): void => {
    editor.windowManager.close();
  };

  it('ouvre une boîte intitulée DESTRUCTION, avec l’annulation en bouton principal', async () => {
    const editor = hook.editor();
    await pOpen(editor, () => assert.fail('rien ne doit être supprimé'));

    const title = UiFinder.findIn(SugarBody.body(), '.tox-dialog__title').getOrDie();
    assert.include(title.dom.textContent ?? '', 'DESTRUCTION');

    // Le seul bouton de pied est celui qui annule : Entrée ou Échap ne détruisent rien.
    const footer = UiFinder.findAllIn<HTMLElement>(SugarBody.body(), '.tox-dialog__footer button');
    assert.lengthOf(footer, 1);
    assert.equal(footer[0].dom.textContent, 'Ne pas supprimer');
    close(editor);
  });

  it('annonce ce qui va disparaître et la durée du maintien', async () => {
    const editor = hook.editor();
    const hold = await pOpen(editor, () => assert.fail('rien ne doit être supprimé'), 6);

    const lead = UiFinder.findIn(SugarBody.body(), '.onlc-destroy__lead').getOrDie();
    assert.include(lead.dom.textContent ?? '', 'le bloc');

    assert.equal(hold.dom.textContent, 'Tout détruire');
    const hint = UiFinder.findIn(SugarBody.body(), '.onlc-destroy__hint').getOrDie();
    assert.include(hint.dom.textContent ?? '', '6');
    close(editor);
  });

  it('relâcher avant la fin annule et ne supprime rien', async () => {
    const editor = hook.editor();
    let destroyed = false;
    const hold = await pOpen(editor, () => {
      destroyed = true;
    });

    press(hold, 'pointerdown');
    await Waiter.pWait(300);

    // Pendant le maintien, le bouton dit ce qu'il fait et jusqu'à quand.
    assert.equal(hold.dom.dataset.holding, 'true');
    const hint = UiFinder.findIn(SugarBody.body(), '.onlc-destroy__hint').getOrDie();
    assert.include(hint.dom.textContent ?? '', 'Lâchez');

    press(hold, 'pointerup');
    await Waiter.pWait(1200);

    assert.isFalse(destroyed, 'un relâchement doit annuler la suppression');
    assert.equal(hold.dom.dataset.holding, 'false');
    assert.equal(hold.dom.textContent, 'Tout détruire');
    close(editor);
  });

  it('la barre de progression repart de zéro après une annulation', async () => {
    const editor = hook.editor();
    const hold = await pOpen(editor, () => assert.fail('rien ne doit être supprimé'));
    const fill = UiFinder.findIn<HTMLElement>(SugarBody.body(), '.onlc-destroy__fill').getOrDie();

    press(hold, 'pointerdown');
    await Waiter.pWait(400);
    assert.notEqual(fill.dom.style.width, '0%', 'la barre doit progresser pendant le maintien');

    press(hold, 'pointerup');
    await Waiter.pWait(100);
    assert.equal(fill.dom.style.width, '0%');
    close(editor);
  });

  it('maintenir jusqu’au bout supprime et referme la boîte', async () => {
    const editor = hook.editor();
    let destroyed = false;
    const hold = await pOpen(editor, () => {
      destroyed = true;
    });

    press(hold, 'pointerdown');
    await Waiter.pTryUntil('la suppression doit finir par se produire', () => {
      assert.isTrue(destroyed);
    }, 50, 4000);

    await Waiter.pTryUntil('la boîte doit se refermer', () => {
      UiFinder.notExists(SugarBody.body(), '.onlc-destroy__hold');
    }, 50, 2000);
  });

  it('ne supprime qu’une fois, même si le décompte repart', async () => {
    const editor = hook.editor();
    let count = 0;
    const hold = await pOpen(editor, () => {
      count += 1;
    });

    press(hold, 'pointerdown');
    await Waiter.pTryUntil('première suppression', () => {
      assert.equal(count, 1);
    }, 50, 4000);

    press(hold, 'pointerdown');
    await Waiter.pWait(1500);
    assert.equal(count, 1, 'la suppression ne doit pas se répéter');
  });

  it('la barre d’espace maintient elle aussi, et la relâcher annule', async () => {
    const editor = hook.editor();
    let destroyed = false;
    const hold = await pOpen(editor, () => {
      destroyed = true;
    });

    key(hold, 'keydown');
    await Waiter.pWait(300);
    assert.equal(hold.dom.dataset.holding, 'true');

    key(hold, 'keyup');
    await Waiter.pWait(1200);
    assert.isFalse(destroyed);
    close(editor);
  });
});
