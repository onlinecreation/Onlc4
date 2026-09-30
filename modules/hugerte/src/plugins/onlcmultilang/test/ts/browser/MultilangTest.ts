import { describe, it } from '@ephox/bedrock-client';
import { TinyApis, TinyHooks } from '@ephox/wrap-mcagar';
import { assert } from 'chai';

import Editor from 'hugerte/core/api/Editor';
import * as Dom from 'hugerte/plugins/onlcmultilang/core/Dom';
import Plugin from 'hugerte/plugins/onlcmultilang/Plugin';

/**
 * L'aller-retour, qui est tout l'enjeu.
 *
 * Un fichier ouvert puis enregistré sans y toucher doit ressortir **identique**. Les sections
 * polyglottes traversent l'éditeur sous une autre forme — un élément visible, encadré, nommé —
 * et cette forme n'existe que le temps de l'écriture ; si elle survivait à l'enregistrement, la
 * page publiée porterait des `<div>` que le moteur du site ne saurait pas retirer.
 *
 * Le reste des cas tourne autour de la même exigence : rien de ce qui est écrit ne doit
 * disparaître, quelle que soit la manœuvre.
 */
describe('browser.hugerte.plugins.onlcmultilang.MultilangTest', () => {
  const hook = TinyHooks.bddSetupLight<Editor>({
    plugins: 'onlcmultilang',
    toolbar: 'onlcmultilang',
    base_url: '/project/hugerte/js/hugerte'
  }, [ Plugin ], true);

  /** Ouvre un contenu puis le réenregistre : ce que le site relira. */
  const roundTrip = (editor: Editor, content: string): string => {
    editor.setContent(content);
    return editor.getContent();
  };

  describe('aller-retour', () => {
    it('rend un [LG] à l’identique', () => {
      const editor = hook.editor();
      assert.include(roundTrip(editor, '<p>[LG="fr"]Bonjour[/LG]</p>'), '[LG="fr"]Bonjour[/LG]');
    });

    it('rend un multilang à l’identique', () => {
      const editor = hook.editor();
      const out = roundTrip(editor, '<multilang lang="nl"><p>Hallo</p></multilang>');
      assert.include(out, '<multilang lang="nl">');
      assert.include(out, '<p>Hallo</p>');
      assert.include(out, '</multilang>');
    });

    it('garde à chaque section son écriture d’origine', () => {
      const editor = hook.editor();
      const out = roundTrip(editor, '<p>[LG="fr"]a[/LG]</p><multilang lang="en"><p>b</p></multilang>');
      assert.include(out, '[LG="fr"]a[/LG]');
      assert.include(out, '<multilang lang="en">');
      assert.notInclude(out, '[LG="en"]');
    });

    it('ne laisse aucune trace de l’élément d’édition dans ce qui est enregistré', () => {
      const editor = hook.editor();
      const out = roundTrip(editor, '<multilang lang="fr"><p>a</p></multilang>');
      assert.notInclude(out, Dom.codeAttribute);
      assert.notInclude(out, Dom.blockClass);
      assert.notInclude(out, 'lang="fr"><p');
    });

    it('ne touche pas au contenu commun', () => {
      // Sans accent : l'éditeur encode les caractères non ascii en entités nommées, et ce test
      // porte sur ce qui entoure les sections, pas sur l'encodage.
      const editor = hook.editor();
      const out = roundTrip(editor, '<p>Avant</p><multilang lang="fr"><p>a</p></multilang><p>Ensuite</p>');
      assert.include(out, '<p>Avant</p>');
      assert.include(out, '<p>Ensuite</p>');
    });
  });

  describe('ce qui devient une section', () => {
    it('entoure du texte d’un span', () => {
      const editor = hook.editor();
      editor.setContent('<p>[LG="fr"]Bonjour[/LG]</p>');
      assert.lengthOf(editor.dom.select(`span${Dom.selector}`), 1);
      assert.lengthOf(editor.dom.select(`div${Dom.selector}`), 0);
    });

    it('entoure des blocs d’un div', () => {
      // Un span autour d'un <h2> serait défait par le nettoyeur, et la section perdue avec lui.
      const editor = hook.editor();
      editor.setContent('<multilang lang="fr"><h2>Titre</h2></multilang>');
      assert.lengthOf(editor.dom.select(`div${Dom.selector}`), 1);
    });

    it('pose la langue du dictionnaire et l’intitulé de la pastille', () => {
      const editor = hook.editor();
      editor.setContent('<p>[LG="nl"]Hallo[/LG]</p>');
      const section = editor.dom.select<HTMLElement>(Dom.selector)[0];
      assert.equal(section.getAttribute('lang'), 'nl');
      assert.equal(section.getAttribute(Dom.labelAttribute), 'Nederlands');
    });

    it('signale une langue absente de la configuration sans la supprimer', () => {
      const editor = hook.editor();
      editor.setContent('<p>[LG="it"]Ciao[/LG]</p>');
      const section = editor.dom.select<HTMLElement>(Dom.selector)[0];
      assert.isTrue(editor.dom.hasClass(section, Dom.unknownModifier));
      assert.include(editor.getContent(), '[LG="it"]Ciao[/LG]');
    });

    it('reconnaît un marqueur écrit en minuscules', () => {
      // Les motifs du site ignorent la casse : le repérage rapide doit l'ignorer aussi, sinon
      // une page écrite en minuscules traverserait l'éditeur sans jamais être reconnue.
      const editor = hook.editor();
      editor.setContent('<p>[lg="fr"]Bonjour[/lg]</p>');
      assert.lengthOf(editor.dom.select(Dom.selector), 1);
    });

    it('laisse en toutes lettres une section dont les marqueurs ne se referment pas ensemble', () => {
      // Elle ne peut pas devenir un élément sans déplacer du contenu. Illisible, mais intacte —
      // et la page publiée se comporte exactement comme avant.
      const editor = hook.editor();
      const out = roundTrip(editor, '<p>[LG="fr"]début</p><p>fin[/LG]</p>');
      assert.include(out, '[LG="fr"]');
      assert.include(out, '[/LG]');
      assert.lengthOf(editor.dom.select(Dom.selector), 0);
    });
  });

  describe('marquer, changer, retirer', () => {
    it('marque le bloc courant quand rien n’est sélectionné', () => {
      const editor = hook.editor();
      editor.setContent('<p>Bonjour</p>');
      TinyApis(editor).setCursor([ 0, 0 ], 2);
      editor.execCommand('OnlcMarkLanguage', false, 'fr');

      assert.lengthOf(editor.dom.select(Dom.selector), 1);
      assert.include(editor.getContent(), '<multilang lang="fr">');
    });

    it('change la langue plutôt que d’imbriquer une section dans une autre', () => {
      // Le site ne sait pas lire une section imbriquée : elle tairait tout ce qu'elle contient.
      const editor = hook.editor();
      editor.setContent('<multilang lang="fr"><p>a</p></multilang>');
      TinyApis(editor).setCursor([ 0, 0, 0 ], 1);
      editor.execCommand('OnlcMarkLanguage', false, 'en');

      assert.lengthOf(editor.dom.select(Dom.selector), 1);
      assert.include(editor.getContent(), '<multilang lang="en">');
    });

    it('retire le marquage sans emporter le texte', () => {
      const editor = hook.editor();
      editor.setContent('<multilang lang="fr"><p>Bonjour</p></multilang>');
      TinyApis(editor).setCursor([ 0, 0, 0 ], 1);
      editor.execCommand('OnlcUnmarkLanguage');

      assert.lengthOf(editor.dom.select(Dom.selector), 0);
      const out = editor.getContent();
      assert.include(out, '<p>Bonjour</p>');
      assert.notInclude(out, 'multilang');
    });

    it('complète les langues manquantes à côté de la section', () => {
      const editor = hook.editor();
      editor.setContent('<multilang lang="fr"><p>Bonjour</p></multilang>');
      TinyApis(editor).setCursor([ 0, 0, 0 ], 1);
      editor.execCommand('OnlcCompleteLanguages');

      const codes = editor.dom.select<HTMLElement>(Dom.selector)
        .map((element) => element.getAttribute(Dom.codeAttribute));
      assert.deepEqual(codes, [ 'fr', 'en', 'nl' ]);
    });

    it('copie la section où l’on se trouve, pas une autre du groupe', () => {
      // On complète à partir de ce qu'on vient d'écrire ; prendre la dernière du groupe
      // donnerait à traduire un texte que l'on n'a pas sous les yeux.
      const editor = hook.editor();
      editor.setContent(
        '<multilang lang="fr"><p>Bonjour</p></multilang>' +
        '<multilang lang="en"><p>Hello</p></multilang>'
      );
      TinyApis(editor).setCursor([ 0, 0, 0 ], 1);
      editor.execCommand('OnlcCompleteLanguages');

      const nl = editor.dom.select<HTMLElement>('[data-onlc-lang="nl"]');
      assert.lengthOf(nl, 1);
      assert.equal(nl[0].textContent, 'Bonjour');
    });

    it('ne crée pas de doublon quand on complète deux fois', () => {
      const editor = hook.editor();
      editor.setContent('<multilang lang="fr"><p>Bonjour</p></multilang>');
      TinyApis(editor).setCursor([ 0, 0, 0 ], 1);
      editor.execCommand('OnlcCompleteLanguages');
      editor.execCommand('OnlcCompleteLanguages');

      assert.lengthOf(editor.dom.select(Dom.selector), 3);
    });

    it('ignore un code que le site ne saurait pas écrire', () => {
      const editor = hook.editor();
      editor.setContent('<p>Bonjour</p>');
      TinyApis(editor).setCursor([ 0, 0 ], 2);
      editor.execCommand('OnlcMarkLanguage', false, 'francais');

      assert.lengthOf(editor.dom.select(Dom.selector), 0);
    });
  });

  describe('aperçu par langue', () => {
    it('n’affiche qu’une langue, puis les rend toutes', () => {
      const editor = hook.editor();
      editor.setContent('<multilang lang="fr"><p>a</p></multilang><multilang lang="en"><p>b</p></multilang>');

      editor.execCommand('OnlcViewLanguage', false, 'en');
      assert.equal(editor.queryCommandValue('OnlcViewedLanguage'), 'en');

      editor.execCommand('OnlcViewLanguage', false, '');
      assert.equal(editor.queryCommandValue('OnlcViewedLanguage'), '');
    });

    it('ne retire rien du contenu pendant l’aperçu', () => {
      // Le filtrage est en css : ce qui est masqué reste écrit, et un enregistrement fait
      // pendant un aperçu ne peut pas amputer la page.
      const editor = hook.editor();
      editor.setContent('<multilang lang="fr"><p>a</p></multilang><multilang lang="en"><p>b</p></multilang>');
      editor.execCommand('OnlcViewLanguage', false, 'en');

      const out = editor.getContent();
      assert.include(out, '<multilang lang="fr">');
      assert.include(out, '<multilang lang="en">');
    });
  });

  describe('rendu pour un visiteur', () => {
    it('réduit le contenu à une langue', () => {
      const editor = hook.editor();
      editor.setContent('<p>[LG="fr"]Bonjour[/LG][LG="en"]Hello[/LG]</p>');
      const api = editor.plugins.onlcmultilang as { resolve: (code?: string) => string };

      assert.include(api.resolve('fr'), 'Bonjour');
      assert.notInclude(api.resolve('fr'), 'Hello');
    });
  });

  describe('bascule d’écriture', () => {
    it('enregistre en balise un [LG] devenu incapable de dire ce qu’il contient', () => {
      // Le moteur du site s'arrête au premier crochet : garder `[LG]` publierait les marqueurs.
      const editor = hook.editor();
      editor.setContent('<p>[LG="fr"]Bonjour[/LG]</p>');
      const section = editor.dom.select<HTMLElement>(Dom.selector)[0];
      section.innerHTML = 'Voir [MenuSite]';

      const out = editor.getContent();
      assert.include(out, '<multilang lang="fr">');
      assert.notInclude(out, '[LG="fr"]');
    });
  });

  describe('sécurité', () => {
    it('n’écrit jamais un code de langue forgé dans la page', () => {
      // Les marqueurs sortent sans échappement — c'est la seule façon d'écrire `<multilang>`.
      // Le code est donc revalidé juste avant : un attribut trafiqué perd son marquage et
      // garde son contenu, plutôt que d'injecter du markup dans la page enregistrée.
      const editor = hook.editor();
      editor.setContent('<p>Bonjour</p>');
      const paragraph = editor.dom.select<HTMLElement>('p')[0];
      editor.dom.setAttrib(paragraph, Dom.codeAttribute, 'fr"><script>alert(1)</script><span x="');

      const out = editor.getContent();
      assert.notInclude(out, '<script>');
      assert.notInclude(out, 'alert(1)');
      assert.include(out, 'Bonjour');
    });

    it('ne laisse pas passer un code trop long', () => {
      const editor = hook.editor();
      editor.setContent('<p>Bonjour</p>');
      const paragraph = editor.dom.select<HTMLElement>('p')[0];
      editor.dom.setAttrib(paragraph, Dom.codeAttribute, 'francais');

      const out = editor.getContent();
      assert.notInclude(out, 'francais');
      assert.include(out, 'Bonjour');
    });
  });
});
