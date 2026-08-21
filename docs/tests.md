# Tests

Deux suites, qui ne tournent pas au même endroit et ne coûtent pas le même temps.

| Suite | Ce qu'elle couvre | Commande | Durée |
|---|---|---|---|
| **Node** | les simulations d'api, l'habillage de l'éditeur d'images, les générateurs | `yarn test-node` | ~1 s |
| **Navigateur** | les plugins ONLC : logique pure et interfaces | `yarn test-onlc` | ~45 s |

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
| `onlcwidgets/…/browser/LibraryMergeTest` | la bibliothèque unique : les deux catalogues, la recherche, l'aiguillage des cartes |
| `onlcwidgets/…/browser/PreviewDialogTest` | le bac à sable de l'aperçu, le remplissage, les trois largeurs |
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
| `example/test/template-api.test.js` | le gabarit d'aperçu et ses codes |
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

Une remarque sur les simulations : l'api média se branche par `onlc_media_handlers`, ce qui
permet à un test de décrire exactement l'arborescence dont il a besoin — et de compter les
appels, pour vérifier par exemple que le contenu d'un dossier n'est demandé qu'au dépliage.
