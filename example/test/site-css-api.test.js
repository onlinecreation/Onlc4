'use strict';

/**
 * Le relais de lecture des feuilles de style du site.
 *
 * Un relais qui va chercher n'importe quelle adresse pour le compte de celui qui la demande est
 * une porte ouverte sur le réseau interne : c'est la faille dite de « requête falsifiée côté
 * serveur ». Ces épreuves vérifient que la porte est fermée — et qu'elle l'est par une liste de
 * domaines **déclarés**, plutôt que par une liste d'adresses interdites, qu'on n'arrive jamais à
 * écrire complètement.
 */

const { describe, it, assert } = require('./harness');
const siteCssApi = require('../api/site-css-api');

describe('API des feuilles de style du site', () => {
  const relais = siteCssApi.create({ allowedHosts: [ 'exemple.tld', 'lmparts.fr' ] });

  const demande = (adresse) =>
    relais.handle({ method: 'GET' }, new URL('http://x/?url=' + encodeURIComponent(adresse)));

  it('accepte un domaine déclaré et ses sous-domaines', () => {
    assert.ok(relais.isAllowed('exemple.tld'));
    assert.ok(relais.isAllowed('www.exemple.tld'));
    assert.ok(relais.isAllowed('static.cdn.exemple.tld'));
  });

  it('refuse un domaine qui ressemble sans en être un', () => {
    // Le point du suffixe est ce qui empêche « notexemple.tld » de passer pour « exemple.tld ».
    assert.notOk(relais.isAllowed('notexemple.tld'));
    assert.notOk(relais.isAllowed('exemple.tld.attaquant.fr'));
  });

  it('refuse un protocole qui n’est pas http', async () => {
    await assert.rejects(() => demande('file:///etc/passwd'), 400);
    await assert.rejects(() => demande('gopher://exemple.tld/'), 400);
  });

  it('refuse le réseau interne', async () => {
    await assert.rejects(() => demande('http://127.0.0.1/design.css'), 403);
    await assert.rejects(() => demande('http://localhost:3000/design.css'), 403);
    await assert.rejects(() => demande('http://169.254.169.254/latest/meta-data/'), 403);
    await assert.rejects(() => demande('http://192.168.1.1/design.css'), 403);
  });

  it('refuse une adresse illisible', async () => {
    await assert.rejects(() => demande('pas une adresse'), 400);
  });

  it('refuse une demande sans adresse', async () => {
    await assert.rejects(() => relais.handle({ method: 'GET' }, new URL('http://x/')), 400);
  });

  it('ne répond qu’à son propre point d’entrée', async () => {
    assert.equal(await relais.handle({ method: 'GET' }, new URL('http://x/autre')), null);
    assert.equal(await relais.handle({ method: 'POST' }, new URL('http://x/')), null);
  });

  it('ne sert rien quand aucun domaine n’est déclaré', () => {
    const ferme = siteCssApi.create({});
    assert.notOk(ferme.isAllowed('exemple.tld'));
    assert.deepEqual(ferme.allowed, []);
  });
});
