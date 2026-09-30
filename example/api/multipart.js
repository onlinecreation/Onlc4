'use strict';

/**
 * Analyseur `multipart/form-data` minimal, suffisant pour le téléversement de l'explorateur
 * de médias (un champ texte `path` et un fichier `file`). Aucune dépendance externe.
 */

const boundaryOf = (contentType) => {
  const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || '');
  return match === null ? null : (match[1] || match[2]).trim();
};

const headerValue = (headers, name) => {
  const line = headers.split('\r\n').find((h) => h.toLowerCase().startsWith(name.toLowerCase() + ':'));
  return line === undefined ? '' : line.slice(line.indexOf(':') + 1).trim();
};

const parameterOf = (value, name) => {
  const match = new RegExp(name + '="([^"]*)"', 'i').exec(value);
  return match === null ? null : match[1];
};

/**
 * Renvoie `{ fields: { nom: valeur }, files: [ { field, filename, mime, data } ] }`.
 */
const parse = (buffer, contentType) => {
  const boundary = boundaryOf(contentType);
  if (boundary === null) {
    throw new Error('Requête multipart sans délimiteur');
  }

  const separator = Buffer.from('--' + boundary);
  const result = { fields: {}, files: [] };
  let index = buffer.indexOf(separator);

  while (index !== -1) {
    const start = index + separator.length;
    // Fin du corps : le dernier délimiteur est suivi de « -- »
    if (buffer.slice(start, start + 2).toString() === '--') {
      break;
    }

    const next = buffer.indexOf(separator, start);
    const end = next === -1 ? buffer.length : next;
    const part = buffer.slice(start + 2, end - 2); // retire les \r\n encadrants

    const split = part.indexOf('\r\n\r\n');
    if (split !== -1) {
      const headers = part.slice(0, split).toString('utf8');
      const body = part.slice(split + 4);
      const disposition = headerValue(headers, 'content-disposition');
      const field = parameterOf(disposition, 'name');
      const filename = parameterOf(disposition, 'filename');

      if (field !== null) {
        if (filename !== null && filename !== '') {
          result.files.push({
            field,
            filename,
            mime: headerValue(headers, 'content-type') || 'application/octet-stream',
            data: body
          });
        } else {
          result.fields[field] = body.toString('utf8');
        }
      }
    }

    index = next;
  }

  return result;
};

module.exports = { parse };
