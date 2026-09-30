'use strict';

/**
 * Génère le contenu de démonstration (`example/public/assets/contenu.html`).
 *
 *   node example/tools/build-content.js
 *
 * Le fichier produit est du **html publié** : exactement ce qu'un site enregistrerait en base.
 * L'éditeur le relit au démarrage, ce qui met à l'épreuve le chemin le plus important — celui de
 * la reprise d'une page existante — plutôt que le seul chemin de l'insertion.
 *
 * Les blocs prédéfinis portent leur configuration en json dans un attribut : elle est écrite ici
 * par `bloc()`, ce qui évite d'avoir à encoder ces attributs à la main.
 */

const fs = require('fs');
const path = require('path');

const target = path.resolve(__dirname, '../public/assets/contenu.html');

/** Bloc prédéfini, sous sa forme publiée. */
const bloc = (id, config, html) =>
  `<div class="onlc-widget onlc-widget--${id}" data-onlc-widget="${id}" ` +
  `data-onlc-widget-config="${encodeURIComponent(JSON.stringify(config))}">${html}</div>`;

const lieu = (address, latitude, longitude, zoom) =>
  JSON.stringify({ address, latitude, longitude, zoom });

const galerie = [
  { src: '/media/photos/montagne.svg', title: 'Sommet au lever du jour' },
  { src: '/media/photos/plage.svg', title: 'Plage au petit matin' },
  { src: '/media/photos/foret.svg', title: 'Sous-bois en automne' },
  { src: '/media/photos/ville.svg', title: 'Toits de la ville' },
  { src: '/media/photos/desert.svg', title: 'Dunes au couchant' },
  { src: '/media/photos/atelier.svg', title: 'Dans l’atelier' }
];

const rendezVous = [
  { day: '3', time: '09:30', label: 'Petit-déjeuner d’accueil' },
  { day: '3', time: '14:00', label: 'Atelier « premiers pas »' },
  { day: '11', time: '18:30', label: 'Rencontre des adhérents' },
  { day: '18', time: '10:00', label: 'Portes ouvertes' },
  { day: '18', time: '15:00', label: 'Démonstration en direct' },
  { day: '26', time: '20:00', label: 'Concert de fin de saison' }
];

const parts = [];
const add = (html) => parts.push(html);

/* Ouverture ---------------------------------------------------------------- */

add(bloc('hero', {
  title: 'Un éditeur qui se fait oublier',
  subtitle: 'Écrivez, déplacez, publiez. ONLC 4 rassemble les blocs, les médias et les codes de votre site.',
  image: '/media/illustrations/banniere.svg',
  height: '440px',
  overlay: '45',
  align: 'center',
  buttonLabel: 'Découvrir la démonstration',
  buttonUrl: '#blocs',
  buttonTarget: '',
  color: '#ffffff',
  gradientFrom: '',
  gradientTo: '',
  gradientAngle: '90',
  shadowX: '0',
  shadowY: '2',
  shadowBlur: '8',
  shadowColor: 'rgba(0, 0, 0, 0.45)'
},
'<section class="onlc-hero" style="min-height: 440px; background-image: url(&quot;/media/illustrations/banniere.svg&quot;); text-align: center">' +
'<div class="onlc-hero__overlay onlc-widget__static" style="background-color: rgba(0, 0, 0, 0.45)"></div>' +
'<div class="onlc-hero__content" style="color: #ffffff; text-shadow: 0px 2px 8px rgba(0, 0, 0, 0.45)">' +
'<h2 class="onlc-hero__title" data-onlc-slot="title">Un éditeur qui se fait oublier</h2>' +
'<div class="onlc-hero__subtitle" data-onlc-slot="subtitle"><p>Écrivez, déplacez, publiez. ONLC 4 rassemble les blocs, les médias et les codes de votre site.</p></div>' +
'<a class="onlc-btn btn btn-primary btn-lg" href="#blocs">Découvrir la démonstration</a>' +
'</div></section>'));

