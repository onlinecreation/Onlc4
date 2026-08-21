import { UiFinder, Waiter } from '@ephox/agar';
import { describe, it } from '@ephox/bedrock-client';
import { Arr } from '@ephox/katamari';
import { SugarBody } from '@ephox/sugar';
import { TinyHooks, TinyUiActions } from '@ephox/wrap-mcagar';
import { assert } from 'chai';

import Editor from 'hugerte/core/api/Editor';
import * as PagePreview from 'hugerte/plugins/onlcwidgets/core/PagePreview';
import Plugin from 'hugerte/plugins/onlcwidgets/Plugin';

/**
 * Aperçu de la page comme la verra un visiteur.
 *
 * Deux points sont gardés ici, et ils tirent en sens contraire.
 *
 * **Ce que l'aperçu montre.** La page est servie par une adresse `blob:`, pas par `srcdoc` : un
 * document passé dans un attribut arrive tronqué au-delà d'une dizaine de milliers de caractères
 * dès que le cadre est peint par un autre processus, et l'analyseur referme alors les balises
 * ouvertes sans rien signaler. Une page de démonstration y perdait plus de la moitié de ses blocs.
 *
 * **Ce qu'il empêche.** Les jetons du bac à sable viennent de `onlc_preview_sandbox` ; un projet
 * peut les resserrer jusqu'à l'isolement strict. `allow-modals` n'y est jamais : un aperçu n'a pas
 * à bloquer l'éditeur derrière lui.
 */

const template =
  '<!doctype html><html><head><title>[NomPage]</title>' +
  '<meta name="TITLE" content="[TitreSite]"></head>' +
  '<body><header>[MenuSite classparent="nav"]</header>' +
  '<main>[ContenuPage]</main><footer>[Copyrights]</footer></body></html>';

describe('browser.hugerte.plugins.onlcwidgets.PreviewDialogTest', () => {
  const hook = TinyHooks.bddSetupLight<Editor>({
    plugins: 'onlcwidgets',
    toolbar: 'onlcpreview',
    base_url: '/project/hugerte/js/hugerte',
    onlc_preview_template: template,
    onlc_preview_values: {
      NomPage: 'Accueil',
      TitreSite: 'Ma boutique',
      Copyrights: '© 2026 Ma boutique',
      MenuSite: (attributs: Record<string, string>) =>
        `<ul class="${attributs.classparent}"><li>Accueil</li></ul>`
    }
  }, [ Plugin ], true);

  const pOpen = async (editor: Editor): Promise<HTMLIFrameElement> => {
    editor.execCommand('OnlcPreview');
    await TinyUiActions.pWaitForDialog(editor);
    return await Waiter.pTryUntil('le cadre d’aperçu doit apparaître', () =>
      UiFinder.findIn<HTMLIFrameElement>(SugarBody.body(), '.onlc-pagepreview__frame').getOrDie().dom,
    50, 5000);
  };

  it('sert la page par une adresse, jamais par un attribut', async () => {
    // `srcdoc` tronque au-delà d'une dizaine de milliers de caractères dès que le cadre est isolé :
    // la page se referme d'elle-même, amputée de sa fin, sans le moindre message.
    const editor = hook.editor();
    const frame = await pOpen(editor);

    assert.isNull(frame.getAttribute('srcdoc'), 'la page ne doit pas passer par un attribut');
    assert.match(frame.getAttribute('src') ?? '', /^blob:/, 'la page est servie par une adresse blob');
    assert.equal(frame.getAttribute('referrerpolicy'), 'no-referrer');

    editor.windowManager.close();
  });

  it('met la page en bac à sable, sans laisser ouvrir de fenêtre modale', async () => {
    const editor = hook.editor();
    const frame = await pOpen(editor);

    const sandbox = frame.getAttribute('sandbox') ?? '';
    assert.include(sandbox, 'allow-scripts', 'les scripts du gabarit doivent tourner');
    assert.notInclude(sandbox, 'allow-modals', 'un aperçu n’a pas à bloquer l’éditeur');
    assert.notInclude(sandbox, 'allow-top-navigation', 'un aperçu ne quitte pas le back-office');

    editor.windowManager.close();
  });

  it('laisse le projet resserrer le bac à sable jusqu’à l’isolement strict', async () => {
    const editor = hook.editor();
    editor.options.set('onlc_preview_sandbox', 'allow-scripts');
    const frame = await pOpen(editor);

    assert.equal(frame.getAttribute('sandbox'), 'allow-scripts');

    editor.windowManager.close();
    editor.options.unset('onlc_preview_sandbox');
  });

  it('remplit le gabarit avec le contenu et les valeurs configurées', async () => {
    const editor = hook.editor();
    editor.setContent('<p>Bonjour tout le monde</p>');

    const html = await PagePreview.render(editor);
    assert.include(html, 'Bonjour tout le monde', 'le contenu de la page');
    assert.include(html, 'Ma boutique', 'une valeur configurée');
    assert.include(html, '<title>Accueil</title>', 'un code dans le texte du gabarit');
    assert.include(html, 'content="Ma boutique"', 'un code dans un attribut du gabarit');
    assert.include(html, '<ul class="nav">', 'une valeur fonction, avec ses attributs');
    assert.include(html, '© 2026 Ma boutique');
  });

  it('ne laisse aucun code court dans la page affichée', async () => {
    const editor = hook.editor();
    editor.setContent('<p>Bonjour</p>');

    const html = await PagePreview.render(editor);
    const restants = html.match(/\[[A-Za-z][A-Za-z0-9_-]*(\s[^\]]*)?\]/g) ?? [];
    assert.deepEqual(restants, [], 'un visiteur ne voit jamais de crochets');
  });

  it('propose trois largeurs, la première étant retenue au départ', async () => {
    const editor = hook.editor();
    await pOpen(editor);

    const devices = UiFinder.findAllIn<HTMLElement>(SugarBody.body(), '.onlc-pagepreview__device');
    assert.deepEqual(Arr.map(devices, (d) => d.dom.textContent), [ 'Ordinateur', 'Tablette', 'Téléphone' ]);
    assert.equal(devices[0].dom.getAttribute('aria-pressed'), 'true');

    editor.windowManager.close();
  });

  it('choisir « Téléphone » borne la largeur du cadre', async () => {
    const editor = hook.editor();
    const frame = await pOpen(editor);

    const devices = UiFinder.findAllIn<HTMLElement>(SugarBody.body(), '.onlc-pagepreview__device');
    const phone = Arr.find(devices, (d) => d.dom.textContent === 'Téléphone').getOrDie();
    phone.dom.click();

    assert.equal(frame.style.maxWidth, '390px');
    assert.equal(phone.dom.getAttribute('aria-pressed'), 'true');
    assert.equal(devices[0].dom.getAttribute('aria-pressed'), 'false');

    editor.windowManager.close();
  });

  it('les commandes de largeur restent confortables au doigt', async () => {
    const editor = hook.editor();
    await pOpen(editor);

    const devices = UiFinder.findAllIn<HTMLElement>(SugarBody.body(), '.onlc-pagepreview__device');
    Arr.each(devices, (device) => {
      const rect = device.dom.getBoundingClientRect();
      assert.isAtLeast(rect.height, 44, `${device.dom.textContent} est trop bas`);
      assert.isAtLeast(rect.width, 50, `${device.dom.textContent} est trop étroit`);
    });

    editor.windowManager.close();
  });
});
