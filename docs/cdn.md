# Mettre l'éditeur sur un CDN

Le dépôt sert à développer l'éditeur ; il ne se dépose pas tel quel sur un serveur. La commande
ci-dessous en tire un **dossier autoportant, entièrement minifié**, qu'on copie sur un CDN et
qu'une page appelle par une seule balise `<script>`.

```sh
yarn build-cdn
```

Elle enchaîne deux étapes, qu'on peut lancer séparément :

| Étape | Commande | Ce qu'elle fait |
|---|---|---|
| 1 | `yarn hugerte-grunt prodBuild` | compile, assemble et minifie, dans `modules/hugerte/js/hugerte` |
| 2 | `yarn build-cdn-only` | trie, minifie le reste, et écrit `dist/onlc4` |

La première prend plusieurs minutes ; la seconde, quelques secondes. Après une simple retouche
du script d'empaquetage, la seconde suffit.

## Ce que produit l'empaquetage

```
dist/onlc4/
  onlc4.min.js          l'éditeur
  themes/ models/ icons/ skins/
  plugins/<nom>/plugin.min.js       (+ css/, fonts/, openmoji/ selon le plugin)
  langs/<code>.js       80 langues
  manifest.json         liste, tailles et empreintes
  README.md             la notice de déploiement, à lire par qui met en ligne
  exemple.html          une page minimale, pour vérifier un dépôt
```

Environ **20 Mo**, dont 13 Mo de dessins d'emoji, servis un par un et à la demande. Le premier
chargement d'une page tire l'éditeur, un thème, un habillage, une langue et les plugins
demandés : de l'ordre de 700 Ko, 250 Ko une fois compressés.

`prodBuild` en produit 29 Mo : la différence est faite de cartes de source, de définitions
TypeScript, des sources des habillages et de la version lisible de chaque fichier minifié.

## Le tri, et pourquoi il refuse par défaut

`modules/hugerte/tools/cdn/build.js` **ne recopie rien par défaut**. Chaque fichier doit tomber
dans une règle de `decide()`, sinon il est écarté *et signalé en fin de course*. Une ressource
d'un genre nouveau — un dictionnaire, une police, un dessin — ne peut donc pas disparaître du
paquet en silence : elle apparaît dans la liste des fichiers non classés, et il faut lui écrire
une règle ou confirmer qu'elle est inutile.

Trois familles de fichiers ne sont pas simplement recopiées :

| Famille | Traitement | Pourquoi |
|---|---|---|
| `langs/<code>.js` | minifié **sous le même nom** | le cœur les demande en `langs/<code>.js`, jamais en `.min` |
| `plugins/*/css/*.css` | minifié **sous le même nom** | le code les demande sous leur nom exact, `${pluginUrl}/css/onlcblocks.css` |
| `hugerte.min.js` | renommé `onlc4.min.js` | c'est le nom du produit, et celui que la page appelle |

### Le nom du fichier n'est pas décoratif

C'est lui qui donne à l'éditeur son dossier d'installation **et** son suffixe : le cœur parcourt
les balises `<script>` de la page, reconnaît le sien, et en déduit où chercher le thème, le
modèle, l'habillage, les plugins et la langue (`core/api/EditorManager.ts`). Le fork reconnaît
`onlc4(.min|.dev).js` en plus de `hugerte(.min|.dev).js`. Sans cet ajout, le nom `onlc4.min.js`
n'aurait été retrouvé que par `document.currentScript`, qui vaut `null` dès que le script est
chargé autrement que par une balise classique.

Une page qui charge l'éditeur autrement — empaqueteur, injection, `import()` — doit donc dire
l'adresse elle-même :

```js
hugerte.init({ base_url: 'https://cdn.exemple.fr/onlc4/1.0.12', suffix: '.min' });
```

## Le contrôle des renvois

Une feuille de style qui cite un fichier absent du paquet est une panne différée : le navigateur
ne va le chercher qu'au moment d'en avoir besoin, et ne dit rien avant. L'empaquetage relève donc
les `url()` de chaque feuille qu'il emporte, les résout depuis le dossier de la feuille, et
**s'arrête** si l'un d'eux ne désigne aucun fichier du paquet.

