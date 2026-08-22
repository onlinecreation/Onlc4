import { Optional, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

import * as Script from '../core/Script';
import * as WidgetDom from '../core/WidgetDom';
import * as Widgets from '../core/Widgets';
import * as PreviewDialog from '../ui/PreviewDialog';
import * as ScriptDialog from '../ui/ScriptDialog';
import * as SourceDialog from '../ui/SourceDialog';
import * as WidgetDialog from '../ui/WidgetDialog';
import * as WidgetPicker from '../ui/WidgetPicker';
import { ScriptData } from './Types';

const register = (editor: Editor): void => {
  // Script tool: edits the selected script, otherwise creates a new one
  editor.addCommand('OnlcScript', () => {
    ScriptDialog.open(editor, Script.getSelected(editor));
  });

  editor.addCommand('OnlcRemoveScript', () => {
    Script.getSelected(editor).each((elm) => Script.remove(editor, elm));
  });

  /**
   * Pose un script sans passer par le formulaire.
   *
   * Un autre plugin a parfois besoin d'écrire du javascript dans la page — `onlcswiper` crée
   * ainsi la configuration d'un diaporama qui n'en avait pas. Il ne peut pas le faire lui-même :
   * un `<script>` inséré dans la zone d'écriture est supprimé par le nettoyeur du cœur avant
   * qu'aucun filtre ne le voie. Cette commande pose le jeton à sa place.
   *
   * La valeur est un `ScriptData` partiel ; ce qui manque prend les valeurs par défaut.
   */
  editor.addCommand('OnlcInsertScript', (_ui, value?: Partial<ScriptData>) => {
    if (!Type.isObject(value)) {
      return;
    }
    Script.insert(editor, { ...Script.emptyData(editor), ...value });
  });

  // Html source of the whole document
  editor.addCommand('OnlcSourceCode', () => {
    SourceDialog.open(editor);
  });

  // Library of the predefined blocks
  editor.addCommand('OnlcWidgetLibrary', () => {
    WidgetPicker.open(editor);
  });

  /**
   * Inserts a predefined block. The value is the identifier of a widget, when it is missing the
   * library is opened instead.
   */
  editor.addCommand('OnlcInsertWidget', (_ui, value?: string) => {
    if (!Type.isString(value) || value === '') {
      WidgetPicker.open(editor);
      return;
    }
    Widgets.find(editor, value).fold(
      () => WidgetPicker.open(editor),
      (definition) => WidgetDialog.open(editor, definition, Optional.none())
    );
  });

  // Edits the selected block
  editor.addCommand('OnlcEditWidget', () => {
    WidgetDom.getSelected(editor).each((element) => {
      WidgetDom.getDefinition(editor, element).each((definition) => {
        WidgetDialog.open(editor, definition, Optional.some(element));
      });
    });
  });

  editor.addCommand('OnlcRemoveWidget', () => {
    WidgetDom.getSelected(editor).each((element) => WidgetDom.remove(editor, element));
  });

  /** Ouvre l'aperçu de la page entière, gabarit du site compris. */
  editor.addCommand('OnlcPreview', () => {
    PreviewDialog.open(editor);
  });

};

export {
  register
};
