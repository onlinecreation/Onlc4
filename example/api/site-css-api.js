'use strict';

/**
 * Relais de lecture des feuilles de style du site (`onlc_site_css_proxy`).
 *
 * Le navigateur affiche sans difficulté une feuille servie par un autre domaine — une feuille de
 * style n'est pas soumise au contrôle d'origine à l'affichage. Mais **en lire le texte** l'est :
 * `document.styleSheets` lève une erreur de sécurité, et `fetch` est refusé si le site n'a pas
 * posé d'en-tête d'autorisation. L'éditeur ne peut donc pas proposer les classes du design d'un
 * site qu'il n'héberge pas.
 *
 * Ce point d'entrée va la chercher côté serveur, où le contrôle d'origine n'existe pas.
 *
 *   GET /api/site-css?url=https%3A%2F%2Fexemple.tld%2Fdesign.css
 *   → { "css": "…", "url": "…" }
 *
 * ## Ce qui est refusé, et pourquoi
 *
 * Un relais qui va chercher n'importe quelle adresse pour le compte de celui qui la demande est
 * une porte ouverte sur le réseau interne : c'est la faille dite de « requête falsifiée côté
 * serveur ». Trois garde-fous, dans cet ordre :
 *
 *   1. seuls `http` et `https` sont acceptés — ni `file:`, ni `gopher:`, ni `data:` ;
 *   2. l'hôte doit figurer dans la **liste des domaines autorisés**, donnée à la construction.
 *      C'est le garde-fou qui compte : sans liste, rien n'est servi ;
 *   3. la réponse est bornée en taille et en durée, et seul le texte est rendu — jamais les
 *      en-têtes, jamais le code de statut d'un hôte interne, qui renseigneraient sur ce qui existe
 *      derrière le pare-feu.
 *
 * Les redirections sont suivies, mais chaque étape repasse par le même contrôle d'hôte : une
 * redirection vers `127.0.0.1` est refusée comme le serait une demande directe.
 */

/** Taille maximale d'une feuille lue : au-delà, ce n'est plus une feuille de style. */
const MAX_SIZE = 2 * 1024 * 1024;

/** Durée maximale d'attente. Un site lent ne doit pas immobiliser le back-office. */
const TIMEOUT_MS = 8000;

/** Nombre de redirections suivies. */
const MAX_REDIRECTS = 3;

const create = (options) => {
  const allowed = (options && Array.isArray(options.allowedHosts) ? options.allowedHosts : [])
    .map((host) => String(host).toLowerCase());

  /**
   * L'hôte est-il autorisé ?
   *
   * La comparaison porte sur le nom entier ou sur un suffixe de domaine précédé d'un point :
   * `lmparts.fr` autorise `www.lmparts.fr` mais **pas** `notlmparts.fr`.
   */
  const isAllowed = (hostname) => {
    const host = hostname.toLowerCase();
    return allowed.some((entry) => host === entry || host.endsWith('.' + entry));
  };

  const check = (target) => {
    let parsed;
    try {
      parsed = new URL(target);
    } catch (_err) {
      throw Object.assign(new Error('Adresse illisible'), { status: 400 });
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw Object.assign(new Error('Seules les adresses http et https sont relayées'), { status: 400 });
    }
    if (!isAllowed(parsed.hostname)) {
      throw Object.assign(
        new Error('Ce domaine n’est pas autorisé pour le relais de feuilles de style : ' + parsed.hostname),
        { status: 403 });
    }
    return parsed;
  };

  const fetchCss = async (target) => {
    let current = check(target);

    for (let step = 0; step <= MAX_REDIRECTS; step += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

      let response;
      try {
        response = await fetch(current.href, {
          redirect: 'manual',
          signal: controller.signal,
          headers: { Accept: 'text/css,*/*;q=0.1' }
        });
      } catch (_err) {
        // Le message d'origine n'est pas repris : il dit si l'hôte existe, ce qui renseigne sur
        // le réseau interne. Une seule réponse, la même pour tous les échecs.
        throw Object.assign(new Error('Feuille de style injoignable'), { status: 502 });
      } finally {
        clearTimeout(timer);
      }

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) {
          throw Object.assign(new Error('Redirection sans destination'), { status: 502 });
        }
        // Chaque étape est contrôlée comme la première : une redirection ne contourne rien.
        current = check(new URL(location, current.href).href);
        continue;
      }

      if (!response.ok) {
        throw Object.assign(new Error('Feuille de style refusée (' + response.status + ')'), { status: 502 });
      }

      const text = await response.text();
      if (text.length > MAX_SIZE) {
        throw Object.assign(new Error('Feuille de style trop volumineuse'), { status: 413 });
      }
      return { css: text, url: current.href };
    }

    throw Object.assign(new Error('Trop de redirections'), { status: 502 });
  };

  /**
   * Traite une requête. Renvoie `null` si l'URL ne correspond à aucun point d'entrée, pour
   * laisser le serveur essayer les autres routes.
   */
  const handle = (request, url) => {
    if (url.pathname !== '/' || request.method.toUpperCase() !== 'GET') {
      return null;
    }
    const target = url.searchParams.get('url');
    if (!target) {
      throw Object.assign(new Error('Paramètre « url » manquant'), { status: 400 });
    }
    return fetchCss(target);
  };

  return { handle, isAllowed, allowed };
};

module.exports = { create, MAX_SIZE, TIMEOUT_MS, MAX_REDIRECTS };
