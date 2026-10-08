import { describe, it } from '@ephox/bedrock-client';
import { TinyHooks } from '@ephox/wrap-mcagar';
import { assert } from 'chai';

import Editor from 'hugerte/core/api/Editor';
import BlocksPlugin from 'hugerte/plugins/onlcblocks/Plugin';

/**
 * Où se pose la barre d'un bloc, et qui commande son apparition.
 *
 * Deux sujets voisins, réunis ici parce qu'ils portent tous deux sur l'affichage de la barre
 * plutôt que sur ce que font ses boutons.
 *
 * **Le placement.** La barre se pose deux pixels au-dessus du bloc. Elle se calait sur des
 * coordonnées périmées au premier affichage qui suit un changement de contenu : `show` plaçait la
 * barre *avant* de créer les zones d'ajout, et celle du début, insérée en tête du corps, pousse
 * tout le contenu vers le bas de sa hauteur. La barre flottait alors quarante pixels trop haut,
 * au-dessus du bloc précédent. `refresh` faisait déjà les deux dans le bon ordre.
 *
 * **L'activation.** Par défaut la barre suit le survol et le curseur. Une application qui intègre
 * l'éditeur peut couper cet automatisme et commander l'affichage elle-même.
 */
describe('browser.hugerte.plugins.onlcblocks.BlockToolbarPlacementTest', () => {
  const hook = TinyHooks.bddSetupLight<Editor>({
    plugins: 'onlcblocks',
    base_url: '/project/hugerte/js/hugerte'
  }, [ BlocksPlugin ], true);

  interface BlocksApi {
    readonly setAutoActivation: (enabled: boolean) => void;
    readonly showFor: (node: Node | null) => void;
    readonly hide: () => void;
    readonly getActiveBlock: () => { readonly getOrNull: () => HTMLElement | null };
  }

  const api = (editor: Editor): BlocksApi => editor.plugins.onlcblocks as unknown as BlocksApi;

  const part = (editor: Editor, name: string): HTMLElement =>
    editor.dom.select<HTMLElement>(`[data-onlc-part="${name}"]`)[0];

  // L'overlay masque ses parties par une classe, pas par `display` : voir `setVisible`.
  const isVisible = (element: HTMLElement | undefined): boolean =>
    element !== undefined && !element.classList.contains('onlc-blocks-hidden');

  /** Le rectangle d'un élément de l'interface, dans le repère du corps du document. */
  const box = (editor: Editor, element: HTMLElement) => {
    const position = editor.dom.getPos(element, editor.getBody());
    return {
      top: position.y,
      bottom: position.y + element.offsetHeight,
      height: element.offsetHeight
    };
  };

  const blocks = (editor: Editor): HTMLElement[] =>
    editor.dom.select<HTMLElement>('body > *').filter((element) => !element.hasAttribute('data-onlc-ui'));

  it('pose la barre deux pixels au-dessus du bloc', () => {
    const editor = hook.editor();
    // Un premier bloc assez haut pour que le second soit loin du début du document.
    editor.setContent('<div style="height: 400px">haut</div><p>deuxième</p>');
    const second = blocks(editor)[1];

    api(editor).showFor(second);

    const toolbar = box(editor, part(editor, 'toolbar'));
    assert.equal(toolbar.bottom, box(editor, second).top - 2, 'collée au bloc, à deux pixels');
  });

  it('place la barre d\'après le contenu décalé par les zones d\'ajout', () => {
    const editor = hook.editor();
    // Le défaut : `setContent` efface les zones d'ajout, et le premier `show` qui suit les
    // recréait **après** avoir placé la barre. La zone du début est insérée en tête du corps :
    // sa création pousse le contenu vers le bas, et la barre restait sur l'ancienne mesure.
    editor.setContent('<div style="height: 400px">haut</div><p>deuxième</p>');
    const second = blocks(editor)[1];

    api(editor).showFor(second);

    const zone = box(editor, part(editor, 'edge-start'));
    assert.isAbove(zone.height, 0, 'la zone du début a bien été créée');

    const toolbar = box(editor, part(editor, 'toolbar'));
    // Sans le correctif, la barre était trop haute de la hauteur de cette zone.
    assert.equal(toolbar.bottom, box(editor, second).top - 2, 'la barre suit le contenu décalé');
  });

  it('suit le survol tant que l\'activation automatique n\'est pas coupée', () => {
    const editor = hook.editor();
    editor.setContent('<p>un</p><p>deux</p>');
    const [ one, two ] = blocks(editor);

    editor.dispatch('mouseover', { target: one } as unknown as MouseEvent);
    assert.equal(api(editor).getActiveBlock().getOrNull(), one, 'le premier bloc est actif');

    editor.dispatch('mouseover', { target: two } as unknown as MouseEvent);
    assert.equal(api(editor).getActiveBlock().getOrNull(), two, 'le survol a déplacé la barre');
  });

  it('cesse de suivre le survol quand l\'application prend la main', () => {
    const editor = hook.editor();
    editor.setContent('<p>un</p><p>deux</p>');
    const [ one, two ] = blocks(editor);

    api(editor).showFor(one);
    api(editor).setAutoActivation(false);

    editor.dispatch('mouseover', { target: two } as unknown as MouseEvent);
    assert.equal(api(editor).getActiveBlock().getOrNull(), one, 'le survol ne déplace plus rien');

    // L'application commande alors elle-même, et la barre répond comme avant.
    api(editor).showFor(two);
    assert.equal(api(editor).getActiveBlock().getOrNull(), two, 'mais la commande directe marche');

    api(editor).hide();
    assert.isFalse(isVisible(part(editor, 'toolbar')), 'et le masquage ferme la barre');

    // Rendre la main remet le survol en service : l'automatisme n'est pas perdu.
    api(editor).setAutoActivation(true);
    editor.dispatch('mouseover', { target: one } as unknown as MouseEvent);
    assert.equal(api(editor).getActiveBlock().getOrNull(), one, 'le survol est rétabli');
  });

  it('ne construit pas la couche d\'interface juste pour la masquer', () => {
    const editor = hook.editor();
    editor.setContent('<p>un</p>');
    // `hide()` sur un éditeur dont personne n'a encore affiché de barre ne doit rien créer : la
    // couche n'existe pas, il n'y a rien à fermer.
    api(editor).hide();
    assert.lengthOf(editor.dom.select('[data-onlc-part="toolbar"]'), 0, 'aucune couche créée');
  });
});
