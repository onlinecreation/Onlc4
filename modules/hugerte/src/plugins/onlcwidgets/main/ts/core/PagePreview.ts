import { Arr, Fun, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import * as Http from 'hugerte/plugins/onlcshared/Http';

import * as Options from '../api/Options';
import { PreviewValue } from '../api/Types';
import * as Multilang from './Multilang';
import * as FilterContent from './shortcodes/FilterContent';
import * as Parse from './shortcodes/Parse';

/**
 * Aperçu de la page telle que la verra un visiteur.
 *
 * L'éditeur montre le contenu seul, sur fond blanc : ni l'en-tête du site, ni son menu, ni ses
 * polices, ni sa mise en page. On écrit donc à l'aveugle sur tout ce qui l'entoure — un titre
 * qui passe très bien dans l'éditeur peut se retrouver illisible sur le fond du gabarit.
 *
 * L'aperçu prend le **gabarit du site**, servi par une api, et y remplace :
 *
 * * `[ContenuPage]` par le contenu réel, dans sa forme publiée ;
 * * tous les autres codes courts par les valeurs données en configuration
 *   (`onlc_preview_values`) — nom du site, menu, logo, copyright…
 *
 * Le résultat est affiché dans un cadre **sans accès à l'origine du back-office** : les scripts
 * du gabarit s'exécutent, sinon l'aperçu ne montrerait rien de la vraie page, mais ils ne
 * peuvent lire ni les cookies de session ni le document qui les contient.
 */

/** Code qui reçoit le contenu de la page. Le reste du gabarit est décor. */
const contentPlaceholder = 'ContenuPage';

/**
 * Le gabarit, tel que le site l'utilise.
 *
 * Deux sources possibles, dans cet ordre : la chaîne donnée en configuration, puis l'adresse
 * d'une api. Sans l'une ni l'autre, l'aperçu se rabat sur un gabarit minimal — mieux vaut voir
 * son contenu sur une page nue que ne rien voir du tout.
 */
const fallbackTemplate =
  '<!doctype html><html lang="fr"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width, initial-scale=1">' +
  '<title>[NomPage]</title></head><body>[ContenuPage]</body></html>';

const loadTemplate = (editor: Editor): Promise<string> => {
  const inline = Options.getPreviewTemplate(editor);
  if (Type.isString(inline) && inline.trim() !== '') {
    return Promise.resolve(inline);
  }

  const url = Options.getPreviewTemplateUrl(editor);
  if (!Type.isString(url) || url.trim() === '') {
    return Promise.resolve(fallbackTemplate);
  }

  return Http.request<{ template?: string } | string>({ url })
    .then((response) => {
      const template = Type.isString(response) ? response : response.template;
      return Type.isString(template) && template.trim() !== '' ? template : fallbackTemplate;
    });
};

/**
 * Valeur d'un code court dans l'aperçu.
 *
 * Un code sans valeur configurée disparaît plutôt que de s'afficher entre crochets : le but est
 * de montrer la page, pas de rappeler au rédacteur ce qui reste à régler côté site.
 */
const valueOf = (values: Record<string, PreviewValue>, parsed: Parse.ParsedShortcode): string => {
  const entry = Arr.find(Object.keys(values), (key) => key.toLowerCase() === parsed.name.toLowerCase());

  return entry.fold(Fun.constant(''), (key) => {
    const value = values[key];
    if (Type.isFunction(value)) {
      // Les attributs du code sont passés à la fonction : un menu peut ainsi rendre les classes
      // css demandées, exactement comme le ferait le gabarit.
      return String(value(parsed.attributes, parsed.name) ?? '');
    }
    return Type.isString(value) ? value : '';
  });
};

/**
 * Remplace les codes courts d'un fragment de **texte**, hors balises.
 *
 * Le balayage se fait de la fin vers le début : les positions relevées par `findAll` restent
 * ainsi valables pendant les remplacements, quelle que soit la longueur du texte inséré.
 *
 * `content` est ce qui prend la place de `[ContenuPage]`. Il est passé tel quel : c'est du html
 * déjà résolu, et le repasser au remplacement abîmerait des crochets légitimes du texte.
 */
const resolveText = (text: string, values: Record<string, PreviewValue>, content: string): string =>
  Arr.foldr(Parse.findAll(text), (result: string, parsed) => {
    const replacement = parsed.name.toLowerCase() === contentPlaceholder.toLowerCase()
      ? content
      : valueOf(values, parsed);
    return result.slice(0, parsed.start) + replacement + result.slice(parsed.end);
  }, text);

/**
 * Remplace les codes courts du **contenu**, hors balises.
 *
 * Le balayage saute l'intérieur des balises : un `alt="[2] la suite"` ou un attribut de données
 * contenant des crochets n'est pas un code court, et le confondre casserait le markup autour.
 * C'est le même découpage que celui qui transforme les codes en blocs à l'ouverture.
 *
 * Cette prudence ne vaut que pour le contenu. Un **gabarit** place au contraire ses codes dans
 * des attributs à dessein — `<meta content="[TitreSite]">` — et y sauter les balises reviendrait
 * à ne rien remplacer du tout.
 */
const resolveContent = (html: string, values: Record<string, PreviewValue>): string =>
  Arr.map(FilterContent.segments(html), (part) =>
    part.text ? resolveText(part.value, values, '') : part.value).join('');

/**
 * Gabarit et contenu, tous deux résolus.
 *
 * Les codes courts ne sont pas seulement dans le gabarit : la page en contient aussi — un
 * formulaire de contact, des boutons de partage. Le contenu est donc résolu **d'abord**, seul,
 * puis posé dans le gabarit. Sans cette première passe, l'aperçu montrait `[Contact email="…"]`
 * en toutes lettres au milieu de la page, ce qu'aucun visiteur ne verra jamais.
 */
const fill = (template: string, content: string, values: Record<string, PreviewValue>): string =>
  resolveText(template, values, resolveContent(content, values));

/**
 * Gabarit rempli, prêt à être affiché.
 *
 * La passe polyglotte vient **en dernier**, sur la page assemblée, exactement comme le fait le
 * moteur du site : un `[LG]` de l'en-tête du gabarit et un `<multilang>` du contenu sont alors
 * traités du même geste. Une page qui porte trois langues n'en montre qu'une au visiteur, et un
 * aperçu qui les empilerait ne montrerait aucune page réelle. Sans le plugin polyglotte, la
 * page part telle quelle.
 */
const render = (editor: Editor, language?: string): Promise<string> =>
  loadTemplate(editor).then((template) =>
    Multilang.resolvePage(
      editor,
      fill(template, editor.getContent(), Options.getPreviewValues(editor)),
      language
    ));

export {
  contentPlaceholder,
  fallbackTemplate,
  loadTemplate,
  valueOf,
  resolveText,
  resolveContent,
  fill,
  render
};
