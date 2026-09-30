import { Arr, Fun, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import * as Http from 'hugerte/plugins/onlcshared/Http';
import * as RawElements from 'hugerte/plugins/onlcshared/text/RawElements';

import * as Options from '../api/Options';
import { PreviewValue } from '../api/Types';
import * as Html from './Html';
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

/**
 * Ajoute à la page les styles qui lui manquent : les feuilles du site et des plugins, puis les
 * règles que les plugins écrivent à la volée.
 *
 * Tout va **à la fin du `<head>`**, après ce que le gabarit y a mis : ce sont les mêmes styles que
 * la zone d'écriture charge, et l'aperçu doit ressembler à ce qu'on vient d'écrire. Un gabarit
 * sans `</head>` — il en existe — les reçoit en tête de page, ce qui vaut mieux que pas du tout.
 *
 * Les adresses passent par `Html.attr`, qui les échappe et refuse les schémas exécutables : elles
 * viennent de la configuration, mais elles finissent dans du html écrit à la main. Les règles,
 * elles, sont écrites par les plugins eux-mêmes, mais entrent dans un `<style>` : une accolade
 * fermante suivie de `</style>` y rouvrirait la page au html, la séquence est donc neutralisée.
 */
/**
 * Donne à la page un point de départ pour ses adresses relatives.
 *
 * Le cadre reçoit son contenu par `srcdoc`, dans une origine opaque : la page n'a plus d'adresse
 * propre, et une image en `/media/photo.jpg`, un pdf, une police appelée par le gabarit n'ont plus
 * rien à quoi se rapporter. Elles ne se chargent tout simplement pas, sans le moindre message.
 *
 * Une balise `<base>` posée en tête de `<head>` rend leur point de départ à toutes en une fois :
 * celui du document où l'on écrit, c'est-à-dire le site lui-même. Elle doit venir **avant** tout
 * ce qui porte une adresse, d'où sa place tout en haut.
 *
 * Un gabarit qui en déclare déjà une garde la sienne : c'est un choix du site, pas un oubli.
 */
const withBase = (page: string, url: string): string => {
  if (url === '' || /<base\b/i.test(page)) {
    return page;
  }

  const tag = `<base${Html.attr('href', url)}>`;
  const opening = /<head\b[^>]*>/i.exec(page);
  return opening === null ? tag + page : page.slice(0, opening.index + opening[0].length) + tag + page.slice(opening.index + opening[0].length);
};

const withStyles = (page: string, urls: string[], rules: string[] = []): string => {
  const links = Arr.map(urls, (url) => `<link rel="stylesheet"${Html.attr('href', url)}>`).join('');
  const inline = rules.length === 0
    ? ''
    : `<style>${Arr.map(rules, (rule) => rule.replace(/<\//g, '<\\/')).join('')}<\/style>`;
  const styles = links + inline;

  if (styles === '') {
    return page;
  }

  const closing = /<\/head\s*>/i.exec(page);
  return closing === null ? styles + page : page.slice(0, closing.index) + styles + page.slice(closing.index);
};

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
 * Remplace les codes courts d'un **gabarit**, en sautant le corps des `script` et des `style`.
 *
 * Un gabarit place ses codes dans des attributs à dessein — `<meta content="[TitreSite]">` — et y
 * sauter les balises, comme on le fait pour le contenu, reviendrait à ne rien remplacer. Mais un
 * gabarit porte aussi du javascript, et là un crochet n'est jamais un code court.
 *
 * Le gabarit d'un site réel commence par le mouchard de Google Tag Manager :
 *
 * ```js
 * (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start': …
 * ```
 *
 * `[l]` y était pris pour un code court sans valeur configurée, donc effacé : le script devenait
 * `w=w||[];w.push(…)`, et le mouchard tombait en erreur dans l'aperçu. Le même piège attend
 * n'importe quel `tableau[i]` d'un gabarit.
 */
const resolveTemplate = (template: string, values: Record<string, PreviewValue>, content: string): string => {
  const raw = RawElements.spansOf(template);
  if (raw.length === 0) {
    return resolveText(template, values, content);
  }

  // Les intervalles sont dans l'ordre : on recompose en alternant texte résolu et corps intacts.
  let out = '';
  let cursor = 0;
  Arr.each(raw, (span) => {
    out += resolveText(template.slice(cursor, span.start), values, content);
    out += template.slice(span.start, span.end);
    cursor = span.end;
  });
  return out + resolveText(template.slice(cursor), values, content);
};

/**
 * Gabarit et contenu, tous deux résolus.
 *
 * Les codes courts ne sont pas seulement dans le gabarit : la page en contient aussi — un
 * formulaire de contact, des boutons de partage. Le contenu est donc résolu **d'abord**, seul,
 * puis posé dans le gabarit. Sans cette première passe, l'aperçu montrait `[Contact email="…"]`
 * en toutes lettres au milieu de la page, ce qu'aucun visiteur ne verra jamais.
 */
const fill = (template: string, content: string, values: Record<string, PreviewValue>): string =>
  resolveTemplate(template, values, resolveContent(content, values));

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
    withBase(
      withStyles(
        Multilang.resolvePage(
          editor,
          fill(template, editor.getContent(), Options.getPreviewValues(editor)),
          language
        ),
        Options.getPreviewCss(editor),
        Options.getPreviewRules(editor)
      ),
      editor.documentBaseURI.getURI()
    ));

export {
  contentPlaceholder,
  fallbackTemplate,
  loadTemplate,
  resolveTemplate,
  withBase,
  withStyles,
  valueOf,
  resolveText,
  resolveContent,
  fill,
  render
};
