import { Arr } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import { Dialog } from 'hugerte/core/api/ui/Ui';

import * as Detect from '../core/Detect';
import * as JsObject from '../core/JsObject';
import * as Settings from '../core/Settings';
import * as Slides from '../core/Slides';
import * as Write from '../core/Write';
import * as BreakpointsField from './BreakpointsField';
import * as SlidesField from './SlidesField';

/**
 * Le formulaire d'un diaporama.
 *
 * Quatre onglets, dans l'ordre où l'on s'en sert :
 *
 * * **Images** — ce que le diaporama montre. C'est ce qu'on vient changer neuf fois sur dix.
 * * **Défilement** — comment il avance : tout seul, à la molette, au doigt.
 * * **Affichage** — combien de vues à la fois, quel espacement, quel effet.
 * * **Écrans** — les paliers qui adaptent tout cela à la largeur disponible.
 *
 * Les trois derniers onglets ne servent que si les réglages ont été retrouvés : sans appel
 * `new Swiper(...)` dans la page, il n'y a rien à modifier, et le formulaire le dit au lieu
 * d'afficher des cases qui ne changeraient rien.
 *
 * ## Une précaution de fond
 *
 * La liste des vues travaille sur les nœuds du document, les réglages sur le texte du script.
 * Enregistrer fait les deux dans une seule opération d'annulation : un retour arrière remet le
 * diaporama exactement dans l'état où il était, images et réglages ensemble.
 */

interface SwiperDialogData {
  readonly slides: string;
  readonly breakpoints: string;
  readonly slidesPerView: string;
  readonly spaceBetween: string;
  readonly centeredSlides: boolean;
  readonly direction: string;
  readonly effect: string;
  readonly loop: boolean;
  readonly autoplay: boolean;
  readonly autoplayDelay: string;
  readonly autoplayStopsOnTouch: boolean;
  readonly allowTouchMove: boolean;
  readonly freeMode: boolean;
  readonly mousewheel: boolean;
  readonly keyboard: boolean;
  readonly navigation: boolean;
  readonly pagination: boolean;
  readonly paginationType: string;
  readonly scrollbar: boolean;
}

const help = (editor: Editor, text: string): Dialog.HtmlPanelSpec => ({
  type: 'htmlpanel',
  presets: 'presentation',
  html: `<p class="onlc-field-help">${editor.dom.encode(editor.translate(text) as string)}</p>`
});

const missingConfigPanel = (editor: Editor, canCreate: boolean): Dialog.HtmlPanelSpec => ({
  type: 'htmlpanel',
  presets: 'document',
  html: `<p>${editor.dom.encode(editor.translate(
    'Ce diaporama n’a pas de réglages dans la page : aucun appel « new Swiper(…) » ne le désigne. ' +
    'Ses images restent modifiables.') as string)}</p>` +
    (canCreate
      ? `<p>${editor.dom.encode(editor.translate(
        'Le bouton « Ajouter une configuration » en pose une, à la fin de la page, avec les ' +
        'commandes que son html contient déjà.') as string)}</p>`
      : `<p>${editor.dom.encode(editor.translate(
        'Le plugin des scripts n’est pas chargé : la configuration ne peut pas être ajoutée depuis ' +
        'ici. Écrivez-la dans le gabarit du site.') as string)}</p>`)
});

