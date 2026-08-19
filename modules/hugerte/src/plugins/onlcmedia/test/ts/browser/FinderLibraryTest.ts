import { UiFinder, Waiter } from '@ephox/agar';
import { describe, it } from '@ephox/bedrock-client';
import { Arr } from '@ephox/katamari';
import { SugarBody } from '@ephox/sugar';
import { TinyHooks, TinyUiActions } from '@ephox/wrap-mcagar';
import { assert } from 'chai';

import Editor from 'hugerte/core/api/Editor';
import { MediaFile, MediaFolder, MediaListing, MediaQuota, MediaVersion } from 'hugerte/plugins/onlcmedia/api/Types';
import Plugin from 'hugerte/plugins/onlcmedia/Plugin';

/**
 * Médiathèque : arborescence, quotas et historique des versions.
 *
 * L'api est simulée par `onlc_media_handlers`, ce qui laisse les tests décrire exactement
 * l'arborescence dont ils ont besoin — et compter les appels, pour vérifier que le contenu d'un
 * dossier n'est demandé qu'au moment où on le déplie.
 */

const folder = (name: string, path: string): MediaFolder => ({ name, path });
const file = (name: string, path: string): MediaFile =>
  ({ name, path, url: `/media${path}`, mime: 'image/png', size: 2048 });

/** Arborescence de test : deux niveaux, pour vérifier le retrait et le dépliage. */
const tree: Record<string, MediaListing> = {
  '/': { path: '/', parent: null, folders: [ folder('photos', '/photos'), folder('documents', '/documents') ], files: [ file('logo.png', '/logo.png') ] },
  '/photos': { path: '/photos', parent: '/', folders: [ folder('2026', '/photos/2026') ], files: [ file('plage.png', '/photos/plage.png') ] },
  '/photos/2026': { path: '/photos/2026', parent: '/photos', folders: [], files: [] },
  '/documents': { path: '/documents', parent: '/', folders: [], files: [] }
};

const versions: MediaVersion[] = [
  { id: 'current', createdAt: '2026-04-18T09:12:00Z', url: '/media/photos/plage.png', label: 'Version actuelle', current: true },
  { id: 'v1-abc', createdAt: '2026-04-17T16:40:00Z', url: '/media/.versions/v1-abc.png', label: 'Avant retouche' }
];

const quota: MediaQuota = { files: 12, maxFiles: 60, maxFileSize: 4194304 };

let listCalls: string[] = [];

