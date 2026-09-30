import { describe, it } from '@ephox/bedrock-client';
import { Arr } from '@ephox/katamari';
import { TinyHooks } from '@ephox/wrap-mcagar';
import { assert } from 'chai';

import Editor from 'hugerte/core/api/Editor';
import * as Assets from 'hugerte/plugins/onlcshared/Assets';
import * as Options from 'hugerte/plugins/onlcshared/Options';

/**
 * L'adresse des ressources statiques, et sa bascule sur un CDN.
 *
 * Un plugin sert ses feuilles, ses polices et ses dessins depuis son propre dossier. `onlc_cdn_url`
 * remplace la base de ces adresses en gardant le `plugins/<nom>/…` qui suit : c'est ce qui permet
 * de déposer le paquet tel quel sur un CDN sans avoir à déplacer un fichier. Se tromper ici ne
 * casse rien à l'ouverture — les icônes deviennent des carrés vides, et les emojis déjà
 * enregistrés pointent vers un serveur qui ne répond pas.
 */

const pluginUrl = 'https://exemple.test/editeur/plugins/onlcicons';

describe('browser.hugerte.plugins.onlcshared.AssetsTest', () => {
  describe('sans CDN', () => {
    const hook = TinyHooks.bddSetupLight<Editor>({
      base_url: '/project/hugerte/js/hugerte'
    }, [], true);

    it('sert la ressource depuis le dossier du plugin', () => {
      assert.equal(
        Assets.urlOf(hook.editor(), pluginUrl, 'css/onlcicons.css'),
        'https://exemple.test/editeur/plugins/onlcicons/css/onlcicons.css');
    });

    it('n’ajoute pas de barre en double', () => {
      assert.equal(
        Assets.urlOf(hook.editor(), pluginUrl, '/openmoji'),
        'https://exemple.test/editeur/plugins/onlcicons/openmoji');
    });
  });

  describe('avec un CDN', () => {
    const hook = TinyHooks.bddSetupLight<Editor>({
      base_url: '/project/hugerte/js/hugerte',
      onlc_cdn_url: 'https://cdn.exemple.test/onlc4/1.0.12'
    }, [], true);

    it('remplace la base et garde l’arborescence du paquet', () => {
      assert.equal(
        Assets.urlOf(hook.editor(), pluginUrl, 'css/fontawesome.css'),
        'https://cdn.exemple.test/onlc4/1.0.12/plugins/onlcicons/css/fontawesome.css');
    });

    it('ne demande à personne le nom du plugin', () => {
      // La bascule ne connaît que la forme de l'adresse : un plugin nouveau en profite sans
      // qu'on ait à l'inscrire nulle part.
      assert.equal(
        Assets.urlOf(hook.editor(), 'https://exemple.test/editeur/plugins/onlcbidule', 'css/x.css'),
        'https://cdn.exemple.test/onlc4/1.0.12/plugins/onlcbidule/css/x.css');
    });

    it('laisse tranquille une adresse qui n’a pas cette forme', () => {
      // Un plugin chargé d'un emplacement inhabituel : mieux vaut son dossier d'origine, qui
      // fonctionne, qu'une adresse recomposée au jugé.
      const ailleurs = 'https://exemple.test/un/autre/rangement';
      assert.equal(Assets.urlOf(hook.editor(), ailleurs, 'css/x.css'), `${ailleurs}/css/x.css`);
    });
  });

  describe('la valeur donnée', () => {
    const hook = TinyHooks.bddSetupLight<Editor>({
      base_url: '/project/hugerte/js/hugerte'
    }, [], true);

    it('supporte une barre finale, ou plusieurs', () => {
      assert.equal(Options.safeBase('https://cdn.exemple.test/onlc4/'), 'https://cdn.exemple.test/onlc4');
      assert.equal(Options.safeBase('  https://cdn.exemple.test/onlc4//  '), 'https://cdn.exemple.test/onlc4');
    });

    it('accepte une adresse sans protocole et un simple chemin', () => {
      assert.equal(Options.safeBase('//cdn.exemple.test/onlc4'), '//cdn.exemple.test/onlc4');
      assert.equal(Options.safeBase('/statique/onlc4'), '/statique/onlc4');
    });

    it('écarte ce qui ne désigne pas un serveur', () => {
      // Cette valeur finit dans un `href` de feuille et dans le `src` des emojis enregistrés :
      // un protocole exotique n'a rien à y faire, et vaut mieux être refusé à la source.
      Arr.each([ 'javascript:alert(1)', 'data:text/html,x', 'file:///etc' ], (mauvais) => {
        assert.equal(Options.safeBase(mauvais), '', mauvais);
      });
    });

    it('retombe alors sur le dossier du plugin', () => {
      const editor = hook.editor();
      editor.options.set('onlc_cdn_url', 'javascript:alert(1)');
      assert.equal(Assets.urlOf(editor, pluginUrl, 'css/x.css'), `${pluginUrl}/css/x.css`);
      editor.options.unset('onlc_cdn_url');
    });
  });

  describe('un plugin qui s’en sert', () => {
    const hook = TinyHooks.bddSetupLight<Editor>({
      base_url: '/project/hugerte/js/hugerte',
      plugins: 'onlcblocks',
      onlc_cdn_url: 'https://cdn.exemple.test/onlc4/1.0.12'
    }, [], true);

    it('charge sa feuille depuis le CDN', () => {
      const feuilles = hook.editor().contentCSS;
      assert.include(feuilles, 'https://cdn.exemple.test/onlc4/1.0.12/plugins/onlcblocks/css/onlcblocks.css',
        `attendue parmi : ${feuilles.join(', ')}`);
    });
  });
});
