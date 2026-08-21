import PluginManager from 'hugerte/core/api/PluginManager';
import * as PublishedCss from 'hugerte/plugins/onlcshared/PublishedCss';
import * as DialogStyles from 'hugerte/plugins/onlcshared/ui/DialogStyles';

import * as Commands from './api/Commands';
import * as Options from './api/Options';
import * as ShortcodeCommands from './api/ShortcodeCommands';
import { ShortcodeDefinition } from './api/ShortcodeTypes';
import { WidgetConfig, WidgetDefinition } from './api/Types';
import * as FilterContent from './core/FilterContent';
import * as ShortcodeFilterContent from './core/shortcodes/FilterContent';
import * as Shortcodes from './core/shortcodes/Shortcodes';
import * as WidgetDom from './core/WidgetDom';
import * as Widgets from './core/Widgets';
import * as Buttons from './ui/Buttons';
import * as ShortcodeButtons from './ui/shortcodes/Buttons';
import * as SourceDialog from './ui/SourceDialog';

/**
 * Tout ce qu'on pose dans une page sans l'écrire à la main.
 *
 * Quatre outils sur une même base : un éditeur de script javascript coloré, un éditeur de source
 * html, une bibliothèque de **blocs prédéfinis** qui restent modifiables après insertion, et les
 * **codes courts** des gabarits Online Création.
 *
 * Les codes courts étaient un plugin à part. Du point de vue du rédacteur, pourtant, un bandeau
 * Hero et un menu de site sont la même chose : un élément qu'on choisit dans une liste et qu'on
 * règle dans un formulaire. Les deux catalogues sont donc réunis dans la même bibliothèque, sous
 * un seul plugin — un seul bouton à mettre dans la barre d'outils, un seul nom à retenir.
 *
 * Le nom `onlcshortcodes` reste reconnu dans `plugins:` : il ne charge plus rien lui-même et
 * renvoie vers celui-ci (voir le plugin de compatibilité du même nom).
 *
 * @class hugerte.onlcwidgets.Plugin
 * @private
 */

export interface OnlcWidgetsApi {
  readonly listWidgets: () => WidgetDefinition[];
  readonly insertWidget: (id: string, config?: WidgetConfig) => void;
  readonly listShortcodes: () => ShortcodeDefinition[];
  readonly insertShortcode: (name: string) => void;
  readonly getSource: () => string;
  readonly setSource: (value: string) => void;
}

export default (): void => {
  PluginManager.add('onlcwidgets', (editor, pluginUrl): OnlcWidgetsApi => {
    Options.register(editor);

    DialogStyles.setup(editor);

    // Ces deux feuilles décrivent l'allure des blocs sur le site — un bandeau, une grille de
    // calendrier, une visionneuse de pdf — et pas la façon de les modifier : la page publiée en a
    // besoin autant que la zone d'écriture, l'aperçu visiteur les reprend donc telles quelles.
    if (Options.shouldInjectStyles(editor)) {
      editor.contentCSS.push(`${pluginUrl}/css/onlcwidgets.css`);
      PublishedCss.declareSheets(editor, [ `${pluginUrl}/css/onlcwidgets.css` ]);
    }
    if (Options.shouldInjectShortcodeStyles(editor)) {
      editor.contentCSS.push(`${pluginUrl}/css/onlcshortcodes.css`);
    }

    // Les iframes du contenu sont mises en bac à sable par le cœur : les hôtes de nos
    // intégrations sont ajoutés aux exclusions pour que l'aperçu fonctionne dans l'éditeur.
    Options.allowIframeHosts(editor, Options.getIframeExclusions(editor));

    FilterContent.setup(editor);
    ShortcodeFilterContent.setup(editor);
    Commands.register(editor);
    ShortcodeCommands.register(editor);
    Buttons.register(editor);
    ShortcodeButtons.register(editor);

    return {
      listWidgets: () => Widgets.list(editor),
      insertWidget: (id: string, config?: WidgetConfig) => {
        Widgets.find(editor, id).each((definition) => {
          WidgetDom.insert(editor, definition, config ?? {});
        });
      },
      listShortcodes: () => Shortcodes.list(editor),
      insertShortcode: (name: string) => editor.execCommand('OnlcInsertShortcode', false, name),
      getSource: () => SourceDialog.getSource(editor),
      setSource: (value: string) => SourceDialog.setSource(editor, value)
    };
  });
};
