import { describe, it } from '@ephox/bedrock-client';
import { Fun, Optional } from '@ephox/katamari';
import { TinyHooks } from '@ephox/wrap-mcagar';
import { assert } from 'chai';

import Editor from 'hugerte/core/api/Editor';
import BlocksPlugin from 'hugerte/plugins/onlcblocks/Plugin';
import * as PropertiesDialog from 'hugerte/plugins/onlcblocks/ui/PropertiesDialog';
import * as BlockActions from 'hugerte/plugins/onlcshared/BlockActions';
import * as ClassField from 'hugerte/plugins/onlcshared/ui/ClassField';

/**
 * Les propriétés d'un bloc, et la barre unique qui les porte.
 *
 * Deux choses sont vérifiées ici, et ce sont celles dont dépend le reste :
 *
 * 1. **qui a le droit** d'être modifié — une colonne de grille non, un bloc prédéfini non, un
 *    paragraphe ou une section oui ;
 * 2. **où va le bouton** — dans la barre du bloc quand elle existe, ce qui suppose que les
 *    plugins puissent y déclarer leurs boutons sans se connaître.
 */
describe('browser.hugerte.plugins.onlcblocks.BlockPropertiesTest', () => {
  const hook = TinyHooks.bddSetupLight<Editor>({
    plugins: 'onlcblocks',
    base_url: '/project/hugerte/js/hugerte'
  }, [ BlocksPlugin ], true);

  const bloc = (editor: Editor, selecteur: string): HTMLElement =>
    editor.dom.select<HTMLElement>(selecteur, editor.getBody())[0];

  it('accepte un bloc ordinaire', () => {
    const editor = hook.editor();
    editor.setContent('<div class="screens" id="tarifs"><p>Texte</p></div>');
    assert.isTrue(PropertiesDialog.isEditable(editor, bloc(editor, '.screens')));
    assert.isTrue(PropertiesDialog.isEditable(editor, bloc(editor, 'p')));
  });

  it('refuse une colonne de grille', () => {
    const editor = hook.editor();
    editor.setContent('<div class="row"><div class="col-sm-6"><p>a</p></div></div>');
    assert.isFalse(PropertiesDialog.isEditable(editor, bloc(editor, '.col-sm-6')),
      'les classes d’une colonne sont sa largeur : elles se changent par la disposition');
    assert.isTrue(PropertiesDialog.isEditable(editor, bloc(editor, '.row')),
      'la ligne, elle, a des propriétés comme un bloc ordinaire');
  });

  it('refuse un bloc qui appartient à un autre plugin', () => {
    const editor = hook.editor();
    editor.setContent('<div data-onlc-widget="hero"><p>Titre</p></div>');
    assert.isFalse(PropertiesDialog.isEditable(editor, bloc(editor, '[data-onlc-widget]')));
    assert.isFalse(PropertiesDialog.isEditable(editor, bloc(editor, 'p')),
      'ni les morceaux qu’il contient');
  });

  it('valide un identifiant utilisable comme ancre', () => {
    assert.isTrue(PropertiesDialog.isValidId('tarifs'));
    assert.isTrue(PropertiesDialog.isValidId('nos-services'));
    assert.isTrue(PropertiesDialog.isValidId('contact2'));
    assert.isFalse(PropertiesDialog.isValidId('2contacts'), 'ne commence pas par un chiffre');
    assert.isFalse(PropertiesDialog.isValidId('nos services'), 'pas d’espace');
    assert.isFalse(PropertiesDialog.isValidId('café'), 'pas d’accent');
  });

  it('propose les classes des autres blocs de la page', () => {
    const editor = hook.editor();
    editor.setContent('<p class="text-center big">a</p><p class="text-center">b</p>' +
      '<div class="onlc-blocks-ui mce-item">c</div>' +
      '<p class="[LG=fr]etiquette[/LG]">d</p>');
    const classes = ClassField.inPage(editor);
    assert.include(classes, 'text-center');
    assert.include(classes, 'big');
    assert.notInclude(classes, 'onlc-blocks-ui', 'les classes de l’interface ne décrivent pas la page');
    assert.notInclude(classes, 'mce-item');
    assert.notInclude(classes, '[LG=fr]etiquette[/LG]',
      'ce qui ne peut pas être un nom de classe n’est pas une suggestion');
    assert.equal(classes.length, new Set(classes).size, 'sans doublon');
  });

  /**
   * Le double clic ouvre ce qu'on vient de désigner, par le registre des propriétés — c'est ce
   * que fait `openFor`. Deux règles le gouvernent : la cible la plus profonde l'emporte, et rien
   * ne s'ouvre en lecture seule.
   */
  it('ouvre la configuration du bloc désigné, et la plus proche', () => {
    const editor = hook.editor();
    editor.setContent('<div class="screens"><p>Texte <em>accentué</em></p></div>');

    const ouverts: string[] = [];
    BlockActions.declare(editor, {
      id: 'epreuve-bloc',
      label: 'Épreuve — le bloc',
      icon: '<svg></svg>',
      order: 200,
      match: (_editor, unBloc) => Optional.some(unBloc),
      run: () => ouverts.push('bloc')
    });
    BlockActions.declare(editor, {
      id: 'epreuve-accent',
      label: 'Épreuve — l’accent',
      icon: '<svg></svg>',
      order: 210,
      match: (unEditor, unBloc) => BlockActions.matchIn(unEditor, unBloc, 'em'),
      run: () => ouverts.push('accent')
    });

    assert.isTrue(BlockActions.openFor(editor, bloc(editor, 'em')), 'quelque chose s’est ouvert');
    assert.deepEqual(ouverts, [ 'accent' ], 'la cible la plus profonde l’emporte');

    editor.mode.set('readonly');
    assert.isFalse(BlockActions.openFor(editor, bloc(editor, 'em')),
      'rien ne s’ouvre en lecture seule');
    editor.mode.set('design');
    assert.deepEqual(ouverts, [ 'accent' ], 'et rien n’a été ouvert entre-temps');
  });

  it('n’ouvre rien hors de tout bloc', () => {
    const editor = hook.editor();
    editor.setContent('<p>Texte</p>');
    assert.isFalse(BlockActions.openFor(editor, null));
  });

  it('déclare que la barre des blocs existe', () => {
    const editor = hook.editor();
    assert.isTrue(BlockActions.hasToolbar(editor));
  });

  it('range le bouton des propriétés dans la barre du bloc', () => {
    const editor = hook.editor();
    editor.setContent('<p>Un paragraphe</p>');
    const actions = BlockActions.forBlock(editor, bloc(editor, 'p'));
    assert.include(actions.map((action) => action.action.id), 'onlcblocks-properties');
  });

  it('retire le bouton là où il n’a rien à faire', () => {
    const editor = hook.editor();
    editor.setContent('<div class="row"><div class="col-sm-6"><p>a</p></div></div>');
    const actions = BlockActions.forBlock(editor, bloc(editor, '.col-sm-6'));
    assert.notInclude(actions.map((action) => action.action.id), 'onlcblocks-properties');
  });

  it('sait dire quel bloc entoure un nœud', () => {
    const editor = hook.editor();
    editor.setContent('<div class="screens"><p>Texte</p></div>');
    const api = editor.plugins.onlcblocks as { blockAt: (node: Node) => HTMLElement | null };
    const paragraphe = bloc(editor, 'p');
    assert.isNotNull(api.blockAt(paragraphe));
    assert.isTrue(BlockActions.isHandledByToolbar(editor, paragraphe),
      'un nœud dans un bloc est servi par la barre : sa bulle n’a plus lieu de s’ouvrir');
  });

  it('ne fait pas tomber la barre quand un plugin se trompe', () => {
    const editor = hook.editor();
    editor.setContent('<p>Un paragraphe</p>');

    BlockActions.declare(editor, {
      id: 'test-en-panne',
      label: 'Bouton fautif',
      icon: '',
      match: () => {
        throw new Error('panne');
      },
      run: Fun.noop
    });
    BlockActions.declare(editor, {
      id: 'test-valide',
      label: 'Bouton valide',
      icon: '',
      order: 900,
      match: (_editor, block) => Optional.some(block),
      run: Fun.noop
    });

    const ids = BlockActions.forBlock(editor, bloc(editor, 'p')).map((action) => action.action.id);
    assert.notInclude(ids, 'test-en-panne', 'le bouton fautif disparaît');
    assert.include(ids, 'test-valide', 'les autres restent');
    assert.include(ids, 'onlcblocks-properties');
  });
});
