import { Arr, Optional } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import { Dialog } from 'hugerte/core/api/ui/Ui';

import * as Anim from '../core/Anim';
import * as Markup from '../core/Markup';

/**
 * Le formulaire du texte animé.
 *
 * Une seule fenêtre pour les trois sortes d'animation : ce qui change d'une sorte à l'autre tient
 * en un champ — la liste des mots n'a de sens que pour une ronde — et deux fenêtres presque
 * identiques se ressembleraient assez pour qu'on les confonde.
 *
 * Les mots se saisissent **un par ligne**. C'est la façon d'écrire une liste que tout le monde
 * connaît, et elle évite d'avoir à choisir un séparateur qu'un mot pourrait contenir.
 */

interface AnimDialogData {
  readonly kind: string;
  readonly items: string;
  readonly duration: string;
}

const kindItems = [
  { text: 'Mots qui se relaient', value: 'rotate' },
  { text: 'Clignotant', value: 'blink' },
  { text: 'Défilant', value: 'scroll' }
];

/** Le texte de la zone de saisie : un mot par ligne. */
const toLines = (items: string[]): string => items.join('\n');

const fromLines = (value: string): string[] =>
  Arr.filter(Arr.map(value.split('\n'), (line) => line.trim()), (line) => line !== '');

/**
 * Ce que fait la sorte choisie, dit en une phrase.
 *
 * La traduction est appelée **ici**, sur chaque phrase entière : un relevé de couverture cherche
 * les chaînes là où elles sont traduites, et une phrase rendue à l'appelant pour qu'il la traduise
 * lui échapperait.
 */
const explanation = (editor: Editor, kind: string): string => {
  const t = (text: string): string => editor.translate(text) as string;

  if (kind === 'rotate') {
    return t('Les mots se relaient à la même place. La place réservée est celle du plus long : ' +
      'le texte qui suit ne bouge pas quand ils changent.');
  }
  if (kind === 'blink') {
    return t('Le passage apparaît et disparaît. À employer avec mesure : un texte qui clignote se ' +
      'lit mal, et se remarque partout ailleurs sur la page.');
  }
  return t('Le passage traverse son cadre, de droite à gauche. Il occupe alors toute la largeur ' +
    'disponible, comme un paragraphe.');
};

const bodyFor = (editor: Editor, kind: string): Dialog.BodyComponentSpec[] => {
  const items: Dialog.BodyComponentSpec[] = [
    { type: 'listbox', name: 'kind', label: 'Sorte d’animation', items: kindItems }
  ];

  if (kind === 'rotate') {
    items.push({
      type: 'textarea',
      name: 'items',
      label: 'Mots qui se relaient (un par ligne)',
      maximized: true
    });
  } else {
    items.push({ type: 'input', name: 'items', label: 'Texte animé' });
  }

  items.push({ type: 'input', name: 'duration', label: 'Durée d’un cycle (secondes)', inputMode: 'decimal' });
  items.push({
    type: 'htmlpanel',
    presets: 'document',
    html: `<p>${editor.dom.encode(explanation(editor, kind))}</p>` +
      `<p>${editor.dom.encode(editor.translate(
        'Rien ne bouge pour qui a demandé à son système de réduire les animations : le texte ' +
        'reste alors lisible, arrêté.') as string)}</p>`
  });

  return items;
};

const spec = (editor: Editor, target: Optional<HTMLElement>, data: AnimDialogData): Dialog.DialogSpec<AnimDialogData> => ({
  title: target.isSome() ? 'Modifier le texte animé' : 'Insérer un texte animé',
  size: 'normal',
  body: { type: 'panel', items: bodyFor(editor, data.kind) },
  initialData: data,
  buttons: [
    { type: 'cancel', name: 'cancel', text: 'Annuler' },
    { type: 'submit', name: 'save', text: 'Mettre à jour', primary: true }
  ],
  onChange: (api, details) => {
    // Changer de sorte change les champs : la liste des mots n'a de sens que pour une ronde.
    if (details.name === 'kind') {
      const courant = api.getData();
      api.redial(spec(editor, target, {
        ...courant,
        duration: String(Anim.defaultDuration(courant.kind as Anim.AnimKind))
      }));
    }
  },
  onSubmit: (api) => {
    const data2 = api.getData();
    const kind = Anim.isKind(data2.kind) ? data2.kind : 'rotate';
    const mots = kind === 'rotate' ? fromLines(data2.items) : [ data2.items.trim() ];
    const settings: Anim.AnimSettings = {
      kind,
      duration: Anim.clampDuration(parseFloat(data2.duration)),
      items: mots.length === 0 ? [ '' ] : mots
    };

    editor.undoManager.transact(() => {
      target.fold(
        () => {
          const cree = Markup.create(editor, settings);
          editor.insertContent(cree.outerHTML);
        },
        (element) => Markup.apply(editor, element, settings)
      );
    });
    editor.nodeChanged();
    api.close();
  }
});

/** Ouvre le formulaire sur le texte animé visé, ou sur la sélection pour en créer un. */
const open = (editor: Editor, target: Optional<HTMLElement>): void => {
  const settings = target.fold(
    (): Anim.AnimSettings => {
      const selection = editor.selection.getContent({ format: 'text' }).trim();
      return { kind: 'rotate', duration: Anim.defaultDuration('rotate'), items: selection === '' ? [ '' ] : [ selection ] };
    },
    (element) => Anim.settingsOf(editor, element)
  );

  editor.windowManager.open(spec(editor, target, {
    kind: settings.kind,
    items: settings.kind === 'rotate' ? toLines(settings.items) : (settings.items[0] ?? ''),
    duration: String(settings.duration)
  }));
};

export {
  kindItems,
  toLines,
  fromLines,
  open
};