describe('browser.hugerte.plugins.onlcmedia.FinderLibraryTest', () => {
  const hook = TinyHooks.bddSetupLight<Editor>({
    plugins: 'onlcmedia',
    toolbar: 'onlcmedialibrary',
    base_url: '/project/hugerte/js/hugerte',
    onlc_media_handlers: {
      list: (path: string) => {
        listCalls.push(path);
        return Promise.resolve(tree[path] ?? tree['/']);
      },
      versions: () => Promise.resolve(versions),
      quota: () => Promise.resolve(quota)
    }
  }, [ Plugin ], true);

  const pOpen = async (editor: Editor): Promise<void> => {
    listCalls = [];
    editor.execCommand('OnlcMediaExplorer');
    await TinyUiActions.pWaitForDialog(editor);
    await Waiter.pTryUntil('la médiathèque doit se charger', () => {
      UiFinder.exists(SugarBody.body(), '.onlc-finder__branch');
    }, 50, 5000);
  };

  const branches = (): Array<{ label: string; indent: string; expanded: string | null; current: boolean }> =>
    Arr.map(UiFinder.findAllIn<HTMLElement>(SugarBody.body(), '.onlc-finder__branch'), (row) => ({
      label: row.dom.querySelector('.onlc-finder__place span')?.textContent ?? '',
      indent: row.dom.style.paddingLeft,
      expanded: row.dom.querySelector('.onlc-finder__twisty')?.getAttribute('aria-expanded') ?? null,
      current: row.dom.querySelector('.onlc-finder__place')?.classList.contains('onlc-finder__place--current') === true
    }));

  it('affiche l’arborescence plutôt qu’une liste à plat', async () => {
    const editor = hook.editor();
    await pOpen(editor);

    const rows = branches();
    assert.equal(rows[0].label, 'Médiathèque');
    assert.equal(rows[0].indent, '0px', 'la racine n’est pas en retrait');
    assert.isTrue(rows[0].current, 'le dossier ouvert est signalé');

    const enfants = Arr.filter(rows, (row) => row.indent === '14px');
    assert.deepEqual(Arr.map(enfants, (row) => row.label).sort(), [ 'documents', 'photos' ]);

    editor.windowManager.close();
  });

  it('ne demande le contenu d’un dossier qu’au dépliage', async () => {
    const editor = hook.editor();
    await pOpen(editor);

    assert.notInclude(listCalls, '/photos', 'un dossier replié ne doit rien coûter');

    const rows = UiFinder.findAllIn<HTMLElement>(SugarBody.body(), '.onlc-finder__branch');
    const photos = Arr.find(rows, (row) => row.dom.textContent?.indexOf('photos') === 0).getOrDie();
    photos.dom.querySelector<HTMLElement>('.onlc-finder__twisty')?.click();

    await Waiter.pTryUntil('le sous-dossier doit apparaître', () => {
      assert.include(Arr.map(branches(), (row) => row.label), '2026');
    }, 50, 3000);

    assert.include(listCalls, '/photos');
    editor.windowManager.close();
  });

  it('replie ce qui a été déplié', async () => {
    const editor = hook.editor();
    await pOpen(editor);

    const twisty = UiFinder.findIn<HTMLElement>(SugarBody.body(), '.onlc-finder__twisty').getOrDie();
    assert.equal(twisty.dom.getAttribute('aria-expanded'), 'true', 'la racine est dépliée');

    twisty.dom.click();
    await Waiter.pTryUntil('seule la racine doit rester', () => {
      assert.lengthOf(branches(), 1);
    }, 50, 2000);

    editor.windowManager.close();
  });

  it('l’emplacement actif reste lisible au survol', async () => {
    const editor = hook.editor();
    await pOpen(editor);

    const active = UiFinder.findIn<HTMLElement>(SugarBody.body(), '.onlc-finder__place--current').getOrDie();
    const repos = window.getComputedStyle(active.dom).backgroundColor;

    active.dom.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    const survol = window.getComputedStyle(active.dom).backgroundColor;

    // La règle de survol est plus spécifique : sans garde-fou, elle repeignait le fond en gris
    // clair sous un texte blanc, et l'élément actif disparaissait.
    assert.equal(survol, repos);
    editor.windowManager.close();
  });

  it('affiche la jauge de quota', async () => {
    const editor = hook.editor();
    await pOpen(editor);

    await Waiter.pTryUntil('la jauge doit se remplir', () => {
      const gauge = UiFinder.findIn<HTMLElement>(SugarBody.body(), '.onlc-finder__quota').getOrDie();
      assert.include(gauge.dom.textContent ?? '', '12');
      assert.include(gauge.dom.textContent ?? '', '60');
    }, 50, 3000);

    const fill = UiFinder.findIn<HTMLElement>(SugarBody.body(), '.onlc-finder__quota-fill').getOrDie();
    assert.equal(fill.dom.style.width, '20%', '12 sur 60');

    editor.windowManager.close();
  });

  it('limite le sélecteur de fichiers aux types acceptés', async () => {
    const editor = hook.editor();
    await pOpen(editor);

    const input = UiFinder.findIn<HTMLInputElement>(SugarBody.body(), '.onlc-finder__file-input').getOrDie();
    assert.equal(input.dom.accept, 'image/*,application/pdf');

    editor.windowManager.close();
  });

  it('montre l’historique d’un fichier sélectionné', async () => {
    const editor = hook.editor();
    await pOpen(editor);

    // Dossiers et fichiers partagent la grille : on vise explicitement un fichier.
    const item = await Waiter.pTryUntil('une vignette de fichier doit apparaître', () =>
      UiFinder.findIn<HTMLElement>(SugarBody.body(), '.onlc-finder__item--file').getOrDie(), 50, 3000);
    item.dom.click();

    await Waiter.pTryUntil('les versions doivent être listées', () => {
      const rows = UiFinder.findAllIn<HTMLElement>(SugarBody.body(), '.onlc-finder__version');
      assert.lengthOf(rows, 2);
    }, 50, 3000);

    // La version en service porte une pastille, les autres un bouton pour y revenir.
    UiFinder.exists(SugarBody.body(), '.onlc-finder__version-current');
    const labels = Arr.map(
      UiFinder.findAllIn<HTMLElement>(SugarBody.body(), '.onlc-finder__version-label'),
      (label) => label.dom.textContent);
    assert.deepEqual(labels, [ 'Version actuelle', 'Avant retouche' ]);

    editor.windowManager.close();
  });
});
