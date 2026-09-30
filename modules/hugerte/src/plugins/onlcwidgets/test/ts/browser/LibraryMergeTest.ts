import { UiFinder } from '@ephox/agar';
import { describe, it } from '@ephox/bedrock-client';
import { Arr } from '@ephox/katamari';
import { SugarBody } from '@ephox/sugar';
import { TinyHooks, TinyUiActions } from '@ephox/wrap-mcagar';
import { assert } from 'chai';

import Editor from 'hugerte/core/api/Editor';
import Plugin from 'hugerte/plugins/onlcwidgets/Plugin';
import * as WidgetPicker from 'hugerte/plugins/onlcwidgets/ui/WidgetPicker';

/**
 * Bibliothèque unique : blocs prédéfinis **et** éléments du site.
 *
 * Les codes courts étaient un plugin à part, avec sa propre fenêtre. Du point de vue du
 * rédacteur, un bandeau Hero et un menu de site sont pourtant la même chose : un élément qu'on
 * choisit dans une liste et qu'on règle dans un formulaire. Ces tests vérifient que les deux
 * catalogues arrivent bien dans la même fenêtre, et que chaque carte sait d'où elle vient.
 */
describe('browser.hugerte.plugins.onlcwidgets.LibraryMergeTest', () => {
  const hook = TinyHooks.bddSetupLight<Editor>({
    plugins: 'onlcwidgets',
    toolbar: 'onlcwidget',
    // Ces épreuves portent sur la formulation **française** des intitulés. L'option « language »
    // vaut « en » par défaut, et l'éditeur charge alors le paquet anglais : il faut donc demander
    // le français pour que les clés s'affichent telles qu'elles sont écrites dans le code.
    language: 'fr',
    base_url: '/project/hugerte/js/hugerte'
  }, [ Plugin ], true);

  const ids = (editor: Editor): string[] => Arr.map(WidgetPicker.allEntries(editor), (entry) => entry.id);

  it('un seul plugin porte les deux catalogues', () => {
    const editor = hook.editor();
    const api = editor.plugins.onlcwidgets as {
      listWidgets: () => unknown[];
      listShortcodes: () => unknown[];
    };
    assert.isAbove(api.listWidgets().length, 0);
    assert.isAbove(api.listShortcodes().length, 0);
  });

  it('la liste des cartes réunit blocs et éléments du site', () => {
    const editor = hook.editor();
    const all = ids(editor);

    assert.include(all, 'hero', 'les blocs prédéfinis doivent être là');
    assert.include(all, 'shortcode:MenuSite', 'les éléments du site aussi');
  });

  it('chaque carte porte son origine', () => {
    const editor = hook.editor();
    const entries = WidgetPicker.allEntries(editor);

    const shortcodes = Arr.filter(entries, (entry) => entry.id.indexOf('shortcode:') === 0);
    assert.isAbove(shortcodes.length, 0);

    // Un identifiant nu désigne un bloc, `command:` un outil qui a sa propre fenêtre.
    const blocks = Arr.filter(entries, (entry) =>
      entry.id.indexOf('shortcode:') !== 0 && entry.id.indexOf('command:') !== 0);
    assert.isAbove(blocks.length, 0);
  });

  it('les catégories des deux catalogues se juxtaposent sans se recouvrir', () => {
    const editor = hook.editor();
    const categories = WidgetPicker.categoriesOf(editor);

    assert.include(categories, 'Médias', 'catégorie de blocs');
    assert.include(categories, 'Navigation', 'catégorie d’éléments du site');
    assert.equal(categories.length, Arr.unique(categories).length, 'aucune catégorie en double');
  });

  it('chaque carte a un intitulé et une explication', () => {
    const editor = hook.editor();
    Arr.each(WidgetPicker.allEntries(editor), (entry) => {
      assert.isNotEmpty(entry.label, `intitulé manquant pour ${entry.id}`);
      assert.isNotEmpty(entry.description, `explication manquante pour ${entry.id}`);
      assert.isNotEmpty(entry.category, `catégorie manquante pour ${entry.id}`);
    });
  });

  it('la recherche trouve un bloc comme un élément du site', () => {
    const editor = hook.editor();

    const parMot = WidgetPicker.matching(editor, 'Tous', 'menu');
    assert.isTrue(Arr.exists(parMot, (item) => String(item.value) === 'shortcode:MenuSite'));

    const parBloc = WidgetPicker.matching(editor, 'Tous', 'hero');
    assert.isTrue(Arr.exists(parBloc, (item) => String(item.value) === 'hero'));
  });

  it('la recherche ignore la casse et les accents', () => {
    const editor = hook.editor();
    const accents = WidgetPicker.matching(editor, 'Tous', 'MEDIAS');
    const sans = WidgetPicker.matching(editor, 'Tous', 'médias');
    assert.isAbove(accents.length, 0);
    assert.deepEqual(Arr.map(accents, (i) => i.value), Arr.map(sans, (i) => i.value));
  });

  it('un onglet ne montre que sa catégorie', () => {
    const editor = hook.editor();
    const navigation = WidgetPicker.matching(editor, 'Navigation', '');
    assert.isAbove(navigation.length, 0);
    assert.isTrue(Arr.forall(navigation, (item) => String(item.value).indexOf('shortcode:') === 0));
  });

  it('la fenêtre s’ouvre sous un seul titre, avec un onglet par catégorie', async () => {
    const editor = hook.editor();
    editor.execCommand('OnlcWidgetLibrary');
    await TinyUiActions.pWaitForDialog(editor);

    const title = UiFinder.findIn(SugarBody.body(), '.tox-dialog__title').getOrDie();
    assert.equal(title.dom.textContent, 'Blocs et éléments');

    const tabs = UiFinder.findAllIn<HTMLElement>(SugarBody.body(), '.tox-dialog__body-nav-item');
    const labels = Arr.map(tabs, (tab) => tab.dom.textContent ?? '');
    assert.include(labels, 'Tous');
    assert.include(labels, 'Navigation');
    assert.include(labels, 'Médias');

    editor.windowManager.close();
  });

  it('l’ancienne commande ouvre la même fenêtre', async () => {
    const editor = hook.editor();
    editor.execCommand('OnlcShortcodeLibrary');
    await TinyUiActions.pWaitForDialog(editor);

    const title = UiFinder.findIn(SugarBody.body(), '.tox-dialog__title').getOrDie();
    assert.equal(title.dom.textContent, 'Blocs et éléments');
    editor.windowManager.close();
  });

  it('choisir un élément du site ouvre son formulaire', async () => {
    const editor = hook.editor();
    WidgetPicker.choose(editor, 'shortcode:MenuSite');
    await TinyUiActions.pWaitForDialog(editor);

    const title = UiFinder.findIn(SugarBody.body(), '.tox-dialog__title').getOrDie();
    assert.equal(title.dom.textContent, 'Menu');
    editor.windowManager.close();
  });

  it('choisir un bloc ouvre le sien', async () => {
    const editor = hook.editor();
    WidgetPicker.choose(editor, 'hero');
    await TinyUiActions.pWaitForDialog(editor);

    const title = UiFinder.findIn(SugarBody.body(), '.tox-dialog__title').getOrDie();
    assert.equal(title.dom.textContent, 'Hero');
    editor.windowManager.close();
  });

  it('un identifiant inconnu n’ouvre rien plutôt que de planter', () => {
    const editor = hook.editor();
    WidgetPicker.choose(editor, 'shortcode:CeCodeNExistePas');
    WidgetPicker.choose(editor, 'ce-bloc-nexiste-pas');
    UiFinder.notExists(SugarBody.body(), '.tox-dialog');
  });

  it('la bibliothèque ne propose plus les emojis, qui sont du texte et non un bloc', () => {
    const editor = hook.editor();
    assert.notInclude(ids(editor), 'command:OnlcIcons');
  });
});
