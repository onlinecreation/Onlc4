import { Arr, Optional } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import { Dialog } from 'hugerte/core/api/ui/Ui';

import * as Options from '../api/Options';
import { Syntax } from '../api/Types';
import * as Dom from '../core/Dom';
import * as Languages from '../core/Languages';
import * as Sections from '../core/Sections';

/**
 * Le formulaire d'une section de langue.
 *
 * Deux réglages seulement : dans quelle langue, et dans quelle écriture. Le reste de la fenêtre
 * explique ce que la section fait, parce que « `[LG]` ou `<multilang>` » ne veut rien dire pour
 * qui découvre l'application, et que le choix a une conséquence bien réelle sur la page publiée.
 */

interface LanguageDialogData {
  readonly code: string;
  readonly syntax: string;
}

const explanation =
  '<p>Ce qui est marqué dans une langue n’apparaît sur le site que pour les visiteurs qui la ' +
  'consultent. Le reste de la page — ce qui n’est marqué dans aucune langue — s’affiche pour ' +
  'tout le monde.</p>';

const syntaxHelp =
  '<p>Les deux écritures font la même chose sur le site. <strong>Balise</strong> ' +
  '(<code>&lt;multilang lang="fr"&gt;…&lt;/multilang&gt;</code>) accepte tout : du texte, des ' +
  'paragraphes entiers, des éléments de site. <strong>Crochets</strong> ' +
  '(<code>[LG="fr"]…[/LG]</code>) est l’écriture historique, plus courte, mais elle s’arrête au ' +
  'premier crochet ouvrant : une section qui contient un élément de site est enregistrée en ' +
  '« balise » quoi qu’il arrive, sinon la page publierait les marqueurs en toutes lettres.</p>';

const syntaxItems: Array<{ text: string; value: Syntax }> = [
  { text: 'Balise multilang (accepte tout)', value: 'multilang' },
  { text: 'Crochets LG (écriture historique)', value: 'lg' }
];

/**
 * Les langues proposées : celles de la configuration, plus celle de la section si elle n'y est
 * pas. Une section écrite dans une langue qu'on a cessé de déclarer doit rester modifiable —
 * sans quoi la seule façon de la corriger serait de la supprimer.
 */
const languageItems = (editor: Editor, code: string): Array<{ text: string; value: string }> => {
  const declared = Arr.map(Languages.list(editor), (language) => ({
    text: language.label,
    value: language.code
  }));

  const known = Arr.exists(declared, (item) => item.value === code);

  if (known || code === '') {
    return declared;
  }

  const warning = editor.translate('langue non déclarée') as string;
  return declared.concat([{ text: `${Languages.labelOf(code)} (${warning})`, value: code }]);
};

const open = (editor: Editor, element: Optional<HTMLElement>): void => {
  const code = element.fold(() => Languages.first(editor), (elm) => Dom.codeOf(editor, elm));
  const syntax = element.fold(() => Options.getDefaultSyntax(editor), (elm) => Dom.syntaxOf(editor, elm));

  const body: Dialog.PanelSpec = {
    type: 'panel',
    items: [
      { type: 'htmlpanel', html: explanation, presets: 'document' },
      {
        type: 'listbox',
        name: 'code',
        label: 'Langue de cette section',
        items: languageItems(editor, code)
      },
      {
        type: 'listbox',
        name: 'syntax',
        label: 'Écriture dans la page enregistrée',
        items: syntaxItems
      },
      { type: 'htmlpanel', html: syntaxHelp, presets: 'document' }
    ]
  };

  const buttons: Dialog.DialogFooterButtonSpec[] = element.fold<Dialog.DialogFooterButtonSpec[]>(
    () => [
      { type: 'cancel', name: 'cancel', text: 'Annuler' },
      { type: 'submit', name: 'save', text: 'Marquer', primary: true }
    ],
    () => [
      { type: 'custom', name: 'unmark', text: 'Retirer le marquage', align: 'start' },
      { type: 'cancel', name: 'cancel', text: 'Annuler' },
      { type: 'submit', name: 'save', text: 'Appliquer', primary: true }
    ]
  );

  editor.windowManager.open<LanguageDialogData>({
    title: element.isSome() ? 'Langue de la section' : 'Marquer dans une langue',
    size: 'normal',
    body,
    initialData: { code, syntax },
    buttons,
    onAction: (api, details) => {
      if (details.name === 'unmark') {
        // Le contenu est rendu au document : c'est le marquage qui part, pas le texte.
        Sections.unmark(editor);
        api.close();
      }
    },
    onSubmit: (api) => {
      const data = api.getData();
      Sections.mark(editor, data.code, data.syntax === 'lg' ? 'lg' : 'multilang');
      api.close();
    }
  });
};

export {
  explanation,
  syntaxHelp,
  syntaxItems,
  languageItems,
  open
};
