# Dépendances et audit de sécurité

## L'essentiel en trois phrases

`package.json` ne déclare **aucune** `dependencies` : les 51 paquets qu'il liste sont tous des
`devDependencies`. Rien de ce que signale `yarn audit` n'entre donc dans les fichiers livrés —
`modules/hugerte/js/hugerte/**` et le paquet CDN de `dist/onlc4` ne contiennent que du code du
dépôt, compilé et minifié. Les alertes portent sur l'outillage : ce qui tourne sur la machine
d'un développeur et dans l'intégration continue.

Cela ne les rend pas sans objet — une chaîne de construction compromise produit des fichiers
compromis —, mais cela dit **qui** est exposé, et ce que chaque correction vaut.

## Ce que le dépôt corrige lui-même

Le champ `resolutions` de `package.json` remonte dix paquets transitifs. La règle retenue :

> On n'épingle un paquet que si **toutes** ses copies installées sont dans la même frontière de
> compatibilité semver, et que la version corrigée y est aussi. Autrement dit : jamais de
> changement de majeur imposé dans le dos d'un paquet qui demande l'ancien.

| Paquet | Installé sans l'épinglage | Épinglé à | Avis levés |
| --- | --- | --- | --- |
| `baseline-browser-mapping` | 2.10.23 | 2.11.0 | 1 |
| `basic-ftp` | 5.3.0 | 5.3.1 | 1 |
| `body-parser` | 1.20.5 | 1.20.6 | 1 |
| `diff` | 5.1.0 | 5.2.2 | 1 |
| `fast-xml-parser` | 4.2.5 | 4.5.7 | 5 |
| `lodash` | 4.17.21 | 4.18.0 | 3 |
| `qs` | 6.11.0 et 6.15.2 | 6.16.0 | 4 |
| `serve-static` | 1.15.0 et 1.16.3 | 1.16.3 | 1 (+ 1 sur `send`) |
| `tar-fs` | 3.0.4 | 3.1.1 | 3 |
| `ws` | 8.13.0 et 8.18.0 | 8.21.0 | 3 |

Mesuré avec `yarn audit` avant et après : **917 → 831 chemins**, **128 → 104 avis distincts**,
dont un critique en moins. Aucun avis nouveau n'apparaît.

Deux détails qui surprennent à la lecture :

- **`serve-static` est épinglé à `1.16.3`, pas à `1.16.0`** que l'avis suffirait à satisfaire.
  Deux copies cohabitent, 1.15.0 et 1.16.3 ; un épinglage à 1.16.0 aurait **redescendu** la
  seconde. Un épinglage `resolutions` s'applique à toutes les copies, y compris à celles qui
  n'étaient pas vulnérables.
- **`yarn.lock` n'est pas modifié par ces épinglages.** Yarn 1 les applique à chaque installation
  en lisant `package.json`, sans les réécrire dans le fichier de verrouillage. Vérifié :
  `yarn install --frozen-lockfile` — la commande de l'intégration continue — installe bien les dix
  versions corrigées.

L'installation affiche pour certains une mise en garde du genre
`Resolution field "ws@8.21.0" is incompatible with requested version "ws@8.13.0"`. Elle est
normale : elle dit que la version demandée par un paquet intermédiaire a été forcée. Toutes les
substitutions sont des montées de version mineure ou corrective dans le même majeur ; la liste
ci-dessus a été vérifiée paquet par paquet contre `yarn.lock` pour qu'aucune ne redescende.

## Ce qui reste, et pourquoi

104 avis distincts (831 chemins — un même avis est compté une fois par chemin de dépendance qui y
mène, d'où l'écart) demeurent. Aucun n'est épinglable sans casser quelque chose :

- soit **plusieurs majeurs du paquet cohabitent** dans l'arbre, et un épinglage global en
  casserait forcément un — `minimatch` est installé en 3, 5, 8 et 9 ; l'interface de `minimatch` 5
  n'est pas celle de `minimatch` 3 ;
- soit **la correction n'existe qu'au-dessus du majeur installé**, et l'imposer changerait
  l'interface sous les pieds du paquet qui la demande — `tar` 6.2.1 est à jour de son majeur, et
  l'avis exige `>= 7.5.21`, réclamé par `lerna` en `^6` ;
