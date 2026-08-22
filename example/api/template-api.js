'use strict';

/**
 * Simulation de l'API qui sert le **gabarit du site**.
 *
 * L'aperçu visiteur (`onlc_preview_template_url`) demande ici la page complète du site — en-tête,
 * menu, pied, feuilles de style — dans laquelle l'éditeur vient poser le contenu à la place de
 * `[ContenuPage]`. Les autres codes courts sont remplacés côté éditeur, à partir des valeurs
 * données dans `onlc_preview_values` (voir `public/assets/demo.js`).
 *
 * Dans un vrai back-office, ce point d'entrée rend le gabarit du design choisi par le client,
 * pour la page en cours d'édition. C'est exactement ce que fait `pages.inc.php` au moment de
 * publier : la seule différence est que le contenu vient de l'éditeur plutôt que de la base.
 *
 * Réponse : `{ "template": "<!doctype html>…" }`
 */

const template = `<!doctype html>
<html lang="fr">
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
    <meta charset="utf-8">
    <title>[NomPage]</title>
    <meta name='TITLE' content="[TitreSite]" />
    <meta name='DESCRIPTION' content="[DescriptionSite]" />
    <meta name='KEYWORDS' content="[KeywordsSite]" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.3.5/css/bootstrap.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.5.0/css/font-awesome.min.css">
    <link href="https://fonts.googleapis.com/css?family=Open+Sans:300" rel="stylesheet">
    <link rel="stylesheet" href="https://static.onlc.eu/designs/bootstrap/b3_agency_red.css">
  </head>
  <body class="agency">
    <header role="header">
      <div class="container">
        <a class="logo" href="/">[TitreLogoSite]</a>
        <div class="nav-container">
          <nav role="header-nav">
            <div id="menu-button"><span></span><span></span><span></span>Menu</div>
            [MenuSite type="ul" classparent="" classchild="" classactivechild="active"]
          </nav>
        </div>
      </div>
    </header>
    <main role="main-inner-wrapper" class="container onlc_content">
      [ContenuPage]
    </main>
    <footer role="footer" class="footer">
      <div class="container">
        <a class="footer-logo" href="/">[TitreLogoSite]</a>
        <nav role="footer-nav">
          [MenuSite type="ul" classparent="" classchild="" classactivechild="active"]
        </nav>
        <p class="copyright"><span class="onlc_copyrights">[Copyrights]</span> <span class="onlc_contentalert">[ContentAlert]</span></p>
      </div>
    </footer>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.3.5/js/bootstrap.min.js" type="text/javascript"></script>
    <script type="text/javascript" src="https://static.onlc.eu/designs/bootstrap/scripts/images-sizer.js"></script>
    <script src="https://static.onlc.eu/designs/bootstrap/b3_agency.js"></script>
  </body>
</html>
`;

/**
 * Second gabarit : celui d'un vrai site marchand, sur Bootstrap 3 et Swiper.
 *
 * Il est servi sous `/api/template/lmparts`. Deux différences avec le premier, et ce sont
 * justement celles qui comptent pour l'aperçu :
 *
 *   - la **bibliothèque Swiper** est chargée par le gabarit, pas par le contenu. Un diaporama
 *     écrit dans la page ne fonctionne donc que dans l'aperçu et sur le site, jamais dans la zone
 *     d'écriture — c'est la raison d'être du rendu de repli de `onlcswiper` ;
 *   - la **feuille du design** vient du site lui-même, à une adresse versionnée. C'est elle que
 *     `onlc_site_css` déclare, et c'est d'elle que viennent les classes proposées dans les
 *     formulaires.
 */
const lmparts = `<!DOCTYPE html>
<html lang="fr">
  <head>
    <title>[TitreSite] • [NomPage]</title>
    <meta charset="utf-8">
    <meta name="description" content="[DescriptionSite]">
    <meta name="keywords" content="[KeywordsSite]">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1, shrink-to-fit=no">
    <meta http-equiv="x-ua-compatible" content="ie=edge">
    <meta name="robots" content="index,follow">
    <meta name="generator" content="OnlineCreation.me">
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preconnect" href="https://cdnjs.cloudflare.com">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.2.1/jquery.min.js"><\/script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.3.7/js/bootstrap.min.js"><\/script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.3.7/css/bootstrap.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.5.0/css/font-awesome.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Raleway:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css">
    <link rel="stylesheet" href="/assets/lmparts-site.css">
  </head>
  <body>
    <nav class="navbar navbar-transparent" data-spy="affix" data-offset-top="1">
      <div class="container-fluid">
        <div class="navbar-header">
          <button type="button" class="navbar-toggle collapsed" data-toggle="collapse" data-target="#main-menu" aria-expanded="false">
            <span class="sr-only">Menu</span>
            <span class="icon-bar"></span><span class="icon-bar"></span><span class="icon-bar"></span>
          </button>
          <a class="navbar-brand" href="/">[TitreLogoSite]</a>
        </div>
        <div class="collapse navbar-collapse" id="main-menu">
          [MenuSite type="ul" classparent="nav navbar-nav main-navbar" classchild="" classactivechild="active"]
        </div>
      </div>
    </nav>
    <main>
      [ContenuPage]
    </main>
    <!-- Swiper JS : la bibliothèque est chargée par le gabarit, jamais par le contenu. -->
    <script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"><\/script>
  </body>
</html>
`;

const create = () => {
  /**
   * Traite une requête. Renvoie `null` si l'URL ne correspond à aucun point d'entrée, pour
   * laisser le serveur essayer les autres routes.
   */
  const handle = (request, url) => {
    if (request.method.toUpperCase() !== 'GET') {
      return null;
    }
    if (url.pathname === '/') {
      return { template };
    }
    if (url.pathname === '/lmparts') {
      return { template: lmparts };
    }
    return null;
  };

  return { handle, template, lmparts };
};

module.exports = { create, template, lmparts };
