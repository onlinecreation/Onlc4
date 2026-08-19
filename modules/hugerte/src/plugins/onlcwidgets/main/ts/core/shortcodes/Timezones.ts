import { Arr, Type } from '@ephox/katamari';

import { ShortcodeFieldItem } from '../../api/ShortcodeTypes';

/**
 * Fuseaux horaires, au format IANA (`Europe/Paris`).
 *
 * La liste complète est demandée au navigateur — `Intl.supportedValuesOf('timeZone')` en donne
 * plus de quatre cents, tenus à jour par le système. Les navigateurs qui ne connaissent pas
 * encore cette fonction reçoivent la liste de secours ci-dessous, qui couvre les fuseaux les
 * plus utilisés. Dans les deux cas, le fuseau du poste est proposé en tête.
 */

const fallback = [
  'Africa/Abidjan', 'Africa/Algiers', 'Africa/Cairo', 'Africa/Casablanca', 'Africa/Johannesburg',
  'Africa/Lagos', 'Africa/Nairobi', 'Africa/Tunis',
  'America/Anchorage', 'America/Argentina/Buenos_Aires', 'America/Bogota', 'America/Chicago',
  'America/Denver', 'America/Guadeloupe', 'America/Halifax', 'America/Lima', 'America/Los_Angeles',
  'America/Martinique', 'America/Mexico_City', 'America/Montreal', 'America/New_York',
  'America/Phoenix', 'America/Santiago', 'America/Sao_Paulo', 'America/Toronto', 'America/Vancouver',
  'Asia/Bangkok', 'Asia/Beirut', 'Asia/Dubai', 'Asia/Hong_Kong', 'Asia/Jakarta', 'Asia/Jerusalem',
  'Asia/Karachi', 'Asia/Kolkata', 'Asia/Riyadh', 'Asia/Seoul', 'Asia/Shanghai', 'Asia/Singapore',
  'Asia/Taipei', 'Asia/Tehran', 'Asia/Tokyo',
  'Atlantic/Azores', 'Atlantic/Canary', 'Atlantic/Reykjavik',
  'Australia/Adelaide', 'Australia/Brisbane', 'Australia/Melbourne', 'Australia/Perth', 'Australia/Sydney',
  'Europe/Amsterdam', 'Europe/Athens', 'Europe/Berlin', 'Europe/Brussels', 'Europe/Bucharest',
  'Europe/Budapest', 'Europe/Copenhagen', 'Europe/Dublin', 'Europe/Helsinki', 'Europe/Istanbul',
  'Europe/Kyiv', 'Europe/Lisbon', 'Europe/London', 'Europe/Luxembourg', 'Europe/Madrid',
  'Europe/Moscow', 'Europe/Oslo', 'Europe/Paris', 'Europe/Prague', 'Europe/Rome', 'Europe/Stockholm',
  'Europe/Vienna', 'Europe/Warsaw', 'Europe/Zurich',
  'Indian/Reunion',
  'Pacific/Auckland', 'Pacific/Honolulu', 'Pacific/Noumea', 'Pacific/Tahiti',
  'UTC'
];

const supported = (): string[] => {
  const intl = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };
  if (Type.isFunction(intl.supportedValuesOf)) {
    try {
      const values = intl.supportedValuesOf('timeZone');
      if (Type.isArray(values) && values.length > 0) {
        return values;
      }
    } catch (_err) {
      // Le navigateur connaît la fonction mais pas la clé : on retombe sur la liste de secours.
    }
  }
  return fallback;
};

const current = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris';
  } catch (_err) {
    return 'Europe/Paris';
  }
};

/** Intitulé lisible : `Europe/Paris` devient « Europe — Paris ». */
const label = (zone: string): string => zone.replace(/_/g, ' ').replace('/', ' — ');

const items = (): ShortcodeFieldItem[] => {
  const here = current();
  const all = Arr.filter(supported(), (zone) => zone !== here);
  return [{ text: `${label(here)} (fuseau de cet ordinateur)`, value: here }]
    .concat(Arr.map(all, (zone) => ({ text: label(zone), value: zone })));
};

export {
  fallback,
  supported,
  current,
  label,
  items
};
