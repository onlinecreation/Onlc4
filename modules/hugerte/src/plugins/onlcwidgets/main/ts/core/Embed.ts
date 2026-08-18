import { Optional, Type } from '@ephox/katamari';

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
 * Resolves the embed url of a map. OpenStreetMap needs coordinates, so a postal address falls
 * back to the key free Google Maps embed.
 */
const mapUrl = (place: string, zoom: string, provider: string, apiKey: string): Optional<string> => {
  const value = place.trim();
  if (value === '') {
    return Optional.none();
  }

  const level = /^\d+$/.test(zoom.trim()) ? zoom.trim() : '14';

  if (provider === 'google' && Type.isString(apiKey) && apiKey !== '') {
    return Optional.some(`https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(value)}&zoom=${level}`);
  }

  if (provider === 'osm' && isCoordinates(value)) {
    const [ lat, lon ] = value.split(',').map((part) => parseFloat(part));
    const delta = Math.max(0.001, 0.3 / Math.pow(2, parseInt(level, 10) - 10));
    const bbox = [ lon - delta, lat - delta, lon + delta, lat + delta ].join(',');
    return Optional.some(`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`);
  }

  return Optional.some(`https://maps.google.com/maps?q=${encodeURIComponent(value)}&z=${level}&output=embed`);
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
  mapUrl,
  calendarUrl,
  isCoordinates
};
