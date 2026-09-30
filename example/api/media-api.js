'use strict';

const fs = require('fs');
const path = require('path');

const multipart = require('./multipart');

/**
 * Simulation de l'API média décrite dans docs/api/onlc-media-api.md.
 *
 * Les fichiers sont stockés dans `example/storage`, servis publiquement sous `/media/…`.
 * Tout est volontairement synchrone et sans base de données : le but est de pouvoir lire le
 * code d'un bout à l'autre pour écrire sa propre implémentation.
 */

const mimeTypes = {
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.pdf': 'application/pdf'
};

const mimeOf = (name) => mimeTypes[path.extname(name).toLowerCase()] || 'application/octet-stream';

const create = ({
  root,
  publicPrefix = '/media',
  maxUploadSize = 8 * 1024 * 1024,
  // Quotas du compte simulé. Dans un vrai back-office ils viennent de la fiche client ; ils
  // sont relus par l'éditeur à chaque fois qu'ils servent, jamais gardés en cache.
  maxFiles = 60,
  maxFileSize = 4 * 1024 * 1024,
  acceptedMimes = [ 'image/', 'application/pdf' ]
}) => {

  // --- chemins -------------------------------------------------------------

  const normalize = (value) => {
    const raw = typeof value === 'string' && value.trim() !== '' ? value.trim() : '/';
    const withLeading = raw.startsWith('/') ? raw : '/' + raw;
    const collapsed = path.posix.normalize(withLeading);
    return collapsed.length > 1 && collapsed.endsWith('/') ? collapsed.slice(0, -1) : collapsed;
  };

  /** Refuse toute sortie de l'arborescence exposée (« ../ », chemins absolus…). */
  const toDisk = (virtualPath) => {
    const normalized = normalize(virtualPath);
    const resolved = path.resolve(root, '.' + normalized);
    if (resolved !== root && !resolved.startsWith(root + path.sep)) {
      const error = new Error('Chemin hors de l’espace autorisé');
      error.status = 403;
      throw error;
    }
    return resolved;
  };

  const parentOf = (virtualPath) => {
    const normalized = normalize(virtualPath);
    if (normalized === '/') {
      return null;
    }
    const index = normalized.lastIndexOf('/');
    return index <= 0 ? '/' : normalized.slice(0, index);
  };

  const join = (virtualPath, name) => {
    const normalized = normalize(virtualPath);
    return normalized === '/' ? '/' + name : normalized + '/' + name;
  };

  const publicUrl = (virtualPath) =>
    publicPrefix + normalize(virtualPath).split('/').map(encodeURIComponent).join('/');

  const fail = (status, message) => {
    const error = new Error(message);
    error.status = status;
    return error;
  };

  const requireExisting = (virtualPath) => {
    const disk = toDisk(virtualPath);
    if (!fs.existsSync(disk)) {
      throw fail(404, 'Introuvable : ' + normalize(virtualPath));
    }
    return disk;
  };

  const safeName = (name) => {
    const base = String(name || '').replace(/[/\\]/g, '').trim();
    if (base === '' || base === '.' || base === '..') {
      throw fail(400, 'Nom de fichier invalide');
    }
    return base;
  };

  /** Ajoute « -1 », « -2 »… tant que le nom est déjà pris. */
  const uniqueName = (folderPath, name) => {
    const extension = path.extname(name);
    const base = path.basename(name, extension);
    let candidate = name;
    let counter = 1;
    while (fs.existsSync(toDisk(join(folderPath, candidate)))) {
      candidate = `${base}-${counter}${extension}`;
      counter += 1;
    }
    return candidate;
  };

  // --- objets renvoyés -----------------------------------------------------

  const toFile = (virtualPath) => {
    const disk = toDisk(virtualPath);
    const stats = fs.statSync(disk);
    const name = path.basename(virtualPath);
    return {
      name,
      path: normalize(virtualPath),
      url: publicUrl(virtualPath),
      mime: mimeOf(name),
      size: stats.size,
      modified: stats.mtime.toISOString()
    };
  };

  const toFolder = (virtualPath) => {
    const disk = toDisk(virtualPath);
    const stats = fs.statSync(disk);
    return {
      name: path.basename(virtualPath),
      path: normalize(virtualPath),
      count: fs.readdirSync(disk).filter((entry) => !entry.startsWith('.')).length,
      modified: stats.mtime.toISOString()
    };
  };

  // --- versions et quotas --------------------------------------------------

  /**
   * Historique des fichiers.
   *
   * Chaque version est un binaire rangé sous `/.versions/<chemin encodé>/`, accompagné d'un
   * `index.json` qui garde l'ordre, les dates et l'intitulé donné par l'éditeur d'images. Le
   * dossier commence par un point : `list` l'ignore déjà, il n'apparaît donc jamais dans la
   * médiathèque.
   *
   * Le fichier « vivant » reste à sa place habituelle — les URL publiées ne bougent pas quand on
   * enregistre une nouvelle version.
   */
  const versionsRoot = '/.versions';

  const versionDir = (virtualPath) => join(versionsRoot, encodeURIComponent(normalize(virtualPath)));

  const readIndex = (virtualPath) => {
    const file = path.join(toDisk(versionDir(virtualPath)), 'index.json');
    if (!fs.existsSync(file)) {
      return [];
    }
    try {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
      return Array.isArray(parsed) ? parsed : [];
    } catch (_err) {
      return [];
    }
  };

  const writeIndex = (virtualPath, entries) => {
    const dir = toDisk(versionDir(virtualPath));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify(entries, null, 2), 'utf8');
  };

  /** Met de côté le contenu actuel d'un fichier, avant qu'il ne soit remplacé. */
  const archive = (virtualPath, label) => {
    const disk = requireExisting(virtualPath);
    const entries = readIndex(virtualPath);
    const id = 'v' + (entries.length + 1) + '-' + Date.now().toString(36);
    const extension = path.extname(virtualPath) || '.bin';
    const stored = join(versionDir(virtualPath), id + extension);

    fs.mkdirSync(toDisk(versionDir(virtualPath)), { recursive: true });
    fs.copyFileSync(disk, toDisk(stored));

    const stats = fs.statSync(disk);
    entries.push({
      id,
      file: id + extension,
      createdAt: stats.mtime.toISOString(),
      size: stats.size,
      label: label || 'Version précédente'
    });
    writeIndex(virtualPath, entries);
    return id;
  };

  /** Historique d'un fichier, de la plus récente à la plus ancienne. */
  const versions = (virtualPath) => {
    const disk = requireExisting(virtualPath);
    const stats = fs.statSync(disk);
    const stored = readIndex(virtualPath).map((entry) => ({
      id: entry.id,
      createdAt: entry.createdAt,
      size: entry.size,
      label: entry.label,
      url: publicUrl(join(versionDir(virtualPath), entry.file)),
      current: false
    }));

    const live = {
      id: 'current',
      createdAt: stats.mtime.toISOString(),
      size: stats.size,
      label: 'Version actuelle',
      url: publicUrl(virtualPath),
      current: true
    };

    return { versions: [ live ].concat(stored.reverse()) };
  };

  /**
   * Revient à une version antérieure.
   *
   * L'état actuel est lui-même archivé au passage : revenir en arrière est donc, à son tour,
   * réversible. Rien ne se perd tant que le fichier existe.
   */
  const restoreVersion = (virtualPath, versionId) => {
    const disk = requireExisting(virtualPath);
    const entry = readIndex(virtualPath).find((candidate) => candidate.id === versionId);
    if (entry === undefined) {
      throw fail(404, 'Version introuvable : ' + versionId);
    }

    const source = toDisk(join(versionDir(virtualPath), entry.file));
    if (!fs.existsSync(source)) {
      throw fail(410, 'Le contenu de cette version a été purgé');
    }

    archive(virtualPath, 'Avant restauration');
    fs.copyFileSync(source, disk);
    return { file: toFile(virtualPath) };
  };

  /**
   * À quel fichier de la médiathèque une retouche se rapporte-t-elle ?
   *
   * L'éditeur d'images ne connaît pas toujours le chemin interne : quand la retouche part d'une
   * image déjà posée dans la page, il ne dispose que de son adresse. On accepte donc les deux, et
   * une adresse étrangère à la médiathèque ne résout rien — la retouche donnera un fichier neuf,
   * ce qui est le comportement voulu : on ne réécrit pas un fichier qu'on n'a pas servi.
   */
  const resolveReplaced = (value) => {
    if (typeof value !== 'string' || value.trim() === '') {
      return null;
    }
    const raw = value.trim();
    let candidate = raw;

    if (/^https?:\/\//i.test(raw)) {
      try {
        candidate = new URL(raw).pathname;
      } catch (_err) {
        return null;
      }
    }
    if (candidate.startsWith(publicPrefix + '/')) {
      candidate = candidate.slice(publicPrefix.length);
    } else if (raw.indexOf('/') !== 0) {
      return null;
    }

    let decoded = candidate;
    try {
      decoded = decodeURIComponent(candidate);
    } catch (_err) {
      return null;
    }

    const normalized = normalize(decoded);
    return fs.existsSync(toDisk(normalized)) && fs.statSync(toDisk(normalized)).isFile() ? normalized : null;
  };

  /** Un type est-il accepté ? Une entrée finissant par « / » vaut pour toute une famille. */
  const acceptsMime = (mime) => acceptedMimes.length === 0 || acceptedMimes.some((entry) =>
    entry.endsWith('/') ? String(mime || '').startsWith(entry) : mime === entry);

  /**
   * Quotas du compte.
   *
   * Chaque version compte pour un fichier — c'est ce qui empêche l'historique de grossir sans
   * fin. Le comptage est fait à la demande plutôt que tenu à jour : sur une médiathèque de
   * démonstration c'est instantané, et surtout toujours juste.
   */
  const countFiles = (dir) => fs.readdirSync(dir, { withFileTypes: true }).reduce((total, entry) => {
    if (entry.isDirectory()) {
      return total + countFiles(path.join(dir, entry.name));
    }
    // L'index n'est pas un fichier de l'utilisateur : il ne lui est pas facturé.
    return total + (entry.name === 'index.json' ? 0 : 1);
  }, 0);

  const quota = () => ({
    files: countFiles(root),
    maxFiles,
    maxFileSize
  });

  // --- opérations ----------------------------------------------------------

  const list = (virtualPath) => {
    const target = normalize(virtualPath);
    const disk = requireExisting(target);
    if (!fs.statSync(disk).isDirectory()) {
      throw fail(400, 'Ce chemin n’est pas un dossier');
    }

    const entries = fs.readdirSync(disk).filter((entry) => !entry.startsWith('.'));
    const folders = [];
    const files = [];

    entries.forEach((entry) => {
      const childPath = join(target, entry);
      if (fs.statSync(toDisk(childPath)).isDirectory()) {
        folders.push(toFolder(childPath));
      } else {
        files.push(toFile(childPath));
      }
    });

    const byName = (a, b) => a.name.localeCompare(b.name, 'fr');
    return { path: target, parent: parentOf(target), folders: folders.sort(byName), files: files.sort(byName) };
  };

  const upload = (virtualPath, file) => {
    if (file.data.length > maxUploadSize) {
      throw fail(413, 'Fichier trop volumineux (maximum ' + Math.round(maxUploadSize / 1024 / 1024) + ' Mo)');
    }
    if (!acceptsMime(file.mime)) {
      throw fail(415, 'Type de fichier refusé : ' + file.mime);
    }

    const room = quota();
    if (room.maxFiles > 0 && room.files >= room.maxFiles) {
      throw fail(507, 'Quota atteint : ' + room.files + ' / ' + room.maxFiles + ' fichiers');
    }
    if (room.maxFileSize > 0 && file.data.length > room.maxFileSize) {
      throw fail(413, 'Ce fichier dépasse le poids autorisé par votre offre');
    }

    requireExisting(virtualPath);
    const name = uniqueName(virtualPath, safeName(file.filename));
    const destination = join(virtualPath, name);
    fs.writeFileSync(toDisk(destination), file.data);
    return { file: toFile(destination) };
  };

  const createFolder = (virtualPath, name) => {
    requireExisting(virtualPath);
    const folderPath = join(virtualPath, safeName(name));
    if (fs.existsSync(toDisk(folderPath))) {
      throw fail(409, 'Un dossier de ce nom existe déjà');
    }
    fs.mkdirSync(toDisk(folderPath));
    return { folder: toFolder(folderPath) };
  };

  const deleteFolder = (virtualPath) => {
    if (normalize(virtualPath) === '/') {
      throw fail(403, 'La racine ne peut pas être supprimée');
    }
    const disk = requireExisting(virtualPath);
    fs.rmSync(disk, { recursive: true, force: true });
    return { deleted: normalize(virtualPath) };
  };

  const deleteFile = (virtualPath) => {
    const disk = requireExisting(virtualPath);
    if (fs.statSync(disk).isDirectory()) {
      throw fail(400, 'Utilisez /folder pour supprimer un dossier');
    }
    fs.unlinkSync(disk);
    return { deleted: normalize(virtualPath) };
  };

  const transfer = (sources, target, mode) => {
    requireExisting(target);
    const files = (Array.isArray(sources) ? sources : []).map((source) => {
      const sourceDisk = requireExisting(source);
      const name = uniqueName(target, path.basename(normalize(source)));
      const destination = join(target, name);

      if (mode === 'move') {
        fs.renameSync(sourceDisk, toDisk(destination));
      } else {
        fs.cpSync(sourceDisk, toDisk(destination), { recursive: true });
      }
      return toFile(destination);
    });
    return { files };
  };

  const rename = (virtualPath, name) => {
    const disk = requireExisting(virtualPath);
    const folder = parentOf(virtualPath);
    if (folder === null) {
      throw fail(403, 'La racine ne peut pas être renommée');
    }
    const destination = join(folder, safeName(name));
    if (fs.existsSync(toDisk(destination))) {
      throw fail(409, 'Un élément de ce nom existe déjà');
    }
    fs.renameSync(disk, toDisk(destination));
    return { file: toFile(destination) };
  };

  /**
   * Enregistre un binaire renvoyé par l'éditeur d'images (data url + métadonnées).
   *
   * Deux cas, que `metadata.replaces` distingue :
   *
   * * il désigne un fichier existant → le contenu actuel est archivé, puis remplacé. Le fichier
   *   garde son nom et son adresse : les pages qui l'affichent déjà ne cassent pas ;
   * * il est absent → un nouveau fichier est créé, sous un nom libre.
   */
  const save = (virtualPath, name, data, metadata) => {
    requireExisting(virtualPath);
    const meta = metadata && typeof metadata === 'object' ? metadata : {};
    const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(String(data || ''));
    if (match === null) {
      throw fail(400, 'Image attendue sous forme de data url');
    }

    const mime = meta.format || match[1] || 'image/png';
    const content = match[2] ? Buffer.from(match[3], 'base64') : Buffer.from(decodeURIComponent(match[3]), 'utf8');
    if (content.length > maxUploadSize) {
      throw fail(413, 'Image trop volumineuse');
    }
    if (!acceptsMime(mime)) {
      throw fail(415, 'Type de fichier refusé : ' + mime);
    }

    const room = quota();
    if (room.maxFileSize > 0 && content.length > room.maxFileSize) {
      throw fail(413, 'Ce fichier dépasse le poids autorisé par votre offre');
    }

    const replaces = resolveReplaced(meta.replaces);

    if (replaces !== null) {
      // Une version de plus compte pour un fichier de plus.
      if (room.maxFiles > 0 && room.files >= room.maxFiles) {
        throw fail(507, 'Quota atteint : supprimez des fichiers ou d’anciennes versions');
      }
      archive(replaces, meta.label || 'Avant retouche');
      fs.writeFileSync(toDisk(replaces), content);
      return { file: toFile(replaces) };
    }

    if (room.maxFiles > 0 && room.files >= room.maxFiles) {
      throw fail(507, 'Quota atteint : ' + room.files + ' / ' + room.maxFiles + ' fichiers');
    }

    const folder = typeof meta.folder === 'string' && meta.folder !== '' ? normalize(meta.folder) : virtualPath;
    requireExisting(folder);
    const extension = path.extname(name || '') || '.' + (mime.split('/')[1] || 'png').replace('+xml', '');
    const base = path.basename(safeName(meta.title || name || 'image' + extension), path.extname(name || ''));
    const destination = join(folder, uniqueName(folder, base + extension));
    fs.writeFileSync(toDisk(destination), content);
    return { file: toFile(destination) };
  };

  // --- routage -------------------------------------------------------------

  /**
   * Traite une requête de l'API. Renvoie `null` si l'URL ne correspond à aucun point d'entrée,
   * pour laisser le serveur essayer les autres routes.
   */
  const handle = (request, url, body) => {
    const endpoint = url.pathname;
    const method = request.method.toUpperCase();
    const query = url.searchParams;
    const json = () => {
      if (!body || body.length === 0) {
        return {};
      }
      try {
        return JSON.parse(body.toString('utf8'));
      } catch (_err) {
        throw fail(400, 'Corps JSON invalide');
      }
    };

    if (endpoint === '/list' && method === 'GET') {
      return list(query.get('path') || '/');
    }
    if (endpoint === '/upload' && method === 'POST') {
      const parsed = multipart.parse(body, request.headers['content-type']);
      const file = parsed.files.find((entry) => entry.field === 'file');
      if (file === undefined) {
        throw fail(400, 'Aucun fichier reçu');
      }
      return upload(parsed.fields.path || '/', file);
    }
    if (endpoint === '/folder' && method === 'POST') {
      const data = json();
      return createFolder(data.path || '/', data.name);
    }
    if (endpoint === '/folder' && method === 'DELETE') {
      return deleteFolder(query.get('path'));
    }
    if (endpoint === '/file' && method === 'DELETE') {
      return deleteFile(query.get('path'));
    }
    if ((endpoint === '/move' || endpoint === '/copy') && method === 'POST') {
      const data = json();
      return transfer(data.sources, data.target, endpoint === '/move' ? 'move' : 'copy');
    }
    if (endpoint === '/rename' && method === 'POST') {
      const data = json();
      return rename(data.path, data.name);
    }
    if (endpoint === '/save' && method === 'POST') {
      const data = json();
      return save(data.path || '/', data.name, data.data, data.metadata);
    }
    if (endpoint === '/versions' && method === 'GET') {
      return versions(query.get('path'));
    }
    if (endpoint === '/version/restore' && method === 'POST') {
      const data = json();
      return restoreVersion(data.path, data.versionId);
    }
    if (endpoint === '/quota' && method === 'GET') {
      return { quota: quota() };
    }

    return null;
  };

  return { handle, list, toDisk, normalize, mimeOf, quota, versions };
};

module.exports = { create, mimeOf };
