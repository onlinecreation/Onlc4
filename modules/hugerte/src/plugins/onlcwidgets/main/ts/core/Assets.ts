import { Arr, Type } from '@ephox/katamari';

import { WidgetAssets, WidgetConfig, WidgetDefinition } from '../api/Types';
import * as Html from './Html';

/**
 * Dépendances d'un bloc (Leaflet par exemple). Elles sont écrites en tête du code HTML du bloc
 * sur la page publiée, de sorte qu'un copier-coller du bloc reste autonome.
 *
 * ```html
 * <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css">
 * <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js" defer></script>
 * ```
 *
 * Le navigateur ignore une feuille ou un script déjà chargé une seconde fois : plusieurs blocs
 * de même type sur une page ne posent donc pas de problème.
 */

const stylesheet = (url: string): string =>
  `<link rel="stylesheet"${Html.attr('href', url)} crossorigin="anonymous" referrerpolicy="no-referrer">`;

const script = (url: string): string =>
  `<script${Html.attr('src', url)} crossorigin="anonymous" referrerpolicy="no-referrer" defer><\/script>`;

/**
 * Dépendances effectives d'un bloc pour une configuration donnée. Un bloc peut n'en avoir besoin
 * que dans certains réglages : une carte déplaçable charge Leaflet, un simple plan ne charge
 * rien du tout.
 */
const resolve = (definition: WidgetDefinition, config: WidgetConfig): WidgetAssets | undefined => {
  const assets = definition.assets;
  return Type.isFunction(assets) ? assets(config) : assets;
};

const toHtml = (definition: WidgetDefinition, config: WidgetConfig): string => {
  const assets = resolve(definition, config);
  if (!Type.isNonNullable(assets)) {
    return '';
  }
  const links = Arr.map(assets.css ?? [], stylesheet).join('');
  const scripts = Arr.map(assets.js ?? [], script).join('');
  return links + scripts;
};

const hasAssets = (definition: WidgetDefinition, config: WidgetConfig): boolean => {
  const assets = resolve(definition, config);
  return Type.isNonNullable(assets) && ((assets.css ?? []).length > 0 || (assets.js ?? []).length > 0);
};

/** Liste lisible des dépendances, affichée dans l'aperçu de l'éditeur. */
const describe = (definition: WidgetDefinition, config: WidgetConfig): string => {
  const assets = resolve(definition, config);
  if (!Type.isNonNullable(assets)) {
    return '';
  }
  const urls = (assets.css ?? []).concat(assets.js ?? []);
  return Arr.map(urls, (url) => url.split('/').slice(-1)[0]).join(', ');
};

const withAssets = (definition: WidgetDefinition, config: WidgetConfig, markup: string): string =>
  toHtml(definition, config) + markup;

export {
  stylesheet,
  script,
  resolve,
  toHtml,
  hasAssets,
  describe,
  withAssets
};
