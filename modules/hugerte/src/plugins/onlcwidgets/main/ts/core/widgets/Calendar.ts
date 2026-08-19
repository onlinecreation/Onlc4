import { Arr, Fun } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

import { WidgetConfig, WidgetDefinition } from '../../api/Types';
import * as Embed from '../Embed';
import * as Html from '../Html';
import * as ListEditor from '../ListEditor';
import * as Preview from '../Preview';
import * as Common from './Common';

/**
 * Deux façons de montrer un agenda.
 *
 * `calendar` dessine le mois demandé sous forme de grille hebdomadaire, avec les rendez-vous
 * saisis dans le dialogue. Tout est en html statique : la page publiée n'exécute aucun script,
 * ne dépend d'aucun service, et le calendrier reste lisible même sans javascript.
 *
 * `calendarembed` intègre un agenda partagé existant (Google Agenda ou autre) dans un cadre.
 */

const monthNames = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
];

/** Jours de la semaine, du lundi au dimanche, en version courte. */
const dayNames = [ 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.' ];

export interface CalendarEvent {
  readonly day: number;
  readonly time: string;
  readonly label: string;
}

const monthField = /^(\d{4})-(\d{2})$/;

/** Mois affiché, sous la forme `[année, mois de 0 à 11]`. */
const monthOf = (value: string | undefined): [number, number] => {
  const match = monthField.exec(String(value ?? '').trim());
  if (match === null) {
    const now = new Date();
    return [ now.getFullYear(), now.getMonth() ];
  }
  const year = parseInt(match[1], 10);
  const month = Math.max(1, Math.min(12, parseInt(match[2], 10))) - 1;
  return [ year, month ];
};

const readEvents = (value: string | undefined, year: number, month: number): CalendarEvent[] => {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Arr.bind(ListEditor.parse(String(value ?? '')), (row) => {
    const day = Math.round(Common.number(row.day, 0));
    const label = String(row.label ?? '').trim();
    if (day < 1 || day > daysInMonth || label === '') {
      return [];
    }
    return [{ day, time: String(row.time ?? '').trim(), label }];
  });
};

/** Numéro de la colonne d'un jour, selon le premier jour de semaine choisi. */
const columnOf = (date: Date, weekStart: string): number => {
  const day = date.getDay(); // 0 = dimanche
  return weekStart === 'sunday' ? day : (day + 6) % 7;
};

const orderedDayNames = (weekStart: string): string[] =>
  weekStart === 'sunday' ? [ dayNames[6] ].concat(dayNames.slice(0, 6)) : dayNames;

const eventsMarkup = (events: CalendarEvent[], accent: string): string =>
  Arr.map(events, (event) =>
    `<span class="onlc-cal__event">` +
    `<span class="onlc-cal__dot"${Html.style({ 'background-color': accent })}></span>` +
    (event.time === '' ? '' : `<span class="onlc-cal__time">${Html.escape(event.time)}</span>`) +
    `<span class="onlc-cal__label">${Html.escape(event.label)}</span></span>`).join('');

const renderGrid = (c: WidgetConfig): string => {
  const accent = String(c.accent ?? '').trim() === '' ? '#006ce7' : String(c.accent).trim();
  const [ year, month ] = monthOf(c.month);
  const events = readEvents(c.events, year, month);
  const weekStart = c.weekStart === 'sunday' ? 'sunday' : 'monday';
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const lead = columnOf(first, weekStart);
  const cellCount = Math.ceil((lead + daysInMonth) / 7) * 7;
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  const heads = Arr.map(orderedDayNames(weekStart), (name) =>
    `<span class="onlc-cal__weekday">${Html.escape(name)}</span>`).join('');

  const cells = Arr.map(Arr.range(cellCount, Fun.identity), (index) => {
    const day = index - lead + 1;
    if (day < 1 || day > daysInMonth) {
      return `<span class="onlc-cal__day onlc-cal__day--empty"></span>`;
    }
    const ofDay = Arr.filter(events, (event) => event.day === day);
    const isToday = isCurrentMonth && today.getDate() === day;
    const number = isToday
      ? `<span class="onlc-cal__number onlc-cal__number--today"${Html.style({ 'background-color': accent })}>${day}</span>`
      : `<span class="onlc-cal__number">${day}</span>`;
    return `<span class="onlc-cal__day${ofDay.length > 0 ? ' onlc-cal__day--busy' : ''}">` +
      `${number}${eventsMarkup(ofDay, accent)}</span>`;
  }).join('');

  const heading = c.title.trim() === ''
    ? `${monthNames[month]} ${year}`
    : c.title.trim();

  return `<div class="onlc-cal">` +
    `<div class="onlc-cal__header"><span class="onlc-cal__month">${Html.escape(heading)}</span>` +
    `<span class="onlc-cal__year">${Html.escape(`${monthNames[month]} ${year}`)}</span></div>` +
    `<div class="onlc-cal__weekdays">${heads}</div>` +
    `<div class="onlc-cal__grid">${cells}</div></div>`;
};

const calendar: WidgetDefinition = {
  id: 'calendar',
  label: 'Calendrier du mois',
  description: 'La grille d’un mois, avec vos rendez-vous inscrits jour par jour',
  category: 'Contenu',
  icon: 'insert-time',
  fields: [
    { name: 'title', label: 'Titre affiché', type: 'text', placeholder: 'Les rendez-vous d’avril' },
    { name: 'month', label: 'Mois affiché', type: 'month', half: true,
      help: 'Au format AAAA-MM, par exemple 2026-04. Laissez vide pour le mois en cours.' },
    { name: 'weekStart', label: 'La semaine commence le', type: 'select', half: true, items: [
      { text: 'Lundi', value: 'monday' },
      { text: 'Dimanche', value: 'sunday' }
    ] },
    { name: 'accent', label: 'Couleur d’accentuation', type: 'color', half: true },
    { name: 'events', label: 'Rendez-vous du mois', type: 'events', tab: 'Rendez-vous' }
  ],
  defaults: {
    title: '',
    month: '',
    weekStart: 'monday',
    accent: '#006ce7',
    events: '[]'
  },
  render: renderGrid
};

/* Agenda partagé ----------------------------------------------------------- */

const calendarEmbed: WidgetDefinition = {
  id: 'calendarembed',
  canonical: true,
  label: 'Agenda partagé',
  description: 'Intègre un agenda public existant (Google Agenda, ICS…)',
  category: 'Médias',
  icon: 'insert-time',
  fields: [
    { name: 'url', label: 'Adresse de l’agenda', type: 'url' },
    { name: 'mode', label: 'Affichage', type: 'select', half: true, items: [
      { text: 'Mois', value: 'month' },
      { text: 'Semaine', value: 'week' },
      { text: 'Planning', value: 'agenda' }
    ] },
    { name: 'height', label: 'Hauteur', type: 'text', half: true, placeholder: '600px' },
    { name: 'title', label: 'Titre (accessibilité)', type: 'text' }
  ],
  defaults: { url: '', mode: 'month', height: '600px', title: 'Agenda' },
  render: (c) => Embed.calendarUrl(c.url, c.mode).fold(
    () => c.url.trim() === ''
      ? Common.missing('Indiquez l’adresse de l’agenda')
      : `<p class="onlc-widget__inner"><a${Common.linkAttributes(c.url, '_blank', 'noopener')}>${Html.escape(c.title || 'Ouvrir l’agenda')}</a></p>`,
    (src) =>
      `<div class="onlc-embed onlc-embed--fixed">` +
      `<iframe class="onlc-embed__frame"${Html.attr('src', src)}${Html.attr('title', c.title)}` +
      `${Html.style({ height: Html.withUnit(c.height), width: '100%' })} frameborder="0" loading="lazy"></iframe></div>`
  ),
  renderEditor: (c) => c.url.trim() === ''
    ? Common.missing('Indiquez l’adresse de l’agenda')
    : Preview.card({
      kind: 'Agenda partagé',
      title: c.title.trim() === '' ? c.url : c.title,
      detail: c.url,
      height: Html.withUnit(c.height)
    })
};

const all = (_editor: Editor): WidgetDefinition[] => [ calendar, calendarEmbed ];

export {
  monthNames,
  dayNames,
  monthOf,
  readEvents,
  columnOf,
  orderedDayNames,
  renderGrid,
  calendar,
  calendarEmbed,
  all
};
