import { Arr, Fun, Optional, Singleton, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import * as Http from 'hugerte/plugins/onlcshared/Http';

import * as Options from '../api/Options';
import { fontAwesomeIcons } from './FontAwesomeData';
import { materialIcons, RawMaterialIcon } from './IconsData';

/**
 * Catalogue des icônes proposées par le sélecteur.
 *
 * Deux familles sont embarquées, chacune activable séparément (`onlc_icons_families`) :
 *
 * - **Material Design** — la police de Google, où l'icône est un mot :
 *   `<span class="material-icons">home</span>` ;
 * - **Font Awesome Free** — où l'icône est une classe :
 *   `<i class="fa-solid fa-house"></i>`.
 *
 * Une entrée retient sa famille, de sorte que le markup produit soit toujours celui que la
 * police attend, quel que soit le mélange affiché dans la liste.
 */

export type IconFamily = 'material' | 'fontawesome' | 'custom';

export interface IconEntry {
  readonly name: string;
  readonly title: string;
  readonly keywords: string[];
  readonly category: string;
  readonly family: IconFamily;
  /** Variante de la police Font Awesome : `solid`, `regular` ou `brands`. */
  readonly style?: string;
}

interface RemoteIcon {
  readonly name?: string;
  readonly keywords?: string[] | string;
  readonly category?: string;
  readonly family?: string;
  readonly style?: string;
}

export interface IconDatabase {
  readonly listAll: () => IconEntry[];
  readonly listCategory: (category: string) => IconEntry[];
  readonly listCategories: () => string[];
  readonly hasLoaded: () => boolean;
  readonly waitForLoad: () => Promise<boolean>;
}

const ALL_CATEGORY = 'Toutes';
const CUSTOM_CATEGORY = 'Personnalisées';

/** Les catégories de Font Awesome sont publiées en anglais : les plus courantes sont traduites. */
const categoryLabels: Record<string, string> = {
  Accessibility: 'Accessibilité',
  Alert: 'Alertes',
  Animals: 'Animaux',
  Arrows: 'Flèches',
  Astronomy: 'Astronomie',
  Buildings: 'Bâtiments',
  Business: 'Entreprise',
  Camping: 'Camping',
  Charity: 'Solidarité',
  Charts: 'Graphiques',
  Childhood: 'Enfance',
  Clothing: 'Vêtements',
  Coding: 'Développement',
  Communication: 'Communication',
  Connectivity: 'Connectivité',
  Construction: 'Construction',
  Design: 'Design',
  Devices: 'Appareils',
  Disaster: 'Catastrophes',
  Editing: 'Édition',
  Education: 'Éducation',
  Energy: 'Énergie',
  Files: 'Fichiers',
  Film: 'Cinéma',
  'Food + Beverage': 'Alimentation',
  Fruits: 'Fruits et légumes',
  Gaming: 'Jeux',
  Halloween: 'Halloween',
  Hands: 'Mains',
  Holidays: 'Fêtes',
  Household: 'Maison',
  Humanitarian: 'Humanitaire',
  Logistics: 'Logistique',
  Maps: 'Cartes et lieux',
  Maritime: 'Maritime',
  Marketing: 'Marketing',
  Mathematics: 'Mathématiques',
  'Medical + Health': 'Santé',
  Money: 'Argent',
  Moving: 'Déménagement',
  Music: 'Musique',
  Nature: 'Nature',
  Numbers: 'Chiffres',
  Photos: 'Photos',
  Political: 'Politique',
  Punctuation: 'Ponctuation',
  Religion: 'Religion',
  Science: 'Sciences',
  Security: 'Sécurité',
  Shapes: 'Formes',
  Shopping: 'Achats',
  Social: 'Réseaux sociaux',
  Spinners: 'Chargement',
  Sports: 'Sport',
  Text: 'Texte',
  Time: 'Temps',
  Toggle: 'Interrupteurs',
  Transportation: 'Transports',
  Travel: 'Voyages',
  Users: 'Personnes',
  Weather: 'Météo',
  Writing: 'Écriture',
  Divers: 'Divers'
};

const translateCategory = (name: string): string =>
  Object.prototype.hasOwnProperty.call(categoryLabels, name) ? categoryLabels[name] : name;

const toKeywords = (keywords: string[] | string | undefined): string[] => {
  if (Type.isArray(keywords)) {
    return keywords;
  } else if (Type.isString(keywords)) {
    return keywords.split(/[\s,]+/);
  } else {
    return [];
  }
};

const toTitle = (name: string): string => name.replace(/[_-]/g, ' ');

const fromMaterial = (raw: RawMaterialIcon): IconEntry => ({
  name: raw.name,
  title: toTitle(raw.name),
  keywords: toKeywords(raw.keywords).concat(raw.name.split('_')),
  category: raw.category,
  family: 'material'
});

const fromFontAwesome = (raw: { name: string; style: string; label: string; keywords: string; category: string }): IconEntry => ({
  name: raw.name,
  title: raw.label,
  keywords: toKeywords(raw.keywords).concat(raw.name.split('-')),
  category: translateCategory(raw.category),
  family: 'fontawesome',
  style: raw.style
});

const fromRemote = (raw: RemoteIcon | string): Optional<IconEntry> => {
  const name = Type.isString(raw) ? raw : raw.name;
  if (!Type.isString(name) || name.length === 0) {
    return Optional.none();
  }
  const category = Type.isString(raw) ? CUSTOM_CATEGORY : (raw.category ?? CUSTOM_CATEGORY);
  const keywords = Type.isString(raw) ? [] : toKeywords(raw.keywords);
  const declared = Type.isString(raw) ? '' : (raw.family ?? '');
  const family = declared === 'material' || declared === 'fontawesome' ? declared : 'custom';
  return Optional.some({
    name,
    title: toTitle(name),
    keywords: keywords.concat(name.split(/[_-]/)),
    category,
    family: family as IconFamily,
    style: Type.isString(raw) ? undefined : raw.style
  });
};

const loadRemote = (editor: Editor): Promise<IconEntry[]> => {
  const url = Options.getMaterialUrl(editor);
  if (url === '') {
    return Promise.resolve([]);
  }

  return Http.request<{ icons?: Array<RemoteIcon | string> } | Array<RemoteIcon | string>>({ url })
    .then((response) => {
      const raws = Type.isArray(response) ? response : response.icons;
      const list = Type.isArray(raws) ? raws : [];
      return Arr.bind(list, (raw) => fromRemote(raw).toArray());
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.warn('[onlc] Impossible de charger la liste des icônes :', err);
      return [];
    });
};

/**
 * Retire les doublons.
 *
 * Deux niveaux : le même dessin déclaré deux fois dans une famille, et — plus visible pour le
 * rédacteur — le **même nom dans deux familles**. « lock », « star » ou « folder » existent chez
 * Material comme chez Font Awesome : la grille montrait alors deux vignettes presque identiques
 * l'une à côté de l'autre, sans rien pour les départager.
 *
 * Le premier arrivé gagne, et l'ordre est celui de `onlc_icons_families` : un projet qui écrit
 * `[ 'fontawesome', 'material' ]` obtient le dessin Font Awesome pour les noms communs, et
 * Material pour tout le reste. Les icônes ajoutées par le projet passent avant les deux.
 */
const dedupe = (entries: IconEntry[]): IconEntry[] => {
  const seen: Record<string, boolean> = {};
  return Arr.filter(entries, (entry) => {
    if (seen[entry.name] === true) {
      return false;
    }
    seen[entry.name] = true;
    return true;
  });
};

/**
 * Le catalogue est celui des familles activées, complété par la liste distante
 * (`onlc_icons_material_url`) et par `onlc_icons_material_append`.
 */
const initDatabase = (editor: Editor): IconDatabase => {
  const state = Singleton.value<IconEntry[]>();
  const families = Options.getFamilies(editor);

  const appended = Arr.bind(Options.getAppendedIcons(editor), (entry) => fromRemote(entry as RemoteIcon).toArray());
  const bundled = ([] as IconEntry[])
    // L'ordre suit `onlc_icons_families` : c'est lui qui tranche pour les noms communs.
    .concat(Arr.bind(families, (family) => {
      if (family === 'material') {
        return Arr.map(materialIcons, fromMaterial);
      } else if (family === 'fontawesome') {
        return Arr.map(fontAwesomeIcons, fromFontAwesome);
      } else {
        return [];
      }
    }));

  // Les icônes embarquées sont utilisables immédiatement, la liste distante s'y ajoute ensuite
  state.set(dedupe(appended.concat(bundled)));

  const loaded = loadRemote(editor).then((remote) => {
    state.set(dedupe(appended.concat(bundled).concat(remote)));
    return true;
  });

  const listAll = (): IconEntry[] => state.get().getOr([]);

  const listCategories = (): string[] =>
    [ ALL_CATEGORY ].concat(Arr.sort(Arr.foldl(listAll(), (acc: string[], entry) =>
      Arr.contains(acc, entry.category) ? acc : acc.concat([ entry.category ]), [])));

  const listCategory = (category: string): IconEntry[] =>
    category === ALL_CATEGORY ? listAll() : Arr.filter(listAll(), (entry) => entry.category === category);

  return {
    listAll,
    listCategory,
    listCategories,
    hasLoaded: () => state.isSet(),
    waitForLoad: Fun.constant(loaded)
  };
};

export {
  ALL_CATEGORY,
  CUSTOM_CATEGORY,
  categoryLabels,
  translateCategory,
  initDatabase,
  toTitle
};