add('<h1 id="blocs">Démonstration ONLC 4</h1>');
add('<p>Survolez ce paragraphe : les outils de bloc apparaissent à sa gauche, et les zones d’ajout se placent avant et après le contenu. ' +
  'Tout ce que vous voyez ici est relu depuis du html publié, comme le ferait un vrai site.</p>');

/* Grille ------------------------------------------------------------------- */

add('<div class="row">' +
  '<div class="col-sm-4"><h3><i class="fa-solid fa-rocket onlc-icon" role="img" aria-label="rocket"></i> Rapide</h3>' +
  '<p>Colonne d’un tiers. La ligne se déplace d’un seul bloc, les colonnes restent en place.</p></div>' +
  '<div class="col-sm-4"><h3><span class="material-icons onlc-icon" role="img" aria-label="favorite">favorite</span> Soigné</h3>' +
  '<p>Deux polices d’icônes sont embarquées : Font Awesome et Material Design.</p></div>' +
  '<div class="col-sm-4"><h3><i class="fa-solid fa-handshake onlc-icon" role="img" aria-label="handshake"></i> Accompagné</h3>' +
  '<p>Cliquez dans une colonne : la barre de la ligne propose les sept dispositions.</p></div>' +
  '</div>');

/* Textes ------------------------------------------------------------------- */

add(bloc('text', {
  title: 'Un titre en dégradé',
  content: 'Le bloc de texte accepte une couleur, un dégradé (départ, arrivée, angle) et une ombre portée.',
  align: 'center',
  width: '720px',
  color: '',
  gradientFrom: '#006ce7',
  gradientTo: '#e0007a',
  gradientAngle: '45',
  shadowX: '0',
  shadowY: '2',
  shadowBlur: '6',
  shadowColor: 'rgba(0, 0, 0, 0.25)'
},
'<div class="onlc-widget__inner" style="text-align: center; max-width: 720px; margin: 0 auto; background-image: linear-gradient(45deg, #006ce7, #e0007a); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; color: transparent; text-shadow: 0px 2px 6px rgba(0, 0, 0, 0.25)">' +
'<h3 data-onlc-slot="title">Un titre en dégradé</h3>' +
'<div data-onlc-slot="content"><p>Le bloc de texte accepte une couleur, un dégradé (départ, arrivée, angle) et une ombre portée.</p></div></div>'));

add(bloc('details', {
  summary: 'Comment insérer une vidéo ?',
  content: 'Cliquez sur « Blocs prédéfinis », choisissez « Vidéo », puis collez l’adresse YouTube, Vimeo ou Dailymotion.\n\nL’éditeur affiche une vignette : la vidéo n’est jamais lue pendant que vous écrivez.',
  open: 'false',
  variant: 'boxed'
},
'<details class="onlc-details onlc-details--boxed">' +
'<summary class="onlc-details__summary" data-onlc-slot="summary">Comment insérer une vidéo ?</summary>' +
'<div class="onlc-details__body" data-onlc-slot="content">' +
'<p>Cliquez sur « Blocs prédéfinis », choisissez « Vidéo », puis collez l’adresse YouTube, Vimeo ou Dailymotion.</p>' +
'<p>L’éditeur affiche une vignette : la vidéo n’est jamais lue pendant que vous écrivez.</p></div></details>'));

add(bloc('quote', {
  text: 'Un éditeur doit se faire oublier : on pense à son texte, pas à ses boutons.',
  author: 'Équipe ONLC',
  source: ''
},
'<figure class="onlc-quote"><blockquote data-onlc-slot="text">' +
'<p>Un éditeur doit se faire oublier : on pense à son texte, pas à ses boutons.</p></blockquote>' +
'<figcaption class="onlc-quote__author">Équipe ONLC</figcaption></figure>'));

/* Images ------------------------------------------------------------------- */

