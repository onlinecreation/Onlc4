import Editor from 'hugerte/core/api/Editor';

import { WidgetConfig, WidgetDefinition } from '../../api/Types';
import * as Cdn from '../Cdn';
import * as Embed from '../Embed';
import * as Html from '../Html';
import * as LocationEditor from '../LocationEditor';
import * as Preview from '../Preview';
import * as Tiles from '../Tiles';

/**
 * Bloc carte, sur fond OpenStreetMap. Aucun autre fournisseur n'est proposé : le produit ne
 * dépend d'aucune clé d'api et n'envoie l'adresse des visiteurs à aucun service commercial.
 *
 * Deux rendus, pour deux besoins :
 *
 * - **carte déplaçable** : Leaflet, chargé depuis un CDN, le visiteur peut zoomer et se
 *   déplacer ;
 * - **plan simple** : le cadre d'intégration d'OpenStreetMap, sans aucune dépendance.
 *
 * Dans l'éditeur, ni l'un ni l'autre : un damier de tuiles, inerte, qui montre exactement le
 * lieu choisi sans capter le moindre clic.
 */

const locationOf = (c: WidgetConfig): LocationEditor.Location => LocationEditor.parse(c.location ?? '');

const map = (editor: Editor): WidgetDefinition => ({
  id: 'map',
  canonical: true,
  label: 'Carte',
  description: 'Situe une adresse sur un plan OpenStreetMap',
  category: 'Médias',
  icon: 'location',
  assets: (c) => Html.isTrue(c.interactive) ? Cdn.leaflet(editor) : undefined,
  fields: [
    { name: 'location', label: 'Lieu affiché', type: 'location' },
    { name: 'marker', label: 'Texte de l’épingle', type: 'text', placeholder: 'Nos bureaux' },
    { name: 'height', label: 'Hauteur de la carte', type: 'text', half: true, placeholder: '360px' },
    { name: 'interactive', label: 'Carte déplaçable par le visiteur', type: 'checkbox', half: true },
    { name: 'scrollZoom', label: 'Zoom à la molette de la souris', type: 'checkbox', half: true }
  ],
  defaults: {
    location: LocationEditor.serialize(LocationEditor.defaultLocation),
    marker: '',
    height: '360px',
    interactive: 'true',
    scrollZoom: 'false'
  },
  render: (c) => {
    const place = locationOf(c);
    const height = Html.withUnit(c.height) === '' ? '360px' : Html.withUnit(c.height);

    if (!Html.isTrue(c.interactive)) {
      const src = Embed.mapUrl(place.latitude, place.longitude, place.zoom);
      return `<div class="onlc-embed onlc-embed--fixed">` +
        `<iframe class="onlc-embed__frame"${Html.attr('src', src)}` +
        `${Html.attr('title', place.address === '' ? 'Carte' : place.address)}` +
        `${Html.style({ height, width: '100%' })} frameborder="0" loading="lazy"></iframe></div>` +
        `<p class="onlc-map__credit"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© les contributeurs OpenStreetMap</a></p>`;
    }

    const settings = {
      latitude: place.latitude,
      longitude: place.longitude,
      zoom: Tiles.clampZoom(place.zoom),
      marker: c.marker.trim(),
      scrollZoom: Html.isTrue(c.scrollZoom)
    };

    // Le script se rattache à l'élément qui le précède : aucun identifiant à gérer, et
    // plusieurs cartes peuvent cohabiter sur la même page.
    const script = `(function () {
  var element = document.currentScript && document.currentScript.previousElementSibling;
  if (!element || element.getAttribute('data-onlc-ready')) { return; }
  element.setAttribute('data-onlc-ready', '1');
  var settings = ${Html.jsonForScript(settings)};
  var start = function () {
    if (!window.L) { return window.setTimeout(start, 150); }
    var map = window.L.map(element, { scrollWheelZoom: settings.scrollZoom })
      .setView([ settings.latitude, settings.longitude ], settings.zoom);
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
    var pin = window.L.marker([ settings.latitude, settings.longitude ]).addTo(map);
    if (settings.marker) { pin.bindPopup(settings.marker); }
  };
  start();
})();`;

    return `<div class="onlc-leaflet"${Html.style({ height, width: '100%' })}></div>` +
      `<script>${script}<\/script>`;
  },
  renderEditor: (c) => {
    const place = locationOf(c);
    const height = Html.withUnit(c.height) === '' ? '360px' : Html.withUnit(c.height);
    const coordinates = `${place.latitude}, ${place.longitude} — zoom ${Tiles.clampZoom(place.zoom)}`;

    return Preview.card({
      kind: Html.isTrue(c.interactive) ? 'Carte déplaçable (Leaflet)' : 'Plan OpenStreetMap',
      title: place.address === '' ? 'Carte' : place.address,
      detail: coordinates,
      height,
      body: Preview.mapTiles(place.latitude, place.longitude, place.zoom, height)
    });
  }
});

const all = (editor: Editor): WidgetDefinition[] => [ map(editor) ];

export {
  locationOf,
  map,
  all
};
