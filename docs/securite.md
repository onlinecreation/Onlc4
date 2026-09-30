# Sécurité et neutralisation dans l'éditeur

## Le modèle de menace

Dans ONLC 4, la personne qui écrit le contenu et la personne exposée à ce contenu sont **la même
personne**, ou son visiteur. Seul un compte authentifié accède à l'éditeur, et ce qu'il compose
finit sur son propre site. Le risque dominant est donc l'**auto-atteinte** : se casser sa page,
coller un code d'intégration douteux, ouvrir une faille chez soi.

Cela ne dispense de rien. Deux garanties doivent tenir, quoi qu'il arrive :

1. **Rien ne s'exécute pendant l'écriture.** Un script collé dans la page ne doit pas tourner
   dans l'éditeur : il y partagerait l'origine du back-office, ses cookies et son jeton de
   session.
2. **Ce qui est publié est exactement ce qui a été demandé.** Ni plus — pas d'attribut ajouté
   qui casserait une intégration — ni moins.

Ce document décrit comment ces deux garanties sont obtenues.

## Ce qui ne s'exécute jamais dans la zone d'édition

| Élément | Représentation pendant l'écriture | Ce qui est publié |
|---|---|---|
| `<script>` | un jeton jaune montrant les trois premières lignes | la balise `<script>` d'origine |
| Widget HTML | un cadre avec le nom et un extrait du code | le code, tel quel |
| Vidéo, page intégrée | une vignette inerte (image, titre, adresse) | l'`<iframe>` prévue |
| Carte | un damier de tuiles OpenStreetMap, en fond de `span` | Leaflet, ou le cadre OpenStreetMap |
| Galerie, document PDF | une vignette inerte | nanogallery2 / pdf.js et leurs imports |
| Diaporama Swiper | une bande d'images alignées horizontalement, sans javascript | le html d'origine, inchangé |
| Fiche de microdonnées | une carte grise annonçant le type décrit | `<script type="application/ld+json">` |
| Action au clic d'un lien | l'attribut inerte `data-onlc-click` | l'attribut `onclick` d'origine |

Aucune de ces représentations ne contient d'`<iframe>`, de `<script>` ni d'écouteur : ce sont des
`div` et des `span`.

### Les scripts

Le remplacement a lieu sur la **chaîne html**, dans `BeforeSetContent`, avant toute analyse : le
désinfectant du cœur supprime les éléments `<script>` bien avant qu'un filtre de nœud puisse les
voir. Le jeton porte la définition du script (code, `src`, `type`, `async`, `defer`, position)
encodée dans un attribut `data-`, et un filtre de sérialisation la retransforme en balise.

Conséquence directe : dans la démonstration, le contenu initial comprend `alert("hello")` et
**aucune alerte ne s'affiche**. C'est vérifié à chaque passe de tests.

### Les intégrations

Le cœur ajoute `sandbox=""` à toutes les iframes du contenu (`sandbox_iframes`, activé par
défaut). C'est une bonne protection pendant l'écriture, mais cet attribut partait aussi dans la
page publiée, où il rendait l'intégration inerte.

Les blocs concernés sont donc marqués `canonical` : au moment de l'enregistrement, leur contenu
est **reconstruit à partir de leur configuration**, sans repasser par le dom de l'éditeur. La
page reçoit exactement le code prévu. Et comme ces blocs ne sont de toute façon pas affichés sous
leur forme définitive dans l'éditeur, la question du bac à sable ne se pose plus.

### Les configurations de diaporama

`onlcswiper` doit **lire** l'objet de configuration d'un `new Swiper(…)` pour en proposer un
formulaire. Cet objet vient du contenu, donc d'une source qui n'est pas fiable.

Ni `eval` ni `new Function` ne sont employés : ce serait exécuter le contenu dans le back-office,
c'est-à-dire exactement ce que tout le reste de ce document s'attache à empêcher. `JSON.parse` ne
convient pas non plus — les clés sont nues, les guillemets simples, il y a des virgules finales
et des fonctions.