add('<h2>Images</h2>');
add('<figure class="onlc-image onlc-image--parallax" style="background-image: url(/media/photos/montagne.svg)">' +
  '<img src="/media/photos/montagne.svg" alt="Sommet au lever du jour" style="width: 100%; height: auto">' +
  '<figcaption class="onlc-image__overlay onlc-image__overlay--middle-center" ' +
  'style="font-size: 2.5rem; font-family: Lobster, cursive; padding: 1rem 2rem; ' +
  'background-image: linear-gradient(35deg, #ffd479, #ff8b8b); -webkit-background-clip: text; ' +
  'background-clip: text; -webkit-text-fill-color: transparent; color: transparent; ' +
  'text-shadow: 0px 2px 10px rgba(0, 0, 0, 0.55)">Le grand air</figcaption></figure>');

add('<p>L’image ci-dessus utilise le style « Parallaxe ». Celle de droite garde une largeur en pourcentage ' +
  'et une hauteur automatique : ni <code>width</code> ni <code>height</code> ne sont écrits en attribut.</p>');

add(bloc('image', {
  src: '/media/photos/plage.svg',
  alt: 'Plage au petit matin',
  caption: 'Une légende sous l’image, éditable dans le formulaire du bloc.',
  width: '70%',
  align: 'center',
  url: '',
  target: ''
},
'<figure class="onlc-widget__figure" style="text-align: center">' +
'<img src="/media/photos/plage.svg" alt="Plage au petit matin" style="width: 70%; height: auto">' +
'<figcaption>Une légende sous l’image, éditable dans le formulaire du bloc.</figcaption></figure>'));

/* Galerie ------------------------------------------------------------------ */

add('<h2>Galerie</h2>');
add(bloc('gallery', {
  items: JSON.stringify(galerie),
  layout: 'masonry',
  size: '220',
  gap: '6',
  showLabels: 'true'
}, '<div class="onlc-gallery"></div>'));

/* Médias ------------------------------------------------------------------- */

add('<h2>Médias</h2>');

add(bloc('video', {
  url: 'https://www.youtube.com/shorts/cUEAojyBuis',
  title: 'Short YouTube',
  ratio: '177.77%',
  autoplay: 'false',
  loop: 'false',
  muted: 'false'
}, '<div class="onlc-embed" style="padding-bottom: 177.77%"></div>'));

add(bloc('iframe', {
  src: '/pixie/',
  title: 'Pixel•OnlineCreation, l’éditeur d’images',
  mode: 'height',
  ratio: '56.25%',
  height: '420px',
  scrolling: 'true'
}, '<div class="onlc-embed onlc-embed--fixed"></div>'));

add(bloc('map', {
  location: lieu('61 rue du Château d’Eau, 33000 Bordeaux', 44.8404, -0.5805, 15),
  marker: 'Nos bureaux',
  height: '380px',
  interactive: 'true',
  scrollZoom: 'false'
}, '<div class="onlc-leaflet" style="height: 380px; width: 100%"></div>'));

add(bloc('pdf', {
  src: '/media/documents/presentation-onlc.pdf',
  title: 'Notre présentation',
  height: '640px',
  pages: '0',
  download: 'true'
}, '<div class="onlc-pdf" style="max-height: 640px"></div>'));

/* Calendrier --------------------------------------------------------------- */

add('<h2>Calendrier</h2>');
add(bloc('calendar', {
  title: 'Les rendez-vous du mois',
  month: '2026-04',
  weekStart: 'monday',
  accent: '#e0007a',
  events: JSON.stringify(rendezVous)
}, '<div class="onlc-cal"></div>'));

/* Codes courts ------------------------------------------------------------- */

