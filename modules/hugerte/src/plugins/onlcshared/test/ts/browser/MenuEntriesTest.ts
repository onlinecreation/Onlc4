import { describe, it } from '@ephox/bedrock-client';
import { TinyHooks } from '@ephox/wrap-mcagar';
import { assert } from 'chai';

import Editor from 'hugerte/core/api/Editor';
import * as MenuEntries from 'hugerte/plugins/onlcshared/ui/MenuEntries';
import { defaultMenus } from 'hugerte/themes/silver/ui/menus/menubar/Integration';

/**
 * Les commandes ONLC dans les menus déroulants.
 *
 * Le thème **remplace** la liste d'un menu quand l'option `menu` la décrit, il ne la complète
 * jamais. Ajouter une entrée à « Insertion » sans réécrire tout le reste supposerait donc de
 * connaître la liste du thème : le registre en garde une copie, et cette épreuve vérifie qu'elle
 * n'a pas dérivé.
 */
describe('browser.hugerte.plugins.onlcshared.MenuEntriesTest', () => {
  const hook = TinyHooks.bddSetupLight<Editor>({
    base_url: '/project/hugerte/js/hugerte'
  }, [], true);

  /** Ce que l'éditeur porte comme option `menu`, à l'instant. */
  const menus = (editor: Editor): Record<string, { title: string; items: string }> =>
    editor.options.get('menu') as Record<string, { title: string; items: string }>;

  it('recopie les listes du thème sans en changer une virgule', () => {
    assert.deepEqual(MenuEntries.themeMenus, defaultMenus,
      'la copie a dérivé : reprenez-la sur celle du thème');
  });

  it('ajoute une entrée sans effacer la liste du thème', () => {
    const editor = hook.editor();
    MenuEntries.declare(editor, 'insert', [ 'monprojetbidule' ]);

    const insert = menus(editor).insert;
    assert.include(insert.items, 'image', 'les entrées du thème sont toujours là');
    assert.include(insert.items, 'monprojetbidule', 'et la nôtre s’y ajoute');
    assert.equal(insert.title, defaultMenus.insert.title, 'le titre du menu ne change pas');
  });

  it('n’ajoute pas deux fois la même entrée', () => {
    const editor = hook.editor();
    MenuEntries.declare(editor, 'tools', [ 'monprojetoutil' ]);
    MenuEntries.declare(editor, 'tools', [ 'monprojetoutil' ]);
    MenuEntries.declare(editor, 'tools', [ 'monprojetoutil', 'monprojetautre' ]);

    const items = menus(editor).tools.items;
    assert.equal(items.split('monprojetoutil').length - 1, 1, 'une seule fois');
    assert.include(items, 'monprojetautre');
  });

  it('ne connaît pas les menus que personne n’a décrits', () => {
    const editor = hook.editor();
    MenuEntries.declare(editor, 'menuquinexistepas', [ 'monprojetbidule' ]);
    assert.isUndefined(menus(editor).menuquinexistepas,
      'un menu que ni le projet ni le thème ne connaissent n’est pas inventé');
  });
});
