import { Arr, Fun, Optional, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

import * as Options from '../api/Options';
import { MediaFile, MediaFolder, MediaListing, MediaQuota, MediaVersion } from '../api/Types';
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
  /**
   * Demande la confirmation d'une suppression. `what` désigne ce qui va disparaître, au
   * complément d'objet : « le fichier “photo.jpg” ». La confirmation est temporelle — il faut
   * maintenir le bouton — et c'est l'appelant qui la présente.
   */
  readonly onDestroy: (what: string, detail: string, onConfirm: () => void) => void;
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
.tox .onlc-finder__branch { display: flex; align-items: center; gap: 2px; }
.tox .onlc-finder__twisty {
  display: flex; align-items: center; justify-content: center; flex: 0 0 auto;
  width: 22px; height: 40px; padding: 0; border: 0; border-radius: 4px;
  background: transparent; color: #5a6570; cursor: pointer;
}
.tox .onlc-finder__twisty:hover { background: #dde3e9; }
.tox .onlc-finder__twisty[data-empty="true"] { visibility: hidden; cursor: default; }
.tox .onlc-finder__twisty svg { transition: transform .12s ease; }
.tox .onlc-finder__twisty[aria-expanded="true"] svg { transform: rotate(90deg); }
.tox .onlc-finder__place {
  display: flex; align-items: center; gap: 8px; flex: 1 1 auto; min-width: 0; min-height: 40px;
  padding: 6px 8px; border: 0; border-radius: 6px; background: transparent;
  font: inherit; color: #22303c; text-align: left; cursor: pointer;
}
.tox .onlc-finder__place span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tox .onlc-finder__place:hover { background: #e6ebf0; }
/* L'état courant doit rester lisible au survol : sans cette règle, la règle de survol — plus
   spécifique — repeint le fond en gris clair sous un texte blanc, et l'actif disparaît. */
.tox .onlc-finder__place--current,
.tox .onlc-finder__place--current:hover { background: #006ce7; color: #ffffff; }
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
.tox .onlc-finder__status { display: flex; gap: 12px; align-items: center; justify-content: space-between; padding: 6px 12px; border-top: 1px solid rgba(34, 47, 62, 0.12); font-size: 12px; color: #5a6570; background: #f6f8fa; }
.tox .onlc-finder__quota { display: flex; gap: 8px; align-items: center; flex: 0 0 auto; }
.tox .onlc-finder__quota-bar { width: 90px; height: 6px; border-radius: 3px; background: #dde3e9; overflow: hidden; }
.tox .onlc-finder__quota-fill { display: block; height: 100%; background: #2c9a4a; }
.tox .onlc-finder__quota[data-full="true"] .onlc-finder__quota-fill { background: #b4241f; }
.tox .onlc-finder__versions { margin-top: 12px; border-top: 1px solid rgba(34, 47, 62, 0.12); padding-top: 10px; }
.tox .onlc-finder__versions-title { display: block; margin-bottom: 6px; font-size: 11px; font-weight: 700; color: #8a949e; text-transform: uppercase; letter-spacing: 0.04em; }
.tox .onlc-finder__version { display: flex; gap: 8px; align-items: center; padding: 4px 0; }
.tox .onlc-finder__version-thumb { flex: 0 0 auto; width: 40px; height: 40px; border-radius: 4px; background: #eef1f4 center/cover no-repeat; }
.tox .onlc-finder__version-text { display: flex; flex-direction: column; flex: 1 1 auto; min-width: 0; font-size: 12px; }
.tox .onlc-finder__version-label { font-weight: 600; color: #22303c; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tox .onlc-finder__version-date { color: #5a6570; }
.tox .onlc-finder__version-current { flex: 0 0 auto; padding: 2px 8px; border-radius: 10px; background: #e4f1e8; color: #1f6b36; font-size: 11px; font-weight: 600; }
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

const chevronGlyph =
  '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>';

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

/**
 * Le type d'un fichier figure-t-il dans la liste autorisée ?
 *
 * Une entrée vaut un type complet (`image/png`), une famille (`image/`) ou une extension
 * (`.pdf`). La liste vide accepte tout. Ce contrôle épargne un aller-retour inutile ; il ne
 * remplace pas celui du serveur, seul à faire autorité.
 */
const matchesMimeList = (file: File, allowed: string[]): boolean => {
  if (!Type.isArray(allowed) || allowed.length === 0) {
    return true;
  }
  const mime = (file.type ?? '').toLowerCase();
  const name = file.name.toLowerCase();
  return Arr.exists(allowed, (entry) => {
    const wanted = entry.trim().toLowerCase();
    if (wanted === '') {
      return false;
    } else if (wanted.charAt(0) === '.') {
      return name.length > wanted.length && name.slice(-wanted.length) === wanted;
    } else if (wanted.charAt(wanted.length - 1) === '/') {
      return mime.indexOf(wanted) === 0;
    } else {
      return mime === wanted;
    }
  });
};

/** Date lisible, tirée d'un horodatage ISO. La chaîne brute sert de repli. */
const humanDate = (value: string | undefined): string => {
  if (!Type.isString(value) || value === '') {
    return '';
  }
  const date = new Date(value);
  return isNaN(date.getTime()) ? value : date.toLocaleString();
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
  /** Contenu de chaque dossier déjà déplié, par chemin. */
  const tree: Record<string, MediaFolder[]> = {};
  /** Chemins des dossiers dépliés. `open` est réservé en portée de module. */
  let open_: string[] = [ '/' ];

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

  const status = doc.createElement('div');
  status.className = 'onlc-finder__status';

  const statusText = doc.createElement('span');
  // Jauge de quota : un compte à part, toujours visible en bas à droite.
  const quotaBox = doc.createElement('span');
  quotaBox.className = 'onlc-finder__quota';
  status.appendChild(statusText);
  status.appendChild(quotaBox);

  const fileInput = doc.createElement('input');
  fileInput.type = 'file';
  fileInput.multiple = true;
  // Le sélecteur natif propose d'emblée les bons types ; le contrôle reste fait à l'envoi,
  // l'attribut `accept` n'étant qu'une suggestion que le navigateur peut ignorer.
  fileInput.accept = Options.getUploadMimeTypes(editor).map((entry) => entry.trim()).filter((entry) => entry !== '')
    .map((entry) => entry.charAt(entry.length - 1) === '/' ? `${entry}*` : entry).join(',');
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

  const t = (text: string): string => editor.translate(text) as string;

  const setStatus = (message: string) => {
    statusText.textContent = t(message);
  };

  /* Quotas ----------------------------------------------------------------- */

  /**
   * Les quotas ne sont pas gardés en mémoire : ils varient d'un compte à l'autre, et un envoi
   * fait depuis un autre onglet les change. Ils sont donc redemandés à chaque fois qu'ils
   * servent — au chargement d'un dossier, avant un envoi, après une suppression.
   */
  let quota: MediaQuota | null = null;

  const renderQuota = () => {
    quotaBox.innerHTML = '';
    if (quota === null || !Type.isNumber(quota.maxFiles) || quota.maxFiles <= 0) {
      return;
    }
    const used = Math.max(0, quota.files);
    const share = Math.min(100, (used / quota.maxFiles) * 100);
    quotaBox.dataset.full = used >= quota.maxFiles ? 'true' : 'false';

    const label = doc.createElement('span');
    label.textContent = `${used} / ${quota.maxFiles} ${t('fichiers')}`;

    const bar = doc.createElement('span');
    bar.className = 'onlc-finder__quota-bar';
    const fill = doc.createElement('span');
    fill.className = 'onlc-finder__quota-fill';
    fill.style.width = `${share}%`;
    bar.appendChild(fill);

    quotaBox.title = t('Chaque version d’un fichier compte pour un fichier.');
    quotaBox.appendChild(label);
    quotaBox.appendChild(bar);
  };

  /** Relit les quotas. La promesse aboutit même quand l'api n'en sert pas. */
  const refreshQuota = (): Promise<MediaQuota | null> => {
    if (Options.isQuotaEnabled(editor) !== true) {
      return Promise.resolve(null);
    }
    return api.quota().then((result) => {
      quota = Type.isObject(result) && Type.isNumber(result.files) ? result : null;
      renderQuota();
      return quota;
    }, () => {
      // Une api sans quotas n'est pas une erreur : la jauge disparaît, rien d'autre.
      quota = null;
      renderQuota();
      return null;
    });
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

  /**
   * Barre latérale : l'arborescence des dossiers.
   *
   * Une liste à plat ne dit pas où l'on se trouve — deux dossiers nommés « photos » y sont
   * indiscernables. Les dossiers sont donc empilés selon leur profondeur réelle, chacun
   * dépliable par son chevron. Le contenu d'un dossier n'est demandé à l'api qu'au dépliage,
   * puis gardé en mémoire : ouvrir la médiathèque ne déclenche pas une rafale de requêtes.
   */
  const renderSidebar = () => {
    sidebar.innerHTML = '';
    const title = doc.createElement('span');
    title.className = 'onlc-finder__sidebar-title';
    title.textContent = editor.translate('Emplacements');
    sidebar.appendChild(title);

    const branch = (folder: MediaFolder, depth: number) => {
      const row = doc.createElement('div');
      row.className = 'onlc-finder__branch';
      row.style.paddingLeft = `${depth * 14}px`;

      const children = tree[folder.path];
      const expanded = Arr.contains(open_, folder.path);
      // Un dossier jamais déplié est supposé pouvoir l'être : c'est le dépliage qui tranche.
      const childless = Type.isNonNullable(children) && children.length === 0;

      const twisty = doc.createElement('button');
      twisty.type = 'button';
      twisty.className = 'onlc-finder__twisty';
      twisty.dataset.empty = childless ? 'true' : 'false';
      twisty.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      twisty.setAttribute('aria-label', editor.translate(expanded ? 'Replier' : 'Déplier') as string);
      twisty.innerHTML = chevronGlyph;
      twisty.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleBranch(folder.path);
      });

      const button = doc.createElement('button');
      button.type = 'button';
      button.className = `onlc-finder__place${folder.path === path ? ' onlc-finder__place--current' : ''}`;
      button.innerHTML = `${folderGlyph.replace('width="40" height="40"', 'width="20" height="20"')}<span>${editor.dom.encode(folder.name)}</span>`;
      button.addEventListener('click', () => load(folder.path));

      row.appendChild(twisty);
      row.appendChild(button);
      sidebar.appendChild(row);

      if (expanded && Type.isNonNullable(children)) {
        Arr.each(children, (child) => branch(child, depth + 1));
      }
    };

    branch({ name: editor.translate('Médiathèque') as string, path: '/' }, 0);
  };

  /** Charge le contenu d'un dossier pour l'arborescence, une seule fois. */
  const loadBranch = (target: string): void => {
    if (Type.isNonNullable(tree[target])) {
      renderSidebar();
      return;
    }
    api.list(target).then((result) => {
      tree[target] = result.folders;
      renderSidebar();
    }, () => {
      tree[target] = [];
      renderSidebar();
    });
  };

  const toggleBranch = (target: string): void => {
    if (Arr.contains(open_, target)) {
      open_ = Arr.filter(open_, (entry) => entry !== target);
      renderSidebar();
    } else {
      open_ = open_.concat([ target ]);
      loadBranch(target);
    }
  };

  /** Déplie la branche qui mène au dossier ouvert, pour qu'il soit toujours visible. */
  const revealBranch = (target: string): void => {
    const parts = target.split('/').filter((part) => part !== '');
    let current = '';
    const wanted = [ '/' ];
    Arr.each(parts, (part) => {
      current = `${current}/${part}`;
      wanted.push(current);
    });
    // Le dossier ouvert lui-même n'a pas à être déplié : seuls ses ancêtres le sont.
    Arr.each(wanted.slice(0, -1), (entry) => {
      if (!Arr.contains(open_, entry)) {
        open_ = open_.concat([ entry ]);
      }
    });
    Arr.each(wanted, loadBranch);
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
      spec.onDestroy(
        `${t('le fichier')} « ${file.name} »`,
        'Toutes ses versions seront perdues.',
        () => run('Suppression…', api.deleteFile(file.path))
      );
    }, true));

    info.appendChild(actions);
    renderVersions(file);
  };

  /**
   * Historique d'un fichier.
   *
   * Chaque passage dans l'éditeur d'images ajoute une version au lieu d'écraser la précédente :
   * on peut donc toujours revenir à l'état d'avant. La liste est demandée à l'ouverture du
   * panneau, et seulement pour le fichier sélectionné — inutile d'interroger l'api pour un
   * dossier entier que personne ne regarde.
   */
  const renderVersions = (file: MediaFile): void => {
    if (Options.isVersioningEnabled(editor) !== true) {
      return;
    }

    const box = doc.createElement('div');
    box.className = 'onlc-finder__versions';
    info.appendChild(box);

    api.versions(file.path).then((versions) => {
      // La sélection a pu changer pendant la requête : on ne réécrit pas le panneau d'un autre.
      if (selected.length !== 1 || selected[0].path !== file.path || versions.length <= 1) {
        box.remove();
        return;
      }

      const title = doc.createElement('span');
      title.className = 'onlc-finder__versions-title';
      title.textContent = `${t('Versions')} (${versions.length})`;
      box.appendChild(title);

      Arr.each(versions, (version: MediaVersion) => {
        const line = doc.createElement('div');
        line.className = 'onlc-finder__version';

        const thumb = doc.createElement('span');
        thumb.className = 'onlc-finder__version-thumb';
        const preview_ = version.thumbnailUrl ?? version.url;
        if (Type.isString(preview_) && preview_ !== '') {
          thumb.style.backgroundImage = `url(${backgroundUrl(editor, preview_)})`;
        }

        const text = doc.createElement('span');
        text.className = 'onlc-finder__version-text';
        const label = doc.createElement('span');
        label.className = 'onlc-finder__version-label';
        label.textContent = Type.isString(version.label) && version.label !== ''
          ? t(version.label)
          : t('Version enregistrée');
        const date = doc.createElement('span');
        date.className = 'onlc-finder__version-date';
        date.textContent = humanDate(version.createdAt);
        text.appendChild(label);
        text.appendChild(date);

        line.appendChild(thumb);
        line.appendChild(text);

        if (version.current === true) {
          const badge = doc.createElement('span');
          badge.className = 'onlc-finder__version-current';
          badge.textContent = t('Actuelle');
          line.appendChild(badge);
        } else {
          const restore = doc.createElement('button');
          restore.type = 'button';
          restore.className = 'onlc-finder__action';
          restore.textContent = t('Restaurer');
          restore.addEventListener('click', () => {
            run('Restauration…', api.restoreVersion(file.path, version.id));
          });
          line.appendChild(restore);
        }

        box.appendChild(line);
      });
    }, () => {
      // Une api sans historique n'est pas une erreur : la section disparaît.
      box.remove();
    });
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
      // Le dossier vient d'être lu : l'arborescence profite de la même réponse.
      tree[path] = result.folders;
      revealBranch(path);
      refreshQuota();
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

  /**
   * Envoi de fichiers.
   *
   * Trois refus possibles, dans l'ordre où ils coûtent le moins cher à vérifier : le type, puis
   * le poids réglé côté page, puis les quotas du compte — ces derniers sont relus juste avant,
   * puisqu'ils ont pu changer depuis l'ouverture de la médiathèque. Chaque refus nomme le
   * fichier en cause : « ça n'a pas marché » n'aide personne.
   */
  const upload = (files: File[]): void => {
    const allowed = Options.getUploadMimeTypes(editor);
    const rejected = Arr.find(files, (file) => !matchesMimeList(file, allowed));

    if (rejected.isSome()) {
      const file = rejected.getOrDie();
      spec.onError(`${t('Ce type de fichier n’est pas accepté')} : « ${file.name} » (${file.type === '' ? t('type inconnu') : file.type}). ` +
        `${t('Types acceptés')} : ${allowed.join(', ')}.`);
      return;
    }

    const maxSize = Options.getMaxUploadSize(editor);
    const tooBig = Arr.find(files, (file) => maxSize > 0 && file.size > maxSize);

    if (tooBig.isSome()) {
      spec.onError(`${t('Le fichier dépasse la taille maximale autorisée')} : « ${tooBig.getOrDie().name} » (${humanSize(maxSize)} ${t('maximum')}).`);
      return;
    }

    setStatus('Vérification des quotas…');
    refreshQuota().then((current) => {
      if (current !== null) {
        const perFile = Type.isNumber(current.maxFileSize) && current.maxFileSize > 0 ? current.maxFileSize : 0;
        const overQuotaSize = Arr.find(files, (file) => perFile > 0 && file.size > perFile);

        if (overQuotaSize.isSome()) {
          setStatus('');
          spec.onError(`${t('Le fichier dépasse le poids autorisé par votre offre')} : « ${overQuotaSize.getOrDie().name} » (${humanSize(perFile)} ${t('maximum')}).`);
          return;
        }

        const room = Type.isNumber(current.maxFiles) && current.maxFiles > 0 ? current.maxFiles - current.files : -1;
        if (room >= 0 && files.length > room) {
          setStatus('');
          spec.onError(room === 0
            ? t('Votre médiathèque est pleine. Supprimez des fichiers ou d’anciennes versions pour en ajouter.')
            : `${t('Il ne reste de la place que pour')} ${room} ${t('fichier(s)')}.`);
          return;
        }
      }

      run('Téléversement…', Promise.all(Arr.map(files, (file) => api.upload(path, file))));
    });
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
    spec.onDestroy(`${t('le dossier')} « ${path} »`, 'Tout ce qu’il contient sera perdu.', () => {
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
