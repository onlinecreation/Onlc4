# Tests

Deux suites, qui ne tournent pas au même endroit et ne coûtent pas le même temps.

| Suite | Ce qu'elle couvre | Commande | Durée |
|---|---|---|---|
| **Node** | les simulations d'api, l'habillage de l'éditeur d'images, les générateurs | `yarn test-node` | 74 épreuves, ~1 s |
| **Navigateur** | les plugins ONLC : logique pure et interfaces | `yarn test-onlc` | 362 épreuves, ~90 s |

`yarn test` enchaîne les deux, plus les tests d'origine de HugeRTE.

## La suite navigateur

Elle utilise [bedrock](https://github.com/tinymce/bedrock), déjà en place dans le dépôt, et suit
ses conventions : chaque fichier finit par `Test.ts` et vit sous
`src/plugins/<plugin>/test/ts/<type>/`.

| Type | Ce qui va dedans |
|---|---|
| `atomic` | des fonctions pures, sans dom ni éditeur — l'essentiel de la couverture |
| `browser` | ce qui a besoin d'un éditeur vivant : dialogues, styles, mesures |

Les tests sont **découverts par leur emplacement** : `bedrock-auto:standard` balaie déjà
`src/**/test/ts/**/*Test.ts`. Un nouveau fichier au bon endroit est exécuté sans rien déclarer.

`yarn tsc` les compile avec le reste (`src/plugins/*/test/ts` figure dans le `include` du
`tsconfig.json` de hugerte) : une erreur de type dans un test casse la compilation, comme dans
le code de production.

### Lancer

```sh
yarn test-onlc                 # les seuls tests ONLC, chrome-headless
yarn test-onlc --bedrock-browser=firefox-headless
grunt --gruntfile modules/hugerte/Gruntfile.js test-onlc-manual   # dans un vrai navigateur
```

La cible manuelle sert à regarder un échec de près : bedrock ouvre un serveur, on y navigue, on
inspecte le dom au moment où l'assertion tombe.

> Il faut un Chrome installé et un **chromedriver de la même version majeure**. Un décalage
> donne « This version of ChromeDriver only supports Chrome version N » — c'est le driver qu'il
> faut aligner sur le navigateur, pas l'inverse.

### Ce qui est couvert

| Fichier | Ce qu'il vérifie |
|---|---|
| `onlcwidgets/…/atomic/PagePreviewTest` | remplissage du gabarit d'aperçu : `[ContenuPage]`, valeurs fixes et fonctions, codes du contenu, balises sautées ou non, feuilles et règles posées, adresse de base |
| `onlcwidgets/…/atomic/MonthFieldTest` | lecture et écriture de `AAAA-MM`, et refus des formats approchants |
| `onlcwidgets/…/atomic/MediaFieldTest` | échappement des adresses posées en css, noms de fichiers lisibles |
| `onlcwidgets/…/atomic/ShortcodeGuardTest` | le garde-fou du texte brut d'un code court, et l'analyse des codes |
| `onlcwidgets/…/atomic/SegmentsTest` | où un code court peut être reconnu : ni dans une balise, ni dans le corps d'un script ou d'une feuille de style |
| `onlcmultilang/…/atomic/ParseTest` | les deux écritures polyglottes, ce que le site ne reconnaît pas, l'équilibre des balises, le rendu par langue |
| `onlcmultilang/…/atomic/LanguagesTest` | intitulés des langues et lecture de leur configuration |
| `onlcmedia/…/atomic/UploadFilterTest` | types acceptés à l'envoi, filtrage de la grille, dates de version |
| `onlcicons/…/atomic/IconDedupeTest` | dédoublonnage par nom, et priorité de la famille |
| `onlcshared/…/browser/DestroyTest` | la confirmation par maintien : annulation au relâchement, suppression au bout, une seule fois |
| `onlcshared/…/browser/DialogStylesTest` | onglets, croix de fermeture centrée, cibles tactiles, pied dans le cadre, intitulé non répété |
| `onlcwidgets/…/browser/CodeEditorTest` | l'éditeur de code face à une règle hostile de la page (`pre { max-height }`) : couche colorée entière, cadre qui défile, les deux couches superposées |
| `onlcwidgets/…/browser/LibraryMergeTest` | la bibliothèque unique : les deux catalogues, la recherche, l'aiguillage des cartes |
| `onlcwidgets/…/browser/PreviewDialogTest` | la page servie par une adresse et non par un attribut, les jetons du bac à sable et la possibilité de le resserrer, le remplissage, les trois largeurs |
| `onlcmedia/…/browser/FinderLibraryTest` | arborescence et chargement à la demande, actif au survol, quota, historique |
| `onlcmultilang/…/browser/MultilangTest` | l'aller-retour à l'identique, span ou div, marquer/compléter/retirer, aperçu par langue, codes forgés |
| `onlcmultilang/…/browser/ScopeTest` | ce que le marquage englobe : en ligne ou bloc, la colonne Bootstrap qui survit, le curseur laissé dans la section, le bandeau où seul l'en ligne est possible |
| `onlcblocks/…/browser/BlockLanguageTest` | la langue réglée depuis la barre du bloc, sur le bloc désigné et non sur celui du curseur ; le globe retiré dans un bloc prédéfini ; les blocs visés à l'intérieur d'une section de langue ; boutons de 50 pixels |

Les tests d'interface **mesurent le rendu** plutôt que la présence des règles css : ces règles
corrigent le thème, et une montée de version d'Oxide peut en défaire une en silence. Vérifier
qu'un onglet fait bien la largeur des autres attrape ce genre de régression ; vérifier que la
règle existe ne l'attraperait pas.

## La suite Node

Elle porte sur du code qui ne passe pas par un navigateur : les simulations d'api de
`example/api/` et les générateurs de `modules/hugerte/tools/`.

```sh
yarn test-node
node example/test/run.js     # la même chose
```

| Fichier | Ce qu'il vérifie |
|---|---|
| `example/test/media-api.test.js` | versions et restauration, quotas, types acceptés, sécurité des chemins |
| `example/test/template-api.test.js` | les deux gabarits d'aperçu et leurs codes |
| `example/test/site-css-api.test.js` | le relais de feuilles de style : protocoles, domaines, réseau interne |
| `example/test/branding.test.js` | l'habillage Pixel•OnlineCreation de Pixie : marque, thème, traductions |
| `example/test/build-langs.test.js` | conversion des paquets TinyMCE, alias de code court, génération bout à bout |

Ces tests décrivent le **contrat** que doit tenir n'importe quelle implémentation, pas seulement
la simulation : lisez-les comme un complément à `docs/api/`.

Le banc d'essai tient dans `example/test/harness.js`, une centaine de lignes. L'exemple n'a
aucune dépendance npm — c'est ce qui permet de le lire comme une spécification exécutable — et
lui en ajouter une pour trois fonctions (`describe`, `it`, des assertions) aurait coûté plus que
de les écrire.

## Ajouter un test

1. Une fonction pure ? `src/plugins/<plugin>/test/ts/atomic/<Nom>Test.ts`.
2. Besoin d'un éditeur ? `…/test/ts/browser/<Nom>Test.ts`, avec `TinyHooks.bddSetupLight`.
3. Du code Node ? `example/test/<nom>.test.js`, puis ajoutez-le à la liste de
   `example/test/run.js`.

Rien d'autre à déclarer : les deux lanceurs trouvent les fichiers par leur emplacement.

### Ce que certaines épreuves ont trouvé

Un test n'a de valeur que s'il peut échouer. Plusieurs de ceux-ci ont trouvé de vrais défauts en
étant écrits, et il vaut la peine de dire lesquels :

* `onlcswiper/JsObjectTest` — le lecteur de littéraux refusait les **clés numériques**, alors que
  `768: { slidesPerView: 2 }` est la façon la plus répandue d'écrire un palier d'écran. La moitié
  des configurations réelles étaient illisibles ;
* `onlcwidgets/CodeEditorTest` — il **pose délibérément** la règle hostile
  `pre { max-height: 40px }` dans le document du back-office, puis vérifie que l'éditeur de code
  survit. C'est le bug qui coupait le code source à la dix-septième ligne ;
* `onlcblocks/BlockPropertiesTest` — il déclare un bouton de propriétés dont le `match` lève une
  exception, et vérifie que **les autres restent** : un plugin qui se trompe ne doit pas emporter
  la barre entière ;
* `onlcblocks/BlockResolutionTest` — il décrit une page **sans grille**, des sections dans un
  `div` d'enrobage, comme celles qu'on reprend d'un site existant. La règle d'origine y rendait la
  page entière comme bloc unique : plus rien n'y était manipulable, ni les sections, ni les
  diaporamas qu'elles portent ;
* `onlcseo/JsonldRoundTripTest` — il charge trois plugins qui réécrivent tous la chaîne html
  brute, et cite `onlcseo` **avant** `onlcwidgets` : c'est l'ordre qui faisait échouer la
  revendication du type de script. La fiche qu'il emploie porte des marqueurs de langue dans ses
  valeurs json, ce qui la rendait illisible et faisait perdre les données du rédacteur ;
* `onlcswiper/BlockAccessTest` — il vérifie qu'on peut **atteindre** les réglages, ce qui est
  autre chose que de savoir les lire. Sur la page qui a révélé le défaut, aucun diaporama n'avait
  d'entrée : ni bouton dans la barre du bloc, ni bulle contextuelle ;
* `onlcmultilang/TagSpansTest` — il pose un marqueur de langue **dans un attribut `class`**,
  comme le fait une page réelle. Le plugin en faisait un élément, écrit au milieu d'une balise
  ouvrante : la section entière du contenu s'en trouvait disloquée. Le cas voisin — une balise
  `<multilang>`, qui *est* un marqueur et commence par un chevron — garde la distinction ouverte ;
* `onlcswiper/DetectTest` — il pose une vue à **deux images**, comme la page réelle en contient
  deux. Le formulaire ne produit plus qu'une image par vue : la question est de savoir ce qu'il
  advient de celles qui existaient déjà. Elles passent en vues libres, et un cas vérifie que la
  seconde image survit à un déplacement ;
* `onlcwidgets/PagePreviewTest` — il donne à l'aperçu le mouchard Google Tag Manager d'un gabarit
  réel. `[l]` y était pris pour un code court sans valeur, donc effacé, et le script tombait en
  erreur. Le même fichier avait par ailleurs un `it` imbriqué dans un autre, qui ne s'exécutait
  jamais comme un cas à part.

Une remarque sur les simulations : l'api média se branche par `onlc_media_handlers`, ce qui
permet à un test de décrire exactement l'arborescence dont il a besoin — et de compter les
appels, pour vérifier par exemple que le contenu d'un dossier n'est demandé qu'au dépliage.
