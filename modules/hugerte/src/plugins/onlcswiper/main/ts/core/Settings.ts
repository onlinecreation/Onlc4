import { Arr, Obj, Type } from '@ephox/katamari';

import * as JsObject from './JsObject';

/**
 * Les réglages d'un diaporama, traduits dans les deux sens.
 *
 * D'un côté l'objet de configuration de Swiper, avec ses quatre-vingts options, ses objets
 * imbriqués et ses valeurs qui veulent dire deux choses (`slidesPerView: 'auto'`). De l'autre un
 * formulaire qu'on doit pouvoir remplir sans avoir lu la documentation de la bibliothèque.
 *
 * ## La règle de conservation
 *
 * Le formulaire ne connaît qu'une partie des options. Tout ce qu'il ignore est **conservé tel
 * quel** : une configuration réglée finement par un intégrateur ne perd rien à passer par ce
 * formulaire, et un rédacteur qui vient changer la vitesse de défilement ne casse pas les effets
 * que quelqu'un d'autre a posés. C'est la condition pour que l'outil soit utilisable sur des pages
 * existantes plutôt que sur les seules pages qu'il a créées.
 *
 * Concrètement : `fromConfig` lit, `toConfig` réécrit **par-dessus l'objet d'origine**. Une option
 * remise à sa valeur par défaut est retirée, pour ne pas alourdir la configuration de lignes qui
 * ne disent rien.
 */

export interface Breakpoint {
  /** La clé écrite dans la configuration : `768` (pixels) ou `@1.5` (rapport). */
  readonly key: string;
  readonly slidesPerView: string;
  readonly spaceBetween: string;
}

export interface Settings {
  /* Affichage */
  readonly slidesPerView: string;
  readonly spaceBetween: string;
  readonly centeredSlides: boolean;
  readonly direction: string;
  readonly effect: string;
  readonly loop: boolean;

  /* Interactions */
  readonly autoplay: boolean;
  readonly autoplayDelay: string;
  readonly autoplayStopsOnTouch: boolean;
  readonly allowTouchMove: boolean;
  readonly freeMode: boolean;
  readonly mousewheel: boolean;
  readonly keyboard: boolean;

  /* Commandes visibles */
  readonly navigation: boolean;
  readonly pagination: boolean;
  readonly paginationType: string;
  readonly scrollbar: boolean;

  /* Écrans */
  readonly breakpoints: Breakpoint[];
}

const effects = [
  { text: 'Glissement (par défaut)', value: 'slide' },
  { text: 'Fondu', value: 'fade' },
  { text: 'Perspective', value: 'coverflow' },
  { text: 'Cube', value: 'cube' },
  { text: 'Retournement', value: 'flip' },
  { text: 'Cartes empilées', value: 'cards' }
];

const directions = [
  { text: 'Horizontal', value: 'horizontal' },
  { text: 'Vertical', value: 'vertical' }
];

const paginationTypes = [
  { text: 'Points', value: 'bullets' },
  { text: 'Barre de progression', value: 'progressbar' },
  { text: 'Numéro de vue', value: 'fraction' }
];

const defaults: Settings = {
  slidesPerView: '1',
  spaceBetween: '0',
  centeredSlides: false,
  direction: 'horizontal',
  effect: 'slide',
  loop: false,
  autoplay: false,
  autoplayDelay: '3000',
  autoplayStopsOnTouch: true,
  allowTouchMove: true,
  freeMode: false,
  mousewheel: false,
  keyboard: false,
  navigation: false,
  pagination: false,
  paginationType: 'bullets',
  scrollbar: false,
  breakpoints: []
};

/**
 * La valeur d'un interrupteur, quelle que soit la façon dont Swiper l'accepte.
 *
 * `mousewheel: true` et `mousewheel: { enabled: true }` veulent dire la même chose ;
 * `freeMode: { enabled: false }` veut dire non, alors que la seule présence de la clé pourrait
 * laisser croire le contraire. C'est un piège classique de ces configurations, et il est traité
 * ici une fois pour toutes.
 */
const flagOf = (value: JsObject.JsValue | undefined, fallback: boolean): boolean => {
  if (!Type.isNonNullable(value)) {
    return fallback;
  }
  if (Type.isBoolean(value)) {
    return value;
  }
  if (Type.isObject(value) && !Type.isArray(value) && !JsObject.isRaw(value)) {
    const enabled = (value as JsObject.JsObjectValue).enabled;
    return Type.isBoolean(enabled) ? enabled : true;
  }
  return true;
};

/** Une valeur simple ramenée à du texte, pour un champ de saisie. */
const textOf = (value: JsObject.JsValue | undefined, fallback: string): string => {
  if (Type.isString(value)) {
    return value;
  }
  if (Type.isNumber(value) || Type.isBoolean(value)) {
    return String(value);
  }
  return fallback;
};

/** Le sous-objet d'une option, ou un objet vide. */
const objectOf = (value: JsObject.JsValue | undefined): JsObject.JsObjectValue =>
  Type.isObject(value) && !Type.isArray(value) && !JsObject.isRaw(value)
    ? value as JsObject.JsObjectValue
    : {};

const readBreakpoints = (config: JsObject.JsObjectValue): Breakpoint[] => {
  const raw = objectOf(config.breakpoints);
  return Arr.map(Obj.keys(raw), (key) => {
    const entry = objectOf(raw[key]);
    return {
      key,
      slidesPerView: textOf(entry.slidesPerView, ''),
      spaceBetween: textOf(entry.spaceBetween, '')
    };
  });
};

