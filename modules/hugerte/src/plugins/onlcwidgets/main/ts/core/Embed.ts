import { Optional } from '@ephox/katamari';

/**
 * Turns the url a user pastes into the url an `<iframe>` can display, for the video, map and
 * calendar widgets.
 */

const youtube = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{6,})/i;
const vimeo = /vimeo\.com\/(?:video\/)?(\d+)/i;
const dailymotion = /dailymotion\.com\/(?:video\/|embed\/video\/)([\w]+)|dai\.ly\/([\w]+)/i;

export interface VideoOptions {
  readonly autoplay: boolean;
  readonly loop: boolean;
  readonly muted: boolean;
}

const query = (options: VideoOptions, extra: Record<string, string> = {}): string => {
  const params: string[] = [];
  if (options.autoplay) {
    params.push('autoplay=1');
  }
  if (options.muted || options.autoplay) {
    params.push('muted=1');
  }
  if (options.loop) {
    params.push('loop=1');
  }
  Object.keys(extra).forEach((key) => params.push(`${key}=${extra[key]}`));
  return params.length === 0 ? '' : `?${params.join('&')}`;
};

/**
 * Resolves the embed url of a video. Unknown providers are used as is, which covers the
 * "or another one" case: any url that can be framed works.
 */
const videoUrl = (url: string, options: VideoOptions): Optional<string> => {
  const value = url.trim();
  if (value === '') {
    return Optional.none();
  }

  const yt = youtube.exec(value);
  if (yt !== null) {
    return Optional.some(`https://www.youtube.com/embed/${yt[1]}${query(options, options.loop ? { playlist: yt[1] } : {})}`);
  }

  const vm = vimeo.exec(value);
  if (vm !== null) {
    return Optional.some(`https://player.vimeo.com/video/${vm[1]}${query(options)}`);
  }

  const dm = dailymotion.exec(value);
  if (dm !== null) {
    return Optional.some(`https://www.dailymotion.com/embed/video/${dm[1] ?? dm[2]}${query(options)}`);
  }

  return Optional.some(value);
};

const isCoordinates = (value: string): boolean => /^\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*$/.test(value);

/**
 * Vignette d'une vidéo, quand le service en publie une à une adresse prévisible. Elle sert
 * uniquement d'aperçu dans l'éditeur : aucune requête n'est faite vers l'api du service.
 */
const videoPoster = (url: string): Optional<string> => {
  const yt = youtube.exec(url.trim());
  return yt === null ? Optional.none() : Optional.some(`https://i.ytimg.com/vi/${yt[1]}/hqdefault.jpg`);
};

/**
 * Adresse d'intégration d'une carte OpenStreetMap, à partir de coordonnées et d'un zoom.
 * Aucun autre fournisseur n'est proposé : la cartographie du produit est OpenStreetMap.
 */
const mapUrl = (latitude: number, longitude: number, zoom: number): string => {
  const level = Math.max(1, Math.min(19, Math.round(zoom)));
  const delta = Math.max(0.0008, 0.35 / Math.pow(2, level - 10));
  const bbox = [ longitude - delta, latitude - delta, longitude + delta, latitude + delta ].join(',');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude},${longitude}`;
};

/**
 * Resolves the embed url of a calendar. Google Calendar public urls are rewritten, any other
 * url is framed as is.
 */
const calendarUrl = (url: string, mode: string): Optional<string> => {
  const value = url.trim();
  if (value === '') {
    return Optional.none();
  }

  const googleId = /calendar\.google\.com\/calendar(?:\/u\/\d+)?\/(?:embed\?src=|r\?cid=)([^&]+)/i.exec(value);
  const separator = value.indexOf('?') === -1 ? '?' : '&';

  if (googleId !== null) {
    return Optional.some(`https://calendar.google.com/calendar/embed?src=${googleId[1]}&mode=${mode.toUpperCase()}`);
  }

  if (/\.ics(?:$|\?)/i.test(value)) {
    // An ics file cannot be framed, it is linked instead by the widget
    return Optional.none();
  }

  return Optional.some(mode === '' ? value : `${value}${separator}mode=${mode.toUpperCase()}`);
};

export {
  videoUrl,
  videoPoster,
  mapUrl,
  calendarUrl,
  isCoordinates
};
