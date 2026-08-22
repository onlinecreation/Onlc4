import { describe, it } from '@ephox/bedrock-client';
import { TinyHooks } from '@ephox/wrap-mcagar';
import { assert } from 'chai';

import Editor from 'hugerte/core/api/Editor';
import * as Work from 'hugerte/plugins/onlcmultilang/core/Work';
import MultilangPlugin from 'hugerte/plugins/onlcmultilang/Plugin';

/**
 * Le mode « travailler dans une seule langue ».
 *
 * Il masque les autres langues et marque dans celle-ci tout bloc ajouté. Deux choses comptent, et
 * ce sont les deux qui ont posé problème :
 *
 * * il ne doit **jamais** être actif au départ — c'est un mode de rédaction, pas la vue normale ;
 * * il ne doit envelopper que **l'élément ajouté**. Le premier jet passait par le marquage
 *   ordinaire, qui cherche la portée du bloc : sur une page sans grille, la recherche remontait
 *   jusqu'à l'enrobage, et c'est la page entière qui se retrouvait dans une section de langue.
 */
describe('browser.hugerte.plugins.onlcmultilang.WorkModeTest', () => {
  const hook = TinyHooks.bddSetupLight<Editor>({
    plugins: 'onlcmultilang',
    onlc_multilang_languages: [ 'fr', 'en', 'nl' ],
    base_url: '/project/hugerte/js/hugerte'
  }, [ MultilangPlugin ], true);

  /** Une page sans grille : des sections dans un enrobage, comme celles qu'on reprend. */
  const page =
    '<div class="home">' +
    '<div class="section-a"><p>Bonjour</p></div>' +
    '<div class="section-b"><p>Au revoir</p></div>' +
    '</div>';

  const ajouter = (editor: Editor, texte: string): HTMLElement => {
    const cible = editor.dom.select<HTMLElement>('.section-b', editor.getBody())[0];
    const neuf = editor.dom.create('p', {}, texte);
    cible.parentNode?.insertBefore(neuf, cible);
    Work.sweep(editor);
    return neuf;
  };

  const sectionDe = (element: HTMLElement): HTMLElement | null =>
    element.closest('[data-onlc-lang]');

  it('n’est pas actif au départ', () => {
    const editor = hook.editor();
    editor.setContent(page);

    assert.equal(Work.current(editor), '', 'le mode de rédaction n’est jamais celui d’ouverture');
  });

  it('masque les autres langues et pose le bandeau', () => {
    const editor = hook.editor();
    editor.setContent(page);
    Work.enter(editor, 'fr');

    const body = editor.getBody();
    assert.equal(Work.current(editor), 'fr');
    assert.isTrue(body.classList.contains(Work.workClass));
    assert.isTrue(body.classList.contains('onlc-lang-only-fr'));
    assert.equal(body.getAttribute(Work.workAttribute), 'Français',
      'le bandeau nomme la langue, faute de quoi on cherche un paragraphe qu’on croit perdu');
  });

  it('marque le bloc ajouté, et lui seul', () => {
    const editor = hook.editor();
    editor.setContent(page);
    Work.enter(editor, 'fr');

    const neuf = ajouter(editor, 'Un paragraphe neuf');
    const section = sectionDe(neuf);

    assert.isNotNull(section, 'le bloc ajouté prend la langue en cours');
    assert.equal((section as HTMLElement).getAttribute('data-onlc-lang'), 'fr');
    assert.equal((section as HTMLElement).children.length, 1,
      'la section n’entoure que le bloc ajouté');
    assert.equal((section as HTMLElement).firstElementChild, neuf);
    assert.isNull(editor.dom.select('.home', editor.getBody())[0].closest('[data-onlc-lang]'),
      'l’enrobage de la page n’est pas emporté');
  });

  it('ne marque rien dans une section qui a déjà sa langue', () => {
    const editor = hook.editor();
    editor.setContent(
      '<div class="home"><div class="onlc-lang" data-onlc-lang="en" lang="en">' +
      '<p>Hello</p></div><div class="section-b"><p>x</p></div></div>');
    Work.enter(editor, 'fr');

    const hote = editor.dom.select<HTMLElement>('[data-onlc-lang="en"]', editor.getBody())[0];
    const neuf = editor.dom.create('p', {}, 'Un autre');
    hote.appendChild(neuf);
    Work.sweep(editor);

    assert.equal(sectionDe(neuf)?.getAttribute('data-onlc-lang'), 'en',
      'le texte ajouté dans un bloc anglais reste anglais');
  });

  it('ne marque rien tant que le mode est fermé', () => {
    const editor = hook.editor();
    editor.setContent(page);
    Work.enter(editor, '');

    assert.isNull(sectionDe(ajouter(editor, 'Sans langue')));
  });

  it('referme sans rien reconstruire', () => {
    const editor = hook.editor();
    editor.setContent(page);
    Work.enter(editor, 'fr');
    const avant = editor.getContent();
    Work.enter(editor, '');

    const body = editor.getBody();
    assert.equal(Work.current(editor), '');
    assert.isFalse(body.classList.contains(Work.workClass));
    assert.isNull(body.getAttribute(Work.workAttribute));
    assert.equal(editor.getContent(), avant, 'le contenu n’a pas bougé');
  });

  it('refuse une langue que le site ne déclare pas', () => {
    const editor = hook.editor();
    editor.setContent(page);
    Work.enter(editor, 'de');

    assert.equal(Work.current(editor), '',
      'mieux vaut tout montrer que cacher du contenu sans qu’on sache le retrouver');
  });
});
