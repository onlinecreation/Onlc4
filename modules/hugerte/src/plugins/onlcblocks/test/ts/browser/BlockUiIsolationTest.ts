import { describe, it } from '@ephox/bedrock-client';
import { Arr } from '@ephox/katamari';
import { TinyHooks } from '@ephox/wrap-mcagar';
import { assert } from 'chai';

import Editor from 'hugerte/core/api/Editor';
import BlocksPlugin from 'hugerte/plugins/onlcblocks/Plugin';

/**
 * Les commandes d'un bloc face à la feuille de style du site.
 *
 * La couche d'interface des blocs vit dans le document du site, dont la feuille est chargée telle
 * quelle pour que la page ressemble à ce qu'elle sera. Les règles que cette feuille écrit sur des
 * **noms d'éléments** — `button`, `div`, `svg` — atteignent donc les commandes des blocs, sans
 * jamais les viser : personne n'écrit une feuille de site en pensant à un éditeur.
 *
 * C'est le même principe que pour les dialogues, où deux défauts sont venus de là. Ici la feuille
 * du plugin redit tout ce dont les commandes ont besoin ; cette épreuve vérifie qu'elle ne laisse
 * rien passer, en lui opposant les règles qu'une feuille de site pose couramment.
 */
describe('browser.hugerte.plugins.onlcblocks.BlockUiIsolationTest', () => {
  const hook = TinyHooks.bddSetupLight<Editor>({
    plugins: 'onlcblocks',
    base_url: '/project/hugerte/js/hugerte'
  }, [ BlocksPlugin ], true);

  /** Des règles qu'une feuille de site écrit couramment, et qui ne visent aucune de nos classes. */
  const siteSheet =
    'button { float: left; width: 100%; padding: 14px 20px; font-size: 19px;' +
    ' text-transform: uppercase; letter-spacing: 3px; background: #b30000; color: #fff;' +
    ' border: 3px dashed #000; border-radius: 0; text-decoration: underline; }' +
    'div { line-height: 3; text-align: center; }' +
    'svg { width: 100%; height: auto; }';

  const withSiteSheet = <T> (editor: Editor, run: () => T): { readonly before: T; readonly after: T } => {
    const before = run();
    const style = editor.dom.create('style', {}, siteSheet);
    editor.getDoc().head.appendChild(style);
    const after = run();
    style.remove();
    return { before, after };
  };

  const api = (editor: Editor) =>
    editor.plugins.onlcblocks as unknown as { readonly showFor: (node: Node | null) => void };

  const block = (editor: Editor): HTMLElement =>
    editor.dom.select<HTMLElement>('body > *').filter((element) => !element.hasAttribute('data-onlc-ui'))[0];

  it('garde la taille et l\'allure de ses boutons', () => {
    const editor = hook.editor();
    editor.setContent('<p>un</p>');
    api(editor).showFor(block(editor));

    const button = editor.dom.select<HTMLElement>('.onlc-blocks-btn')[0];
    const { before, after } = withSiteSheet(editor, () => {
      const style = editor.getWin().getComputedStyle(button);
      return {
        width: button.offsetWidth,
        height: button.offsetHeight,
        float: style.float,
        textTransform: style.textTransform,
        letterSpacing: style.letterSpacing,
        fontSize: style.fontSize,
        borderTopWidth: style.borderTopWidth,
        backgroundColor: style.backgroundColor
      };
    });

    // Cinquante pixels de côté : c'est la cible tactile du projet, et une feuille de site qui
    // pose `button { width: 100% }` ne doit pas l'emporter.
    assert.equal(after.width, 50, 'la largeur du bouton ne bouge pas');
    assert.equal(after.height, 50, 'ni sa hauteur');
    Arr.each(Object.keys(before) as Array<keyof typeof before>, (key) => {
      assert.deepEqual(after[key], before[key], `« ${key} » n'a pas changé`);
    });
  });

  it('garde la géométrie de la barre entière', () => {
    const editor = hook.editor();
    editor.setContent('<p>un</p>');
    api(editor).showFor(block(editor));

    const toolbar = editor.dom.select<HTMLElement>('[data-onlc-part="toolbar"]')[0];
    const { before, after } = withSiteSheet(editor, () => ({
      width: toolbar.offsetWidth,
      height: toolbar.offsetHeight,
      // Les boutons restent-ils sur une seule rangée ? Un `float` ou une largeur imposée les
      // ferait passer à la ligne, et la barre doublerait de hauteur.
      rows: Arr.unique(Arr.map(
        editor.dom.select<HTMLElement>('[data-onlc-part="toolbar"] .onlc-blocks-btn'),
        (b) => b.offsetTop
      )).length
    }));

    assert.deepEqual(after, before, 'la barre a la même géométrie');
  });

  it('garde la taille des dessins de ses boutons', () => {
    const editor = hook.editor();
    editor.setContent('<p>un</p>');
    api(editor).showFor(block(editor));

    // `svg { width: 100% }` est une règle de feuille de site très répandue, posée pour les
    // illustrations responsives.
    const { before, after } = withSiteSheet(editor, () =>
      Arr.map(Array.prototype.slice.call(editor.getDoc().querySelectorAll('.onlc-blocks-ui svg')) as Element[], (svg) => {
        const box = svg.getBoundingClientRect();
        return { w: Math.round(box.width), h: Math.round(box.height) };
      }));

    assert.isAbove(before.length, 0, 'il y a bien des dessins à mesurer');
    assert.deepEqual(after, before, 'aucun dessin n\'a changé de taille');
  });
});
