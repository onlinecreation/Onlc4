import { Arr, Obj, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

/**
 * Les commandes ONLC dans les menus déroulants, sans que personne ait à les y ranger.
 *
 * Une barre d'outils est **courte**. Un projet en retire ce qui ne lui sert pas tous les jours,
 * et ce jour-là la fonction disparaît : le bouton des icônes a ainsi cessé d'exister pour tout un
 * site, parce qu'il avait été coupé d'une ligne de configuration. Rien ne le rattrapait, puisque
 * l'entrée de menu correspondante n'était affichée nulle part.
 *
 * Le thème ne montre en effet dans « Insertion » ou « Outils » que ce que l'option `menu`
 * énumère, et cette option est **remplacée**, jamais complétée : y ajouter une entrée obligeait à
 * réécrire la liste entière de ce menu, valeurs par défaut comprises. Personne ne le fait.
 *
 * Chaque plugin déclare donc ici où vont ses commandes, et le registre recompose l'option `menu`
 * à partir de ce que le projet a écrit — ou, à défaut, des listes du thème. Une barre d'outils
 * peut alors être aussi courte qu'on veut : tout reste atteignable au menu.
 *
 * ```ts
 * MenuEntries.declare(editor, 'insert', [ 'onlcimage', 'onlcmedialibrary' ]);
 * ```
 *
 * Le registre vit sur l'objet éditeur, que tous les plugins partagent : **l'ordre de chargement
 * n'a aucun effet**, et l'option est recomposée à chaque déclaration.
 */

interface MenuSpec {
  readonly title: string;
  readonly items: string;
}

interface MenuState {
  /** L'option telle que le projet l'a écrite, avant toute addition de notre fait. */
  readonly original: Record<string, MenuSpec>;
  /** Les noms d'entrées ajoutés, par menu. */
  readonly added: Record<string, string[]>;
}

const carrier = '_onlcMenuEntries';

/**
 * Les listes du thème, recopiées.
 *
 * Elles servent de point de départ pour un menu que le projet n'a pas décrit lui-même : sans
 * elles, ajouter « Emojis et icônes » à « Insertion » effacerait « Image », « Lien » et tout le
 * reste. Une épreuve compare cette table à celle du thème, pour que la copie ne dérive pas.
 */
const themeMenus: Record<string, MenuSpec> = {
  file: { title: 'File', items: 'newdocument restoredraft | preview | importword exportpdf exportword | export print | deleteallconversations' },
  edit: { title: 'Edit', items: 'undo redo | cut copy paste pastetext | selectall | searchreplace' },
  view: { title: 'View', items: 'code revisionhistory | visualaid visualchars visualblocks | spellchecker | preview fullscreen | showcomments' },
  insert: { title: 'Insert', items: 'image link media addcomment pageembed template inserttemplate codesample inserttable accordion | charmap emoticons hr | pagebreak nonbreaking anchor tableofcontents footnotes | mergetags | insertdatetime' },
  format: { title: 'Format', items: 'bold italic underline strikethrough superscript subscript codeformat | styles blocks fontfamily fontsize align lineheight | forecolor backcolor | language | removeformat' },
  tools: { title: 'Tools', items: 'aidialog aishortcuts | spellchecker spellcheckerlanguage | autocorrect capitalization | a11ycheck code typography wordcount addtemplate' },
  table: { title: 'Table', items: 'inserttable | cell row column | advtablesort | tableprops deletetable' },
  help: { title: 'Help', items: 'help' }
};

const isMenuSpec = (value: unknown): value is MenuSpec =>
  Type.isObject(value) && Type.isString((value as MenuSpec).items);

/** L'option `menu` telle qu'elle a été écrite, réduite à ce qui est exploitable. */
const readOption = (editor: Editor): Record<string, MenuSpec> => {
  // eslint-disable-next-line @tinymce/no-direct-editor-options
  const value: unknown = editor.options.get('menu');
  if (!Type.isObject(value)) {
    return {};
  }
  const result: Record<string, MenuSpec> = {};
  Obj.each(value as Record<string, unknown>, (spec, name) => {
    if (isMenuSpec(spec)) {
      result[name] = { title: Type.isString(spec.title) ? spec.title : name, items: spec.items };
    }
  });
  return result;
};

const state = (editor: Editor): MenuState => {
  const store = editor as unknown as Record<string, MenuState | undefined>;
  const existing = store[carrier];
  if (Type.isNonNullable(existing)) {
    return existing;
  }
  const fresh: MenuState = { original: readOption(editor), added: {}};
  store[carrier] = fresh;
  return fresh;
};

/**
 * Recompose l'option à partir de ce que le projet a écrit et de ce que les plugins ont déclaré.
 *
 * Le calcul repart toujours de `original`, jamais du résultat précédent : une déclaration de plus
 * ne peut donc pas ajouter deux fois les mêmes entrées.
 */
const apply = (editor: Editor, current: MenuState): void => {
  const merged: Record<string, MenuSpec> = { ...current.original };

  Obj.each(current.added, (items, name) => {
    const base = merged[name] ?? themeMenus[name];
    if (!Type.isNonNullable(base)) {
      // Un menu que ni le projet ni le thème ne connaissent : on n'en invente pas.
      return;
    }
    const nouveaux = Arr.filter(items, (item) => base.items.indexOf(item) < 0);
    if (nouveaux.length > 0) {
      merged[name] = { title: base.title, items: `${base.items} | ${nouveaux.join(' ')}` };
    } else {
      merged[name] = base;
    }
  });

  // eslint-disable-next-line @tinymce/no-direct-editor-options
  editor.options.set('menu', merged);
};

/**
 * Range ces entrées dans ce menu.
 *
 * `menu` est le nom d'un menu de la barre — `insert`, `format`, `tools`… — et `items` les noms
 * sous lesquels les entrées ont été enregistrées par `editor.ui.registry.addMenuItem`. Une entrée
 * déjà présente dans la liste n'est pas ajoutée une seconde fois.
 */
const declare = (editor: Editor, menu: string, items: string[]): void => {
  const current = state(editor);
  const deja = current.added[menu] ?? [];
  current.added[menu] = Arr.unique(deja.concat(items));
  apply(editor, current);
};

export {
  themeMenus,
  declare
};