- soit **aucune version corrigée n'est publiée** (`extract-zip`).

| Paquet | Installé | Correction attendue en | Gravité la plus haute | Avis | Tiré par |
| --- | --- | --- | --- | --- | --- |
| `tar` | 6.2.1 | 7.5.21 | critique | 12 | `lerna` |
| `brace-expansion` | 1.1.11, 2.0.1 | 2.1.7 | élevée | 16 | `@ephox/bedrock-server`, `@tinymce/eslint-plugin`, `fork-ts-checker-webpack-plugin` |
| `minimatch` | 3.0.5, 3.0.8, 3.1.2, 5.1.6, 8.0.4, 9.0.3, 9.0.5 | 9.0.7 | élevée | 12 | `@ephox/bedrock-server`, `@tinymce/eslint-plugin`, `@typescript-eslint/eslint-plugin` |
| `js-yaml` | 3.14.1, 4.1.0 | 4.3.2 | élevée | 10 | `@ephox/bedrock-server`, `@tinymce/eslint-plugin`, `@tinymce/moxiedoc` |
| `adm-zip` | 0.5.10 | 0.6.1 | élevée | 8 | `@ephox/bedrock-server` |
| `postcss` | 6.0.23, 7.0.39, 8.4.12 | 8.5.23 | élevée | 6 | `less-plugin-autoprefix`, `stylelint`, `stylelint-order` |
| `picomatch` | 2.3.1, 4.0.2 | 4.0.4 | élevée | 4 | `@ephox/bedrock-server`, `@tinymce/eslint-plugin`, `grunt` |
| `ip` | 1.1.8, 2.0.0 | 2.0.1 | élevée | 3 | `@ephox/bedrock-server`, `lerna` |
| `rollup` | 1.32.1, 2.79.0, 4.32.1 | 4.59.0 | élevée | 3 | `@ephox/bedrock-server`, `@ephox/swag`, `rollup` |
| `browserslist` | 3.2.8, 4.28.2 | 4.28.7 | élevée | 2 | `@ephox/bedrock-server`, `less-plugin-autoprefix`, `stylelint` |
| `extract-zip` | 2.0.1 | — | élevée | 2 | `@ephox/bedrock-server` |
| `tmp` | 0.0.33, 0.2.1 | 0.2.6 | élevée | 2 | `lerna`, `patch-package` |
| `cross-spawn` | 6.0.5 | 6.0.6 | élevée | 1 | `npm-run-all` |
| `deepmerge-ts` | 5.1.0 | 8.0.0 | élevée | 1 | `@ephox/bedrock-server` |
| `glob` | 10.3.10 | 10.5.0 | élevée | 1 | `@ephox/bedrock-server`, `lerna` |
| `pacote` | 18.0.6 | 21.5.1 | élevée | 1 | `lerna` |
| `sigstore` | 2.2.0 | 4.1.1 | élevée | 1 | `lerna` |
| `webpack-dev-middleware` | 5.3.4, 7.4.2 | 7.4.6 | élevée | 1 | `@ephox/bedrock-server`, `webpack-dev-server` |
| `webpack-dev-server` | 4.15.1 | 5.2.6 | moyenne | 6 | `@ephox/bedrock-server` |
| `ajv` | 6.12.6, 8.12.0 | 8.18.0 | moyenne | 2 | `@ephox/bedrock-server`, `fork-ts-checker-webpack-plugin`, `stylelint` |
| `yaml` | 1.10.2, 2.7.0 | 2.8.3 | moyenne | 2 | `@ephox/bedrock-server`, `fork-ts-checker-webpack-plugin`, `lerna` |
| `@octokit/plugin-paginate-rest` | 6.1.2 | 9.2.2 | moyenne | 1 | `lerna` |
| `@octokit/request` | 6.2.8 | 8.4.1 | moyenne | 1 | `lerna` |
| `@octokit/request-error` | 3.0.3 | 5.1.1 | moyenne | 1 | `lerna` |
| `@sigstore/core` | 0.2.0 | 3.2.1 | moyenne | 1 | `lerna` |
| `fast-xml-parser` | 4.5.7 | 5.7.0 | moyenne | 1 | `@ephox/bedrock-server` |
| `nx` | 20.4.6 | 22.7.2 | moyenne | 1 | `lerna` |
| `uuid` | 8.3.2, 10.0.0 | 11.1.1 | moyenne | 1 | `@ephox/bedrock-server`, `lerna`, `webpack-dev-server` |
| `@smithy/config-resolver` | 2.0.23 | 4.4.0 | faible | 1 | `@ephox/bedrock-server` |

