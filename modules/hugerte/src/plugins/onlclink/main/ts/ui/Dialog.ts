import { Optional, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import { Dialog } from 'hugerte/core/api/ui/Ui';
import * as LinkActions from 'hugerte/plugins/onlcshared/link/LinkActions';
import * as LinkFields from 'hugerte/plugins/onlcshared/link/LinkFields';
import { LinkAttributes, LinkContext } from 'hugerte/plugins/onlcshared/link/LinkTypes';

const textField = 'onlc_link_text';

const getSelectedText = (editor: Editor, anchor: Optional<HTMLAnchorElement>): string =>
  anchor.map((elm) => elm.textContent ?? '').getOrThunk(() => editor.selection.getContent({ format: 'text' }));

const canEditText = (editor: Editor, anchor: Optional<HTMLAnchorElement>): boolean =>
  anchor.isSome() || editor.selection.isCollapsed() || editor.selection.getContent({ format: 'html' }).indexOf('<') === -1;

/**
 * La fenêtre du lien : ce qu'il vise, puis ce qui l'habille.
 *
 * Deux onglets. Le premier ne montre **que la sorte de lien choisie** — une page du site, une
 * ancre de la page courante, ou une adresse écrite à la main. Le second réunit ce qu'un
 * intégrateur règle : le titre au survol, les classes, le style, l'action au clic.
 *
 * ## Pourquoi la fenêtre se redessine
 *
 * Un dialogue de l'éditeur décrit ses champs à l'ouverture, et rien ne permet d'en cacher un
 * ensuite. Changer de sorte de lien reconstruit donc la fenêtre — `redial` — avec les données
 * qu'on venait d'y saisir. C'est sans danger ici : tous les champs sont ordinaires, et leur
 * valeur tient dans la donnée du dialogue.
 */
const openDialog = (editor: Editor, context: LinkContext): void => {
  const anchor = LinkActions.getSelectedAnchor(editor);
  const attributes: Partial<LinkAttributes> = anchor
    .map((elm) => LinkActions.readAttributes(editor, elm) as Partial<LinkAttributes>).getOr({});
  const withText = canEditText(editor, anchor);

  const initialData = {
    ...LinkFields.getInitialData(editor, context, attributes),
    ...(withText ? { [textField]: getSelectedText(editor, anchor) } : {})
  };

  const spec = (data: Record<string, unknown>): Dialog.DialogSpec<any> => {
    const kind = LinkFields.readString(data, LinkFields.fields.predefined);
    const cible: Dialog.BodyComponentSpec[] = LinkFields.getItems(editor, context, kind);

    return {
      title: anchor.isSome() ? 'Modifier le lien' : 'Insérer un lien',
      size: 'normal',
      body: {
        type: 'tabpanel',
        tabs: [
          {
            name: 'cible',
            title: 'Lien',
            items: withText
              ? ([{ type: 'input', name: textField, label: 'Texte à afficher' }] as Dialog.BodyComponentSpec[]).concat(cible)
              : cible
          },
          {
            name: 'avance',
            title: 'Avancé',
            items: LinkFields.getAdvancedItems()
          }
        ]
      },
      initialData: data,
      onChange: (api, details) => {
        if (LinkFields.isKindChange(details.name)) {
          // La fenêtre se rouvre sur les champs de la nouvelle sorte, avec ce qui était saisi.
          api.redial(spec(api.getData() as Record<string, unknown>));
        }
      },
      buttons: [
        { type: 'cancel', name: 'cancel', text: 'Annuler' },
        { type: 'submit', name: 'save', text: 'Enregistrer', primary: true }
      ],
      onSubmit: (api) => {
        const data = api.getData() as Record<string, unknown>;
        const linkAttributes = LinkFields.toAttributes(data);
        const text = withText ? LinkFields.readString(data, textField) : undefined;

        if (linkAttributes.href === '') {
          LinkActions.unlink(editor);
        } else {
          LinkActions.applyToSelection(editor, linkAttributes, Type.isString(text) ? text : undefined);
        }
        api.close();
      }
    };
  };

  editor.windowManager.open(spec(initialData));
};

/**
 * Loads the predefined links before opening the dialog, so that the lists are ready when the
 * user sees them.
 */
const open = (editor: Editor): void => {
  LinkFields.collectContext(editor).then((context) => openDialog(editor, context));
};

export {
  open
};
