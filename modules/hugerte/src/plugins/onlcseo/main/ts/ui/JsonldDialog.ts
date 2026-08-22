import { Arr, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import { Dialog } from 'hugerte/core/api/ui/Ui';
import * as Destroy from 'hugerte/plugins/onlcshared/ui/Destroy';

import * as Options from '../api/Options';
import * as Jsonld from '../core/Jsonld';
import * as Schema from '../core/Schema';
import * as SchemaForm from './SchemaForm';

/**
 * La fenêtre des microdonnées : le formulaire guidé, et ce qu'on en fait.
 *
 * Elle est grande parce que le formulaire l'est : une fiche produit complète compte une douzaine
 * de propriétés, dont deux ouvrent des objets. En taille normale, il faudrait faire défiler pour
 * revoir le début de ce qu'on vient d'écrire.
 *
 * Le pied de la fenêtre mène à l'outil de test des moteurs plutôt que de prétendre valider la
 * fiche : la validité d'une fiche schema.org dépend de règles que chaque moteur fait évoluer, et
 * un éditeur qui affirmerait « c'est bon » se tromperait tôt ou tard.
 */

interface JsonldDialogData {
  readonly microdata: string;
}

const open = (editor: Editor): void => {
  const existing = Jsonld.existing(editor);
  const initial = existing.fold(() => ({} as Jsonld.JsonldObject), (element) => Jsonld.read(editor, element));

  const buttons: Dialog.DialogFooterButtonSpec[] = [
    { type: 'cancel', name: 'cancel', text: 'Annuler' }
  ];

  const testUrl = Options.getTestUrl(editor);
  if (testUrl !== '') {
    buttons.push({ type: 'custom', name: 'test', text: 'Outil de test des moteurs…' });
  }

  existing.each(() => {
    buttons.push({ type: 'custom', name: 'remove', text: 'Supprimer la fiche' });
  });

  buttons.push({
    type: 'submit',
    name: 'save',
    text: existing.isSome() ? 'Mettre à jour' : 'Ajouter à la page',
    primary: true
  });

  editor.windowManager.open<JsonldDialogData>({
    title: 'Microdonnées de la page',
    size: 'large',
    body: {
      type: 'panel',
      items: [ SchemaForm.field(editor, 'microdata') ]
    },
    initialData: { microdata: JSON.stringify(initial) },
    buttons,
    onAction: (api, details) => {
      if (details.name === 'test') {
        editor.windowManager.open({
          title: 'Vérifier la fiche',
          body: {
            type: 'panel',
            items: [{
              type: 'htmlpanel',
              presets: 'document',
              html: `<p>${editor.dom.encode(editor.translate(
                'Les moteurs de recherche mettent à disposition un outil qui lit une page publiée et ' +
                'dit ce qu’ils y comprennent. Publiez d’abord la page, puis donnez-lui son adresse.') as string)}</p>` +
                `<p><a href="${Jsonld.escape(testUrl)}" target="_blank" rel="noopener noreferrer">` +
                `${Jsonld.escape(testUrl)}</a></p>`
            }]
          },
          buttons: [{ type: 'cancel', name: 'close', text: 'Fermer', primary: true }]
        });
      }

      if (details.name === 'remove') {
        Destroy.open(editor, {
          what: editor.translate('les microdonnées de cette page') as string,
          onConfirm: () => {
            Jsonld.remove(editor);
            api.close();
          }
        });
      }
    },
    onSubmit: (api) => {
      const raw = api.getData().microdata;
      let data: Jsonld.JsonldObject = {};
      try {
        const parsed: unknown = JSON.parse(Type.isString(raw) && raw !== '' ? raw : '{}');
        data = Type.isObject(parsed) ? parsed as Jsonld.JsonldObject : {};
      } catch (_err) {
        data = {};
      }

      if (Jsonld.typeOf(data) === '') {
        editor.windowManager.alert(
          'Choisissez d’abord ce que décrit cette page : sans type de contenu, les moteurs ne ' +
          'savent pas quoi faire de la fiche.');
        return;
      }

      const missing = Arr.filter(
        Schema.requiredOf(editor, Jsonld.typeOf(data)),
        (name) => SchemaForm.isBlank(data[name]));

      const write = () => {
        Jsonld.write(editor, data);
        api.close();
      };

      if (missing.length === 0) {
        write();
        return;
      }

      // Une fiche incomplète est enregistrée si on le demande : elle vaut mieux que rien, et
      // c'est souvent un travail en plusieurs fois. Mais on dit ce qui manque, et pourquoi.
      editor.windowManager.confirm(
        `${editor.translate('Ces propriétés sont exigées et restent vides :') as string} ` +
        `${missing.join(', ')}. ` +
        `${editor.translate('Les moteurs ignoreront la fiche tant qu’elles manqueront. L’enregistrer quand même ?') as string}`,
        (accepted) => {
          if (accepted) {
            write();
          }
        });
    }
  });
};

export {
  open
};
