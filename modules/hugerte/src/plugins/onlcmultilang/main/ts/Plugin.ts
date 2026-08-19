import PluginManager from 'hugerte/core/api/PluginManager';
import * as DialogStyles from 'hugerte/plugins/onlcshared/ui/DialogStyles';

import * as Commands from './api/Commands';
import * as Options from './api/Options';
import { Language, Syntax } from './api/Types';
import * as FilterContent from './core/FilterContent';
import * as Languages from './core/Languages';
import * as Parse from './core/Parse';
import * as Sections from './core/Sections';
import * as View from './core/View';
import * as Buttons from './ui/Buttons';

/**
 * Une page, plusieurs langues.
 *
 * Les gabarits d'Online Création connaissent deux façons de dire « ceci n'est que pour les
 * visiteurs qui lisent le français » :
 *
 * ```
 * [LG="fr"]Bonjour[/LG][LG="en"]Hello[/LG]
 * <multilang lang="fr"><h2>Nos horaires</h2>…</multilang>
 * ```
 *
 * Les deux font la même chose et acceptent aussi bien trois mots qu'une suite de blocs. Écrites
 * telles quelles dans l'éditeur, elles sont illisibles : on ne voit ni où commence une langue,
 * ni ce qu'elle recouvre, et une frappe malheureuse au milieu d'un marqueur suffit à publier la
 * page en double dans toutes les langues.
 *
 * Le plugin les remplace donc, le temps de l'écriture, par des sections encadrées et nommées,
 * dont le contenu reste modifiable comme le reste du texte. À l'enregistrement, chacune redevient
 * exactement les marqueurs d'où elle vient — même écriture, même langue.
 *
 * Ce qu'il ajoute au passage :
 *
 * * **un aperçu par langue**, qui n'affiche que ce que verra un visiteur donné ;
 * * **« compléter les langues manquantes »**, qui pose à côté d'un passage sa copie dans chaque
 *   langue déclarée — c'est ainsi qu'on traduit une page, pas en recréant le cadre à la main ;
 * * **le dictionnaire de la bonne langue** dans chaque section, par l'attribut `lang`.
 *
 * Les langues autorisées se déclarent dans `onlc_multilang_languages` ; par défaut `fr`, `en`,
 * `nl`. Une langue rencontrée dans un fichier sans y figurer n'est jamais supprimée : elle est
 * signalée, et reste modifiable.
 *
 * @class hugerte.onlcmultilang.Plugin
 * @private
 */

export interface OnlcMultilangApi {
  /** Les langues déclarées, dans l'ordre de la configuration. */
  readonly listLanguages: () => Language[];
  /** Les langues réellement employées dans la page, déclarées ou non. */
  readonly usedLanguages: () => string[];
  readonly mark: (code: string, syntax?: Syntax) => void;
  readonly unmark: () => void;
  /** N'affiche plus qu'une langue dans l'éditeur ; une valeur vide les rend toutes. */
  readonly view: (code: string) => void;
  readonly viewed: () => string;
  /**
   * Le contenu réduit à une langue, comme le publiera le site.
   *
   * Sans argument, la langue de l'aperçu en cours ; à défaut, la première langue déclarée.
   */
  readonly resolve: (code?: string) => string;
  /**
   * La même réduction, appliquée à une page entière plutôt qu'au seul contenu.
   *
   * Le moteur du site fait sa passe polyglotte sur la page **assemblée** : gabarit et contenu
   * confondus, un `[LG]` écrit dans l'en-tête du gabarit compte autant qu'un autre. C'est par
   * là que l'aperçu visiteur de `onlcwidgets` obtient la même page que le visiteur.
   */
  readonly resolveHtml: (html: string, code?: string) => string;
}

export default (): void => {
  PluginManager.add('onlcmultilang', (editor, pluginUrl): OnlcMultilangApi => {
    Options.register(editor);

    /** Sans langue demandée : celle de l'aperçu en cours, à défaut la première déclarée. */
    const resolveHtml = (html: string, code?: string): string => {
      const wanted = code ?? View.current(editor);
      return Parse.resolve(html, wanted === '' ? Languages.first(editor) : wanted);
    };

    DialogStyles.setup(editor);

    if (Options.shouldInjectStyles(editor)) {
      editor.contentCSS.push(`${pluginUrl}/css/onlcmultilang.css`);
    }

    // Les règles d'aperçu dépendent des langues déclarées : elles sont écrites à l'ouverture,
    // pas livrées avec la feuille de styles.
    editor.contentStyles.push(View.styles(editor));

    FilterContent.setup(editor);
    Commands.register(editor);
    Commands.registerQuery(editor);
    Buttons.register(editor);

    editor.on('init', () => {
      View.show(editor, Options.getPreviewLanguage(editor));
    });

    return {
      listLanguages: () => Languages.list(editor),
      usedLanguages: () => Sections.codesInUse(editor),
      mark: (code: string, syntax?: Syntax) => Sections.mark(editor, code, syntax),
      unmark: () => Sections.unmark(editor),
      view: (code: string) => View.show(editor, code),
      viewed: () => View.current(editor),
      resolve: (code?: string) => resolveHtml(editor.getContent(), code),
      resolveHtml
    };
  });
};
