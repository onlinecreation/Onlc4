import { Arr, Optional, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

import * as Options from './Options';
import * as PublishedCss from './PublishedCss';

/**
 * La ou les feuilles de style **du site**, importées dans l'éditeur.
 *
 * Une page d'accueil vraie — bandeau en parallaxe, colonnes, boutons, diaporamas — n'est pas
 * modifiable si l'éditeur ne connaît pas la feuille qui l'habille : le rédacteur voit une longue
 * suite de paragraphes empilés, sans rapport avec ce que le visiteur recevra. Le site déclare
 * donc son adresse, et elle sert trois fois :
 *
 * 1. dans la **zone d'écriture**, pour que le contenu ait son allure définitive ;
 * 2. dans l'**aperçu visiteur**, par le registre des styles de publication ;
 * 3. dans les **formulaires**, où les classes qu'elle définit deviennent des suggestions —
 *    `screen0`, `flex-v-center`, `btn-outline-default` s'écrivent alors sans les retenir.
 *
 * ## Ce que la lecture des classes peut et ne peut pas
 *
 * Poser la feuille avec un `<link>` marche toujours : le navigateur ne contrôle pas l'origine
 * d'une feuille de style. **Lire ses règles**, en revanche, est soumis au contrôle d'origine —
 * `document.styleSheets` lève une erreur sur une feuille d'un autre domaine, et `fetch` est
 * refusé sans en-tête d'autorisation.
 *
 * Trois tentatives, dans cet ordre, et chacune peut échouer sans conséquence :
 *
 * 1. la feuille déjà chargée dans le document d'écriture — gratuit, et suffisant quand le site
 *    et le back-office partagent une origine ;
 * 2. un `fetch` direct — suffisant quand le site autorise la lecture ;
 * 3. le relais déclaré par `onlc_site_css_proxy`, qui va chercher la feuille côté serveur. C'est
 *    la réponse d'un back-office qui sert un domaine qu'il ne contrôle pas.
 *
 * Quand les trois échouent, la feuille **habille quand même** la page : seules les suggestions
 * manquent, et les formulaires le disent au lieu d'afficher une liste vide sans explication.
 */

interface Store {
  /** Adresses déclarées, dans l'ordre. */
  readonly urls: string[];
  /** Classes relevées dans les feuilles lues, triées. */
  classes: string[];
  /** Identifiants relevés dans les feuilles lues, triés. */
  ids: string[];
  /** Adresses dont la lecture a échoué : les suggestions y sont forcément incomplètes. */
  readonly unreadable: string[];
  /** Chargement en cours, pour ne pas le lancer deux fois. */
  loading: Promise<void> | null;
}

interface Carrier {
  onlcSiteCss?: Store;
}

const storeOf = (editor: Editor): Store => {
  const carrier = editor as Editor & Carrier;
  const existing = carrier.onlcSiteCss;
  if (Type.isObject(existing) && Type.isArray(existing.urls)) {
    return existing;
  }
  const created: Store = { urls: [], classes: [], ids: [], unreadable: [], loading: null };
  carrier.onlcSiteCss = created;
  return created;
};

/**
 * Déclare les feuilles du site.
 *
 * Elles sont ajoutées à la zone d'écriture **et** au registre de publication : ce sont les mêmes
 * fichiers qui habillent la page ici et sur le site, il n'y a pas de raison de les nommer deux
 * fois.
 */
const declare = (editor: Editor, urls: string[]): void => {
  const store = storeOf(editor);
  Arr.each(urls, (url) => {
    const trimmed = Type.isString(url) ? url.trim() : '';
    if (trimmed !== '' && !Arr.contains(store.urls, trimmed)) {
      store.urls.push(trimmed);
      editor.contentCSS.push(trimmed);
      PublishedCss.declareSheets(editor, [ trimmed ]);
    }
  });
};

const urls = (editor: Editor): string[] => storeOf(editor).urls.slice();

/**
 * Branche l'option `onlc_site_css` : à appeler au démarrage de chaque plugin ONLC.
 *
 * Les adresses sont posées sur `PreInit`, et non tout de suite : `content_css` n'est ajouté à la
 * liste qu'une fois les plugins initialisés, et déclarer plus tôt placerait la feuille du design
 * **avant** elle. Or c'est le design qui doit avoir le dernier mot, ici comme sur le site.
 *
 * Appeler cette fonction depuis plusieurs plugins est sans effet : les adresses déjà déclarées
 * sont ignorées.
 */
const setup = (editor: Editor): void => {
  Options.register(editor);
  editor.on('PreInit', () => declare(editor, Options.getSiteCss(editor)));
};

/**
 * Relève les noms de classe et d'identifiant d'une feuille, à partir de son texte.
 *
 * Une analyse complète du css n'apporterait rien ici : ce qui est cherché, ce sont les noms
 * qu'un rédacteur pourra écrire dans un champ. Les sélecteurs d'attribut, les pseudo-classes et
 * le contenu des chaînes sont donc écartés d'abord, pour ne pas relever `active` dans
 * `[data-state="active"]` ni `hover` dans `:hover`.
 */
const namesIn = (css: string): { classes: string[]; ids: string[] } => {
  const cleaned = css
    // Commentaires, puis chaînes : `content: ".fausse"` n'est pas un sélecteur.
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/"(?:[^"\\]|\\.)*"/g, ' ')
    .replace(/'(?:[^'\\]|\\.)*'/g, ' ')
    // Corps des règles : `color: #fff` n'est pas un identifiant.
    .replace(/\{[^{}]*\}/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/::?[a-zA-Z-]+(\([^)]*\))?/g, ' ');

  const collect = (pattern: RegExp): string[] => {
    const found: string[] = [];
    let match = pattern.exec(cleaned);
    while (match !== null) {
      if (!Arr.contains(found, match[1])) {
        found.push(match[1]);
      }
      match = pattern.exec(cleaned);
    }
    return found.sort();
  };

  return {
    classes: collect(/\.(-?[_a-zA-Z][\w-]*)/g),
    ids: collect(/#(-?[_a-zA-Z][\w-]*)/g)
  };
};

