import { Arr, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import AstNode from 'hugerte/core/api/html/Node';

import * as Options from '../api/Options';
import * as Jsonld from './Jsonld';

/**
 * Le passage entre la fiche telle qu'on la modifie et la fiche telle qu'elle est publiée.
 *
 * ## À l'entrée
 *
 * Le remplacement se fait sur la chaîne html brute, avant l'analyse : le nettoyeur du cœur
 * supprime les éléments `script` bien avant qu'un filtre de nœud puisse les voir. C'est la même
 * raison qui fait passer les scripts ordinaires par un jeton.
 *
 * ## À la sortie
 *
 * Le bloc redevient un `script` de type `application/ld+json`, et il est **remonté en tête** du
 * document. Le rédacteur peut l'avoir déplacé, ou avoir écrit un paragraphe au-dessus : la
 * position dans la page n'a aucune importance pour lui, elle en a pour qui relira la source.
 *
 * Le json est écrit tel quel dans le document, sans échappement html — c'est ce qu'exige un
 * élément à contenu brut. La seule séquence qui pourrait en sortir prématurément est `</script`,
 * et elle est neutralisée avant l'écriture plutôt que laissée à la bonne fortune de
 * `JSON.stringify`.
 */

const hasClass = (node: AstNode, cls: string): boolean => {
  const className = node.attr('class');
  return Type.isString(className) && Arr.contains(className.split(/\s+/), cls);
};

const jsonldRegExp =
  /<script\b([^>]*\btype\s*=\s*(?:"application\/ld\+json"|'application\/ld\+json')[^>]*)>([\s\S]*?)<\/script\s*>/gi;

/** Le json d'une fiche, ou un objet vide s'il est illisible. */
const parseBody = (body: string): Jsonld.JsonldObject => {
  try {
    const parsed: unknown = JSON.parse(body.trim());
    return Type.isObject(parsed) ? parsed as Jsonld.JsonldObject : {};
  } catch (_err) {
    return {};
  }
};

/**
 * Remplace les fiches d'une chaîne html par leur bloc d'édition, **en tête**.
 *
 * La fiche est remontée avant tout le reste, comme elle le sera à l'enregistrement : c'est le
 * seul endroit où l'on pense à la chercher, et une page réelle l'écrit parfois au milieu d'un
 * paragraphe, tout en bas. Ce qu'on voit à l'écran est alors ce qui sera publié.
 *
 * Une fiche illisible — json malformé, texte tronqué — n'est pas jetée : elle devient un bloc
 * vide dont le formulaire repart de zéro. Perdre les données de quelqu'un parce qu'une virgule
 * manque serait la pire des réponses.
 */
const toBlocks = (editor: Editor, content: string): string => {
  const blocks: string[] = [];
  const rest = content.replace(jsonldRegExp, (_all, _attributes: string, body: string) => {
    blocks.push(Jsonld.toBlockHtml(editor, parseBody(body)));
    return '';
  });
  return blocks.join('') + rest;
};

/** Le json échappé pour vivre dans un élément à contenu brut. */
const safeJson = (editor: Editor, data: Jsonld.JsonldObject): string =>
  Jsonld.toJson(data, Options.getContext(editor)).replace(/<\//g, '<\\/');

const toScriptNode = (editor: Editor, node: AstNode): void => {
  const data = Jsonld.decode(node.attr(Jsonld.dataAttribute) ?? null);

  node.name = 'script';
  node.attr('class', null);
  node.attr(Jsonld.dataAttribute, null);
  node.attr('contenteditable', null);
  node.attr('type', Jsonld.scriptType);
  node.empty();

  const text = new AstNode('#text', 3);
  text.raw = true;
  text.value = safeJson(editor, data);
  node.append(text);
};

/** La racine de l'arbre en cours de sérialisation. */
const rootOf = (node: AstNode): AstNode => {
  let current = node;
  while (Type.isNonNullable(current.parent)) {
    current = current.parent;
  }
  return current;
};

/**
 * Remonte la fiche en première position du document.
 *
 * `insert` détache le nœud de sa place actuelle avant de le reposer : une fiche écrite au milieu
 * d'une colonne remonte donc jusqu'à la racine, et non seulement en tête de sa colonne.
 */
const hoist = (node: AstNode): void => {
  const root = rootOf(node);
  const first = root.firstChild;
  if (Type.isNonNullable(first) && first !== node) {
    root.insert(node, first, true);
  }
};

const setup = (editor: Editor): void => {
  editor.on('BeforeSetContent', (e) => {
    if (Type.isString(e.content) && e.content.toLowerCase().indexOf('ld+json') !== -1) {
      e.content = toBlocks(editor, e.content);
    }
  });

  editor.on('PreInit', () => {
    editor.parser.addNodeFilter('div', (nodes) => {
      Arr.each(nodes, (node) => {
        if (hasClass(node, Jsonld.blockClass)) {
          node.attr('contenteditable', 'false');
        }
      });
    });

    editor.serializer.addNodeFilter('div', (nodes) => {
      Arr.each(nodes, (node) => {
        if (hasClass(node, Jsonld.blockClass)) {
          toScriptNode(editor, node);
          hoist(node);
        }
      });
    });
  });
};

export {
  jsonldRegExp,
  parseBody,
  toBlocks,
  safeJson,
  rootOf,
  hoist,
  setup
};
