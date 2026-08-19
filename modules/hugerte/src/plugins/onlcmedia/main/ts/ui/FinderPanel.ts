import { Arr, Fun, Optional, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

import * as Options from '../api/Options';
import { MediaFile, MediaFolder, MediaListing } from '../api/Types';
import * as MediaApi from '../core/MediaApi';

/**
 * Médiathèque, dessinée sur le modèle du Finder de macOS.
 *
 * Trois zones qu'on retrouve dans tous les gestionnaires de fichiers, et que l'on reconnaît donc
 * sans explication :
 *
 * 1. une **barre latérale** avec les dossiers, dépliés depuis la racine ;
 * 2. une **grille de vignettes** au centre, où l'on sélectionne d'un clic et où l'on ouvre d'un
 *    double clic — exactement comme sur un bureau ;
 * 3. un **panneau d'informations** à droite, qui décrit le fichier sélectionné et regroupe les
 *    actions qui le concernent.
 *
 * Au-dessus, une barre d'outils : chemin en fil d'Ariane, recherche, et les trois actions qui
 * créent quelque chose (nouveau dossier, téléverser, dessiner une image).
 *
 * Tous les boutons font au moins 50 × 50 pixels, taille minimale confortable au doigt.
 */

export interface FinderSpec {
  /** Dossier ouvert au démarrage. */
  readonly path: string;
  /** Autorise la sélection de plusieurs fichiers. */
  readonly multiple?: boolean;
  /** Limite l'affichage aux fichiers dont le type correspond, par exemple `image/`. */
  readonly accept?: string;
  /** Appelé à chaque changement de sélection. */
  readonly onSelectionChange?: (files: MediaFile[]) => void;
  /** Appelé quand un fichier est validé d'un double clic. */
  readonly onConfirm?: (files: MediaFile[]) => void;
  /** Ouvre l'éditeur d'images sur un fichier, ou sur une image vierge. */
  readonly onEditImage?: (file: Optional<MediaFile>, done: () => void) => void;
  /** Demande une saisie à l'utilisateur (nom de dossier, nouveau nom…). */
  readonly onPrompt: (spec: { title: string; label: string; initialValue?: string; submitText: string; onSubmit: (value: string) => void }) => void;
  /** Demande une confirmation. */
  readonly onConfirmAction: (message: string, onYes: () => void) => void;
  /** Signale une erreur. */
  readonly onError: (message: string) => void;
}

export interface FinderInstance {
  readonly element: HTMLElement;
  readonly selection: () => MediaFile[];
  readonly refresh: () => void;
  readonly destroy: () => void;
}

const styleId = 'onlc-finder-styles';

const styles = `
/* Préfixé par .tox pour passer devant le reset très large du thème. */
.tox .onlc-finder { display: flex; flex-direction: column; width: 100%; height: 100%; min-height: 440px; border: 1px solid rgba(34, 47, 62, 0.2); border-radius: 8px; overflow: hidden; background: #ffffff; color: #22303c; }
.tox .onlc-finder__toolbar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; padding: 8px; border-bottom: 1px solid rgba(34, 47, 62, 0.12); background: #f6f8fa; }
.tox .onlc-finder__tool {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  min-width: 50px; min-height: 50px; padding: 0 14px; border: 1px solid rgba(34, 47, 62, 0.18);
  border-radius: 8px; background: #ffffff; font: inherit; color: #22303c;
  cursor: pointer;
}
.tox .onlc-finder__tool:hover { background: #eef2f6; }
.tox .onlc-finder__tool:disabled { opacity: 0.4; cursor: default; }
.tox .onlc-finder__tool--icon { padding: 0; }
.tox .onlc-finder__search { flex: 1 1 180px; min-width: 140px; min-height: 50px; padding: 0 14px; border: 1px solid rgba(34, 47, 62, 0.18); border-radius: 8px; font: inherit; color: #22303c; background: #ffffff; }
.tox .onlc-finder__crumbs { display: flex; flex-wrap: wrap; gap: 2px; align-items: center; padding: 6px 10px; border-bottom: 1px solid rgba(34, 47, 62, 0.12); font-size: 13px; background: #ffffff; }
.tox .onlc-finder__crumb { min-height: 32px; padding: 4px 8px; border: 0; border-radius: 6px; background: transparent; font: inherit; color: #006ce7; cursor: pointer; }
.tox .onlc-finder__crumb:hover { background: #eef4fd; }
.tox .onlc-finder__crumb--current { color: #22303c; font-weight: 600; cursor: default; }
.tox .onlc-finder__crumb-sep { color: #b3bcc5; }
.tox .onlc-finder__body { display: flex; flex: 1 1 auto; min-height: 0; }
.tox .onlc-finder__sidebar { flex: 0 0 200px; overflow-y: auto; padding: 8px; border-right: 1px solid rgba(34, 47, 62, 0.12); background: #f6f8fa; }
.tox .onlc-finder__sidebar-title { display: block; padding: 4px 8px 8px; font-size: 11px; font-weight: 700; color: #8a949e; text-transform: uppercase; letter-spacing: 0.04em; }
.tox .onlc-finder__place { display: flex; align-items: center; gap: 8px; width: 100%; min-height: 40px; padding: 6px 8px; border: 0; border-radius: 6px; background: transparent; font: inherit; color: #22303c; text-align: left; cursor: pointer; }
.tox .onlc-finder__place:hover { background: #e6ebf0; }
.tox .onlc-finder__place--current { background: #006ce7; color: #ffffff; }
.tox .onlc-finder__main { position: relative; display: flex; flex: 1 1 auto; flex-direction: column; min-width: 0; }
.tox .onlc-finder__grid { display: flex; flex: 1 1 auto; flex-wrap: wrap; gap: 10px; align-content: flex-start; padding: 12px; overflow-y: auto; }
.tox .onlc-finder__item {
  display: flex; flex-direction: column; gap: 6px; align-items: center;
  width: 128px; min-height: 128px; padding: 8px; border: 2px solid transparent;
  border-radius: 10px; background: transparent; font: inherit; color: inherit;
  cursor: pointer;
}
.tox .onlc-finder__item:hover { background: #f0f3f6; }
.tox .onlc-finder__item--selected { border-color: #006ce7; background: #eef4fd; }
.tox .onlc-finder__thumb { display: flex; align-items: center; justify-content: center; width: 96px; height: 72px; border-radius: 6px; background: #e9edf1 center/cover no-repeat; color: #5a6570; }
.tox .onlc-finder__name { width: 100%; overflow: hidden; font-size: 12px; line-height: 1.3; text-align: center; text-overflow: ellipsis; word-break: break-word; }
.tox .onlc-finder__empty { flex: 1 1 auto; padding: 40px 24px; color: #5a6570; text-align: center; }
.tox .onlc-finder__info { flex: 0 0 240px; overflow-y: auto; padding: 12px; border-left: 1px solid rgba(34, 47, 62, 0.12); background: #fbfcfd; }
.tox .onlc-finder__preview { width: 100%; height: 150px; margin-bottom: 10px; border-radius: 8px; background: #e9edf1 center/contain no-repeat; }
.tox .onlc-finder__info-name { display: block; font-weight: 600; word-break: break-word; }
.tox .onlc-finder__info-line { display: block; margin-top: 2px; font-size: 12px; color: #5a6570; }
.tox .onlc-finder__actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
.tox .onlc-finder__action { flex: 1 1 100%; min-height: 50px; padding: 0 12px; border: 1px solid rgba(34, 47, 62, 0.18); border-radius: 8px; background: #ffffff; font: inherit; color: #22303c; cursor: pointer; }
.tox .onlc-finder__action:hover { background: #eef2f6; }
.tox .onlc-finder__action--danger:hover { background: #fdecec; color: #b4241f; }
.tox .onlc-finder__status { padding: 6px 12px; border-top: 1px solid rgba(34, 47, 62, 0.12); font-size: 12px; color: #5a6570; background: #f6f8fa; }
.tox .onlc-finder__drop {
  position: absolute; top: 0; right: 0; bottom: 0;
  left: 0; display: flex; align-items: center; justify-content: center;
  font-weight: 600; color: #006ce7; background: rgba(0, 108, 231, 0.08); border: 2px dashed #006ce7;
  border-radius: 8px; pointer-events: none;
}
.tox .onlc-finder__file-input { display: none; }
`;

const folderGlyph =
  '<svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="#7fb3ff" stroke="#3f83d6" stroke-width="1.2"></path></svg>';

const fileGlyph =
  '<svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true"><path d="M6 2.5h8l4.5 4.5v14.5H6z" fill="#ffffff" stroke="currentColor" stroke-width="1.4"></path><path d="M14 2.5V7h4.5" fill="none" stroke="currentColor" stroke-width="1.4"></path></svg>';

const injectStyles = (doc: Document): void => {
  if (doc.getElementById(styleId) === null) {
    const style = doc.createElement('style');
    style.id = styleId;
    style.textContent = styles;
    doc.head.appendChild(style);
  }
};

/**
 * Adresse posée en fond d'un élément.
 *
 * Deux échappements sont nécessaires, et dans cet ordre : les caractères qui refermeraient la
 * parenthèse du `url(...)` ou la déclaration css, puis ceux qui refermeraient l'attribut
 * `style`. Une adresse vient de l'api du site : elle n'a pas à être hostile, mais elle n'a pas
 * non plus à pouvoir injecter du balisage dans le dialogue.
 */
const backgroundUrl = (editor: Editor, url: string): string => {
  const escapes: Record<string, string> = {
    '\\': '%5C', '"': '%22', '\'': '%27', '(': '%28', ')': '%29'
  };
  const safe = url.trim().replace(/[\\"'()]|\s/g, (character) => escapes[character] ?? '%20');
  return /^\s*(javascript|vbscript)\s*:/i.test(url) ? '' : safe;
};

const isImage = (file: MediaFile): boolean =>
  Type.isString(file.mime) ? file.mime.indexOf('image/') === 0 : /\.(png|jpe?g|gif|webp|avif|svg|bmp)$/i.test(file.name);

const humanSize = (size: number | undefined): string => {
  if (!Type.isNumber(size) || size <= 0) {
    return '';
  }
  const units = [ 'o', 'ko', 'Mo', 'Go' ];
  const power = Math.min(units.length - 1, Math.floor(Math.log(size) / Math.log(1024)));
  const value = size / Math.pow(1024, power);
  return `${power === 0 ? value : value.toFixed(1)} ${units[power]}`;
};

const matchesAccept = (file: MediaFile, accept: string | undefined): boolean => {
  if (!Type.isString(accept) || accept.trim() === '') {
    return true;
  }
  if (accept.indexOf('image') !== -1) {
    return isImage(file);
  }
  const extension = accept.replace(/^\./, '').toLowerCase();
  return new RegExp(`\\.${extension}$`, 'i').test(file.name) ||
    (Type.isString(file.mime) && file.mime.indexOf(accept) !== -1);
};

/** Segments cliquables du chemin courant. */
const crumbsOf = (path: string): Array<{ label: string; path: string }> => {
  const normalized = MediaApi.normalizePath(path);
  const parts = Arr.filter(normalized.split('/'), (part) => part !== '');
  const crumbs = [{ label: 'Médiathèque', path: '/' }];
  let current = '';
  Arr.each(parts, (part) => {
    current += `/${part}`;
    crumbs.push({ label: part, path: current });
  });
  return crumbs;
};

const create = (editor: Editor, api: MediaApi.MediaApi, spec: FinderSpec): FinderInstance => {
  const doc = document;
  injectStyles(doc);

  let path = MediaApi.normalizePath(spec.path);
  let listing: MediaListing = { path, parent: null, folders: [], files: [] };
  let selected: MediaFile[] = [];
  let filter = '';
  let visited: string[] = [ path ];

  const element = doc.createElement('div');
  element.className = 'onlc-finder';

  const toolbar = doc.createElement('div');
  toolbar.className = 'onlc-finder__toolbar';

  const crumbs = doc.createElement('nav');
  crumbs.className = 'onlc-finder__crumbs';
  crumbs.setAttribute('aria-label', 'Chemin du dossier');

  const body = doc.createElement('div');
  body.className = 'onlc-finder__body';

  const sidebar = doc.createElement('aside');
  sidebar.className = 'onlc-finder__sidebar';

  const main = doc.createElement('div');
  main.className = 'onlc-finder__main';

  const grid = doc.createElement('div');
  grid.className = 'onlc-finder__grid';

  const info = doc.createElement('aside');
  info.className = 'onlc-finder__info';

  const status = doc.createElement('p');
  status.className = 'onlc-finder__status';

  const fileInput = doc.createElement('input');
  fileInput.type = 'file';
  fileInput.multiple = true;
  fileInput.className = 'onlc-finder__file-input';

  main.appendChild(grid);
  body.appendChild(sidebar);
  body.appendChild(main);
  body.appendChild(info);
  element.appendChild(toolbar);
  element.appendChild(crumbs);
  element.appendChild(body);
  element.appendChild(status);
  element.appendChild(fileInput);

  const setStatus = (message: string) => {
    status.textContent = message;
  };

  const tool = (label: string, onClick: () => void, glyph?: string): HTMLButtonElement => {
    const button = doc.createElement('button');
    button.type = 'button';
    button.className = 'onlc-finder__tool';
    button.title = editor.translate(label) as string;
    const text = editor.dom.encode(editor.translate(label) as string);
    button.innerHTML = Type.isString(glyph) ? `${glyph}<span>${text}</span>` : text;
    button.addEventListener('click', onClick);
    return button;
  };

  const notifySelection = () => {
    spec.onSelectionChange?.(selected);
  };

  /* Rendu ------------------------------------------------------------------ */

  const renderCrumbs = () => {
    crumbs.innerHTML = '';
    const parts = crumbsOf(path);
    Arr.each(parts, (crumb, index) => {
      if (index > 0) {
        const separator = doc.createElement('span');
        separator.className = 'onlc-finder__crumb-sep';
        separator.textContent = '›';
        crumbs.appendChild(separator);
      }
      const button = doc.createElement('button');
      button.type = 'button';
      const isLast = index === parts.length - 1;
      button.className = `onlc-finder__crumb${isLast ? ' onlc-finder__crumb--current' : ''}`;
      button.textContent = crumb.label;
      button.disabled = isLast;
      button.addEventListener('click', () => load(crumb.path));
      crumbs.appendChild(button);
    });
  };

  const renderSidebar = () => {
    sidebar.innerHTML = '';
    const title = doc.createElement('span');
    title.className = 'onlc-finder__sidebar-title';
    title.textContent = editor.translate('Emplacements');
    sidebar.appendChild(title);

    const places: Array<{ label: string; target: string }> = [{ label: 'Médiathèque', target: '/' }];
    Arr.each(visited, (place) => {
      if (place !== '/' && !Arr.exists(places, (entry) => entry.target === place)) {
        places.push({ label: place.split('/').pop() ?? place, target: place });
      }
    });
    Arr.each(listing.folders, (folder: MediaFolder) => {
      if (!Arr.exists(places, (entry) => entry.target === folder.path)) {
        places.push({ label: folder.name, target: folder.path });
      }
    });

    Arr.each(places, (place) => {
      const button = doc.createElement('button');
      button.type = 'button';
      button.className = `onlc-finder__place${place.target === path ? ' onlc-finder__place--current' : ''}`;
      button.innerHTML = `${folderGlyph.replace('width="40" height="40"', 'width="20" height="20"')}<span>${editor.dom.encode(place.label)}</span>`;
      button.addEventListener('click', () => load(place.target));
      sidebar.appendChild(button);
    });
  };

  const isSelected = (file: MediaFile): boolean => Arr.exists(selected, (entry) => entry.path === file.path);

  const toggle = (file: MediaFile, additive: boolean) => {
    if (spec.multiple === true && additive) {
      selected = isSelected(file)
        ? Arr.filter(selected, (entry) => entry.path !== file.path)
        : selected.concat([ file ]);
    } else if (spec.multiple === true && isSelected(file) && selected.length > 1) {
      selected = [ file ];
    } else {
      selected = [ file ];
    }
    renderGrid();
    renderInfo();
    notifySelection();
  };

  const renderGrid = () => {
    grid.innerHTML = '';
    const needle = filter.trim().toLowerCase();
    const folders = Arr.filter(listing.folders, (folder) => needle === '' || folder.name.toLowerCase().indexOf(needle) !== -1);
    const files = Arr.filter(listing.files, (file) =>
      matchesAccept(file, spec.accept) && (needle === '' || file.name.toLowerCase().indexOf(needle) !== -1));

    if (folders.length === 0 && files.length === 0) {
      const empty = doc.createElement('p');
      empty.className = 'onlc-finder__empty';
      empty.textContent = editor.translate(needle === ''
        ? 'Ce dossier est vide. Déposez des fichiers ici, ou utilisez « Téléverser… ».'
        : 'Aucun fichier ne correspond à cette recherche.');
      grid.appendChild(empty);
      return;
    }

    Arr.each(folders, (folder) => {
      const item = doc.createElement('button');
      item.type = 'button';
      item.className = 'onlc-finder__item';
      item.innerHTML =
        `<span class="onlc-finder__thumb">${folderGlyph}</span>` +
        `<span class="onlc-finder__name">${editor.dom.encode(folder.name)}</span>`;
      item.addEventListener('click', () => load(folder.path));
      grid.appendChild(item);
    });

    Arr.each(files, (file) => {
      const item = doc.createElement('button');
      item.type = 'button';
      item.className = `onlc-finder__item${isSelected(file) ? ' onlc-finder__item--selected' : ''}`;
      const thumb = isImage(file)
        ? `<span class="onlc-finder__thumb" style="background-image: url(${backgroundUrl(editor, file.thumbnailUrl ?? file.url)})"></span>`
        : `<span class="onlc-finder__thumb">${fileGlyph}</span>`;
      item.innerHTML = thumb + `<span class="onlc-finder__name">${editor.dom.encode(file.name)}</span>`;
      item.addEventListener('click', (e) => toggle(file, e.metaKey || e.ctrlKey));
      item.addEventListener('dblclick', () => {
        selected = [ file ];
        notifySelection();
        spec.onConfirm?.(selected);
      });
      grid.appendChild(item);
    });
  };

  const action = (label: string, onClick: () => void, danger = false): HTMLButtonElement => {
    const button = doc.createElement('button');
    button.type = 'button';
    button.className = `onlc-finder__action${danger ? ' onlc-finder__action--danger' : ''}`;
    button.textContent = editor.translate(label);
    button.addEventListener('click', onClick);
    return button;
  };

  const renderInfo = () => {
    info.innerHTML = '';

    if (selected.length === 0) {
      const hint = doc.createElement('p');
      hint.className = 'onlc-finder__info-line';
      hint.textContent = editor.translate('Cliquez sur un fichier pour voir ses informations et les actions possibles. ' +
        'Un double clic le choisit directement.');
      info.appendChild(hint);
      return;
    }

    if (selected.length > 1) {
      const count = doc.createElement('span');
      count.className = 'onlc-finder__info-name';
      count.textContent = `${selected.length} ${editor.translate('fichiers sélectionnés')}`;
      info.appendChild(count);
      return;
    }

    const file = selected[0];

    const preview = doc.createElement('div');
    preview.className = 'onlc-finder__preview';
    if (isImage(file)) {
      preview.style.backgroundImage = `url(${backgroundUrl(editor, file.thumbnailUrl ?? file.url)})`;
    } else {
      preview.innerHTML = fileGlyph;
    }
    info.appendChild(preview);

    const name = doc.createElement('span');
    name.className = 'onlc-finder__info-name';
    name.textContent = file.name;
    info.appendChild(name);

    const lines = Arr.filter([
      Type.isNumber(file.width) && Type.isNumber(file.height) ? `${file.width} × ${file.height} pixels` : '',
      humanSize(file.size),
      Type.isString(file.modified) ? `Modifié le ${file.modified}` : ''
    ], (line) => line !== '');

    Arr.each(lines, (line) => {
      const element_ = doc.createElement('span');
      element_.className = 'onlc-finder__info-line';
      element_.textContent = line;
      info.appendChild(element_);
    });

    const actions = doc.createElement('div');
    actions.className = 'onlc-finder__actions';

    if (isImage(file) && Type.isFunction(spec.onEditImage)) {
      actions.appendChild(action('Retoucher l’image…', () => {
        spec.onEditImage?.(Optional.some(file), () => load(path));
      }));
    }

    actions.appendChild(action('Renommer…', () => {
      spec.onPrompt({
        title: 'Renommer le fichier',
        label: 'Nouveau nom',
        initialValue: file.name,
        submitText: 'Renommer',
        onSubmit: (value) => run('Renommage…', api.rename(file.path, value))
      });
    }));

    actions.appendChild(action('Copier vers…', () => {
      spec.onPrompt({
        title: 'Copier vers',
        label: 'Dossier de destination',
        initialValue: path,
        submitText: 'Copier',
        onSubmit: (value) => run('Copie…', api.copy([ file.path ], MediaApi.normalizePath(value)))
      });
    }));

    actions.appendChild(action('Déplacer vers…', () => {
      spec.onPrompt({
        title: 'Déplacer vers',
        label: 'Dossier de destination',
        initialValue: path,
        submitText: 'Déplacer',
        onSubmit: (value) => run('Déplacement…', api.move([ file.path ], MediaApi.normalizePath(value)))
      });
    }));

    actions.appendChild(action('Supprimer', () => {
      spec.onConfirmAction(`Supprimer définitivement « ${file.name} » ?`, () => {
        run('Suppression…', api.deleteFile(file.path));
      });
    }, true));

    info.appendChild(actions);
  };

  /* Actions ---------------------------------------------------------------- */

  const run = (message: string, task: Promise<unknown>): void => {
    setStatus(message);
    task.then(() => {
      load(path);
    }, (err: unknown) => {
      setStatus('');
      spec.onError(err instanceof Error ? err.message : String(err));
    });
  };

  const load = (target: string): void => {
    const next = MediaApi.normalizePath(target);
    setStatus('Chargement du dossier…');
    api.list(next).then((result) => {
      path = result.path;
      listing = result;
      selected = [];
      if (!Arr.contains(visited, path)) {
        visited = visited.concat([ path ]).slice(-6);
      }
      renderCrumbs();
      renderSidebar();
      renderGrid();
      renderInfo();
      notifySelection();
      setStatus(`${listing.folders.length} dossier${listing.folders.length > 1 ? 's' : ''}, ` +
        `${listing.files.length} fichier${listing.files.length > 1 ? 's' : ''}`);
    }, (err: unknown) => {
      listing = { path: next, parent: null, folders: [], files: [] };
      renderCrumbs();
      renderGrid();
      renderInfo();
      setStatus('');
      spec.onError(err instanceof Error ? err.message : String(err));
    });
  };

  const upload = (files: File[]): void => {
    const maxSize = Options.getMaxUploadSize(editor);
    const tooBig = Arr.find(files, (file) => maxSize > 0 && file.size > maxSize);

    if (tooBig.isSome()) {
      spec.onError(`Le fichier « ${tooBig.getOrDie().name} » dépasse la taille maximale autorisée.`);
      return;
    }

    run('Téléversement…', Promise.all(Arr.map(files, (file) => api.upload(path, file))));
  };

  /* Barre d'outils --------------------------------------------------------- */

  const search = doc.createElement('input');
  search.type = 'search';
  search.className = 'onlc-finder__search';
  search.placeholder = editor.translate('Rechercher dans ce dossier…');
  search.setAttribute('aria-label', editor.translate('Rechercher dans ce dossier'));
  const onSearch = () => {
    filter = search.value;
    renderGrid();
  };
  search.addEventListener('input', onSearch);

  toolbar.appendChild(tool('Dossier parent', () => {
    load(Type.isString(listing.parent) && listing.parent !== '' ? listing.parent : MediaApi.parentOf(path));
  }));
  toolbar.appendChild(tool('Nouveau dossier', () => {
    spec.onPrompt({
      title: 'Nouveau dossier',
      label: 'Nom du dossier',
      submitText: 'Créer',
      onSubmit: (value) => run('Création…', api.createFolder(path, value))
    });
  }));
  toolbar.appendChild(tool('Téléverser…', () => fileInput.click()));
  toolbar.appendChild(tool('Dessiner une image…', () => {
    spec.onEditImage?.(Optional.none(), () => load(path));
  }));
  toolbar.appendChild(tool('Supprimer ce dossier', () => {
    spec.onConfirmAction(`Supprimer le dossier « ${path} » et tout son contenu ?`, () => {
      const parent = Type.isString(listing.parent) && listing.parent !== '' ? listing.parent : MediaApi.parentOf(path);
      setStatus('Suppression…');
      api.deleteFolder(path).then(() => load(parent), (err: unknown) => {
        setStatus('');
        spec.onError(err instanceof Error ? err.message : String(err));
      });
    });
  }));
  toolbar.appendChild(search);

  const onFileInput = () => {
    const files = fileInput.files;
    if (files !== null && files.length > 0) {
      upload(Arr.map(Arr.range(files.length, Fun.identity), (index) => files[index] as File));
      fileInput.value = '';
    }
  };
  fileInput.addEventListener('change', onFileInput);

  /* Dépôt de fichiers ------------------------------------------------------ */

  let dropHint: HTMLElement | null = null;

  const showDrop = () => {
    if (dropHint === null) {
      dropHint = doc.createElement('div');
      dropHint.className = 'onlc-finder__drop';
      dropHint.textContent = editor.translate('Déposez vos fichiers pour les téléverser');
      main.appendChild(dropHint);
    }
  };

  const hideDrop = () => {
    if (dropHint !== null) {
      main.removeChild(dropHint);
      dropHint = null;
    }
  };

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    showDrop();
  };
  const onDragLeave = (e: DragEvent) => {
    if (e.target === main) {
      hideDrop();
    }
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    hideDrop();
    const files = e.dataTransfer?.files;
    if (Type.isNonNullable(files) && files.length > 0) {
      upload(Arr.map(Arr.range(files.length, Fun.identity), (index) => files[index] as File));
    }
  };

  main.addEventListener('dragover', onDragOver);
  main.addEventListener('dragleave', onDragLeave);
  main.addEventListener('drop', onDrop);

  renderCrumbs();
  renderSidebar();
  renderGrid();
  renderInfo();
  load(path);

  return {
    element,
    selection: () => selected,
    refresh: () => load(path),
    destroy: () => {
      search.removeEventListener('input', onSearch);
      fileInput.removeEventListener('change', onFileInput);
      main.removeEventListener('dragover', onDragOver);
      main.removeEventListener('dragleave', onDragLeave);
      main.removeEventListener('drop', onDrop);
      element.innerHTML = '';
    }
  };
};

export {
  isImage,
  humanSize,
  crumbsOf,
  backgroundUrl,
  create
};
