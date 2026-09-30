/**
 * Habillage **Pixel•OnlineCreation** de l'éditeur d'images Pixie.
 *
 * Pixie est le produit ; Pixel•OnlineCreation est le nom sous lequel Online Création le propose
 * à ses clients. Tout ce qui suit passe par l'api de configuration de Pixie — aucune feuille de
 * style n'est plaquée par-dessus, aucun sélecteur interne n'est visé. Une montée de version de
 * Pixie ne peut donc pas défaire cet habillage en silence : au pire une option disparaîtrait,
 * et l'éditeur reprendrait son apparence d'origine plutôt que de s'afficher de travers.
 *
 * Trois leviers :
 *
 * 1. `ui.themes` — les couleurs, en triplets « R V B » comme les attend Pixie ;
 * 2. `ui.menubar.items` — la marque, posée en tête de la barre du haut ;
 * 3. `languages` — l'interface en français.
 *
 * Pixie fusionne la configuration reçue avec la sienne, et **concatène les tableaux**. On
 * n'ajoute donc ici que la marque : annuler/rétablir, zoom, historique et enregistrement restent
 * ceux de Pixie. Les redéclarer les afficherait deux fois — et il faudrait les tenir à jour à
 * chaque version. Leur intitulé passe en français par les traductions, pas par une redéclaration.
 *
 * Ce fichier ne dépend de rien et n'exporte qu'un objet : `window.OnlcPixieBranding`.
 */
(function () {
  'use strict';

  var BLEU = '#006ce7';

  /**
   * Marque affichée en tête de la barre d'outils.
   *
   * Dessinée en svg plutôt que chargée en image : la barre fait trente pixels de haut, la marque
   * doit rester nette sur un écran à forte densité, et un fichier de plus à héberger pour un
   * logo de 3 Ko ne se justifie pas.
   */
  var marque =
    '<svg xmlns="http://www.w3.org/2000/svg" width="212" height="30" viewBox="0 0 212 30">' +
    '<rect x="0" y="3" width="24" height="24" rx="6" fill="' + BLEU + '"/>' +
    '<path d="M8 9.5h4.6a3.4 3.4 0 0 1 0 6.8H10.4V21H8z" fill="#fff"/>' +
    // Un seul bloc de texte : c'est le moteur de rendu qui espace les mots. Positionner le point
    // à la main supposerait de connaître la largeur de « Pixel » dans la police du système.
    '<text x="32" y="20" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif" ' +
    'font-size="15">' +
    '<tspan font-weight="700" fill="' + BLEU + '">Pixel</tspan>' +
    '<tspan dx="3" font-weight="700" fill="' + BLEU + '">•</tspan>' +
    '<tspan dx="3" font-weight="500" fill="#22303c">OnlineCreation</tspan>' +
    '</text>' +
    '</svg>';

  var logo = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(marque);

  /** Thème ONLC : le bleu de l'éditeur, pour que les deux outils se ressemblent. */
  var theme = {
    name: 'pixel-onlinecreation',
    colors: {
      '--be-foreground-base': '0 0 0',
      '--be-primary-light': '185 213 251',
      '--be-primary': '0 108 231',
      '--be-primary-dark': '0 89 193',
      '--be-on-primary': '255 255 255',
      '--be-danger': '180 36 31',
      '--be-on-danger': '255 255 255',
      '--be-background': '255 255 255',
      '--be-background-alt': '246 248 250',
      '--be-paper': '255 255 255',
      '--be-disabled-bg-opacity': '12%',
      '--be-disabled-fg-opacity': '26%',
      '--be-hover-opacity': '4%',
      '--be-focus-opacity': '12%',
      '--be-selected-opacity': '8%',
      '--be-text-main-opacity': '87%',
      '--be-text-muted-opacity': '60%',
      '--be-divider-opacity': '12%'
    }
  };

  /**
   * Barre du haut : on n'y ajoute que la marque.
   *
   * `position: 0` la place avant annuler/rétablir, dont la position par défaut vaut 1.
   */
  var menubar = [
    { type: 'image', src: logo, align: 'left', position: 0 }
  ];

  /**
   * Interface en français.
   *
   * Les clés sont les chaînes anglaises de Pixie ; celles de la barre de navigation sont en
   * minuscules (`crop`, `draw`…), c'est ainsi que Pixie les déclare.
   */
  var francais = {
    'Open a photo or design to get started': 'Ouvrez une image pour commencer',
    'Open Photo': 'Ouvrir une image',
    'Create New': 'Créer',
    'or use sample': 'ou prenez un exemple',
    Width: 'Largeur',
    Height: 'Hauteur',
    'Background color': 'Couleur de fond',
    Cancel: 'Annuler',
    Create: 'Créer',
    Objects: 'Objets',
    'Hide options': 'Masquer les réglages',
    'Show options': 'Afficher les réglages',
    Close: 'Fermer',
    Apply: 'Appliquer',
    'Loading Canvas': 'Préparation de la zone de travail…',
    'Loading Image': 'Chargement de l’image…',
    'Loading State': 'Chargement du projet…',
    'Processing Image': 'Traitement de l’image…',
    'Save As': 'Enregistrer sous',
    Quality: 'Qualité',
    Save: 'Enregistrer',
    Font: 'Police',
    Color: 'Couleur',
    Background: 'Fond',
    Image: 'Image',
    Opacity: 'Opacité',
    Outline: 'Contour',
    Shadow: 'Ombre',
    Gradient: 'Dégradé',
    Texture: 'Texture',
    'Replace Image': 'Remplacer l’image',
    'Outline Color': 'Couleur du contour',
    'Shadow Color': 'Couleur de l’ombre',
    'Font Size': 'Taille du texte',
    Radius: 'Rayon',
    'Brush Color': 'Couleur du pinceau',
    'Brush Size': 'Taille du pinceau',
    'Brush Type': 'Type de pinceau',
    Size: 'Taille',
    'Maintain aspect ratio': 'Conserver les proportions',
    Resize: 'Redimensionner',
    History: 'Historique',
    'New Text': 'Nouveau texte',
    Done: 'Enregistrer',
    // Barre de navigation, en minuscules côté Pixie.
    filter: 'filtres',
    resize: 'taille',
    crop: 'recadrer',
    draw: 'dessiner',
    text: 'texte',
    shapes: 'formes',
    stickers: 'vignettes',
    frame: 'cadre',
    corners: 'coins',
    merge: 'fusionner'
  };

  window.OnlcPixieBranding = {
    nom: 'Pixel•OnlineCreation',
    logo: logo,
    theme: theme,
    menubar: menubar,
    langue: 'fr',
    traductions: { fr: francais },

    /**
     * Complète une configuration Pixie avec l'habillage.
     *
     * Les tableaux sont concaténés par Pixie : le thème vient s'ajouter aux siens — clair, sombre
     * et le nôtre — et c'est `activeTheme` qui désigne celui qui s'applique.
     */
    appliquer: function (config) {
      config.activeLanguage = this.langue;
      config.languages = this.traductions;
      config.ui = config.ui || {};
      config.ui.activeTheme = this.theme.name;
      config.ui.themes = [ this.theme ];
      config.ui.menubar = { items: this.menubar };
      return config;
    }
  };
}());
