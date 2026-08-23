'use strict';

/**
 * Couverture des traductions ONLC, module par module.
 *
 *   node modules/hugerte/tools/i18n/coverage.js
 *
 * Une interface à moitié traduite ne casse rien : elle déçoit, et elle le fait tard, quand un
 * client néerlandophone ouvre un formulaire et tombe sur trois phrases en français. Ce relevé
 * cherche donc, dans tout ce que les plugins affichent, ce qui manque au tableau des traductions.
 *
 * ## Ce qu'il relève
 *
 * Les champs d'interface d'un dialogue (`label`, `text`, `tooltip`, `placeholder`, `help`…), les
 * appels explicites de traduction, les textes posés à la main dans le dom d'un composant
 * (`textContent`, `title`, `aria-label`), et **le html assemblé à la main** — `title="…"` et le
 * texte d'un `<span>` dans un gabarit de chaîne.
 *
 * Ce dernier cas est celui qui avait échappé : la barre de manipulation des blocs est écrite en
 * html, ses intitulés ne passaient par aucune traduction, et elle restait donc en français sous
 * une interface néerlandaise. Un relevé qui ne cherche que dans les spécifications de dialogue ne
 * l'aurait jamais dit.
 *
 * Ces chaînes sont souvent écrites en plusieurs morceaux — `'début ' + 'suite'` — pour tenir dans
 * la largeur du fichier. Le relevé les **recompose** : c'est la chaîne entière qui sert de clé, et
 * relever un morceau seul produirait des clés qui n'existent pas.
 *
 * ## Ce qu'il ne relève pas, et pourquoi
 *
 * Voir `exemptions` : ce sont des chaînes qui s'affichent, mais qu'aucune langue ne change.
 */

const fs = require('fs');
const path = require('path');

const pluginsDir = path.resolve(__dirname, '../../src/plugins');
const tablePath = path.resolve(__dirname, 'translations.json');

/**
 * Fichiers écartés du relevé.
 *
 * Les **catalogues** — noms des icônes Font Awesome et Material, dictionnaire des emojis — sont
 * produits par un générateur à partir des paquets d'origine. Ce sont les noms sous lesquels ces
 * bibliothèques désignent leurs dessins, pas des chaînes d'interface : les traduire demanderait
 * de retraduire deux mille entrées à chaque montée de version des polices.
 */
const catalogues = /(FontAwesomeData|IconsData|EmojiDatabase|OpenMoji)\.ts$/;

/**
 * Fichiers qui produisent le **contenu de la page**, et non l'interface d'écriture.
 *
 * Le html d'un bloc prédéfini part dans la page publiée : « Télécharger le document » s'adresse
 * au visiteur du site, pas au rédacteur. Il doit donc suivre la langue du **site**, et la traduire
 * avec le paquet de l'éditeur donnerait un bouton néerlandais sur une page française, au seul
 * motif que la personne qui l'a posé écrit en néerlandais.
 *
 * L'exclusion ne porte que sur le **html** de ces fichiers : les intitulés de leurs formulaires —
 * « Texte du bouton », « Couleur de fond » — sont bien de l'interface, et restent relevés.
 */
const contenuPublie = /(core\/widgets\/|core\/shortcodes\/|core\/Preview\.ts$|core\/PagePreview\.ts$)/;

/**
 * Chaînes qui s'affichent mais qu'aucune langue ne change.
 *
 * Chacune porte sa raison : une exemption sans motif finit par couvrir un oubli.
 */