C'est ce contrôle qui a fait apparaître les sources `truetype` de Font Awesome : quatre `.ttf`
cités en secours du `woff2`, jamais livrés. Tant que le `woff2` passe, personne ne les demande —
mais dès qu'il échoue (un en-tête CORS oublié, par exemple), le navigateur enchaîne sur quatre
404. Ces sources ont été retirées des `@font-face` : le `woff2` est reconnu par tout navigateur
depuis 2015, il n'y a rien à rattraper derrière.

## Le manifeste

`manifest.json` donne, pour chaque fichier : sa taille, son poids une fois compressé, son
empreinte `sha256`, et — pour les scripts et les feuilles — l'empreinte `sha384` à recopier dans
un attribut `integrity`.

Les 4 495 dessins d'emoji y tiennent en **une seule ligne** : leur nombre, leur poids total, et
l'empreinte de la liste « chemin empreinte » triée, qui change dès qu'un dessin est ajouté,
retiré ou modifié. Une ligne par dessin rendrait illisible la seule chose qu'on demande à ce
fichier — vérifier qu'un dépôt est complet et intact.

## Ce que le serveur doit envoyer

La notice complète part avec le paquet, dans `dist/onlc4/README.md`. L'essentiel :

| Chemin | En-tête | Pourquoi |
|---|---|---|
| tout le dossier | `Access-Control-Allow-Origin: *` | voir ci-dessous |
| `*.woff2` | `Content-Type: font/woff2` | sinon la police est refusée en silence |
| `*.svg` | `Content-Type: image/svg+xml` | les dessins d'emoji |
| dossier versionné | `Cache-Control: public, max-age=31536000, immutable` | le contenu ne change jamais |

**`Access-Control-Allow-Origin` n'est pas facultatif** dès lors que le CDN est sur un autre
domaine que le site — c'est-à-dire toujours. Trois choses passent par un mécanisme qui vérifie
cet en-tête :

1. **les polices d'icônes** : une police appelée depuis une feuille est toujours demandée en mode
   CORS, même sans `crossorigin` dans la page. Sans l'en-tête, le navigateur télécharge le
   fichier puis refuse de s'en servir, et les icônes s'affichent en toutes lettres ;
2. **la lecture des feuilles des plugins**, dont l'éditeur tire la liste des classes qu'il
   propose dans ses formulaires : il essaie d'abord de lire la feuille déjà chargée — ce que le
   navigateur interdit d'un autre domaine — puis se rabat sur un téléchargement, soumis à CORS ;
3. **les tests d'intégrité**, si la page pose un attribut `integrity` : il exige alors
   `crossorigin="anonymous"`.

Le reste du paquet est chargé par des balises `<script>`, `<link>` et `<img>`, qui n'ont pas
besoin de l'en-tête. Le poser partout est plus simple que fichier par fichier, et sans risque :
ces fichiers sont publics et ne portent aucune donnée de compte.

## Vérifier un dépôt

Ouvrez `exemple.html` **depuis le CDN**. La page affiche l'adresse et le suffixe que l'éditeur a
déduits de son propre nom, puis un éditeur complet. Si les icônes de la barre d'outils sont
dessinées et que le sélecteur d'icônes montre des pictogrammes — et non leurs noms —,
l'arborescence, les types MIME et les en-têtes CORS sont bons.

## Versions

Déposez chaque version dans son propre dossier (`/onlc4/1.0.12/`) plutôt que d'écraser la
précédente : les pages déjà servies continuent de fonctionner, et le cache long ci-dessus devient
sans danger. Le numéro vient de `modules/hugerte/package.json`.

## Tests

`example/test/cdn.test.js` porte sur le tri, la résolution des renvois, la minification et le
manifeste — sur les fonctions, pas sur leur résultat : ces tests tournent sans qu'il faille avoir
compilé l'éditeur. Ils sont lancés par `yarn test-node`.
