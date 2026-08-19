import { describe, it } from '@ephox/bedrock-client';
import { assert } from 'chai';

import * as MediaField from 'hugerte/plugins/onlcwidgets/core/MediaField';

/**
 * Aperçu du sélecteur de médias.
 *
 * `backgroundUrl` pose une adresse en fond d'un élément. Elle vient de la médiathèque ou de la
 * saisie : elle n'a donc pas à pouvoir refermer la parenthèse d'un `url(...)` pour ajouter
 * d'autres règles css par-dessous.
 */
describe('atomic.hugerte.plugins.onlcwidgets.MediaFieldTest', () => {
  it('enveloppe une adresse ordinaire', () => {
    assert.equal(MediaField.backgroundUrl('/media/photo.jpg'), 'url(/media/photo.jpg)');
  });

  it('encode les caractères qui refermeraient la déclaration', () => {
    const out = MediaField.backgroundUrl('/a(b)c"d\'e\\f.jpg');
    assert.equal(out, 'url(/a%28b%29c%22d%27e%5Cf.jpg)');
    assert.notInclude(out.slice(4, -1), '(');
    assert.notInclude(out.slice(4, -1), ')');
    assert.notInclude(out.slice(4, -1), '"');
    assert.notInclude(out.slice(4, -1), '\'');
  });

  it('encode les espaces plutôt que de couper la valeur', () => {
    assert.equal(MediaField.backgroundUrl('/mes photos/été.jpg'), 'url(/mes%20photos/été.jpg)');
  });

  it('refuse les schémas exécutables', () => {
    assert.equal(MediaField.backgroundUrl('javascript:alert(1)'), '');
    assert.equal(MediaField.backgroundUrl('  JavaScript:alert(1)'), '');
    assert.equal(MediaField.backgroundUrl('vbscript:msgbox'), '');
  });

  it('accepte une image en data url', () => {
    const data = 'data:image/png;base64,iVBORw0KGgo=';
    assert.equal(MediaField.backgroundUrl(data), `url(${data})`);
  });

  it('tire un nom lisible d’une adresse', () => {
    assert.equal(MediaField.nameOf('/media/photos/plage.jpg'), 'plage.jpg');
    assert.equal(MediaField.nameOf('https://exemple.tld/a/b/doc.pdf'), 'doc.pdf');
  });

  it('ignore la requête et l’ancre dans le nom', () => {
    assert.equal(MediaField.nameOf('/media/plage.jpg?v=2'), 'plage.jpg');
    assert.equal(MediaField.nameOf('/media/plage.jpg#haut'), 'plage.jpg');
  });

  it('décode le nom pour l’affichage', () => {
    assert.equal(MediaField.nameOf('/media/mon%20fichier.jpg'), 'mon fichier.jpg');
  });

  it('retombe sur l’adresse entière quand il n’y a pas de nom', () => {
    assert.equal(MediaField.nameOf('/media/photos/'), '/media/photos/');
  });
});
