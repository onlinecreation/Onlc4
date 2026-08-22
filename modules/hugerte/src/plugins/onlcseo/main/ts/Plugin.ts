import PluginManager from 'hugerte/core/api/PluginManager';
import * as DialogStyles from 'hugerte/plugins/onlcshared/ui/DialogStyles';

import * as Commands from './api/Commands';
import * as Options from './api/Options';
import { SchemaField, SchemaType } from './api/Types';
import * as FilterContent from './core/FilterContent';
import * as Jsonld from './core/Jsonld';
import * as Meta from './core/Meta';
import * as Schema from './core/Schema';
import * as Buttons from './ui/Buttons';

/**
 * Les aides au référencement d'une page — celles dont il ne faut qu'un exemplaire.
 *
 * Deux choses, et une règle commune. La **description et les mots-clés**, qui décident du texte
 * affiché sous le titre dans les résultats de recherche ; les **microdonnées schema.org**, qui
 * disent aux moteurs ce que la page décrit — un produit, un commerce, un événement — et leur
 * permettent d'afficher un prix, des étoiles ou une date. Ni l'une ni l'autre ne se voit sur le
 * site, et la page n'en a qu'une : deux descriptions concurrentes, deux fiches contradictoires, et
 * les moteurs choisissent au hasard.
 *
 * La description passe par le code court `[Meta]`, comme dans les gabarits d'Online Création ; les
 * microdonnées sont écrites par ce plugin, en json. C'est un choix de fond : un code court à
 * quinze attributs imbriqués serait illisible, et les microdonnées sont hiérarchiques par nature —
 * un produit contient une offre, qui contient un montant.
 *
 * Le catalogue schema.org est décrit dans `core/Catalog.ts`, avec ce qu'il couvre et ce qu'il ne
 * couvre pas.
 *
 * @class hugerte.onlcseo.Plugin
 * @private
 */

export interface OnlcSeoApi {
  /** La fiche de la page, ou `null` si elle n'en a pas. */
  readonly getMicrodata: () => Jsonld.JsonldObject | null;
  /** Remplace la fiche de la page. Un objet sans type la supprime. */
  readonly setMicrodata: (data: Jsonld.JsonldObject) => void;
  /** Les types proposés, catalogue du projet compris. */
  readonly listTypes: () => SchemaType[];
  /** Les propriétés d'un type, héritage compris. */
  readonly listFields: (typeName: string) => SchemaField[];
  /** Les propriétés qu'un type exige, héritage compris. */
  readonly listRequired: (typeName: string) => string[];
  /** La page porte-t-elle une description pour les moteurs ? */
  readonly hasMeta: () => boolean;
}

export default (): void => {
  PluginManager.add('onlcseo', (editor, pluginUrl): OnlcSeoApi => {
    Options.register(editor);

    DialogStyles.setup(editor);

    editor.contentCSS.push(`${pluginUrl}/css/onlcseo.css`);

    // Les fiches de microdonnées sont des données, pas du code : elles ne doivent pas devenir un
    // jeton « Script JavaScript ». Voir `Options.claimScriptType`.
    Options.claimScriptType(editor, Jsonld.scriptType);

    FilterContent.setup(editor);
    Commands.register(editor);
    Buttons.register(editor);

    return {
      getMicrodata: () => Jsonld.existing(editor).map((element) => Jsonld.read(editor, element)).getOrNull(),
      setMicrodata: (data: Jsonld.JsonldObject) => {
        if (Jsonld.typeOf(data) === '') {
          Jsonld.remove(editor);
        } else {
          Jsonld.write(editor, data);
        }
      },
      listTypes: () => Schema.choosable(editor),
      listFields: (typeName: string) => Schema.fieldsOf(editor, typeName),
      listRequired: (typeName: string) => Schema.requiredOf(editor, typeName),
      hasMeta: () => Meta.existing(editor).isSome()
    };
  });
};
