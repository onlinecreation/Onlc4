import { WidgetDefinition } from '../../api/Types';
import * as Excerpt from '../Excerpt';
import * as Html from '../Html';

/**
 * Blocs avancés : ceux qui contiennent du code fourni par un service tiers.
 *
 * Le widget html est un cas particulier. Ce que le rédacteur voit dans l'éditeur est un jeton
 * — le nom du widget et les trois premières lignes de son code — pour qu'un code d'intégration
 * ne casse ni la mise en page ni la navigation au clavier. Ce que la page publiée reçoit est le
 * code lui-même, tel qu'il a été collé : c'est `FilterContent` qui fait la substitution à
 * l'enregistrement.
 */

const html: WidgetDefinition = {
  id: 'html',
  canonical: true,
  label: 'Widget HTML',
  description: 'Colle un code d’intégration fourni par un service tiers',
  category: 'Avancé',
  icon: 'sourcecode',
  fields: [
    { name: 'code', label: 'Code HTML', type: 'code', language: 'html' },
    { name: 'title', label: 'Nom du widget', type: 'text', placeholder: 'Formulaire de réservation' }
  ],
  defaults: { code: '', title: 'Widget HTML' },
  render: (c) => c.code,
  renderEditor: (c) => {
    const lines = Excerpt.lines(c.code);
    const body = lines.length === 0
      ? 'Aucun code pour le moment.'
      : lines.join('\n');

    return `<div class="onlc-widget__static onlc-widget__html" contenteditable="false">` +
      `<span class="onlc-widget__html-name">${Html.escape(c.title === '' ? 'Widget HTML' : c.title)}</span>` +
      `<pre class="onlc-widget__html-code">${Html.escape(body)}</pre>` +
      `<span class="onlc-widget__html-hint">Le code ci-dessus est affiché tel quel dans l’éditeur ; ` +
      `il est publié sous sa forme active sur la page.</span></div>`;
  }
};

const all: WidgetDefinition[] = [ html ];

export {
  html,
  all
};