Deux paquets expliquent à eux seuls la plus grande part de cette liste : **`lerna`** (l'outil de
monodépôt) et **`@ephox/bedrock-server`** (le lanceur d'épreuves, hérité de TinyMCE). Ils ne se
corrigent pas d'ici : il faut que leurs mainteneurs remontent leurs propres dépendances, ou que le
dépôt en change. Les deux relèvent d'une décision d'outillage, pas d'un correctif de sécurité.

C'est le travail de **Dependabot**, configuré dans
[`.github/dependabot.yml`](../.github/dependabot.yml) : il ouvre les demandes de fusion au fur et
à mesure des publications amont, et chacune passe par les épreuves du dépôt.

## Refaire la mesure

```bash
yarn audit --json > audit.json      # une ligne json par avis
yarn audit                          # même chose, lisible
yarn audit --groups dependencies    # seulement ce qui serait livré : vide, par construction
```

`yarn audit --groups dependencies` est la mesure qui compte pour les personnes qui **utilisent**
l'éditeur. Elle ne renvoie rien, et c'est la raison pour laquelle le reste peut attendre une
montée de version propre plutôt qu'un épinglage forcé.

Le total annoncé par `yarn audit` compte les **chemins** de dépendance, pas les failles : un avis
sur `minimatch` atteint par trente-trois chemins compte trente-trois fois. Pour compter les avis
distincts :

```bash
yarn audit --json 2>/dev/null | python3 -c "
import sys, json
vus = set()
for l in sys.stdin:
    try: o = json.loads(l)
    except Exception: continue
    if o.get('type') == 'auditAdvisory':
        a = o['data']['advisory']
        vus.add((a['module_name'], a['id']))
print(len(vus), 'avis distincts')
"
```

## Alertes d'analyse statique

`yarn eslint` ne tolère aucun avertissement (`--max-warnings=0`) et couvre les 20 paquets du
monodépôt. Le greffon `eslint-plugin-only-warn` transforme toutes les erreurs en avertissements :
c'est donc bien ce seuil, et non le code de sortie d'eslint seul, qui fait office de garde-fou.

Le code porte 226 exceptions `eslint-disable`, dont la quasi-totalité vient de HugeRTE et de
TinyMCE en amont — 137 `no-console`, 15 `max-len`, 11 `no-non-null-assertion`, puis une longue
traîne. La mise au propre décrite ci-dessus n'en a ajouté que **deux**, chacune commentée sur
place, et aucune n'est un contournement de confort :

| Fichier | Règle | Raison |
| --- | --- | --- |
| `core/api/dom/ControlSelection.ts` | `@typescript-eslint/no-array-delete` | `ResizeHandle` est un tuple doublé d'un `{ elm?: Element }`, ce qui suffit à faire croire à la règle qu'on supprime un élément de tableau. `elm` est une propriété nommée : la retirer ne laisse pas de trou et ne touche pas à `length`. |
| `alloy/ui/types/SliderTypes.ts` | `@typescript-eslint/no-duplicate-type-constituents` | `SliderValueX` et `SliderValueY` valent tous deux `number`, et la correction automatique réduisait l'union à deux membres. C'est une interface publique ; les trois noms restent parce qu'ils disent les trois sortes de curseur, et qu'en retirer un laisserait « X ou XY », qui a l'air d'exclure l'axe Y. |

Pour dénombrer les exceptions, règle par règle :

```bash
grep -rhno "eslint-disable[a-z-]*\(-next-line\)\? *[@a-z0-9/_-]*" modules/*/src --include=*.ts \
  | sed 's/^[0-9]*://; s/eslint-disable\(-next-line\)\? *//' | sort | uniq -c | sort -rn
```

> Le `Gruntfile.js` de la racine n'est pas couvert par `yarn eslint` : la configuration
> TypeScript du dépôt ne l'inclut pas, et `@typescript-eslint/parser` refuse alors le fichier. Il
> reste vérifié par `node --check`.