/** La feuille telle que le document d'écriture l'a déjà chargée, quand il a le droit de la lire. */
const fromDocument = (editor: Editor, url: string): Optional<string> => {
  const doc = editor.getDoc();
  if (!Type.isNonNullable(doc)) {
    return Optional.none();
  }
  return Arr.findMap(Arr.from(doc.styleSheets), (sheet) => {
    if (sheet.href !== url) {
      return Optional.none<string>();
    }
    try {
      // La lecture lève une `SecurityError` sur une feuille d'un autre domaine : c'est attendu,
      // et c'est précisément ce que les deux autres tentatives sont là pour rattraper.
      return Optional.some(Arr.map(Arr.from(sheet.cssRules), (rule) => rule.cssText).join('\n'));
    } catch (_err) {
      return Optional.none<string>();
    }
  });
};

const viaProxy = (proxy: string, url: string): string =>
  proxy.indexOf('{url}') === -1
    ? `${proxy}${proxy.indexOf('?') === -1 ? '?' : '&'}url=${encodeURIComponent(url)}`
    : proxy.replace('{url}', encodeURIComponent(url));

const fetchText = async (url: string): Promise<string> => {
  const response = await fetch(url, { credentials: 'omit' });
  if (!response.ok) {
    throw new Error(`Feuille de style refusée (${response.status})`);
  }
  return response.text();
};

/**
 * Charge les feuilles déclarées et en relève les noms.
 *
 * Le résultat est mémorisé : les formulaires appellent cette fonction à chaque ouverture, sans
 * relancer le moindre transfert. Un échec n'est pas une erreur remontée à l'appelant — l'adresse
 * est simplement rangée dans les illisibles, et les suggestions se présentent comme incomplètes.
 */
const load = (editor: Editor): Promise<void> => {
  const store = storeOf(editor);
  if (store.loading !== null) {
    return store.loading;
  }

  const proxy = Options.getSiteCssProxy(editor).trim();
  const absolute = Arr.map(store.urls, (url) => editor.documentBaseURI.toAbsolute(url));

  const one = (url: string): Promise<string> =>
    fromDocument(editor, url).fold(
      () => fetchText(url).catch(() => proxy === ''
        ? Promise.reject(new Error('unreadable'))
        : fetchText(viaProxy(proxy, url))),
      (text) => Promise.resolve(text)
    );

  const started = Promise.all(Arr.map(absolute, (url) =>
    one(url).then(namesIn, () => {
      store.unreadable.push(url);
      return { classes: [] as string[], ids: [] as string[] };
    })
  )).then((results) => {
    store.classes = Arr.unique(Arr.bind(results, (result) => result.classes)).sort();
    store.ids = Arr.unique(Arr.bind(results, (result) => result.ids)).sort();
  });

  store.loading = started;
  return started;
};

const classes = (editor: Editor): string[] => storeOf(editor).classes.slice();
const ids = (editor: Editor): string[] => storeOf(editor).ids.slice();
const unreadable = (editor: Editor): string[] => storeOf(editor).unreadable.slice();

export {
  setup,
  declare,
  urls,
  namesIn,
  load,
  classes,
  ids,
  unreadable
};
