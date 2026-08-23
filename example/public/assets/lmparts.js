/* global hugerte */
'use strict';

/**
 * Second exemple : la page d'accueil d'un site marchand, telle qu'elle est publiée.
 *
 * Le premier exemple montre ce que l'éditeur sait **poser** dans une page : ses blocs, ses
 * médias, ses codes courts. Celui-ci montre ce qu'il sait **reprendre** — une page écrite par un
 * intégrateur, avec ses conventions à lui, que le rédacteur doit pouvoir modifier sans rien
 * casser.
 *
 * Trois choses le distinguent du premier, et ce sont les trois qu'il sert à démontrer :
 *
 *   1. la **feuille de style du site** est déclarée : la zone d'écriture montre la page habillée,
 *      et les classes du design sont proposées dans les formulaires ;
 *   2. les **diaporamas** ne sont pas des blocs de l'éditeur : c'est du html avec une
 *      configuration javascript, que `onlcswiper` retrouve et rend modifiable ;
 *   3. le **gabarit** charge Swiper et Bootstrap 3, donc l'aperçu fait défiler pour de vrai ce que
 *      la zone d'écriture ne peut que montrer en bande.
 */

/**
 * La feuille du design, telle que le site la sert.
 *
 * L'adresse est versionnée : elle change à chaque publication du design. Un back-office la connaît
 * parce qu'il l'a produite ; ici, elle est écrite en dur.
 */
const FEUILLE_DU_SITE = 'https://lmparts.fr/head-style.fdc71de8fa5ec6a49304fbe91ae3f5daxfr.css';

/**
 * La même feuille, servie localement.
 *
 * Elle reprend les classes de structure du design. Elle est déclarée **avant** celle du site :
 * quand le réseau répond, celle du site passe après et a le dernier mot ; quand il ne répond pas —
 * poste hors ligne, intégration continue, pare-feu — la page reste lisible.
 */
const FEUILLE_LOCALE = '/assets/lmparts-site.css';

hugerte.init({
  selector: '#contenu',

  base_url: '/hugerte',
  height: 760,
  branding: false,
  promotion: false,
  convert_urls: false,

  plugins: [
    'onlcblocks', 'onlcmedia', 'onlcresponsiveimages', 'onlclink',
    'onlcspacer', 'onlcicons', 'onlcwidgets', 'onlcmultilang',
    'onlcseo', 'onlcswiper',
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
    'onlcblocksinsert onlcblocksrow',
    'onlcimage onlclink onlcicons',
    'onlcwidget onlcscript onlcsource',
    'onlcmultilang onlcmultilangwork onlcseo',
    'onlcpreview',
    'fullscreen'
  ].join(' | '),

  // --- La feuille du site ---------------------------------------------------
  // Elle habille la zone d'écriture, elle est reprise dans l'aperçu, et ses classes garnissent
  // les suggestions du formulaire « Identifiant et classes du bloc ».
  onlc_site_css: [ FEUILLE_LOCALE, FEUILLE_DU_SITE ],

  // Le navigateur affiche une feuille d'un autre domaine mais refuse d'en lire le texte. Ce
  // relais va la chercher côté serveur, ce qui rend ses classes disponibles dans les formulaires.
  onlc_site_css_proxy: '/api/site-css?url={url}',

  // La grille : le site est sur Bootstrap 3, dont les colonnes s'écrivent `col-md-6`.
  content_css: [ '/assets/vendor/bootstrap-grid.min.css' ],
  onlc_blocks_grid_css: '/assets/vendor/bootstrap-grid.min.css',
  onlc_blocks_breakpoint: 'md',

  // --- API simulées ---------------------------------------------------------
  onlc_media_api_url: '/api/media',
  onlc_media_root_path: '/',
  onlc_media_image_editor_url: '/pixie/',
  onlc_link_api_url: '/api/links',
  onlc_icons_families: [ 'fontawesome' ],

  // --- Trois langues --------------------------------------------------------
  onlc_multilang_languages: [ 'fr', 'en', 'nl' ],
  onlc_multilang_default_syntax: 'multilang',

  // --- Diaporamas -----------------------------------------------------------
  // Hauteur des vues dans la zone d'écriture. Swiper ne s'y exécute pas : sans borne, un
  // diaporama de huit photos occuperait huit écrans.
  onlc_swiper_edit_height: '200px',

  // --- Aperçu comme un visiteur ---------------------------------------------
  onlc_preview_template_url: '/api/template/lmparts',
  onlc_preview_values: {
    NomPage: 'Accueil',
    TitreSite: 'LM Parts',
    DescriptionSite: 'Coques de carte Renault, Dacia et Alpine peintes à la teinte de votre véhicule.',
    KeywordsSite: 'coque de carte, Renault, Dacia, Alpine, porte-clés',
    TitreLogoSite: '<strong>LM Parts</strong>',
    MenuSite: function (attributs) {
      const pages = [
        { titre: 'Le produit', ancre: '#what-is-it' },
        { titre: 'Le montage', ancre: '#how-it-works' },
        { titre: 'Commander', ancre: '#shop' },
        { titre: 'Questions', ancre: '#faq' }
      ];
      const classeListe = attributs.classparent ? ' class="' + attributs.classparent + '"' : '';
      return '<ul' + classeListe + '>' + pages.map(function (page, index) {
        const classes = [ attributs.classchild, index === 0 ? attributs.classactivechild : '' ]
          .filter(Boolean).join(' ');
        return '<li' + (classes ? ' class="' + classes + '"' : '') +
          '><a href="' + page.ancre + '">' + page.titre + '</a></li>';
      }).join('') + '</ul>';
    }
  },

  setup: (editor) => {
    editor.on('init', async () => {
      const statut = document.getElementById('statut');
      statut.textContent = 'Chargement de la page…';

      try {
        const reponse = await fetch('/assets/lmparts-contenu.html');
        editor.setContent(await reponse.text());
        editor.undoManager.clear();
      } catch (err) {
        statut.textContent = 'Page de démonstration indisponible : ' + err.message;
        return;
      }

      const diaporamas = editor.plugins.onlcswiper.list();
      const regles = diaporamas.filter((diaporama) => diaporama.call.isSome()).length;
      statut.textContent = 'Page chargée. ' + diaporamas.length + ' diaporamas, dont ' + regles +
        ' avec leur configuration retrouvée dans le script.';
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
