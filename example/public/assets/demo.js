/* global hugerte */
'use strict';

/**
 * Configuration complète de l'éditeur ONLC 4, branchée sur les API simulées du serveur
 * d'exemple. Chaque option est commentée : ce fichier sert de point de départ à une vraie
 * intégration.
 */

const bloc = (definition) => definition;

/** Feuille des polices Google utilisées par les sites Online Création. */
const POLICES_GOOGLE = 'https://fonts.googleapis.com/css?family=Abril+Fatface|Asar|Concert+One|' +
  'Cinzel|Gloria+Hallelujah|Indie+Flower|Josefin+Sans:400,400i,700,700i|Lato:300,300i,400,400i|' +
  'Lobster|Macondo|Cormorant+Garamond:400%2C700|Montserrat:400,400i,700,700i|' +
  'Open+Sans+Condensed:300,300i,700|Open+Sans:400,400i,700,700i|Oswald:400,700|Pacifico|' +
  'Playfair+Display:400,400i,700|Quicksand:400,700|Raleway:400,400i,700,700i|' +
  'Roboto+Condensed:400,400i,700,700i|Roboto:400,400i,700,700i|Rubik+Mono+One|Sacramento|' +
  'Source+Sans+Pro:400,400i,700,700i|Spirax|UnifrakturCook:700&subset=latin-ext&display=swap';