add('<h2>Éléments du site</h2>');
add('<p>[Meta description="Démonstration complète de l’éditeur ONLC 4." keywords="éditeur, blocs, médias, shortcodes"]</p>');
add('<p>[MenuSite type="ul" classparent="nav navbar-nav" classchild="class-menuitem" classactivechild="active"]</p>');
add('<p>[Contact email="hello@katakana.rocks"]</p>');
add('<p>[SocialButtons Facebook Twitter LinkedIn WhatsApp]</p>');
add('<p>[PaypalButton type="buynow" email="vente@exemple.fr" item="Adhésion annuelle" price="49.00" ' +
  'currency="EUR" class="btn btn-primary" label="Adhérer" target="_blank" align="center"]</p>');
add('<p>[LogoSite;220;90]</p>');
add('<p>[add-to-calendar-button name="Portes ouvertes ONLC" description="Venez essayer l’éditeur." ' +
  'startDate="2026-04-18" endDate="2026-04-18" startTime="10:00" endTime="18:00" timeZone="Europe/Paris" ' +
  'location="61 rue du Château d’Eau, 33000 Bordeaux" buttonStyle="date" lightMode="bodyScheme" ' +
  'options="\'Apple\',\'Google\',\'iCal\',\'Microsoft365\',\'MicrosoftTeams\',\'Outlook.com\',\'Yahoo\'"]</p>');

/* Emojis, icônes et code --------------------------------------------------- */

add('<h2>Emojis, icônes et code</h2>');
add('<p>Ces emojis sont tapés au clavier : 😀 🎉 🚀 🌍 ❤️ — l’éditeur les remplace par les dessins OpenMoji.</p>');
add('<p>Et voici des icônes : <i class="fa-solid fa-envelope onlc-icon" role="img" aria-label="envelope"></i> ' +
  '<i class="fa-brands fa-github onlc-icon" role="img" aria-label="GitHub"></i> ' +
  '<span class="material-icons onlc-icon" role="img" aria-label="place">place</span></p>');

add('<p>Le script ci-dessous n’est jamais exécuté pendant l’édition :</p>');
add('<p><script type="text/javascript">' +
  'window.console.log("Bonjour depuis ONLC 4");\n' +
  'const total = 1 + 1;\n' +
  'alert("hello");\n' +
  'window.console.log("total", total);' +
  '<\/script></p>');

add(bloc('html', {
  code: '<div class="alert alert-info">\n  <strong>Encart partenaire.</strong>\n  Ce code est publié tel quel.\n</div>',
  title: 'Encart partenaire'
}, '<div class="alert alert-info">\n  <strong>Encart partenaire.</strong>\n  Ce code est publié tel quel.\n</div>'));

/* Séparateurs et tableau --------------------------------------------------- */

add(bloc('separator', { height: '48px', variant: 'line', color: '#c3d9f5', width: '60%' },
  '<hr class="onlc-widget__rule" style="margin-top: 48px; margin-bottom: 48px; width: 60%; border-top-color: #c3d9f5">'));

add('<h2>Tableau et liens</h2>');
add('<table><thead><tr><th>Plugin</th><th>Ce qu’il apporte</th></tr></thead><tbody>' +
  '<tr><td>onlcblocks</td><td>Déplacer, dupliquer, supprimer, grille Bootstrap</td></tr>' +
  '<tr><td>onlcmedia</td><td>Médiathèque, retouche, texte par-dessus l’image</td></tr>' +
  '<tr><td>onlcwidgets</td><td>Blocs prédéfinis, script, source html</td></tr>' +
  '<tr><td>onlcshortcodes</td><td>Codes courts des gabarits Online Création</td></tr>' +
  '</tbody></table>');

add('<p>Un lien vers <a href="/contact" title="Nous écrire">la page de contact</a>, ' +
  'et un lien externe vers <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>.</p>');

add('<div class="onlc-spacer" data-onlc-spacer="60px" style="height: 60px" aria-hidden="true"></div>');

const header = `<!--
  Contenu de démonstration d'ONLC 4, sous sa forme publiée.
  Généré par example/tools/build-content.js — ne pas modifier à la main.
-->
`;

fs.writeFileSync(target, header + parts.join('\n\n') + '\n');
console.log(`${parts.length} éléments écrits dans ${target}`);
