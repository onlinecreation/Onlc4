import { describe, it } from '@ephox/bedrock-client';
import { TinyHooks } from '@ephox/wrap-mcagar';
import { assert } from 'chai';

import Editor from 'hugerte/core/api/Editor';
import LinkPlugin from 'hugerte/plugins/onlclink/Plugin';
import * as LinkActions from 'hugerte/plugins/onlcshared/link/LinkActions';

/**
 * L'action au clic d'un lien, mise à l'abri le temps de l'écriture.
 *
 * Un `onclick` posé sur un lien de la zone d'écriture **s'exécute** : le rédacteur qui clique sur
 * son propre lien déclencherait son propre code, au milieu de l'éditeur. L'attribut voyage donc
 * sous un nom inerte, et redevient `onclick` à l'enregistrement.
 *
 * Ce qui est éprouvé ici, c'est le double sens : ce qui entre est désarmé, ce qui sort est armé,
 * et rien ne se perd entre les deux.
 */
describe('browser.hugerte.plugins.onlclink.LinkClickTest', () => {
  const hook = TinyHooks.bddSetupLight<Editor>({
    plugins: 'onlclink',
    // Sans cela, le cœur rendrait « /contact » relatif à l'adresse de la page d'épreuves. C'est
    // son comportement normal, et il n'a rien à voir avec ce qui est vérifié ici.
    convert_urls: false,
    base_url: '/project/hugerte/js/hugerte'
  }, [ LinkPlugin ], true);

  it('désarme l’action au clic du html chargé', () => {
    const editor = hook.editor();
    editor.setContent('<p><a href="/contact" onclick="alert(1)">contact</a></p>');

    const lien = editor.dom.select<HTMLAnchorElement>('a', editor.getBody())[0];
    assert.equal(editor.dom.getAttrib(lien, 'onclick'), '', 'aucun onclick dans la zone d’écriture');
    assert.isNull(lien.onclick, 'et rien que le navigateur exécuterait');
    assert.equal(editor.dom.getAttrib(lien, LinkActions.clickAttribute), 'alert(1)',
      'l’action est conservée sous un nom inerte');
  });

  it('rearme l’action au clic à l’enregistrement', () => {
    const editor = hook.editor();
    editor.setContent('<p><a href="/contact" onclick="alert(1)">contact</a></p>');
    const publie = editor.getContent();

    assert.include(publie, 'onclick="alert(1)"', 'la page publiée porte bien l’attribut');
    assert.notInclude(publie, LinkActions.clickAttribute, 'et pas le nom de travail');
  });

  it('n’invente pas d’action sur un lien qui n’en a pas', () => {
    const editor = hook.editor();
    editor.setContent('<p><a href="/contact">contact</a></p>');
    assert.notInclude(editor.getContent(), 'onclick');
    assert.notInclude(editor.getContent(), LinkActions.clickAttribute);
  });

  /**
   * Un aller-retour ne doit rien abîmer : c'est la garantie qu'on peut ouvrir une page, la
   * réenregistrer sans y toucher, et la retrouver au caractère près.
   */
  it('traverse plusieurs aller-retours sans se déformer', () => {
    const editor = hook.editor();
    const page = '<p><a class="btn" href="/contact" style="color: #c0392b;" ' +
      'onclick="return confirm(\'Partir ?\')">contact</a></p>';

    editor.setContent(page);
    const premier = editor.getContent();
    editor.setContent(premier);
    const second = editor.getContent();

    assert.equal(second, premier, 'la deuxième lecture donne le même html que la première');
    assert.include(second, 'onclick="return confirm(\'Partir ?\')"');
    assert.include(second, 'class="btn"');
  });

  /**
   * La commande sans interface pose un vrai lien, avec **tous** ses attributs.
   *
   * Elle passait au format `link` du cœur une variable `value`, que celui-ci recopiait telle
   * quelle : il en sortait un `<a value="/contact">` sans `href`, que plus rien ne retrouvait —
   * ni le titre, ni les classes, ni le style n'étaient posés.
   */
  it('pose un lien complet sur une sélection', () => {
    const editor = hook.editor();
    editor.setContent('<p>contact</p>');
    editor.selection.select(editor.dom.select('p', editor.getBody())[0], true);

    editor.execCommand('OnlcApplyLink', false, {
      href: '/contact',
      title: 'Nous écrire',
      target: '',
      rel: '',
      classes: 'btn',
      style: 'color: #c0392b',
      click: 'alert(1)'
    });

    const lien = editor.dom.select<HTMLAnchorElement>('a[href]', editor.getBody())[0];
    assert.isNotNull(lien, 'un lien a bien été posé');
    // L'adresse est relue dans le contenu enregistré : le cœur la rend relative à la page dans
    // la zone d'écriture, et c'est la forme d'origine qui ressort à la sérialisation.
    assert.include(editor.getContent(), 'href="/contact"');
    assert.equal(editor.dom.getAttrib(lien, 'title'), 'Nous écrire');
    assert.equal(editor.dom.getAttrib(lien, 'class'), 'btn');
    assert.isNull(lien.onclick, 'rien n’est armé dans la zone d’écriture');
    assert.equal(editor.dom.getAttrib(lien, LinkActions.clickAttribute), 'alert(1)');
    assert.include(editor.getContent(), 'onclick="alert(1)"', 'et la page publiée la porte');
  });

  it('pose un lien complet là où le curseur se trouve', () => {
    const editor = hook.editor();
    editor.setContent('<p>avant</p>');
    editor.selection.setCursorLocation(editor.dom.select('p', editor.getBody())[0], 0);

    editor.execCommand('OnlcApplyLink', false, {
      href: '/b', title: 'B', target: '', rel: '', classes: 'x', style: '', click: 'alert(2)', text: 'B'
    });

    const lien = editor.dom.select<HTMLAnchorElement>('a[href]', editor.getBody())[0];
    assert.include(editor.getContent(), 'href="/b"');
    assert.equal(editor.dom.getAttrib(lien, 'class'), 'x');
    assert.isNull(lien.onclick);
    assert.equal(editor.dom.getAttrib(lien, LinkActions.clickAttribute), 'alert(2)');
  });
});
