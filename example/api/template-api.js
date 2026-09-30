'use strict';

const fs = require('fs');
const path = require('path');

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
 * Il est servi sous `/api/template/lmparts`, et il est lu **tel quel** dans
 * `api/templates/lmparts.html` : c'est le gabarit du site, recopié sans retouche. Le garder dans
 * un fichier plutôt que dans une chaîne de ce module évite d'avoir à échapper ses cinq balises
 * `script` et son logo svg, et permet de vérifier d'un coup d'œil qu'il n'a pas dérivé.
 *
 * Trois choses le distinguent du premier, et ce sont justement celles qui comptent pour l'aperçu :
 *
 *   - la **bibliothèque Swiper** est chargée par le gabarit, pas par le contenu. Un diaporama
 *     écrit dans la page ne fonctionne donc que dans l'aperçu et sur le site, jamais dans la zone
 *     d'écriture — c'est la raison d'être de l'aperçu en vignette de `onlcswiper` ;
 *   - le gabarit porte lui-même des **codes courts** — `[MenuSite]`, `[TitreSite]` — et des
 *     **marqueurs de langue** `[LG]` dans son menu déroulant : l'aperçu doit résoudre les uns
 *     sans toucher aux autres ;
 *   - la **feuille du design** ne figure pas dans le gabarit : le site l'injecte. C'est
 *     `onlc_site_css` qui la déclare, et l'aperçu l'ajoute à la fin du `<head>` comme la zone
 *     d'écriture le fait.
 *
 * Ce que le gabarit charge depuis des CDN — jQuery, Bootstrap, Font Awesome, Swiper, la police
 * Raleway, Google Tag Manager — n'est pas recopié ici : ces adresses sont celles du site, et les
 * changer donnerait un aperçu qui ne ressemble à rien de réel. Derrière un pare-feu sortant,
 * l'aperçu montre donc la page sans son habillage.
 */
const lmparts = fs.readFileSync(path.join(__dirname, 'templates', 'lmparts.html'), 'utf8');

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