const exemptions = [
  {
    raison: 'symboles et fractions — une disposition de colonnes s’écrit pareil partout',
    test: (v) => /^[\p{P}\p{S}\p{N}\s]+$/u.test(v)
  },
  {
    raison: 'déclarations css proposées en exemple dans un champ',
    test: (v) => /^\s*[a-z-]+\s*:\s*[^:]+(;\s*[a-z-]+\s*:\s*[^:]+)*;?\s*$/i.test(v) && /[a-z-]+\s*:/i.test(v)
  },
  {
    raison: 'valeurs techniques : attribut rel, classes css, code de langue',
    test: (v) => /^(nofollow|noopener|noreferrer|sponsored|ugc|nav|navbar-nav)(\s+\S+)*$/.test(v)
  },
  {
    raison: 'adresses, mesures, raccourcis clavier et adresses de courriel',
    test: (v) => /^(https?:|data:|\/)/.test(v)
      || /^[\d\s.,%+-]+(px|%|g|kg|em|rem)?$/i.test(v)
      || /^[A-Za-z]+\+[A-Za-z0-9]+$/.test(v)
      || /^\S+@\S+\.\S+$/.test(v)
  },
  {
    raison: 'un seul mot technique, ou un sélecteur css',
    test: (v) => /^[a-z0-9_.:#/-]+$/i.test(v) || /^[.#[]/.test(v)
  },
  {
    raison: 'messages des validateurs d’options : ils s’adressent à l’intégrateur, pas au rédacteur',
    test: (v) => /^Must be /.test(v)
  },
  {
    raison: 'marques et noms de systèmes, écrits pareil dans toutes les langues',
    test: (v) => [ 'Twitter / X', 'iOS, Android', 'Facebook', 'LinkedIn', 'PayPal', 'OpenStreetMap' ].indexOf(v) !== -1
  }
];

/** La raison pour laquelle cette chaîne n'est pas traduite, s'il y en a une. */
const exemptionOf = (value) => {
  const trimmed = value.trim();
  if (trimmed === '') {
    return 'chaîne vide';
  }
  const rule = exemptions.filter((e) => e.test(trimmed))[0];
  return rule === undefined ? null : rule.raison;
};

/** Lit une chaîne à partir de son guillemet ouvrant : son contenu, et la position d'après. */
const readString = (src, i) => {
  const quote = src[i];
  let out = '';
  let j = i + 1;
  while (j < src.length) {
    const c = src[j];
    if (c === '\\') {
      out += src[j + 1] === 'n' ? '\n' : src[j + 1];
      j += 2;
      continue;
    }
    if (c === quote) {
      return { value: out, next: j + 1 };
    }
    if (c === '\n') {
      return null;
    }
    out += c;
    j += 1;
  }
  return null;
};

/** La chaîne complète à partir de cette position, morceaux concaténés compris. */
const readConcat = (src, i) => {
  const first = readString(src, i);
  if (first === null) {
    return null;
  }
  let value = first.value;
  let j = first.next;
  for (;;) {
    const suivant = /^\s*\+\s*/.exec(src.slice(j));
    if (suivant === null) {
      return value;
    }
    const k = j + suivant[0].length;
    if (src[k] !== '\'' && src[k] !== '"') {
      return value;
    }
    const morceau = readString(src, k);
    if (morceau === null) {
      return value;
    }
    value += morceau.value;
    j = morceau.next;
  }
};

const ouvertures = [
  /\b(?:label|text|tooltip|title|help|placeholder|ariaLabel|heading|message)\s*:\s*(['"])/g,
  /(?:(?<![\w.$])t|\.translate|windowManager\.(?:alert|confirm))\(\s*(['"])/g,
  /\.(?:textContent|placeholder|title)\s*=\s*(['"])/g,
  /setAttribute\(\s*'aria-label'\s*,\s*(['"])/g
];

/**
 * Le html assemblé à la main, dans un gabarit de chaîne.
 *
 * On y cherche ce qu'un lecteur voit : un attribut `title` ou `aria-label`, et le texte d'un
 * élément. Une valeur qui contient `${` est une interpolation — souvent une traduction déjà
 * faite, parfois un assemblage — et elle est laissée de côté : c'est le morceau littéral qui
 * dirait quelque chose, et il n'y en a pas.
 */
const htmlOuvertures = [
  /(?:title|aria-label)="([^"${]*)"/g,
  />([^<>${]+)</g
];

/**
 * Le source débarrassé de ses commentaires.
 *
 * Un exemple écrit dans une explication — un bloc de code entre accents graves — n'est pas une
 * chaîne d'interface, et le relevé le prenait pour un gabarit.
 */
const withoutComments = (source) => source
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1');

/** Les gabarits de chaîne d'un fichier, sans leurs interpolations. */
const templatesIn = (source) => {
  const found = [];
  let i = 0;
  while (i < source.length) {
    if (source[i] === '`') {
      let j = i + 1;
      let out = '';
      while (j < source.length && source[j] !== '`') {
        if (source[j] === '\\') { out += source[j + 1]; j += 2; continue; }
        out += source[j];
        j += 1;
      }
      found.push(out);
      i = j + 1;
    } else {
      i += 1;
    }
  }
  return found;
};

/**
 * Toutes les chaînes d'interface d'un fichier source.
 *
 * `html` dit s'il faut aussi lire le html assemblé à la main. On le met à faux pour les fichiers
 * qui produisent le contenu de la page : ce html s'adresse au visiteur du site.
 */
const stringsIn = (source, html = true) => {
  const found = [];
  ouvertures.forEach((pattern) => {
    pattern.lastIndex = 0;
    let m;
    while ((m = pattern.exec(source)) !== null) {
      const value = readConcat(source, m.index + m[0].length - 1);
      if (value !== null) {
        found.push(value);
      }
    }
  });

  if (html) {
    templatesIn(withoutComments(source)).forEach((template) => {
      htmlOuvertures.forEach((pattern) => {
        pattern.lastIndex = 0;
        let m;
        while ((m = pattern.exec(template)) !== null) {
          found.push(m[1].trim());
        }
      });
    });
  }

  return found;
};

const walk = (dir, out) => {
  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (entry.name.endsWith('.ts') && !catalogues.test(entry.name)) {
      out.push(full);
    }
  });
  return out;
};

/**
 * Le relevé : un objet par plugin, avec ce qu'il affiche et ce qui manque.
 *
 * `table` est le tableau des traductions ; il est lu sur le disque si on ne le fournit pas.
 */
const report = (table) => {
  const traductions = table === undefined ? JSON.parse(fs.readFileSync(tablePath, 'utf8')) : table;

  return fs.readdirSync(pluginsDir)
    .filter((name) => name.indexOf('onlc') === 0)
    .sort()
    .map((plugin) => {
      const dir = path.join(pluginsDir, plugin, 'main/ts');
      const vues = new Set();
      const manquantes = new Map();

      if (fs.existsSync(dir)) {
        walk(dir, []).forEach((file) => {
          stringsIn(fs.readFileSync(file, 'utf8'), !contenuPublie.test(file)).forEach((value) => {
            if (exemptionOf(value) !== null) {
              return;
            }
            vues.add(value);
            if (!Object.prototype.hasOwnProperty.call(traductions, value)) {
              if (!manquantes.has(value)) {
                manquantes.set(value, []);
              }
              manquantes.get(value).push(path.relative(pluginsDir, file));
            }
          });
        });
      }

      return {
        plugin,
        vues: vues.size,
        manquantes: Array.from(manquantes.entries()).map((e) => ({ chaine: e[0], fichiers: e[1] }))
      };
    });
};

const main = () => {
  const lignes = report();
  let total = 0;
  lignes.forEach((r) => {
    console.log(`${r.manquantes.length === 0 ? '✓' : '✗'} ${r.plugin.padEnd(22)} ` +
      `${String(r.vues).padStart(4)} chaînes, ${String(r.manquantes.length).padStart(3)} sans traduction`);
    r.manquantes.forEach((m) => {
      console.log(`      ${JSON.stringify(m.chaine)}`);
      console.log(`         ← ${Array.from(new Set(m.fichiers)).join(', ')}`);
    });
    total += r.manquantes.length;
  });
  console.log(`\n${total} chaîne(s) sans traduction.`);
  process.exitCode = total === 0 ? 0 : 1;
};

module.exports = { report, stringsIn, readConcat, exemptionOf, exemptions, tablePath };

if (require.main === module) {
  main();
}
