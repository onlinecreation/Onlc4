import { Throttler } from '@ephox/katamari';

import PluginManager from 'hugerte/core/api/PluginManager';
import * as DialogStyles from 'hugerte/plugins/onlcshared/ui/DialogStyles';

import * as Commands from './api/Commands';
import * as Options from './api/Options';
import * as Card from './core/Card';
import * as Detect from './core/Detect';
import * as Settings from './core/Settings';
import * as Slides from './core/Slides';
import * as Buttons from './ui/Buttons';

/**
 * Les diaporamas Swiper d'une page, rendus modifiables.
 *
 * Ce plugin ne crée pas de diaporamas : il en **reconnaît** dans du html écrit à la main, retrouve
 * la configuration javascript qui les anime, et ouvre un formulaire pour l'un et pour l'autre.
 * C'est la différence avec un bloc prédéfini, dont l'éditeur possède le html du début à la fin.
 *
 * La raison est simple : les pages qu'on veut modifier existent déjà. Une page d'accueil réelle
 * porte trois diaporamas, écrits par un intégrateur, avec des classes qui lui sont propres et une
 * configuration groupée avec dix autres choses dans un `$(document).ready`. Un outil qui ne
 * saurait éditer que ses propres diaporamas ne servirait à rien sur cette page.
 *
 * Trois modules portent l'essentiel :
 *
 * * `core/JsObject` lit et réécrit un littéral objet javascript **sans jamais l'exécuter** ;
 * * `core/Detect` rapproche le html d'un diaporama de l'appel qui le configure ;
 * * `core/Write` remplace la configuration dans le script, au caractère près, sans toucher au
 *   reste du code.
 *
 * @class hugerte.onlcswiper.Plugin
 * @private
 */

export interface OnlcSwiperApi {
  /** Les diaporamas de la page, avec leur configuration quand elle a été retrouvée. */
  readonly list: () => Detect.Swiper[];
  /** Les vues d'un diaporama. */
  readonly slidesOf: (swiper: Detect.Swiper) => Slides.Slide[];
  /** Les réglages d'un diaporama, traduits en termes du formulaire. */
  readonly settingsOf: (swiper: Detect.Swiper) => Settings.Settings;
  /** Ouvre le formulaire du diaporama qui contient ce nœud. */
  readonly edit: (node: Node) => void;
}

export default (): void => {
  PluginManager.add('onlcswiper', (editor, pluginUrl): OnlcSwiperApi => {
    Options.register(editor);

    DialogStyles.setup(editor);

    if (Options.shouldInjectStyles(editor)) {
      editor.contentCSS.push(`${pluginUrl}/css/onlcswiper.css`);
      editor.contentStyles.push(
        `body .swiper-wrapper > .swiper-slide { max-height: ${Options.getEditHeight(editor)}; }`);
    }

    Commands.register(editor);
    Buttons.register(editor);

    // L'aperçu est reposé après chaque changement de contenu. `Throttler` évite d'y revenir à
    // chaque frappe : le décor ne change qu'au retrait ou à l'ajout d'une vue.
    const redraw = Throttler.last(() => {
      if (!editor.removed) {
        Card.decorate(editor);
      }
    }, 120);

    editor.on('init SetContent', () => Card.decorate(editor));
    editor.on('NodeChange Undo Redo', redraw.throttle);
    editor.on('remove', redraw.cancel);

    return {
      list: () => Detect.all(editor),
      slidesOf: (swiper: Detect.Swiper) => Slides.read(editor, swiper),
      settingsOf: (swiper: Detect.Swiper) =>
        Settings.fromConfig(swiper.call.bind((call) => call.settings).getOr({})),
      edit: (node: Node) => {
        editor.selection.select(node as HTMLElement);
        editor.execCommand('OnlcSwiper');
      }
    };
  });
};
