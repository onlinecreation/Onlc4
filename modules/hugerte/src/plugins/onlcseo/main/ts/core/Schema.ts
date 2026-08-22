import { Arr, Optional, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

import * as Options from '../api/Options';
import { SchemaField, SchemaType } from '../api/Types';

/**
 * Résolution du vocabulaire : l'héritage, les propriétés d'un type, celles qu'il exige.
 *
 * Un type schema.org ne déclare que ce qui lui est propre. `Product` ne parle ni de `name` ni de
 * `description` : il les tient de `Thing`, dont il descend. Le formulaire, lui, doit présenter la
 * liste complète — c'est ici qu'elle est reconstituée.
 *
 * Les propriétés du type l'emportent sur celles héritées lorsqu'elles portent le même nom : un
 * type peut ainsi préciser un intitulé ou restreindre une liste de choix sans redéfinir le reste.
 */

/** Le catalogue en vigueur : celui livré, complété puis surchargé par celui du projet. */
const all = (editor: Editor): SchemaType[] => {
  const base = Options.getBuiltInTypes(editor);
  const custom = Arr.filter(Options.getCustomTypes(editor), (type) =>
    Type.isObject(type) && Type.isString(type.name) && Type.isArray(type.fields));

  return Arr.foldl(custom, (acc: SchemaType[], type) =>
    Arr.findIndex(acc, (candidate) => candidate.name === type.name).fold(
      () => acc.concat([ type ]),
      (at) => {
        const merged = acc.slice();
        merged[at] = { ...acc[at], ...type };
        return merged;
      }
    ), base);
};

const find = (editor: Editor, name: string): Optional<SchemaType> =>
  Arr.find(all(editor), (type) => type.name === name);

/**
 * La chaîne d'héritage, de la racine au type demandé.
 *
 * Une chaîne rompue — un parent absent du catalogue — s'arrête là où elle peut : mieux vaut un
 * formulaire incomplet qu'un formulaire vide, et un catalogue fourni par un projet a le droit
 * d'être imparfait. La profondeur est bornée pour qu'un `parent` circulaire n'y tourne pas.
 */
const ancestry = (editor: Editor, name: string): SchemaType[] => {
  const chain: SchemaType[] = [];
  const seen: string[] = [];
  let current = find(editor, name);

  while (current.isSome() && chain.length < 12) {
    const type = current.getOrDie();
    if (Arr.contains(seen, type.name)) {
      break;
    }
    seen.push(type.name);
    chain.unshift(type);
    current = Type.isString(type.parent) ? find(editor, type.parent) : Optional.none();
  }

  return chain;
};

/**
 * Toutes les propriétés disponibles pour un type, héritage compris.
 *
 * L'ordre va du plus général au plus précis : `name` et `description` avant `offers`. Une
 * propriété redéclarée conserve sa **place** d'origine et prend la nouvelle description : un
 * intitulé affiné ne déplace pas le champ dans le formulaire.
 */
const fieldsOf = (editor: Editor, name: string): SchemaField[] =>
  Arr.foldl(ancestry(editor, name), (acc: SchemaField[], type) =>
    Arr.foldl(type.fields, (fields: SchemaField[], field) =>
      Arr.findIndex(fields, (candidate) => candidate.name === field.name).fold(
        () => fields.concat([ field ]),
        (at) => {
          const merged = fields.slice();
          merged[at] = { ...fields[at], ...field };
          return merged;
        }
      ), acc), []);

const fieldOf = (editor: Editor, typeName: string, fieldName: string): Optional<SchemaField> =>
  Arr.find(fieldsOf(editor, typeName), (field) => field.name === fieldName);

/**
 * Les propriétés exigées, héritage compris.
 *
 * Un type qui exige `name` et un ancêtre qui exige `url` donnent les deux : ce qui est
 * indispensable à un niveau le reste au niveau du dessous.
 */
const requiredOf = (editor: Editor, name: string): string[] =>
  Arr.unique(Arr.bind(ancestry(editor, name), (type) => type.required ?? []));

const recommendedOf = (editor: Editor, name: string): string[] => {
  const required = requiredOf(editor, name);
  return Arr.filter(
    Arr.unique(Arr.bind(ancestry(editor, name), (type) => type.recommended ?? [])),
    (field) => !Arr.contains(required, field));
};

/** Les types proposés à la racine du formulaire, ceux qui portent une rubrique. */
const choosable = (editor: Editor): SchemaType[] =>
  Arr.filter(all(editor), (type) => Type.isString(type.category) && type.category !== '');

const categories = (editor: Editor): string[] =>
  Arr.foldl(choosable(editor), (acc: string[], type) => {
    const category = type.category as string;
    return Arr.contains(acc, category) ? acc : acc.concat([ category ]);
  }, []);

/** Intitulé d'un type, pour l'affichage. Un type inconnu s'affiche sous son nom brut. */
const labelOf = (editor: Editor, name: string): string =>
  find(editor, name).fold(() => name, (type) => type.label);

export {
  all,
  find,
  ancestry,
  fieldsOf,
  fieldOf,
  requiredOf,
  recommendedOf,
  choosable,
  categories,
  labelOf
};