Le littéral est donc **lu caractère par caractère** (`onlcswiper/core/JsObject.ts`). Le lecteur
ne connaît que des valeurs : objets, tableaux, chaînes, nombres, `true`, `false`, `null`. Tout le
reste — une fonction, un appel, un calcul — est conservé comme **texte opaque** et réécrit à
l'identique, sans jamais être interprété.

La réécriture est tout aussi bornée : seul l'intervalle exact du littéral est remplacé dans le
script, et la fonction refuse d'écrire si cet intervalle n'est plus celui qu'elle croit.

### L'action au clic d'un lien

Un lien peut porter une action javascript au clic — un `onclick`, souvent une confirmation avant
de quitter la page. Posé tel quel dans la zone d'écriture, cet attribut **s'exécute** : le
rédacteur qui clique sur son propre lien déclenche son propre code, au milieu de l'éditeur. C'est
précisément ce que le bac à sable des scripts évite par ailleurs.

L'attribut voyage donc sous un nom inerte, `data-onlc-click`, pendant toute l'écriture, et
redevient `onclick` à la sérialisation. La conversion se fait dans les deux sens : un `onclick`
présent dans le html chargé est désarmé à l'ouverture. Le formulaire du lien le montre, et le
prévient : « Elle ne s'exécute jamais pendant que vous écrivez. »

Le plugin neutralise aussi le **ctrl-clic** et le **clic du milieu** sur un lien de la zone
d'écriture. Le cœur bloque déjà le clic simple ; le navigateur, lui, ouvre l'adresse dans ces deux
cas, et l'on quitte son back-office sans avoir rien demandé.

Cette action est du javascript **choisi par la personne connectée, pour son propre site** : elle
relève du modèle de menace « soi-même », comme les scripts et les widgets html. Ce qui est en jeu
n'est pas de l'empêcher, mais de l'empêcher de s'exécuter **dans l'éditeur**, où elle ne
s'exécuterait pas sur le site.

### Les fiches de microdonnées

Le json est écrit dans un élément à contenu brut, où l'échappement html ne s'applique pas. La
seule séquence qui pourrait en sortir prématurément est `</script`, et elle est neutralisée avant
l'écriture plutôt que laissée à la bonne fortune de `JSON.stringify`.

À l'entrée, une fiche illisible — json malformé, texte tronqué — n'est pas jetée : elle devient un
bloc vide dont le formulaire repart de zéro. Perdre les données de quelqu'un parce qu'une virgule
manque serait la pire des réponses.

## Ce qui est vérifié à l'écriture

La reconstruction des blocs canoniques court-circuite le désinfectant du cœur : l'option
`allow_script_urls` ne les protège pas. Les vérifications sont donc faites au plus près de
l'écriture du markup.

* **Schémas d'adresse** — `Html.attr` refuse `javascript:`, `vbscript:`, `livescript:`, `mocha:`
  et les `data:` autres qu'une image, sur tous les attributs qui désignent une ressource
  (`href`, `src`, `action`, `formaction`, `poster`, `data`, `srcset`, `background`). L'attribut
  est alors simplement omis.
* **Adresses dans le css** — `Html.cssUrl` encode les caractères qui refermeraient la parenthèse
  d'un `url(...)` ou la déclaration, et rejette les mêmes schémas. Sans cela, l'adresse d'une
  image pourrait ajouter d'autres règles css par-dessous.
* **Json dans un `<script>`** — `Html.jsonForScript` écrit `<`, `>` et `&` sous forme
  d'échappements unicode, ainsi que U+2028 et U+2029 qui sont des fins d'instruction en
  javascript. Une chaîne contenant `</script>` ne peut donc pas refermer la balise.
* **Nombres** — toute valeur qui finit dans du code javascript (coordonnées, zoom, dimensions)
  passe par `Common.number` / `Common.integer`, qui la bornent et retombent sur une valeur sûre.
