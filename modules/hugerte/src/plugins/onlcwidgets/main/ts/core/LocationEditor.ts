import { Arr, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import { Dialog } from 'hugerte/core/api/ui/Ui';

import * as Options from '../api/Options';
import * as Tiles from './Tiles';

/**
 * Choix d'un lieu pour le bloc carte.
 *
 * Personne ne connaît par cœur la latitude de sa boutique : on tape une adresse, on choisit
 * parmi les résultats, on ajuste le zoom, et on voit tout de suite ce que verra le visiteur.
 * La recherche s'appuie sur Nominatim, le service de géocodage d'OpenStreetMap ; les
 * coordonnées restent modifiables à la main pour les cas où l'adresse n'est pas trouvée.
 */

export interface Location {
  readonly address: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly zoom: number;
}

const defaultLocation: Location = {
  address: '',
  latitude: 48.8566,
  longitude: 2.3522,
  zoom: 14
};

const styleId = 'onlc-location-editor-styles';

const styles = `
/* Préfixé par .tox pour passer devant le reset très large du thème. */
.tox .onlc-place { display: block; width: 100%; }
.tox .onlc-place__search { display: flex; gap: 8px; align-items: flex-end; margin-bottom: 10px; }
.tox .onlc-place__field { display: flex; flex: 1 1 auto; flex-direction: column; gap: 4px; min-width: 0; }
.tox .onlc-place__label { font-size: 12px; color: #5a6570; }
.tox .onlc-place__input { box-sizing: border-box; width: 100%; min-height: 50px; padding: 8px 12px; border: 1px solid rgba(34, 47, 62, 0.2); border-radius: 6px; font: inherit; color: #22303c; background: #ffffff; }
.tox .onlc-place__go { flex: 0 0 auto; min-width: 130px; min-height: 50px; padding: 0 18px; border: 0; border-radius: 6px; background: #006ce7; color: #ffffff; font: inherit; font-weight: 600; cursor: pointer; }
.tox .onlc-place__go:hover { background: #0059c1; }
.tox .onlc-place__go:disabled { opacity: 0.5; cursor: default; }
.tox .onlc-place__results { display: block; margin: 0 0 10px; padding: 0; list-style: none; border: 1px solid rgba(34, 47, 62, 0.2); border-radius: 6px; overflow: hidden; }
.tox .onlc-place__result { display: block; width: 100%; min-height: 50px; padding: 10px 12px; border: 0; border-bottom: 1px solid rgba(34, 47, 62, 0.12); background: #ffffff; font: inherit; color: #22303c; text-align: left; cursor: pointer; }
.tox .onlc-place__result:last-child { border-bottom: 0; }
.tox .onlc-place__result:hover { background: #eef4fd; }
.tox .onlc-place__status { margin: 0 0 10px; font-size: 12px; color: #5a6570; }
.tox .onlc-place__map { position: relative; width: 100%; height: 260px; overflow: hidden; border: 1px solid rgba(34, 47, 62, 0.2); border-radius: 6px; background: #dfe6ec; }
.tox .onlc-place__tiles { position: absolute; width: 0; height: 0; }
.tox .onlc-place__tile { position: absolute; width: 256px; height: 256px; background-repeat: no-repeat; background-size: 256px 256px; }
.tox .onlc-place__pin {
  position: absolute; top: 50%; left: 50%; width: 18px;
  height: 18px; margin: -18px 0 0 -9px; border: 3px solid #ffffff; border-radius: 50% 50% 50% 0;
  background: #e0007a; transform: rotate(-45deg); box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
}
.tox .onlc-place__credit { position: absolute; right: 4px; bottom: 4px; padding: 2px 6px; border-radius: 3px; background: rgba(255, 255, 255, 0.8); font-size: 11px; color: #22303c; }
.tox .onlc-place__grid { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.tox .onlc-place__cell { display: flex; flex: 1 1 140px; flex-direction: column; gap: 4px; }
`;

const injectStyles = (doc: Document): void => {
  if (doc.getElementById(styleId) === null) {
    const style = doc.createElement('style');
    style.id = styleId;
    style.textContent = styles;
    doc.head.appendChild(style);
  }
};

const toNumber = (value: unknown, fallback: number): number => {
  const parsed = parseFloat(String(value ?? '').replace(',', '.'));
  return isNaN(parsed) ? fallback : parsed;
};

const parse = (value: string): Location => {
  if (!Type.isString(value) || value.trim() === '') {
    return defaultLocation;
  }
  try {
    const parsed = JSON.parse(value) as Partial<Location>;
    return {
      address: Type.isString(parsed.address) ? parsed.address : '',
      latitude: toNumber(parsed.latitude, defaultLocation.latitude),
      longitude: toNumber(parsed.longitude, defaultLocation.longitude),
      zoom: Tiles.clampZoom(toNumber(parsed.zoom, defaultLocation.zoom))
    };
  } catch (_err) {
    return defaultLocation;
  }
};

const serialize = (location: Location): string => JSON.stringify(location);

interface GeocodeResult {
  readonly label: string;
  readonly latitude: number;
  readonly longitude: number;
}

/** Interroge Nominatim et ramène au plus cinq propositions. */
const geocode = (endpoint: string, query: string): Promise<GeocodeResult[]> => {
  const url = `${endpoint}?format=json&limit=5&q=${encodeURIComponent(query)}`;
  return fetch(url, { headers: { Accept: 'application/json' }}).then((response) => {
    if (!response.ok) {
      throw new Error(String(response.status));
    }
    return response.json();
  }).then((payload) => {
    if (!Type.isArray(payload)) {
      return [];
    }
    return Arr.bind(payload as unknown[], (entry) => {
      const item = entry as { display_name?: unknown; lat?: unknown; lon?: unknown };
      return Type.isString(item.display_name)
        ? [{ label: item.display_name, latitude: toNumber(item.lat, 0), longitude: toNumber(item.lon, 0) }]
        : [];
    });
  });
};

/**
 * Builds the `init` function expected by the `customeditor` dialog component.
 */
const create = (editor: Editor) => (element: HTMLElement): Promise<Dialog.CustomEditorInit> => {
  const doc = element.ownerDocument;
  injectStyles(doc);

  let location = defaultLocation;

  const t = (text: string): string => editor.dom.encode(editor.translate(text) as string);

  element.className = 'onlc-place';
  element.innerHTML =
    '<div class="onlc-place__search">' +
    `<label class="onlc-place__field"><span class="onlc-place__label">${t('Adresse du lieu')}</span>` +
    `<input class="onlc-place__input" data-part="address" type="text" placeholder="${t('10 rue de la Paix, Paris')}"></label>` +
    `<button class="onlc-place__go" type="button" data-part="go">${t('Rechercher')}</button></div>` +
    `<p class="onlc-place__status" data-part="status">${t('Saisissez une adresse et cliquez sur « Rechercher », ou entrez directement des coordonnées.')}</p>` +
    '<ul class="onlc-place__results" data-part="results" hidden></ul>' +
    '<div class="onlc-place__map" data-part="map">' +
    '<div class="onlc-place__tiles" data-part="tiles"></div>' +
    '<span class="onlc-place__pin" aria-hidden="true"></span>' +
    '<span class="onlc-place__credit">© OpenStreetMap</span></div>' +
    '<div class="onlc-place__grid">' +
    `<label class="onlc-place__cell"><span class="onlc-place__label">${t('Latitude')}</span>` +
    '<input class="onlc-place__input" data-part="latitude" type="text" inputmode="decimal"></label>' +
    `<label class="onlc-place__cell"><span class="onlc-place__label">${t('Longitude')}</span>` +
    '<input class="onlc-place__input" data-part="longitude" type="text" inputmode="decimal"></label>' +
    `<label class="onlc-place__cell"><span class="onlc-place__label">${t('Zoom (1 = monde, 19 = rue)')}</span>` +
    '<input class="onlc-place__input" data-part="zoom" type="number" min="1" max="19" step="1"></label>' +
    '</div>';

  const part = <T extends HTMLElement>(name: string): T =>
    element.querySelector(`[data-part="${name}"]`) as T;

  const address = part<HTMLInputElement>('address');
  const go = part<HTMLButtonElement>('go');
  const status = part<HTMLParagraphElement>('status');
  const results = part<HTMLUListElement>('results');
  const map = part<HTMLDivElement>('map');
  const tiles = part<HTMLDivElement>('tiles');
  const latitude = part<HTMLInputElement>('latitude');
  const longitude = part<HTMLInputElement>('longitude');
  const zoom = part<HTMLInputElement>('zoom');

  const drawMap = () => {
    const grid = Tiles.grid(location.latitude, location.longitude, location.zoom, 3);
    tiles.style.left = `calc(50% - ${grid.shiftX}px)`;
    tiles.style.top = `calc(50% - ${grid.shiftY}px)`;
    tiles.innerHTML = Arr.map(grid.tiles, (tile) =>
      `<span class="onlc-place__tile" style="left: ${tile.left}px; top: ${tile.top}px; background-image: url(${tile.url})"></span>`).join('');
  };

  const drawFields = () => {
    address.value = location.address;
    latitude.value = String(location.latitude);
    longitude.value = String(location.longitude);
    zoom.value = String(location.zoom);
  };

  const render = () => {
    drawFields();
    drawMap();
  };

  const readFields = () => {
    location = {
      address: address.value,
      latitude: toNumber(latitude.value, location.latitude),
      longitude: toNumber(longitude.value, location.longitude),
      zoom: Tiles.clampZoom(toNumber(zoom.value, location.zoom))
    };
    drawMap();
  };

  const showResults = (found: GeocodeResult[]) => {
    results.innerHTML = '';
    results.hidden = found.length === 0;

    Arr.each(found, (result) => {
      const item = doc.createElement('li');
      const button = doc.createElement('button');
      button.type = 'button';
      button.className = 'onlc-place__result';
      button.textContent = result.label;
      button.addEventListener('click', () => {
        location = { address: result.label, latitude: result.latitude, longitude: result.longitude, zoom: location.zoom };
        results.hidden = true;
        results.innerHTML = '';
        status.textContent = editor.translate('Lieu choisi. Ajustez le zoom si nécessaire.') as string;
        render();
      });
      item.appendChild(button);
      results.appendChild(item);
    });
  };

  const onSearch = () => {
    const query = address.value.trim();
    if (query === '') {
      status.textContent = editor.translate('Saisissez d’abord une adresse.') as string;
      return;
    }
    go.disabled = true;
    status.textContent = editor.translate('Recherche en cours…') as string;

    geocode(Options.getGeocoderUrl(editor), query).then((found) => {
      go.disabled = false;
      if (found.length === 0) {
        status.textContent = editor.translate('Aucun lieu ne correspond. Essayez une adresse plus simple, ou entrez les coordonnées à la main.') as string;
        results.hidden = true;
        return;
      }
      status.textContent = editor.translate('Choisissez le bon lieu dans la liste :') as string;
      showResults(found);
    }).catch(() => {
      go.disabled = false;
      status.textContent = editor.translate('La recherche d’adresse n’a pas abouti. Entrez les coordonnées à la main.') as string;
      results.hidden = true;
    });
  };

  const onMapClick = (e: MouseEvent) => {
    // Un clic sur la carte recentre le lieu à l'endroit désigné.
    const bounds = map.getBoundingClientRect();
    const deltaX = e.clientX - bounds.left - bounds.width / 2;
    const deltaY = e.clientY - bounds.top - bounds.height / 2;
    const scale = Math.pow(2, location.zoom) * Tiles.tileSize;

    const centreX = Tiles.lonToPixel(location.longitude, location.zoom) + deltaX;
    const centreY = Tiles.latToPixel(location.latitude, location.zoom) + deltaY;
    const lon = (centreX / scale) * 360 - 180;
    const lat = (180 / Math.PI) * Math.atan(Math.sinh(Math.PI * (1 - 2 * centreY / scale)));

    location = { ...location, latitude: Math.round(lat * 1e6) / 1e6, longitude: Math.round(lon * 1e6) / 1e6 };
    render();
  };

  go.addEventListener('click', onSearch);
  map.addEventListener('click', onMapClick);
  Arr.each([ address, latitude, longitude, zoom ], (input) => input.addEventListener('change', readFields));

  render();

  return Promise.resolve({
    getValue: () => {
      readFields();
      return serialize(location);
    },
    setValue: (value: string) => {
      location = parse(value);
      render();
    },
    destroy: () => {
      go.removeEventListener('click', onSearch);
      map.removeEventListener('click', onMapClick);
      element.innerHTML = '';
    }
  });
};

const field = (editor: Editor, name: string): Dialog.BodyComponentSpec => ({
  type: 'customeditor',
  name,
  tag: 'div',
  init: create(editor)
});

export {
  defaultLocation,
  parse,
  serialize,
  geocode,
  create,
  field
};
