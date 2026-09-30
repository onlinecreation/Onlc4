'use strict';

/**
 * Contrat du gabarit d'aperçu.
 *
 * Le gabarit n'a qu'une obligation : porter `[ContenuPage]`. Sans ce code, l'aperçu affiche le
 * décor du site et rien d'autre — un mode d'échec silencieux, que ce test rend bruyant.
 */

const { describe, it, assert } = require('./harness');
const templateApiFactory = require('../api/template-api');

describe('API gabarit', () => {
  const api = templateApiFactory.create();

  it('rend le gabarit sous sa clé', () => {
    const response = api.handle({ method: 'GET' }, new URL('http://x/'));
    assert.equal(typeof response.template, 'string');
    assert.includes(response.template, '<!doctype html>');
  });

  it('le gabarit porte le code qui reçoit le contenu', () => {
    assert.includes(templateApiFactory.template, '[ContenuPage]');
  });

  it('le gabarit porte les codes du décor', () => {
    const template = templateApiFactory.template;
    [ '[NomPage]', '[TitreSite]', '[MenuSite', '[TitreLogoSite]', '[Copyrights]' ].forEach((code) => {
      assert.includes(template, code, 'code manquant : ' + code);
    });
  });

  it('ignore les points d’entrée qu’elle ne connaît pas', () => {
    assert.equal(api.handle({ method: 'GET' }, new URL('http://x/autre')), null);
    assert.equal(api.handle({ method: 'POST' }, new URL('http://x/')), null);
  });
});