hugerte.init({
  selector: '#contenu',

  // L'éditeur compilé est servi par le serveur d'exemple sous /hugerte
  base_url: '/hugerte',
  height: 760,
  branding: false,
  promotion: false,

  // Les URL renvoyées par l'API sont déjà absolues côté site : on les garde telles quelles
  convert_urls: false,

  plugins: [
    // plugins ONLC
    'onlcblocks', 'onlcmedia', 'onlcresponsiveimages', 'onlclink',
    'onlcspacer', 'onlcicons', 'onlcwidgets', 'onlcmultilang',
    // plugins d'origine, pour comparer
    'lists', 'table', 'searchreplace', 'fullscreen'
  ].join(' '),

  // La langue de l'interface, et rien d'autre à faire : le paquet `langs/<code>.js` porte les
  // chaînes du cœur comme celles des plugins, et l'éditeur va le chercher tout seul.
  //
  // Elle se choisit ici par l'adresse — « ?lang=nl » — pour que les quatre langues se vérifient
  // sans toucher au fichier. Un vrai back-office la tient de la préférence de la personne
  // connectée. Seuls les quatre codes prévus sont acceptés : ce qui vient de l'adresse ne
  // choisit jamais librement le nom d'un fichier à charger.
  language: (function () {
    var demande = new URLSearchParams(window.location.search).get('lang');
    return [ 'fr', 'en', 'es', 'nl' ].indexOf(demande) === -1 ? 'fr' : demande;
  })(),

  menubar: 'edit insert format table tools',

  toolbar: [
    'undo redo',
    'blocks bold italic',
    'bullist numlist',
    'onlcblocksinsert onlcblocksrow onlcblocks',
    'onlcimage onlcmedialibrary',
    'onlclink onlcunlink',
    'onlcspacer onlcicons',
    'onlcwidget onlcscript onlcsource',
    'onlcmultilang onlcmultilangwork',
    'onlcpreview',
    'fullscreen'
  ].join(' | '),

  // Styles appliqués dans la zone d'édition : la vraie grille Bootstrap, puis les styles du site
  content_css: [
    '/assets/vendor/bootstrap-grid.min.css',
    '/assets/content.css'
  ],

  // --- API médias (docs/api/onlc-media-api.md) ------------------------------
  // --- Blocs ----------------------------------------------------------------
  // La grille est aussi déclarée ici : le plugin la charge dans l'éditeur même si
  // `content_css` change, et sait ainsi afficher les lignes et colonnes correctement.
  onlc_blocks_grid_css: '/assets/vendor/bootstrap-grid.min.css',
  onlc_blocks_breakpoint: 'sm',

  // --- API médias (docs/api/onlc-media-api.md) ------------------------------
  onlc_media_api_url: '/api/media',
  onlc_media_root_path: '/',
  onlc_media_max_upload_size: 8 * 1024 * 1024,

  // --- Éditeur d'images Pixie (docs/api/onlc-pixie-editor.md) ---------------
  // En production : une instance Pixie déployée, par exemple https://pixel.onlinecreation.me
  onlc_media_image_editor_url: '/pixie/',

  // --- API des liens (docs/api/onlc-link-api.md) ----------------------------
  onlc_link_api_url: '/api/links',
  onlc_link_default_rel: '',
  onlc_link_class_list: [
    { text: 'Lien simple', value: '' },
    { text: 'Bouton principal', value: 'btn btn-primary' },
    { text: 'Bouton secondaire', value: 'btn btn-secondary' }
  ],

  // --- Dictionnaires emojis et icônes (docs/api/onlc-icons-api.md) ----------
  // Les deux polices sont embarquées dans le plugin : rien à charger ailleurs. Retirez une
  // entrée de la liste pour ne pas charger cette famille du tout.
  onlc_icons_families: [ 'material', 'fontawesome' ],
  // Catalogue supplémentaire servi par l'API : il s'ajoute aux icônes embarquées.
  onlc_icons_material_url: '/api/icons',
  // Les emojis tapés au clavier deviennent des dessins OpenMoji, identiques partout.
  onlc_icons_rewrite_emoji: true,

  // --- Séparateurs ----------------------------------------------------------
  onlc_spacer_default_height: '30px',

  // --- Pages polyglottes (docs/plugins/onlcmultilang.md) --------------------
  // Les langues du site. Un passage marqué dans l'une d'elles ne s'affiche que pour les
  // visiteurs qui la consultent ; le reste de la page s'affiche pour tout le monde.
  onlc_multilang_languages: [ 'fr', 'en', 'nl' ],
  // Écriture des sections créées ici. `multilang` accepte tout, `lg` est l'écriture historique.
  onlc_multilang_default_syntax: 'multilang',

  // --- Blocs prédéfinis -----------------------------------------------------
  // Bibliothèques externes des blocs carte, galerie et pdf. Remplacez cette adresse si vous
  // hébergez Leaflet, nanogallery2 et pdf.js sur vos propres serveurs.
  onlc_widgets_cdn_base: 'https://cdnjs.cloudflare.com/ajax/libs',
  // Recherche d'adresse du bloc carte (Nominatim, OpenStreetMap).
  onlc_widgets_geocoder_url: 'https://nominatim.openstreetmap.org/search',

  // --- Aperçu comme un visiteur --------------------------------------------
  // Le gabarit du site est servi par une API ; l'éditeur y pose le contenu à la place de
  // [ContenuPage] et remplace les autres codes courts par les valeurs ci-dessous.
  onlc_preview_template_url: '/api/template',
  onlc_preview_values: {
    NomPage: 'Accueil',
    TitreSite: 'ONLC 4 — démonstration',
    DescriptionSite: 'Un éditeur de pages qui se fait oublier.',
    KeywordsSite: 'éditeur, pages, blocs, ONLC',
    TitreLogoSite: '<img src="/media/logo-onlc.svg" alt="ONLC" height="40">',
    Copyrights: '© ' + new Date().getFullYear() + ' Online Création',
    ContentAlert: 'Contenu de démonstration',
    // Un code peut recevoir une fonction : elle lit les attributs écrits dans le gabarit et
    // rend exactement ce que le serveur rendrait — ici, les classes css demandées.
    MenuSite: function (attributs) {
      var pages = [ 'Accueil', 'Nos offres', 'Réalisations', 'Contact' ];
      var classeListe = attributs.classparent ? ' class="' + attributs.classparent + '"' : '';
      return '<ul' + classeListe + '>' + pages.map(function (page, index) {
        var classes = [ attributs.classchild, index === 0 ? attributs.classactivechild : '' ]
          .filter(Boolean).join(' ');
        return '<li' + (classes ? ' class="' + classes + '"' : '') + '><a href="#">' + page + '</a></li>';
      }).join('') + '</ul>';
    },
    Contact: '<p><em>Le formulaire de contact s’affiche ici sur le site publié.</em></p>',
    SocialButtons: '<p><em>Boutons de partage</em></p>',
    PaypalButton: '<p><em>Bouton de paiement PayPal</em></p>',
    LogoSite: '<img src="/media/logo-onlc.svg" alt="ONLC" height="60">'
  },
  onlc_widgets_custom: [
    bloc({
      id: 'horaires',
      label: 'Horaires d’ouverture',
      description: 'Exemple de bloc ajouté par le projet',
      category: 'Contenu',
      icon: 'insert-time',
      fields: [
        { name: 'titre', label: 'Titre', type: 'text' },
        { name: 'semaine', label: 'Du lundi au vendredi', type: 'text', half: true },
        { name: 'weekend', label: 'Week-end', type: 'text', half: true },
        { name: 'note', label: 'Note', type: 'textarea', tab: 'Détails' }
      ],
      defaults: {
        titre: 'Nos horaires',
        semaine: '9 h – 18 h',
        weekend: 'Fermé',
        note: ''
      },
      render: (config) => {
        const echapper = (valeur) => String(valeur)
          .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const note = config.note.trim() === '' ? '' : '<p><em>' + echapper(config.note) + '</em></p>';
        return '<div class="onlc-widget__inner">' +
          '<h3>' + echapper(config.titre) + '</h3>' +
          '<ul><li>Du lundi au vendredi : ' + echapper(config.semaine) + '</li>' +
          '<li>Week-end : ' + echapper(config.weekend) + '</li></ul>' + note +
          '</div>';
      }
    })
  ],

  // --- Typographies ---------------------------------------------------------
  // Les familles Google chargées par la page, proposées telles quelles dans la barre d'outils.
  font_family_formats: [
    'Système=system-ui, -apple-system, sans-serif',
    'Roboto=Roboto, sans-serif',
    'Roboto Condensed=Roboto Condensed, sans-serif',
    'Open Sans=Open Sans, sans-serif',
    'Open Sans Condensed=Open Sans Condensed, sans-serif',
    'Source Sans Pro=Source Sans Pro, sans-serif',
    'Lato=Lato, sans-serif',
    'Montserrat=Montserrat, sans-serif',
    'Raleway=Raleway, sans-serif',
    'Josefin Sans=Josefin Sans, sans-serif',
    'Quicksand=Quicksand, sans-serif',
    'Oswald=Oswald, sans-serif',
    'Concert One=Concert One, cursive',
    'Playfair Display=Playfair Display, serif',
    'Cormorant Garamond=Cormorant Garamond, serif',
    'Cinzel=Cinzel, serif',
    'Abril Fatface=Abril Fatface, cursive',
    'Lobster=Lobster, cursive',
    'Pacifico=Pacifico, cursive',
    'Sacramento=Sacramento, cursive',
    'Spirax=Spirax, cursive',
    'Macondo=Macondo, cursive',
    'Gloria Hallelujah=Gloria Hallelujah, cursive',
    'Indie Flower=Indie Flower, cursive',
    'Asar=Asar, serif',
    'Rubik Mono One=Rubik Mono One, sans-serif',
    'UnifrakturCook=UnifrakturCook, cursive'
  ].join('; '),

  setup: (editor) => {
    editor.on('init', async () => {
      // Les polices Google sont ajoutées **après** l'initialisation, sans l'attendre : une
      // feuille servie par un tiers peut mettre plusieurs secondes à répondre — ou ne jamais
      // répondre — et l'éditeur ne doit pas rester bloqué pour autant.
      const feuille = editor.getDoc().createElement('link');
      feuille.rel = 'stylesheet';
      feuille.href = POLICES_GOOGLE;
      editor.getDoc().head.appendChild(feuille);

      const statut = document.getElementById('statut');
      statut.textContent = 'Chargement du contenu de démonstration…';

      // Le contenu est chargé comme le ferait un site : du html déjà publié, relu par l'éditeur.
      try {
        const reponse = await fetch('/assets/contenu.html');
        editor.setContent(await reponse.text());
        editor.undoManager.clear();
      } catch (err) {
        statut.textContent = 'Contenu de démonstration indisponible : ' + err.message;
        return;
      }

      statut.textContent = 'Éditeur prêt. Modifiez le contenu puis cliquez sur « Enregistrer ».';
    });
  }
});

// --- Enregistrement simulé ---------------------------------------------------

const afficher = (html) => {
  document.querySelector('#sortie code').textContent = html;
};

document.getElementById('rafraichir').addEventListener('click', () => {
  afficher(hugerte.activeEditor.getContent());
});

document.getElementById('enregistrer').addEventListener('click', async () => {
  const contenu = hugerte.activeEditor.getContent();
  const statut = document.getElementById('statut');
  afficher(contenu);
  statut.textContent = 'Envoi en cours…';

  try {
    const reponse = await fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: contenu })
    });
    const resultat = await reponse.json();
    statut.textContent = 'Contenu enregistré (' + resultat.length + ' caractères) à ' +
      new Date(resultat.at).toLocaleTimeString('fr-FR') + '.';
  } catch (err) {
    statut.textContent = 'Échec de l’enregistrement : ' + err.message;
  }
});
