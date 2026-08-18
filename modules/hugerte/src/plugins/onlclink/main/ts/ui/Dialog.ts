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

const openDialog = (editor: Editor, context: LinkContext): void => {
  const anchor = LinkActions.getSelectedAnchor(editor);
  const attributes: Partial<LinkAttributes> = anchor.map((elm) => LinkActions.readAttributes(editor, elm) as Partial<LinkAttributes>).getOr({});
  const withText = canEditText(editor, anchor);

  const items: Dialog.BodyComponentSpec[] = LinkFields.getItems(editor, context);
  const body: Dialog.PanelSpec = {
    type: 'panel',
    items: withText
      ? ([{ type: 'input', name: textField, label: 'Texte à afficher' }] as Dialog.BodyComponentSpec[]).concat(items)
      : items
  };

  const initialData = {
    ...LinkFields.getInitialData(editor, context, attributes),
    ...(withText ? { [textField]: getSelectedText(editor, anchor) } : {})
  };

  editor.windowManager.open({
    title: anchor.isSome() ? 'Modifier le lien' : 'Insérer un lien',
    size: 'normal',
    body,
    initialData,
    onChange: LinkFields.onChange(context),
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
  });
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