const open = (editor: Editor, swiper: Detect.Swiper): void => {
  const original = swiper.call.bind((call) => call.settings).getOr({} as JsObject.JsObjectValue);
  const initial = Settings.fromConfig(original);
  const hasConfig = swiper.call.bind((call) => call.settings).isSome();
  const canCreate = editor.hasPlugin('onlcwidgets');

  let slides = Slides.read(editor, swiper);
  let breakpoints = initial.breakpoints;

  const tabs: Dialog.TabSpec[] = [
    {
      title: 'Images',
      name: 'images',
      items: [
        help(editor, 'Chaque vue est une image du diaporama. L’ordre de la liste est celui du défilement.'),
        SlidesField.field(editor, 'slides', slides, (updated) => {
          slides = updated;
        })
      ]
    }
  ];

  if (hasConfig) {
    tabs.push({
      title: 'Défilement',
      name: 'motion',
      items: [
        { type: 'checkbox', name: 'autoplay', label: 'Avancer tout seul' },
        { type: 'input', name: 'autoplayDelay', label: 'Temps d’arrêt sur chaque vue (millisecondes)', inputMode: 'numeric' },
        help(editor, '3000 millisecondes valent trois secondes. En dessous de 2000, la plupart des ' +
          'visiteurs n’ont pas le temps de lire.'),
        { type: 'checkbox', name: 'autoplayStopsOnTouch', label: 'S’arrêter dès que le visiteur y touche' },
        help(editor, 'Recommandé : un diaporama qui repart tout seul pendant qu’on le regarde est ' +
          'pénible, et empêche de revenir en arrière.'),
        { type: 'checkbox', name: 'loop', label: 'Repartir au début après la dernière vue' },
        { type: 'checkbox', name: 'allowTouchMove', label: 'Faire glisser au doigt ou à la souris' },
        { type: 'checkbox', name: 'freeMode', label: 'Défilement libre, sans s’aligner sur une vue' },
        { type: 'checkbox', name: 'mousewheel', label: 'Avancer à la molette de la souris' },
        help(editor, 'À n’activer que sur un diaporama qui occupe l’écran : sinon la molette cesse ' +
          'de faire défiler la page dès qu’on passe dessus.'),
        { type: 'checkbox', name: 'keyboard', label: 'Avancer avec les flèches du clavier' }
      ]
    });

    tabs.push({
      title: 'Affichage',
      name: 'layout',
      items: [
        { type: 'input', name: 'slidesPerView', label: 'Vues affichées en même temps' },
        help(editor, 'Un nombre entier (3), un nombre décimal pour laisser deviner la suivante (1.15), ' +
          'ou « auto » pour suivre la largeur de chaque vue.'),
        { type: 'input', name: 'spaceBetween', label: 'Espace entre les vues (pixels)', inputMode: 'numeric' },
        { type: 'checkbox', name: 'centeredSlides', label: 'Centrer la vue courante' },
        { type: 'listbox', name: 'direction', label: 'Sens du défilement', items: Settings.directions },
        { type: 'listbox', name: 'effect', label: 'Effet de transition', items: Settings.effects },
        help(editor, 'Les effets autres que le glissement demandent leur module dans la page. Si le ' +
          'diaporama se fige après un changement d’effet, revenez au glissement.'),
        { type: 'checkbox', name: 'navigation', label: 'Afficher les flèches précédent / suivant' },
        { type: 'checkbox', name: 'pagination', label: 'Afficher les points de position' },
        { type: 'listbox', name: 'paginationType', label: 'Forme des points', items: Settings.paginationTypes },
        { type: 'checkbox', name: 'scrollbar', label: 'Afficher une barre de défilement' }
      ]
    });

    tabs.push({
      title: 'Écrans',
      name: 'breakpoints',
      items: [
        BreakpointsField.field(editor, 'breakpoints', breakpoints, (updated) => {
          breakpoints = updated;
        })
      ]
    });
  } else {
    tabs.push({
      title: 'Réglages',
      name: 'motion',
      items: [ missingConfigPanel(editor, canCreate) ]
    });
  }

  const buttons: Dialog.DialogFooterButtonSpec[] = [
    { type: 'cancel', name: 'cancel', text: 'Annuler' }
  ];

  if (!hasConfig && canCreate) {
    buttons.push({ type: 'custom', name: 'configure', text: 'Ajouter une configuration' });
  }

  buttons.push({ type: 'submit', name: 'save', text: 'Mettre à jour', primary: true });

  editor.windowManager.open<SwiperDialogData>({
    title: 'Diaporama',
    size: 'large',
    body: { type: 'tabpanel', tabs },
    initialData: {
      slides: String(slides.length),
      breakpoints: String(breakpoints.length),
      slidesPerView: initial.slidesPerView,
      spaceBetween: initial.spaceBetween,
      centeredSlides: initial.centeredSlides,
      direction: initial.direction,
      effect: initial.effect,
      loop: initial.loop,
      autoplay: initial.autoplay,
      autoplayDelay: initial.autoplayDelay,
      autoplayStopsOnTouch: initial.autoplayStopsOnTouch,
      allowTouchMove: initial.allowTouchMove,
      freeMode: initial.freeMode,
      mousewheel: initial.mousewheel,
      keyboard: initial.keyboard,
      navigation: initial.navigation,
      pagination: initial.pagination,
      paginationType: initial.paginationType,
      scrollbar: initial.scrollbar
    },
    buttons,
    onAction: (api, details) => {
      if (details.name === 'configure' && Write.addConfiguration(editor, swiper)) {
        api.close();
        // Le diaporama a changé : on rouvre sur sa nouvelle version, réglages compris.
        Detect.at(editor, swiper.container).each((updated) => open(editor, updated));
      }
    },
    onSubmit: (api) => {
      const data = api.getData();

      const settings: Settings.Settings = {
        slidesPerView: data.slidesPerView,
        spaceBetween: data.spaceBetween,
        centeredSlides: data.centeredSlides,
        direction: data.direction,
        effect: data.effect,
        loop: data.loop,
        autoplay: data.autoplay,
        autoplayDelay: data.autoplayDelay,
        autoplayStopsOnTouch: data.autoplayStopsOnTouch,
        allowTouchMove: data.allowTouchMove,
        freeMode: data.freeMode,
        mousewheel: data.mousewheel,
        keyboard: data.keyboard,
        navigation: data.navigation,
        pagination: data.pagination,
        paginationType: data.paginationType,
        scrollbar: data.scrollbar,
        breakpoints
      };

      const filled = Arr.filter(slides, (slide) =>
        slide.custom || Arr.exists(slide.images, (image) => image.src.trim() !== ''));
      const empty = slides.length - filled.length;

      const apply = () => {
        editor.undoManager.transact(() => {
          Slides.write(editor, swiper, filled);
          if (hasConfig) {
            Write.applySettings(editor, swiper, original, settings);
          }
        });
        editor.nodeChanged();
        api.close();
      };

      if (empty === 0) {
        apply();
        return;
      }

      // Une vue sans image n'affiche rien sur le site : c'est un blanc au milieu du diaporama.
      // On le dit, et on retire ces vues plutôt que de les publier vides.
      editor.windowManager.confirm(
        `${empty} ${editor.translate(empty > 1
          ? 'vues n’ont pas d’image et ne montreraient rien sur le site. Les retirer ?'
          : 'vue n’a pas d’image et ne montrerait rien sur le site. La retirer ?') as string}`,
        (accepted) => {
          if (accepted) {
            apply();
          }
        });
    }
  });
};

export {
  help,
  open
};
