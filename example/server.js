'use strict';

/**
 * Serveur de démonstration de l'éditeur ONLC 4.
 *
 * Il sert :
 *   - la page d'exemple (example/public) ;
 *   - la version compilée de l'éditeur (modules/hugerte/js/hugerte) sous /hugerte ;
 *   - les fichiers de la médiathèque (example/storage) sous /media ;
 *   - les API simulées : /api/media, /api/links, /api/icons ;
 *   - un enregistrement de contenu factice : POST /api/save.
 *
 * Aucune dépendance : Node 18 ou plus suffit.
 *
 *   node example/server.js [--port 3000] [--latency 120]
 */

const fs = require('fs');
const http = require('http');
const path = require('path');

const iconsApi = require('./api/icons-api');
const linksApi = require('./api/links-api');
const mediaApiFactory = require('./api/media-api');

const argument = (name, fallback) => {
  const index = process.argv.indexOf('--' + name);
  return index === -1 ? fallback : process.argv[index + 1];
};

const port = parseInt(argument('port', process.env.PORT || '3000'), 10);
const latency = parseInt(argument('latency', process.env.ONLC_DEMO_LATENCY || '120'), 10);

const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(__dirname, 'public');
const seedDir = path.join(__dirname, 'seed');
const storageDir = path.join(__dirname, 'storage');
const editorDir = path.join(rootDir, 'modules', 'hugerte', 'js', 'hugerte');

/**
 * La médiathèque de démonstration est un espace de travail jetable : elle est recréée à partir
 * de `example/seed` au premier démarrage, ou à chaque démarrage avec `--reset`.
 */
const prepareStorage = () => {
  const reset = process.argv.includes('--reset');
  if (reset && fs.existsSync(storageDir)) {
    fs.rmSync(storageDir, { recursive: true, force: true });
  }
  if (!fs.existsSync(storageDir)) {
    fs.cpSync(seedDir, storageDir, { recursive: true });
    console.log('  Médiathèque initialisée depuis example/seed');
  }
};

prepareStorage();

const mediaApi = mediaApiFactory.create({ root: storageDir, publicPrefix: '/media' });

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject'
};

const sendJson = (response, status, payload) => {
  const body = JSON.stringify(payload, null, 2);
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store'
  });
  response.end(body);
};

const sendError = (response, error) => {
  const status = error && error.status ? error.status : 500;
  if (status >= 500) {
    console.error(error);
  }
  sendJson(response, status, { error: { message: error && error.message ? error.message : 'Erreur serveur' } });
};

/** Sert un fichier statique en interdisant toute sortie du dossier autorisé. */
const sendFile = (response, baseDir, relativePath) => {
  const resolved = path.resolve(baseDir, '.' + decodeURIComponent(relativePath));
  if (resolved !== baseDir && !resolved.startsWith(baseDir + path.sep)) {
    sendError(response, Object.assign(new Error('Accès refusé'), { status: 403 }));
    return true;
  }

  const target = fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()
    ? path.join(resolved, 'index.html')
    : resolved;

  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
    return false;
  }

  response.writeHead(200, {
    'Content-Type': contentTypes[path.extname(target).toLowerCase()] || 'application/octet-stream',
    'Content-Length': fs.statSync(target).size,
    'Cache-Control': 'no-cache'
  });
  fs.createReadStream(target).pipe(response);
  return true;
};

const readBody = (request) => new Promise((resolve, reject) => {
  const chunks = [];
  let size = 0;
  request.on('data', (chunk) => {
    size += chunk.length;
    if (size > 32 * 1024 * 1024) {
      reject(Object.assign(new Error('Corps de requête trop volumineux'), { status: 413 }));
      request.destroy();
      return;
    }
    chunks.push(chunk);
  });
  request.on('end', () => resolve(Buffer.concat(chunks)));
  request.on('error', reject);
});

const wait = (ms) => ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();

/** Route les appels d'API vers la simulation correspondante. */
const handleApi = async (request, response, url) => {
  const prefixes = [
    { prefix: '/api/media', api: mediaApi },
    { prefix: '/api/links', api: linksApi },
    { prefix: '/api/icons', api: iconsApi }
  ];

  const matched = prefixes.find((entry) => url.pathname === entry.prefix || url.pathname.startsWith(entry.prefix + '/'));
  if (matched === undefined) {
    return false;
  }

  const subUrl = new URL(url.href);
  subUrl.pathname = url.pathname.slice(matched.prefix.length) || '/';

  const body = request.method === 'GET' || request.method === 'DELETE' ? null : await readBody(request);
  // Latence artificielle : les états de chargement de l'éditeur restent visibles
  await wait(latency);

  const result = matched.api.handle(request, subUrl, body);
  if (result === null) {
    sendJson(response, 404, { error: { message: 'Point d’entrée inconnu : ' + url.pathname } });
  } else {
    sendJson(response, 200, result);
  }
  return true;
};

const server = http.createServer((request, response) => {
  const url = new URL(request.url, 'http://' + (request.headers.host || 'localhost'));

  Promise.resolve()
    .then(async () => {
      if (await handleApi(request, response, url)) {
        return;
      }

      // Enregistrement du contenu de l'éditeur : renvoie simplement ce qu'il a reçu
      if (url.pathname === '/api/save' && request.method === 'POST') {
        const body = await readBody(request);
        const payload = body.length === 0 ? {} : JSON.parse(body.toString('utf8'));
        console.log('[save] %d caractères de contenu reçus', (payload.content || '').length);
        sendJson(response, 200, { saved: true, length: (payload.content || '').length, at: new Date().toISOString() });
        return;
      }

      if (url.pathname.startsWith('/media/')) {
        if (sendFile(response, storageDir, url.pathname.slice('/media'.length))) {
          return;
        }
      }

      if (url.pathname.startsWith('/hugerte/')) {
        if (!fs.existsSync(editorDir)) {
          sendJson(response, 503, {
            error: { message: 'L’éditeur n’est pas compilé. Lancez `yarn oxide-icons-build && yarn oxide-build && yarn hugerte-rollup`.' }
          });
          return;
        }
        if (sendFile(response, editorDir, url.pathname.slice('/hugerte'.length))) {
          return;
        }
      }

      if (sendFile(response, publicDir, url.pathname === '/' ? '/index.html' : url.pathname)) {
        return;
      }

      sendJson(response, 404, { error: { message: 'Page introuvable : ' + url.pathname } });
    })
    .catch((error) => sendError(response, error));
});

server.listen(port, () => {
  const missing = !fs.existsSync(path.join(editorDir, 'hugerte.js'));
  console.log('');
  console.log('  Démonstration ONLC 4');
  console.log('  → http://localhost:' + port + '/');
  console.log('');
  console.log('  API simulées :');
  console.log('    • médias  : /api/media  (fichiers dans example/storage)');
  console.log('    • liens   : /api/links');
  console.log('    • icônes  : /api/icons');
  console.log('    • éditeur d’images Pixel : /pixel/');
  console.log('    • latence simulée : ' + latency + ' ms');
  console.log('');
  if (missing) {
    console.log('  ⚠ L’éditeur n’est pas encore compilé.');
    console.log('    Lancez : yarn oxide-icons-build && yarn oxide-build && yarn hugerte-rollup');
    console.log('');
  }
});
