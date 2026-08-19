'use strict';

/**
 * Contrat de l'API média : versions, quotas, types acceptés et sécurité des chemins.
 *
 * La simulation de `example/api/media-api.js` sert de **spécification exécutable** pour les
 * back-offices qui implémentent ce contrat. Ces tests décrivent donc le comportement attendu de
 * n'importe quelle implémentation, pas seulement de celle-ci.
 *
 * Chaque test part d'une médiathèque neuve, dans un dossier temporaire.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const { describe, it, assert } = require('./harness');
const mediaApiFactory = require('../api/media-api');

/** Petite image png valide, en data url — de quoi enregistrer sans dépendre d'un fichier. */
const pngData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const withApi = (options, body) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'onlc-media-'));
  try {
    fs.mkdirSync(path.join(root, 'photos'));
    fs.writeFileSync(path.join(root, 'photos', 'plage.jpg'), 'contenu original');
    const api = mediaApiFactory.create({ root, publicPrefix: '/media', ...options });
    return body(api, root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
};

describe('API média — versions', () => {
  it('un fichier neuf n’a qu’une version, la courante', () => {
    withApi({}, (api) => {
      const { versions } = api.versions('/photos/plage.jpg');
      assert.lengthOf(versions, 1);
      assert.equal(versions[0].current, true);
    });
  });

  it('enregistrer sur un fichier existant en fait une version de plus', () => {
    withApi({}, (api) => {
      api.handle({ method: 'POST' }, new URL('http://x/save'),
        Buffer.from(JSON.stringify({
          path: '/photos', name: 'plage.jpg', data: pngData,
          metadata: { replaces: '/photos/plage.jpg', label: 'Avant retouche' }
        })));

      const { versions } = api.versions('/photos/plage.jpg');
      assert.lengthOf(versions, 2);
      assert.equal(versions[0].current, true, 'la plus récente vient en tête');
      assert.equal(versions[1].label, 'Avant retouche');
      assert.notOk(versions[1].current);
    });
  });

  it('le fichier garde son nom et son adresse : les pages publiées ne cassent pas', () => {
    withApi({}, (api, root) => {
      const response = api.handle({ method: 'POST' }, new URL('http://x/save'),
        Buffer.from(JSON.stringify({
          path: '/photos', name: 'plage.jpg', data: pngData,
          metadata: { replaces: '/photos/plage.jpg' }
        })));

      assert.equal(response.file.path, '/photos/plage.jpg');
      assert.equal(response.file.url, '/media/photos/plage.jpg');
      assert.ok(fs.existsSync(path.join(root, 'photos', 'plage.jpg')));
    });
  });

  it('résout aussi une adresse publique, pas seulement un chemin', () => {
    withApi({}, (api) => {
      // L'éditeur d'images ne connaît parfois que l'adresse de l'image ouverte.
      api.handle({ method: 'POST' }, new URL('http://x/save'),
        Buffer.from(JSON.stringify({
          path: '/photos', name: 'plage.jpg', data: pngData,
          metadata: { replaces: 'http://exemple.tld/media/photos/plage.jpg' }
        })));

      assert.lengthOf(api.versions('/photos/plage.jpg').versions, 2);
    });
  });

  it('n’écrase pas un fichier dont l’adresse ne vient pas d’elle', () => {
    withApi({}, (api) => {
      const response = api.handle({ method: 'POST' }, new URL('http://x/save'),
        Buffer.from(JSON.stringify({
          path: '/photos', name: 'plage.jpg', data: pngData,
          metadata: { replaces: 'https://un-autre-site.tld/photos/plage.jpg' }
        })));

      // Une adresse étrangère donne un fichier neuf plutôt qu'un écrasement.
      assert.notEqual(response.file.path, '/photos/plage.jpg');
      assert.lengthOf(api.versions('/photos/plage.jpg').versions, 1);
    });
  });

  it('sans « replaces », crée un fichier au nom libre', () => {
    withApi({}, (api) => {
      const response = api.handle({ method: 'POST' }, new URL('http://x/save'),
        Buffer.from(JSON.stringify({ path: '/photos', name: 'plage.jpg', data: pngData })));

      assert.notEqual(response.file.path, '/photos/plage.jpg');
      assert.includes(response.file.path, '/photos/plage');
    });
  });

  it('restaurer une version remet son contenu en service', () => {
    withApi({}, (api, root) => {
      api.handle({ method: 'POST' }, new URL('http://x/save'),
        Buffer.from(JSON.stringify({
          path: '/photos', name: 'plage.jpg', data: pngData,
          metadata: { replaces: '/photos/plage.jpg' }
        })));

      const ancienne = api.versions('/photos/plage.jpg').versions.find((v) => !v.current);
      api.handle({ method: 'POST' }, new URL('http://x/version/restore'),
        Buffer.from(JSON.stringify({ path: '/photos/plage.jpg', versionId: ancienne.id })));

      assert.equal(fs.readFileSync(path.join(root, 'photos', 'plage.jpg'), 'utf8'), 'contenu original');
    });
  });

  it('restaurer est soi-même réversible', () => {
    withApi({}, (api) => {
      api.handle({ method: 'POST' }, new URL('http://x/save'),
        Buffer.from(JSON.stringify({
          path: '/photos', name: 'plage.jpg', data: pngData,
          metadata: { replaces: '/photos/plage.jpg' }
        })));

      const ancienne = api.versions('/photos/plage.jpg').versions.find((v) => !v.current);
      api.handle({ method: 'POST' }, new URL('http://x/version/restore'),
        Buffer.from(JSON.stringify({ path: '/photos/plage.jpg', versionId: ancienne.id })));

      // L'état d'avant la restauration a été archivé au passage.
      assert.lengthOf(api.versions('/photos/plage.jpg').versions, 3);
    });
  });

  it('refuse une version inconnue', () => {
    withApi({}, (api) => {
      assert.throws(() => api.handle({ method: 'POST' }, new URL('http://x/version/restore'),
        Buffer.from(JSON.stringify({ path: '/photos/plage.jpg', versionId: 'v404' }))), 404);
    });
  });

  it('les versions ne polluent pas la médiathèque', () => {
    withApi({}, (api) => {
      api.handle({ method: 'POST' }, new URL('http://x/save'),
        Buffer.from(JSON.stringify({
          path: '/photos', name: 'plage.jpg', data: pngData,
          metadata: { replaces: '/photos/plage.jpg' }
        })));

      const racine = api.list('/');
      assert.deepEqual(racine.folders.map((f) => f.name), [ 'photos' ]);
    });
  });
});

describe('API média — quotas', () => {
  it('compte les fichiers présents', () => {
    withApi({}, (api) => {
      assert.equal(api.quota().files, 1);
    });
  });

  it('chaque version compte pour un fichier', () => {
    withApi({}, (api) => {
      const avant = api.quota().files;
      api.handle({ method: 'POST' }, new URL('http://x/save'),
        Buffer.from(JSON.stringify({
          path: '/photos', name: 'plage.jpg', data: pngData,
          metadata: { replaces: '/photos/plage.jpg' }
        })));

      // C'est ce qui empêche l'historique de grossir sans fin.
      assert.equal(api.quota().files, avant + 1);
    });
  });

  it('rapporte les plafonds du compte', () => {
    withApi({ maxFiles: 42, maxFileSize: 1024 }, (api) => {
      const quota = api.quota();
      assert.equal(quota.maxFiles, 42);
      assert.equal(quota.maxFileSize, 1024);
    });
  });

  it('refuse un enregistrement une fois le plafond atteint', () => {
    withApi({ maxFiles: 1 }, (api) => {
      assert.throws(() => api.handle({ method: 'POST' }, new URL('http://x/save'),
        Buffer.from(JSON.stringify({ path: '/photos', name: 'neuve.png', data: pngData }))), 507);
    });
  });

  it('refuse un fichier plus lourd que le plafond de l’offre', () => {
    withApi({ maxFileSize: 10 }, (api) => {
      assert.throws(() => api.handle({ method: 'POST' }, new URL('http://x/save'),
        Buffer.from(JSON.stringify({ path: '/photos', name: 'neuve.png', data: pngData }))), 413);
    });
  });

  it('le point d’entrée rend le quota sous sa clé', () => {
    withApi({}, (api) => {
      const response = api.handle({ method: 'GET' }, new URL('http://x/quota'), null);
      assert.ok(response.quota, 'la réponse doit porter une clé « quota »');
      assert.equal(typeof response.quota.files, 'number');
    });
  });
});

describe('API média — types de fichiers', () => {
  it('accepte les types de la liste', () => {
    withApi({ acceptedMimes: [ 'image/', 'application/pdf' ] }, (api) => {
      const response = api.handle({ method: 'POST' }, new URL('http://x/save'),
        Buffer.from(JSON.stringify({ path: '/photos', name: 'neuve.png', data: pngData })));
      assert.ok(response.file);
    });
  });

  it('refuse un type absent de la liste', () => {
    withApi({ acceptedMimes: [ 'application/pdf' ] }, (api) => {
      assert.throws(() => api.handle({ method: 'POST' }, new URL('http://x/save'),
        Buffer.from(JSON.stringify({ path: '/photos', name: 'neuve.png', data: pngData }))), 415);
    });
  });

  it('refuse une data url mal formée', () => {
    withApi({}, (api) => {
      assert.throws(() => api.handle({ method: 'POST' }, new URL('http://x/save'),
        Buffer.from(JSON.stringify({ path: '/photos', name: 'neuve.png', data: 'pas une data url' }))), 400);
    });
  });
});

describe('API média — sécurité des chemins', () => {
  it('aucun chemin ne sort de la racine autorisée', () => {
    withApi({}, (api, root) => {
      const hostiles = [
        '/../..',
        '//..//..',
        '/photos/../../etc',
        '/photos/../../../../../../etc/passwd',
        'photos/../..'
      ];

      // Les « .. » sont **neutralisés par la normalisation** plutôt que refusés : le chemin
      // retombe dans la racine au lieu d'en sortir. Le contrôle explicite de `toDisk` reste la
      // seconde ligne, pour le jour où la normalisation changerait.
      hostiles.forEach((chemin) => {
        const disk = api.toDisk(chemin);
        assert.ok(
          disk === root || disk.indexOf(root + path.sep) === 0,
          'le chemin ' + JSON.stringify(chemin) + ' est sorti de la racine : ' + disk);
      });
    });
  });

  it('ne lit pas un dossier hors de la médiathèque', () => {
    withApi({}, (api) => {
      // Ces chemins retombent dans la racine, où ils ne désignent rien.
      assert.throws(() => api.list('/photos/../../etc'), 404);
      assert.throws(() => api.list('/../../root'), 404);
    });
  });

  it('normalise les chemins reçus', () => {
    withApi({}, (api) => {
      assert.equal(api.normalize('photos'), '/photos');
      assert.equal(api.normalize('/photos/'), '/photos');
      assert.equal(api.normalize(''), '/');
      assert.equal(api.normalize('/photos//2026'), '/photos/2026');
    });
  });

  it('refuse un chemin inconnu plutôt que d’en inventer un', () => {
    withApi({}, (api) => {
      assert.throws(() => api.list('/nexiste-pas'), 404);
    });
  });

  it('ignore les points d’entrée qu’elle ne connaît pas', () => {
    withApi({}, (api) => {
      // `null` laisse le serveur essayer ses autres routes.
      assert.equal(api.handle({ method: 'GET' }, new URL('http://x/inconnu'), null), null);
    });
  });
});