const fromConfig = (config: JsObject.JsObjectValue): Settings => {
  const autoplay = objectOf(config.autoplay);
  const pagination = objectOf(config.pagination);

  return {
    slidesPerView: textOf(config.slidesPerView, defaults.slidesPerView),
    spaceBetween: textOf(config.spaceBetween, defaults.spaceBetween),
    centeredSlides: flagOf(config.centeredSlides, defaults.centeredSlides),
    direction: textOf(config.direction, defaults.direction),
    effect: textOf(config.effect, defaults.effect),
    loop: flagOf(config.loop, defaults.loop),

    autoplay: Type.isNonNullable(config.autoplay) && flagOf(config.autoplay, defaults.autoplay),
    autoplayDelay: textOf(autoplay.delay, defaults.autoplayDelay),
    // `disableOnInteraction` dit « s'arrête quand on y touche » : le formulaire pose la question
    // dans ce sens-là, qui est celui dans lequel on se la pose.
    autoplayStopsOnTouch: flagOf(autoplay.disableOnInteraction, defaults.autoplayStopsOnTouch),
    allowTouchMove: flagOf(config.allowTouchMove, defaults.allowTouchMove),
    freeMode: flagOf(config.freeMode, defaults.freeMode),
    mousewheel: flagOf(config.mousewheel, defaults.mousewheel),
    keyboard: flagOf(config.keyboard, defaults.keyboard),

    navigation: Type.isNonNullable(config.navigation),
    pagination: Type.isNonNullable(config.pagination),
    paginationType: textOf(pagination.type, defaults.paginationType),
    scrollbar: Type.isNonNullable(config.scrollbar),

    breakpoints: readBreakpoints(config)
  };
};

/** Un nombre écrit dans un champ, ou le texte tel quel quand ce n'en est pas un (`auto`). */
const numberOrText = (value: string): JsObject.JsValue => {
  const trimmed = value.trim();
  return /^-?\d+(?:\.\d+)?$/.test(trimmed) ? parseFloat(trimmed) : trimmed;
};

/**
 * Réécrit la configuration à partir des réglages, en gardant tout ce que le formulaire ignore.
 *
 * Les sélecteurs des flèches et des points ne sont pas inventés : quand l'option existait déjà,
 * les siens sont conservés — une page réelle nomme souvent ses commandes
 * (`.swiper-reviews-button-next`). Quand elle n'existait pas, les classes standard de Swiper sont
 * posées, qui sont celles que le html du diaporama porte par défaut.
 */
const toConfig = (original: JsObject.JsObjectValue, settings: Settings): JsObject.JsObjectValue => {
  const out: Record<string, JsObject.JsValue> = { ...original };

  const put = (key: string, value: JsObject.JsValue, isDefault: boolean) => {
    if (isDefault) {
      delete out[key];
    } else {
      out[key] = value;
    }
  };

  put('slidesPerView', numberOrText(settings.slidesPerView),
    settings.slidesPerView.trim() === '' || settings.slidesPerView.trim() === defaults.slidesPerView);
  put('spaceBetween', numberOrText(settings.spaceBetween),
    settings.spaceBetween.trim() === '' || settings.spaceBetween.trim() === defaults.spaceBetween);
  put('centeredSlides', true, !settings.centeredSlides);
  put('direction', settings.direction, settings.direction === defaults.direction);
  put('effect', settings.effect, settings.effect === defaults.effect);
  put('loop', true, !settings.loop);

  if (settings.autoplay) {
    out.autoplay = {
      ...objectOf(original.autoplay),
      delay: numberOrText(settings.autoplayDelay === '' ? defaults.autoplayDelay : settings.autoplayDelay),
      disableOnInteraction: settings.autoplayStopsOnTouch
    };
  } else {
    delete out.autoplay;
  }

  put('allowTouchMove', false, settings.allowTouchMove);
  put('mousewheel', { enabled: true, releaseOnEdges: true }, !settings.mousewheel);
  put('keyboard', { enabled: true }, !settings.keyboard);

  if (settings.freeMode) {
    out.freeMode = { ...objectOf(original.freeMode), enabled: true };
  } else {
    delete out.freeMode;
  }

  const keepOrDefault = (
    key: string,
    wanted: boolean,
    fallback: JsObject.JsObjectValue,
    extra: JsObject.JsObjectValue = {}
  ) => {
    if (!wanted) {
      delete out[key];
      return;
    }
    const previous = objectOf(original[key]);
    out[key] = { ...(Obj.keys(previous).length > 0 ? previous : fallback), ...extra };
  };

  keepOrDefault('navigation', settings.navigation,
    { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' });
  keepOrDefault('pagination', settings.pagination,
    { el: '.swiper-pagination', clickable: true }, { type: settings.paginationType });
  keepOrDefault('scrollbar', settings.scrollbar,
    { el: '.swiper-scrollbar', draggable: true });

  const kept = Arr.filter(settings.breakpoints, (point) => point.key.trim() !== '');
  if (kept.length === 0) {
    delete out.breakpoints;
  } else {
    const previous = objectOf(original.breakpoints);
    const points: Record<string, JsObject.JsValue> = {};
    Arr.each(kept, (point) => {
      const entry: Record<string, JsObject.JsValue> = { ...objectOf(previous[point.key]) };
      if (point.slidesPerView.trim() === '') {
        delete entry.slidesPerView;
      } else {
        entry.slidesPerView = numberOrText(point.slidesPerView);
      }
      if (point.spaceBetween.trim() === '') {
        delete entry.spaceBetween;
      } else {
        entry.spaceBetween = numberOrText(point.spaceBetween);
      }
      points[point.key.trim()] = entry;
    });
    out.breakpoints = points;
  }

  return out;
};

export {
  effects,
  directions,
  paginationTypes,
  defaults,
  flagOf,
  textOf,
  objectOf,
  readBreakpoints,
  fromConfig,
  numberOrText,
  toConfig
};