* **Aperçu visiteur** — la page est montée dans un cadre dont le bac à sable se règle par
  `onlc_preview_sandbox`. Il comprend `allow-same-origin` par défaut, et c'est un compromis
  assumé : une page **sans origine** ne peut charger aucune police (le chargement d'une police est
  toujours soumis au contrôle d'origine), ne peut lire aucun fichier du site, et toute intégration
  tierce qu'elle contient hérite de son isolement et refuse de démarrer. Un aperçu ainsi isolé
  montre une page dont les icônes sont vides, le pdf absent et la vidéo noire — il ne montre plus
  la page du visiteur, ce qui est sa seule raison d'être.

  En contrepartie, l'aperçu partage l'origine du back-office : un script de la page peut atteindre
  le document qui l'entoure. Deux façons de le refermer, décrites dans
  [l'api d'aperçu](api/onlc-preview-api.md) : `onlc_preview_sandbox: 'allow-scripts'` pour
  l'isolement strict, ou — recommandé en production — **servir le site et le back-office depuis
  deux origines distinctes**, auquel cas `allow-same-origin` ne désigne plus que celle du site.

  `allow-modals` n'est jamais accordé, de sorte qu'une page d'aperçu ne peut pas bloquer l'éditeur
  derrière une boîte ; `allow-top-navigation` non plus, elle ne peut donc pas quitter le
  back-office.
* **Codes courts** — les crochets sont retirés des valeurs et les guillemets deviennent `&quot;` :
  un attribut ne peut pas refermer le code au milieu. À l'enregistrement, le texte d'origine est
  réécrit **sans échappement** — c'est la seule façon de restituer au caractère près un code que
  le plugin ne sait pas relire — mais seulement après vérification : il doit être un code court
  et rien d'autre, sans chevron. Un attribut `data-onlc-shortcode-raw` forgé, arrivé par un
  collage, ressort donc en texte visible et non en markup.
* **Marqueurs de langue** — même situation, même parade. Les marqueurs `[LG="fr"]` et
  `<multilang lang="fr">` sortent **sans échappement** : c'est la seule façon d'écrire une balise
  dans la page enregistrée. Le code de langue, lui, vient d'un attribut — c'est-à-dire d'une
  chaîne qu'un contenu collé pourrait avoir choisie — et il est donc revalidé juste avant d'être
  écrit : deux lettres, rien d'autre. Une section dont le code ne tient pas en deux lettres perd
  son marquage et garde tout son contenu. Rien du reste de la section n'est écrit par le plugin :
  le contenu passe par le sérialiseur ordinaire.
* **Filtrage par langue** — l'affichage d'une seule langue dans l'éditeur ne touche pas au
  document : c'est une classe posée sur le corps et des règles css qui masquent le reste. Rien
  n'est retiré, donc un enregistrement fait pendant un aperçu ne peut pas amputer la page.
* **Texte affiché** — tout ce qui vient du rédacteur ou d'une api passe par `Html.escape` ou
  `editor.dom.encode` avant d'entrer dans du markup.

## Ce qui reste sous la responsabilité du site

Certaines fonctions sont **faites pour** publier du code : c'est leur raison d'être.

* le **bloc script** publie une balise `<script>` ;
* le **widget HTML** publie le code collé, tel quel ;
* l'**éditeur de source** permet d'écrire n'importe quel html.

Le plugin ne cherche pas à filtrer ce contenu : il serait à la fois impossible de le faire
correctement et contraire à l'usage attendu. Ce qu'il garantit, c'est que rien de tout cela ne
s'exécute **dans l'éditeur**.

Deux recommandations pour le site qui publie :

1. **Servir les pages depuis une autre origine que le back-office.** Un script du contenu ne
   pourra alors pas lire les cookies de session de l'éditeur.
2. **Restreindre les comptes qui accèdent à ces trois outils** si votre back-office est partagé
   entre plusieurs personnes : retirez `onlcwidgets` de la liste des plugins pour les autres, ou
   excluez les blocs `html` avec `onlc_widgets_exclude: [ 'html' ]`.

## Ce que l'éditeur charge depuis l'extérieur

| Ressource | Origine | Réglable par |
|---|---|---|
| Gabarit de l'aperçu visiteur | votre back-office | `onlc_preview_template_url` |
| Leaflet, nanogallery2, jQuery, pdf.js | cdnjs.cloudflare.com | `onlc_widgets_cdn_base` |
| Tuiles de l'aperçu cartographique | tile.openstreetmap.org | — |
| Recherche d'adresse | nominatim.openstreetmap.org | `onlc_widgets_geocoder_url` |
| Vignette d'une vidéo YouTube | i.ytimg.com | — |
| Polices d'icônes, dessins des emojis | **le plugin lui-même** | `onlc_icons_openmoji_url` |

Les `<script>` et `<link>` écrits par les blocs portent `crossorigin="anonymous"` et
`referrerpolicy="no-referrer"`. Un projet qui doit fonctionner sans accès extérieur remplace
`onlc_widgets_cdn_base` par une adresse locale et sert lui-même ces bibliothèques.

Rien de ce qui est saisi dans l'éditeur n'est envoyé à un service tiers, à une exception près et
seulement sur action explicite : cliquer sur « Rechercher » dans le formulaire d'une carte envoie
l'adresse tapée à Nominatim.

## Les api du site

Les plugins parlent à cinq api (médias, liens, icônes, éditeur d'images, relais de feuilles de
style). Leur contrat est décrit dans `docs/api/`. Plusieurs points relèvent du serveur, et de lui
seul :

* **Traversée de chemin** — l'api médias reçoit des chemins depuis le navigateur. C'est au
  serveur de vérifier que le chemin résolu reste sous la racine autorisée.
* **Autorisations** — l'éditeur n'a aucune idée de qui a le droit d'écrire où. Chaque appel doit
  être vérifié côté serveur, y compris ceux que l'interface ne propose pas.
* **Quotas et types de fichiers** — les contrôles faits par la médiathèque (types mime acceptés,
  poids, nombre de fichiers) épargnent un aller-retour inutile ; ils ne remplacent pas ceux du
  serveur, qui seul fait autorité.
* **Cible d'une retouche** — `POST /save` reçoit un champ `replaces` désignant le fichier dont ce
  binaire devient la nouvelle version. C'est au serveur de le résoudre et de refuser toute
  adresse qu'il ne sert pas lui-même : sans cela, une adresse arbitraire désignerait n'importe
  quel fichier à écraser.

* **Relais de feuilles de style** — c'est le plus délicat des cinq, parce qu'il va chercher une
  adresse **fournie par le client**. Un relais ouvert est une porte sur le réseau interne : une
  simple demande suffirait à lire `http://169.254.169.254/latest/meta-data/`, c'est-à-dire les
  identifiants de la machine. L'implémentation de référence n'accepte que `http` et `https`, et
  seulement vers une **liste fermée de domaines** — pas une liste d'adresses interdites, qui ne
  s'écrit jamais complètement. Chaque redirection repasse par le même contrôle, et les messages
  d'erreur ne disent pas ce qui a échoué : « hôte inconnu » et « connexion refusée » renseignent
  l'un et l'autre sur ce qui existe derrière le pare-feu. Voir
  [onlc-site-css-api.md](api/onlc-site-css-api.md).

Les réponses de ces api sont traitées comme des données non fiables : noms de fichiers, adresses
et intitulés sont échappés avant d'entrer dans l'interface, et les adresses posées en fond
passent par l'encodage css décrit plus haut.

## Vérifications automatiques

Deux filets, décrits dans [tests.md](tests.md) :

* une **suite automatisée** — 211 cas dans un navigateur, 66 en Node — dont plusieurs portent
  précisément sur les garde-fous décrits ici : les jetons du bac à sable de l'aperçu et la
  possibilité de le resserrer, le garde-fou du texte brut d'un code court, la revalidation d'un code de
  langue avant écriture, l'échappement des adresses posées en css, les types acceptés à l'envoi,
  et l'impossibilité pour un chemin d'api de sortir de la racine autorisée ;
* un **contrôle de bout en bout** dans un navigateur réel (Chromium piloté par Playwright) sur la
  démonstration :

* aucune boîte de dialogue ne s'ouvre alors que le contenu comprend `alert("hello")` ;
* aucune `<iframe>` n'est présente dans la zone d'édition ;
* le html enregistré ne contient aucun attribut `sandbox` ;
* le contenu rechargé puis ré-enregistré est identique au caractère près (aller-retour stable) ;
* aucune erreur de page ni de console.
