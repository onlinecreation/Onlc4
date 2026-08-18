/* global hugerte */
'use strict';

/**
 * Configuration complète de l'éditeur ONLC 4, branchée sur les API simulées du serveur
 * d'exemple. Chaque option est commentée : ce fichier sert de point de départ à une vraie
 * intégration.
 */

const bloc = (definition) => definition;

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
    'onlcspacer', 'onlcicons', 'onlcwidgets',
    // plugins d'origine, pour comparer
    'lists', 'table', 'searchreplace', 'fullscreen'
  ].join(' '),

  menubar: 'edit insert format table tools',

  toolbar: [
    'undo redo',
    'blocks bold italic',
    'bullist numlist',
    'onlcblocksinsert onlcblocksrow onlcblocks',
    'onlcimage onlcmedialibrary',
    'onlclink onlcunlink',
    'onlcspacer onlcemoji onlcicons',
    'onlcwidget onlcscript onlcsource',
    'fullscreen'
  ].join(' | '),

  // Styles appliqués dans la zone d'édition : mini grille facon Bootstrap + rendu des blocs
  content_css: '/assets/content.css',

  // --- API médias (docs/api/onlc-media-api.md) ------------------------------
  onlc_media_api_url: '/api/media',
  onlc_media_root_path: '/',
  onlc_media_max_upload_size: 8 * 1024 * 1024,

  // --- Éditeur d'images Pixel (docs/api/onlc-pixel-editor.md) ---------------
  // En production : https://pixel.onlinecreation.me
  onlc_media_image_editor_url: '/pixel/',

  // --- API des liens (docs/api/onlc-link-api.md) ----------------------------
  onlc_link_api_url: '/api/links',
  onlc_link_default_rel: '',
  onlc_link_class_list: [
    { text: 'Lien simple', value: '' },
    { text: 'Bouton principal', value: 'btn btn-primary' },
    { text: 'Bouton secondaire', value: 'btn btn-secondary' }
  ],

  // --- Dictionnaires emojis et icônes (docs/api/onlc-icons-api.md) ----------
  onlc_icons_material_url: '/api/icons',
  // Police d'icônes : vide dans cette démonstration pour qu'elle fonctionne hors ligne.
  // En production : 'https://fonts.googleapis.com/icon?family=Material+Icons'
  onlc_icons_stylesheet_url: '',

  // --- Séparateurs ----------------------------------------------------------
  onlc_spacer_default_height: '30px',

  // --- Blocs prédéfinis -----------------------------------------------------
  onlc_widgets_map_provider: 'osm',
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

  setup: (editor) => {
    editor.on('init', () => {
      document.getElementById('statut').textContent =
        'Éditeur prêt. Modifiez le contenu puis cliquez sur « Enregistrer ».';
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
