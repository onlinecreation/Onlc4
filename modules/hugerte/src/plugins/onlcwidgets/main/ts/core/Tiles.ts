import { Arr, Fun } from '@ephox/katamari';

/**
 * Damier de tuiles OpenStreetMap.
 *
 * Une carte n'a pas besoin d'être vivante pour être reconnaissable : quelques tuiles posées
 * côte à côte suffisent à montrer le lieu choisi. C'est ce que l'éditeur affiche, à la place
 * d'une iframe qui capterait les clics et se retrouverait en bac à sable.
 *
 * Les tuiles proviennent du service public d'OpenStreetMap. La mention « © OpenStreetMap » est
 * obligatoire et accompagne systématiquement l'aperçu.
 */

export const tileSize = 256;

export interface Tile {
  readonly left: number;
  readonly top: number;
  readonly url: string;
}

export interface TileGrid {
  /** Décalage du damier, en pixels, pour que le point demandé tombe au centre du cadre. */
  readonly shiftX: number;
  readonly shiftY: number;
  readonly tiles: Tile[];
}

const clampZoom = (zoom: number): number => Math.max(1, Math.min(19, Math.round(zoom)));

/** Coordonnée horizontale, en pixels, d'une longitude au niveau de zoom donné. */
const lonToPixel = (lon: number, zoom: number): number =>
  ((lon + 180) / 360) * Math.pow(2, zoom) * tileSize;

/** Coordonnée verticale, en pixels, d'une latitude (projection Web Mercator). */
const latToPixel = (lat: number, zoom: number): number => {
  const clamped = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const radians = clamped * Math.PI / 180;
  const y = (1 - Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) / 2;
  return y * Math.pow(2, zoom) * tileSize;
};

/**
 * Tuiles à poser autour d'un point, sur une grille de `size` × `size`. Le résultat est purement
 * arithmétique : aucun accès au dom, ce qui permet de l'utiliser aussi bien pour construire du
 * html que pour dessiner dans un dialogue.
 */
const grid = (latitude: number, longitude: number, zoom: number, size: number): TileGrid => {
  const level = clampZoom(zoom);
  const centreX = lonToPixel(longitude, level);
  const centreY = latToPixel(latitude, level);
  const firstX = Math.floor(centreX / tileSize) - Math.floor(size / 2);
  const firstY = Math.floor(centreY / tileSize) - Math.floor(size / 2);
  const count = Math.pow(2, level);
  const wrap = (value: number): number => ((value % count) + count) % count;

  const tiles = Arr.bind(Arr.range(size, Fun.identity), (row) =>
    Arr.bind(Arr.range(size, Fun.identity), (column) => {
      const tileY = firstY + row;
      if (tileY < 0 || tileY >= count) {
        return [];
      }
      return [{
        left: column * tileSize,
        top: row * tileSize,
        url: `https://tile.openstreetmap.org/${level}/${wrap(firstX + column)}/${tileY}.png`
      }];
    }));

  return {
    shiftX: Math.round(centreX - firstX * tileSize),
    shiftY: Math.round(centreY - firstY * tileSize),
    tiles
  };
};

export {
  clampZoom,
  lonToPixel,
  latToPixel,
  grid
};
