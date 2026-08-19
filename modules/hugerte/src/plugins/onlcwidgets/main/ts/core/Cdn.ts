import Editor from 'hugerte/core/api/Editor';

import * as Options from '../api/Options';
import { WidgetAssets } from '../api/Types';

/**
 * Bibliothèques externes utilisées par certains blocs.
 *
 * Chaque bloc concerné écrit lui-même ses `<link>` et `<script>` en tête de son code : la page
 * publiée est autonome, et un bloc copié-collé ailleurs continue de fonctionner. Le navigateur
 * ignore une ressource déjà chargée, plusieurs blocs de même type ne se gênent donc pas.
 *
 * L'adresse de base est réglable (`onlc_widgets_cdn_base`) pour les projets qui préfèrent
 * héberger ces fichiers eux-mêmes, par exemple derrière un pare-feu.
 */

const versions = {
  leaflet: '1.9.4',
  jquery: '3.7.1',
  nanogallery2: '3.0.5',
  pdfjs: '3.11.174'
};

const base = (editor: Editor): string => Options.getCdnBase(editor).replace(/\/+$/, '');

const leaflet = (editor: Editor): WidgetAssets => ({
  css: [ `${base(editor)}/leaflet/${versions.leaflet}/leaflet.min.css` ],
  js: [ `${base(editor)}/leaflet/${versions.leaflet}/leaflet.min.js` ]
});

const nanogallery2 = (editor: Editor): WidgetAssets => ({
  css: [ `${base(editor)}/nanogallery2/${versions.nanogallery2}/css/nanogallery2.min.css` ],
  js: [
    `${base(editor)}/jquery/${versions.jquery}/jquery.min.js`,
    `${base(editor)}/nanogallery2/${versions.nanogallery2}/jquery.nanogallery2.min.js`
  ]
});

const pdfjs = (editor: Editor): WidgetAssets => ({
  js: [ `${base(editor)}/pdf.js/${versions.pdfjs}/pdf.min.js` ]
});

/** Le moteur de rendu de pdf.js tourne dans un worker, dont l'adresse est donnée à l'exécution. */
const pdfWorker = (editor: Editor): string => `${base(editor)}/pdf.js/${versions.pdfjs}/pdf.worker.min.js`;

export {
  versions,
  leaflet,
  nanogallery2,
  pdfjs,
  pdfWorker
};
