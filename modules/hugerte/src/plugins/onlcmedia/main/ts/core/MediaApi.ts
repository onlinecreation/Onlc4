import { Arr, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import * as Http from 'hugerte/plugins/onlcshared/Http';

import * as Options from '../api/Options';
import { MediaFile, MediaFolder, MediaHandlers, MediaListing, MediaMetadata, MediaQuota, MediaVersion } from '../api/Types';

/**
 * Client of the ONLC media API. Every operation can be overridden one by one through the
 * `onlc_media_handlers` option, which is the recommended way to plug an existing back office.
 */

export interface MediaApi {
  readonly isConfigured: () => boolean;
  readonly list: (path: string) => Promise<MediaListing>;
  readonly upload: (path: string, file: File) => Promise<MediaFile>;
  readonly createFolder: (path: string, name: string) => Promise<MediaFolder>;
  readonly deleteFolder: (path: string) => Promise<void>;
  readonly deleteFile: (path: string) => Promise<void>;
  readonly move: (sources: string[], target: string) => Promise<MediaFile[]>;
  readonly copy: (sources: string[], target: string) => Promise<MediaFile[]>;
  readonly rename: (path: string, name: string) => Promise<MediaFile>;
  /**
   * Enregistre un binaire. Sur un fichier existant, l'api en fait une **nouvelle version** :
   * l'ancienne reste accessible par `versions`.
   */
  readonly save: (path: string, name: string, data: string, metadata?: MediaMetadata) => Promise<MediaFile>;
  /** Historique d'un fichier, de la plus récente à la plus ancienne. */
  readonly versions: (path: string) => Promise<MediaVersion[]>;
  /** Remet une version antérieure en service. Elle devient la version courante. */
  readonly restoreVersion: (path: string, versionId: string) => Promise<MediaFile>;
  /** Quotas du compte. Redemandés à chaque fois qu'ils servent. */
  readonly quota: () => Promise<MediaQuota>;
}

const normalizePath = (path: string): string => {
  const trimmed = path.trim();
  const withLeading = trimmed.charAt(0) === '/' ? trimmed : `/${trimmed}`;
  return withLeading.length > 1 && withLeading.charAt(withLeading.length - 1) === '/'
    ? withLeading.substring(0, withLeading.length - 1)
    : withLeading;
};

const parentOf = (path: string): string => {
  const normalized = normalizePath(path);
  const index = normalized.lastIndexOf('/');
  return index <= 0 ? '/' : normalized.substring(0, index);
};

const joinPath = (path: string, name: string): string => {
  const normalized = normalizePath(path);
  return normalized === '/' ? `/${name}` : `${normalized}/${name}`;
};

const create = (editor: Editor): MediaApi => {
  const handlers: MediaHandlers = Options.getHandlers(editor) ?? {};
  const baseUrl = Options.getApiUrl(editor).replace(/\/$/, '');

  const requestSpec = (endpoint: string, spec: Partial<Http.HttpRequest>): Http.HttpRequest => ({
    url: `${baseUrl}${endpoint}`,
    headers: Options.getApiHeaders(editor),
    credentials: Options.getApiCredentials(editor),
    ...spec
  });

  const failWhenUnconfigured = <T>(): Promise<T> =>
    Promise.reject(new Error('Aucune API média configurée : renseignez `onlc_media_api_url` ou `onlc_media_handlers`.'));

  const withHandler = <T>(handler: ((...args: any[]) => Promise<T>) | undefined, args: unknown[], fallback: () => Promise<T>): Promise<T> => {
    if (Type.isFunction(handler)) {
      return Promise.resolve(handler(...args));
    } else if (baseUrl === '') {
      return failWhenUnconfigured<T>();
    } else {
      return fallback();
    }
  };

  const normalizeListing = (path: string, listing: Partial<MediaListing>): MediaListing => ({
    path: Type.isString(listing.path) ? listing.path : path,
    parent: Type.isString(listing.parent) || listing.parent === null ? listing.parent : parentOf(path),
    folders: Arr.map(listing.folders ?? [], (folder) => ({
      ...folder,
      path: Type.isString(folder.path) ? folder.path : joinPath(path, folder.name)
    })),
    files: Arr.map(listing.files ?? [], (file) => ({
      ...file,
      path: Type.isString(file.path) ? file.path : joinPath(path, file.name)
    }))
  });

  const list = (path: string): Promise<MediaListing> =>
    withHandler(handlers.list, [ path ], () =>
      Http.request<Partial<MediaListing>>(requestSpec('/list', { params: { path }}))
    ).then((listing) => normalizeListing(path, listing as Partial<MediaListing>));

  const upload = (path: string, file: File): Promise<MediaFile> =>
    withHandler(handlers.upload, [ path, file ], () => {
      const body = new FormData();
      body.append('path', path);
      body.append('file', file, file.name);
      return Http.request<{ file: MediaFile } | MediaFile>(requestSpec('/upload', { method: 'POST', body }))
        .then((response) => (response as { file: MediaFile }).file ?? response as MediaFile);
    });

  const createFolder = (path: string, name: string): Promise<MediaFolder> =>
    withHandler(handlers.createFolder, [ path, name ], () =>
      Http.request<{ folder: MediaFolder } | MediaFolder>(requestSpec('/folder', { method: 'POST', body: { path, name }}))
        .then((response) => (response as { folder: MediaFolder }).folder ?? response as MediaFolder)
    );

  const deleteFolder = (path: string): Promise<void> =>
    withHandler(handlers.deleteFolder, [ path ], () =>
      Http.request<unknown>(requestSpec('/folder', { method: 'DELETE', params: { path }})).then(() => undefined)
    );

  const deleteFile = (path: string): Promise<void> =>
    withHandler(handlers.deleteFile, [ path ], () =>
      Http.request<unknown>(requestSpec('/file', { method: 'DELETE', params: { path }})).then(() => undefined)
    );

  const transfer = (endpoint: '/move' | '/copy') => (sources: string[], target: string): Promise<MediaFile[]> =>
    Http.request<{ files?: MediaFile[] }>(requestSpec(endpoint, { method: 'POST', body: { sources, target }}))
      .then((response) => response.files ?? []);

  const move = (sources: string[], target: string): Promise<MediaFile[]> =>
    withHandler(handlers.move, [ sources, target ], () => transfer('/move')(sources, target));

  const copy = (sources: string[], target: string): Promise<MediaFile[]> =>
    withHandler(handlers.copy, [ sources, target ], () => transfer('/copy')(sources, target));

  const rename = (path: string, name: string): Promise<MediaFile> =>
    withHandler(handlers.rename, [ path, name ], () =>
      Http.request<{ file: MediaFile } | MediaFile>(requestSpec('/rename', { method: 'POST', body: { path, name }}))
        .then((response) => (response as { file: MediaFile }).file ?? response as MediaFile)
    );

  const save = (path: string, name: string, data: string, metadata?: MediaMetadata): Promise<MediaFile> =>
    withHandler(handlers.save, [ path, name, data, metadata ], () =>
      Http.request<{ file: MediaFile } | MediaFile>(requestSpec('/save', { method: 'POST', body: { path, name, data, metadata }}))
        .then((response) => (response as { file: MediaFile }).file ?? response as MediaFile)
    );

  const versions = (path: string): Promise<MediaVersion[]> =>
    withHandler(handlers.versions, [ path ], () =>
      Http.request<{ versions?: MediaVersion[] }>(requestSpec('/versions', { params: { path }}))
        .then((response) => response.versions ?? [])
    ).then((result) => Type.isArray(result) ? result : []);

  const restoreVersion = (path: string, versionId: string): Promise<MediaFile> =>
    withHandler(handlers.restoreVersion, [ path, versionId ], () =>
      Http.request<{ file: MediaFile } | MediaFile>(requestSpec('/version/restore', { method: 'POST', body: { path, versionId }}))
        .then((response) => (response as { file: MediaFile }).file ?? response as MediaFile)
    );

  const quota = (): Promise<MediaQuota> =>
    withHandler(handlers.quota, [], () =>
      Http.request<{ quota?: MediaQuota } | MediaQuota>(requestSpec('/quota', {}))
        .then((response) => (response as { quota: MediaQuota }).quota ?? response as MediaQuota)
    );

  return {
    isConfigured: () => baseUrl !== '' || Object.keys(handlers).length > 0,
    list,
    upload,
    createFolder,
    deleteFolder,
    deleteFile,
    move,
    copy,
    rename,
    save,
    versions,
    restoreVersion,
    quota
  };
};

export {
  create,
  normalizePath,
  parentOf,
  joinPath
};
