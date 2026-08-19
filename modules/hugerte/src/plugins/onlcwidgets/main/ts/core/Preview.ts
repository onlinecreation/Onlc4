import { Arr, Type } from '@ephox/katamari';

import * as Html from './Html';
import * as Tiles from './Tiles';

/**
 * Aperçus inertes des blocs média.
 *
 * Une vidéo, une carte ou une page intégrée ne doivent **jamais** être vivantes dans la zone
 * d'édition : une iframe capture les clics, se met en bac à sable (et reste noire), se
 * superpose aux blocs voisins et empêche de sélectionner le bloc pour le déplacer. Ce module
 * dessine à la place une vignette en pur html — un cadre, une image de fond, un intitulé — que
 * l'on peut cliquer, déplacer et sélectionner comme n'importe quel autre bloc.
 *
 * Le code réellement publié, lui, est produit par `render()` et reconstruit à
 * l'enregistrement : ce que voit le visiteur n'est pas ce que manipule le rédacteur.
 */

export interface PreviewSpec {
  /** Famille du bloc, affichée en petit au-dessus du titre : « Vidéo », « Carte »… */
  readonly kind: string;
  /** Intitulé principal : le titre saisi, ou l'adresse. */
  readonly title: string;
  /** Précision affichée en dessous : adresse, coordonnées, dimensions. */
  readonly detail?: string;
  /** Hauteur du cadre. */
  readonly height?: string;
  /** Image de fond de la vignette, quand le service en fournit une. */
  readonly poster?: string;
  /** Contenu html du cadre, pour les aperçus qui se dessinent (tuiles d'une carte). */
  readonly body?: string;
  /** Symbole affiché au centre quand il n'y a ni image ni contenu. */
  readonly glyph?: string;
}

const hint = 'Cliquez pour sélectionner ce bloc, puis « Modifier le bloc » pour le régler.';

const playGlyph =
  '<svg viewBox="0 0 24 24" width="46" height="46" aria-hidden="true" focusable="false">' +
  '<circle cx="12" cy="12" r="11" fill="rgba(255,255,255,0.92)"></circle>' +
  '<path d="M10 8l6 4-6 4z" fill="#22303c"></path></svg>';

const frameGlyph =
  '<svg viewBox="0 0 24 24" width="42" height="42" aria-hidden="true" focusable="false">' +
  '<rect x="2.5" y="4.5" width="19" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"></rect>' +
  '<path d="M2.5 9h19" fill="none" stroke="currentColor" stroke-width="1.6"></path></svg>';

const documentGlyph =
  '<svg viewBox="0 0 24 24" width="42" height="42" aria-hidden="true" focusable="false">' +
  '<path d="M6 2.5h8l4.5 4.5v14.5H6z" fill="none" stroke="currentColor" stroke-width="1.6"></path>' +
  '<path d="M14 2.5V7h4.5" fill="none" stroke="currentColor" stroke-width="1.6"></path></svg>';

const galleryGlyph =
  '<svg viewBox="0 0 24 24" width="42" height="42" aria-hidden="true" focusable="false">' +
  '<rect x="2.5" y="4.5" width="19" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"></rect>' +
  '<path d="M4 16l5-5 4 4 3-3 4 4" fill="none" stroke="currentColor" stroke-width="1.6"></path>' +
  '<circle cx="9" cy="9" r="1.4" fill="currentColor"></circle></svg>';

/**
 * Vignette générique. Tout est en `div`/`span` : rien ici ne peut charger de contenu externe
 * exécutable ni intercepter un clic.
 */
const card = (spec: PreviewSpec): string => {
  const frameStyle = Html.style({
    'min-height': Html.withUnit(spec.height ?? '220px'),
    'background-image': Html.cssUrl(spec.poster)
  });

  const inner = Type.isString(spec.body) && spec.body !== ''
    ? spec.body
    : `<span class="onlc-preview__glyph">${spec.glyph ?? frameGlyph}</span>`;

  const detail = Type.isString(spec.detail) && spec.detail.trim() !== ''
    ? `<span class="onlc-preview__detail">${Html.escape(spec.detail)}</span>`
    : '';

  // `contenteditable="false"` est écrit ici plutôt qu'ajouté par un filtre : quand du contenu
  // publié est rechargé, l'aperçu est réinjecté sous forme de texte brut et aucun filtre de
  // nœud ne le verrait passer.
  return `<div class="onlc-widget__static onlc-preview" contenteditable="false">` +
    `<div class="onlc-preview__frame"${frameStyle}>${inner}</div>` +
    `<div class="onlc-preview__meta">` +
    `<span class="onlc-preview__kind">${Html.escape(spec.kind)}</span>` +
    `<span class="onlc-preview__title">${Html.escape(spec.title)}</span>` +
    detail +
    `<span class="onlc-preview__hint">${Html.escape(hint)}</span>` +
    `</div></div>`;
};

/* Aperçu cartographique ---------------------------------------------------- */

/**
 * Aperçu d'une carte composé de tuiles OpenStreetMap posées en fond de `span`. Aucune iframe,
 * aucun script : la vignette est exacte au pixel près et complètement inerte.
 */
const mapTiles = (latitude: number, longitude: number, zoom: number, height: string): string => {
  const grid = Tiles.grid(latitude, longitude, zoom, 3);

  const tiles = Arr.map(grid.tiles, (tile) =>
    `<span class="onlc-preview__tile"${Html.style({
      left: `${tile.left}px`,
      top: `${tile.top}px`,
      'background-image': Html.cssUrl(tile.url)
    })}></span>`).join('');

  return `<div class="onlc-preview__map"${Html.style({ height: Html.withUnit(height) })}>` +
    `<div class="onlc-preview__tiles"${Html.style({
      left: `calc(50% - ${grid.shiftX}px)`,
      top: `calc(50% - ${grid.shiftY}px)`
    })}>${tiles}</div>` +
    `<span class="onlc-preview__pin" aria-hidden="true"></span>` +
    `<span class="onlc-preview__credit">© OpenStreetMap</span></div>`;
};

export {
  card,
  mapTiles,
  playGlyph,
  frameGlyph,
  documentGlyph,
  galleryGlyph
};
