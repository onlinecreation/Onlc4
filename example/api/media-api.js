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

const create = ({ root, publicPrefix = '/media', maxUploadSize = 8 * 1024 * 1024 }) => {

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
    if (!/^image\//.test(file.mime)) {
      throw fail(415, 'Seules les images sont acceptées dans cette démonstration');
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

  /** Enregistre une image renvoyée par l'éditeur Pixel (data url). */
  const save = (virtualPath, name, data) => {
    requireExisting(virtualPath);
    const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(String(data || ''));
    if (match === null) {
      throw fail(400, 'Image attendue sous forme de data url');
    }

    const mime = match[1] || 'image/png';
    const content = match[2] ? Buffer.from(match[3], 'base64') : Buffer.from(decodeURIComponent(match[3]), 'utf8');
    if (content.length > maxUploadSize) {
      throw fail(413, 'Image trop volumineuse');
    }

    const extension = path.extname(name || '') || '.' + (mime.split('/')[1] || 'png').replace('+xml', '');
    const base = path.basename(safeName(name || 'image' + extension), path.extname(name || ''));
    const destination = join(virtualPath, uniqueName(virtualPath, base + extension));
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
      return save(data.path || '/', data.name, data.data);
    }

    return null;
  };

  return { handle, list, toDisk, normalize, mimeOf };
};

module.exports = { create, mimeOf };
