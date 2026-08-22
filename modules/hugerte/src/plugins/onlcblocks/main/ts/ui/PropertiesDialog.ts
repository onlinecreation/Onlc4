import { Arr, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import { Dialog } from 'hugerte/core/api/ui/Ui';
import * as ClassField from 'hugerte/plugins/onlcshared/ui/ClassField';

import * as Columns from '../core/Columns';

/**
 * Propriétés d'un bloc : son identifiant et ses classes css.
 *
 * Ce sont les deux poignées par lesquelles une page réelle est tenue. L'identifiant sert d'ancre
 * (`<a href="#tarifs">`) et de point d'accroche aux scripts du site ; les classes décident de
 * l'allure. Sans ce formulaire, il fallait passer par « Code source html » et retrouver la bonne
 * balise à la main — pour changer un mot.
 *
 * ## Ce que le formulaire refuse
 *
 * Les **colonnes** d'une grille Bootstrap n'ont pas de propriétés modifiables ici : leurs classes
 * *sont* leur largeur, et les réécrire à la main disloquerait la ligne. On change une colonne en
 * changeant la disposition de sa ligne, comme partout ailleurs dans l'éditeur.
 *
 * Les **blocs prédéfinis** et les **codes courts** ont leur propre formulaire, où leur identité
 * est décrite en termes compréhensibles ; leur balise extérieure appartient au plugin qui les
 * dessine, et n'a pas à être retouchée.
 */

/** Un identifiant html utilisable : sans espace, et employable tel quel dans une ancre. */
const isValidId = (value: string): boolean => /^[A-Za-z][\w:.-]*$/.test(value);

/**
 * Les blocs qui appartiennent à un autre plugin, reconnus à leurs attributs de marquage.
 *
 * Ils sont nommés ici plutôt que demandés à chaque plugin : ce sont des attributs stables, et
 * `onlcblocks` ne peut pas dépendre de plugins qui ne sont pas forcément chargés.
 */
const ownedSelector =
  '[data-onlc-widget],[data-onlc-shortcode],[data-onlc-script],[data-onlc-jsonld],.onlc-shortcode,.onlc-script';

/**
 * Ce bloc accepte-t-il qu'on modifie son identifiant et ses classes ?
 *
 * Non pour une colonne de grille, non pour un bloc qui appartient à un autre plugin, non pour ce
 * qui n'est pas modifiable.
 */
const isEditable = (editor: Editor, block: HTMLElement): boolean =>
  !Columns.isColumnElement(block)
  && !(editor.dom.is(block, ownedSelector) as boolean)
  && !Type.isNonNullable(editor.dom.getParent(block, ownedSelector, editor.getBody()))
  && editor.dom.isEditable(block);

interface PropertiesData {
  readonly id: string;
  readonly classes: string;
}

/**
 * Classes déjà posées sur les autres blocs de la page.
 *
 * Elles sont proposées en plus de celles de la feuille du site : une page reprend souvent ses
 * propres conventions, et une classe utilisée trois fois plus haut est la suggestion la plus
 * juste qu'on puisse faire — même quand la feuille du site n'a pas pu être lue.
 */
const classesInPage = (editor: Editor): string[] => {
  const body = editor.getBody();
  if (!Type.isNonNullable(body)) {
    return [];
  }
  return Arr.unique(Arr.bind(editor.dom.select('*[class]', body), (element) =>
    Arr.filter(ClassField.split(element.className), (name) =>
      // Les classes de l'interface d'écriture ne décrivent pas la page : les proposer inviterait
      // à les poser sur du contenu, où elles ne voudraient rien dire.
      name.indexOf('onlc-') !== 0 && name.indexOf('mce-') !== 0))).sort();
};

const helpPanel = (editor: Editor, text: string): Dialog.HtmlPanelSpec => ({
  type: 'htmlpanel',
  presets: 'presentation',
  html: `<p class="onlc-field-help">${editor.dom.encode(editor.translate(text) as string)}</p>`
});

const open = (editor: Editor, block: HTMLElement): void => {
  const name = block.nodeName.toLowerCase();

  editor.windowManager.open<PropertiesData>({
    title: 'Propriétés du bloc',
    size: 'normal',
    body: {
      type: 'panel',
      items: [
        helpPanel(editor, `Balise « ${name} ». L’identifiant et les classes voyagent avec le bloc : ` +
          'ils sont écrits tels quels dans la page publiée.'),
        { type: 'input', name: 'id', label: 'Identifiant (ancre)', placeholder: 'tarifs' },
        helpPanel(editor, 'Un mot sans espace, unique dans la page. Un lien pourra y conduire avec ' +
          '« #tarifs », et les scripts du site s’en servent pour retrouver ce bloc.'),
        {
          type: 'label',
          label: 'Classes CSS',
          items: [
            ClassField.field(editor, 'classes', { extra: classesInPage(editor) }),
            helpPanel(editor, 'Les classes décident de l’allure du bloc. Celles qui sont proposées ' +
              'viennent de la feuille de style de votre site et des autres blocs de la page.')
          ]
        }
      ]
    },
    initialData: {
      id: editor.dom.getAttrib(block, 'id'),
      classes: block.className
    },
    buttons: [
      { type: 'cancel', name: 'cancel', text: 'Annuler' },
      { type: 'submit', name: 'save', text: 'Mettre à jour', primary: true }
    ],
    onSubmit: (api) => {
      const data = api.getData();
      const id = data.id.trim();

      if (id !== '' && !isValidId(id)) {
        editor.windowManager.alert(
          'Un identifiant commence par une lettre et ne contient ni espace ni accent. ' +
          'Par exemple : tarifs, nos-services, contact2.');
        return;
      }

      editor.undoManager.transact(() => {
        editor.dom.setAttrib(block, 'id', id === '' ? null : id);
        const classes = ClassField.split(data.classes).join(' ');
        editor.dom.setAttrib(block, 'class', classes === '' ? null : classes);
      });
      editor.nodeChanged();
      api.close();
    }
  });
};

export {
  isValidId,
  isEditable,
  classesInPage,
  open
};
