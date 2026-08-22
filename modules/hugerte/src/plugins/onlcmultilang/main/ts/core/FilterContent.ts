import { Arr, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import AstNode from 'hugerte/core/api/html/Node';
import * as RawElements from 'hugerte/plugins/onlcshared/text/RawElements';

import { Syntax } from '../api/Types';
import * as Dom from './Dom';
import * as Parse from './Parse';

/**
 * Passage d'une écriture à l'autre.
 *
 * * **à l'ouverture** : `[LG="fr"]…[/LG]` et `<multilang lang="fr">…</multilang>` deviennent des
 *   éléments visibles, dont le contenu reste modifiable ;
 * * **à l'enregistrement** : chaque élément redevient exactement les deux marqueurs qu'il
 *   représente, dans l'écriture d'où il vient.
 *
 * La conversion d'entrée travaille sur la chaîne html, avant l'analyse : un `[LG]` n'est pas un
 * élément, aucun filtre de nœud ne pourrait le voir. Celle de sortie travaille sur l'arbre, où
 * l'élément, lui, existe bel et bien.
 *
 * ## Ce qui n'est pas converti
 *
 * Une section dont les marqueurs ne se referment pas au même niveau — `[LG]` dans un paragraphe,
 * `[/LG]` dans le suivant — ne peut pas devenir un élément. Elle reste en toutes lettres. C'est
 * moche à l'écran, mais le contenu ressort intact, et la page publiée se comporte comme avant.
 *
 * Pour que ce soit vrai aussi de la forme `<multilang>`, la balise est déclarée valide auprès du
 * schéma : sans cela l'éditeur, ne la connaissant pas, la retirerait au passage.
 */

/**
 * Écriture réellement employée pour une section.
 *
 * `[LG]` est gardé tant qu'il peut dire ce que la section contient. Un crochet ouvrant à
 * l'intérieur — un code court, le plus souvent — le rend incapable de le faire : le moteur du
 * site s'arrêterait au premier crochet et publierait les marqueurs. La section bascule alors en
 * `<multilang>`, qui, lui, accepte tout.
 */
const syntaxFor = (syntax: Syntax, bracket: boolean): Syntax =>
  syntax === 'lg' && !bracket ? 'lg' : 'multilang';

/** Repérage rapide : rien à faire sur une page qui ne porte aucun marqueur. */
const marks = /\[LG=|<multilang /i;

/**
 * Les sections d'une chaîne html, moins celles qui ne sont pas du **texte de contenu**.
 *
 * Deux endroits où un marqueur reste un marqueur, et ne doit surtout pas devenir un élément :
 *
 * * **le corps d'un `script` ou d'un `style`.** Un `[LG=fr]…[/LG]` écrit dans du javascript, ou
 *   dans la valeur d'une fiche de microdonnées, est une donnée que le moteur du site résoudra à
 *   la publication. L'y transformer poserait des guillemets au milieu du code ou du json ;
 * * **l'intérieur d'une balise.** Une page réelle porte
 *   `class="screen6 [LG=fr]label-fr[/LG][LG=en]label-en[/LG]"` — le moteur choisit la classe
 *   selon la langue, comme il choisirait un morceau de texte. Y poser un élément revenait à
 *   écrire un `span` au milieu d'une balise ouvrante, qui n'en était plus une : la section
 *   entière du contenu s'en trouvait disloquée.
 *
 * Dans les deux cas le marqueur traverse l'éditeur intact et ressort tel quel, ce qui est
 * exactement ce que le site attend.
 */
const editableSections = (html: string): Parse.Section[] => {
  const bodies = RawElements.spansOf(html);
  const tags = RawElements.tagSpansOf(html);
  if (bodies.length === 0 && tags.length === 0) {
    return Parse.sections(html);
  }
  return Arr.filter(Parse.sections(html), (section) =>
    !RawElements.overlaps(bodies, section.start, section.end)
    // `strictlyInside` et non `overlaps` : une balise `<multilang>` **est** un marqueur, et sa
    // position de départ est celle du chevron. L'exclure reviendrait à ne plus jamais reconnaître
    // cette écriture-là.
    && !RawElements.strictlyInside(tags, section.start));
};

const rewriteHtml = (editor: Editor, html: string): string =>
  Arr.foldr(editableSections(html), (result: string, section) => {
    if (!Parse.isBalanced(section.inner)) {
      return result;
    }
    const element = Dom.toHtml(editor, section.code, section.syntax, section.inner, Parse.hasBlock(section.inner));
    return result.slice(0, section.start) + element + result.slice(section.end);
  }, html);

/**
 * Un crochet ouvrant se cache-t-il quelque part sous ce nœud ?
 *
 * Le texte est la piste évidente. Les attributs en sont une autre : un code court posé dans la
 * page est devenu une carte, et son texte d'origine voyage encodé dans un attribut — `%5B`. Une
 * section qui en contient un ne peut donc plus s'écrire `[LG]`, même si son texte visible est
 * parfaitement sage.
 *
 * Se tromper ici ne coûte rien : croire à tort qu'il y a un crochet fait écrire `<multilang>`,
 * qui accepte tout. C'est l'inverse qui casserait la page.
 */
const hasBracket = (node: AstNode): boolean => {
  if (node.type === 3) {
    return (node.value ?? '').indexOf('[') !== -1;
  }

  const attributes = node.attributes ?? [];
  const inAttribute = Arr.exists(attributes, (attribute) =>
    attribute.value.indexOf('[') !== -1 || attribute.value.indexOf('%5B') !== -1);

  if (inAttribute) {
    return true;
  }

  for (let child = node.firstChild; Type.isNonNullable(child); child = child.next) {
    if (hasBracket(child)) {
      return true;
    }
  }

  return false;
};

/** Nœud texte écrit tel quel. La valeur ne vient que d'ici : deux lettres validées, rien d'autre. */
const marker = (value: string): AstNode => {
  const node = new AstNode('#text', 3);
  node.raw = true;
  node.value = value;
  return node;
};

/**
 * Remet les marqueurs à la place de l'élément.
 *
 * Le code de langue est **revalidé** avant d'être écrit. Il vient d'un attribut, c'est-à-dire
 * d'une chaîne que du contenu collé pourrait avoir choisie ; comme les marqueurs sortent sans
 * échappement, un code non conforme deviendrait une porte ouverte. Une section dont le code ne
 * tient pas en deux lettres perd donc son marquage — et garde tout son contenu.
 */
const toMarkers = (node: AstNode): void => {
  const parent = node.parent;

  if (!Type.isNonNullable(parent)) {
    // Un nœud sans parent ne peut pas recevoir de voisins, et `unwrap` n'aurait nulle part où
    // reposer ses enfants. Il perd au moins ses attributs : mieux vaut une section muette dans
    // la page qu'un `div` de travail publié avec tout son attirail.
    Arr.each([ Dom.codeAttribute, Dom.syntaxAttribute, Dom.labelAttribute ], (name) => {
      node.attr(name, null);
    });
    return;
  }

  const code = (node.attr(Dom.codeAttribute) ?? '').toLowerCase();

  if (Parse.isCode(code)) {
    const stored: Syntax = node.attr(Dom.syntaxAttribute) === 'lg' ? 'lg' : 'multilang';
    const syntax = syntaxFor(stored, hasBracket(node));

    parent.insert(marker(Parse.openTag(syntax, code)), node, true);
    parent.insert(marker(Parse.closeTag(syntax)), node, false);
  }

  node.unwrap();
};

const setup = (editor: Editor): void => {
  editor.on('BeforeSetContent', (e) => {
    // Le repérage rapide ignore la casse, comme les motifs eux-mêmes : `[lg="fr"]` est une
    // section pour le moteur du site, elle doit en être une ici aussi.
    if (Type.isString(e.content) && marks.test(e.content)) {
      e.content = rewriteHtml(editor, e.content);
    }
  });

  editor.on('PreInit', () => {
    // Filet de sécurité : une balise `<multilang>` non convertie doit traverser l'éditeur sans
    // être retirée, faute de quoi le contenu qu'elle encadre changerait de langue en silence.
    editor.schema.addValidElements('multilang[lang]');

    editor.serializer.addAttributeFilter(Dom.codeAttribute, (nodes) => {
      Arr.each(nodes, toMarkers);
    });
  });
};

export {
  syntaxFor,
  editableSections,
  rewriteHtml,
  hasBracket,
  marker,
  toMarkers,
  marks,
  setup
};
