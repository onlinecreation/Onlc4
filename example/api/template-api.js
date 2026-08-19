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

const create = () => {
  /**
   * Traite une requête. Renvoie `null` si l'URL ne correspond à aucun point d'entrée, pour
   * laisser le serveur essayer les autres routes.
   */
  const handle = (request, url) => {
    if (url.pathname === '/' && request.method.toUpperCase() === 'GET') {
      return { template };
    }
    return null;
  };

  return { handle, template };
};

module.exports = { create, template };
