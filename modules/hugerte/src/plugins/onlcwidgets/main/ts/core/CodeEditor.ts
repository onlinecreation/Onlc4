import { Arr, Type } from '@ephox/katamari';

import { Dialog } from 'hugerte/core/api/ui/Ui';

import { CodeLanguage } from '../api/Types';
import * as Highlight from './Highlight';

/**
 * A small code editor with syntax highlighting, plugged into dialogs through the
 * `customeditor` component. A transparent textarea is laid over a highlighted preview, which is
 * the simplest way to get colours without shipping a full editor library.
 *
 * Les deux couches doivent se replier exactement de la même façon, sinon le texte coloré et le
 * curseur se désynchronisent. Deux décisions en découlent :
 *
 * - **aucun défilement horizontal** : les lignes trop longues reviennent à la ligne, y compris
 *   au milieu d'un mot (`overflow-wrap: anywhere`). Une url ou un code minifié d'un seul tenant
 *   reste donc entièrement lisible ;
 * - **un numéro par ligne logique**, dessiné dans la couche colorée elle-même. Une gouttière
 *   séparée se décalerait dès qu'une ligne se replie ; ici le numéro appartient à la ligne.
 */

export interface CodeEditorSpec {
  readonly language: CodeLanguage;
  readonly tabSize: number;
  readonly lineNumbers: boolean;
  readonly label?: string;
}

const styleId = 'onlc-code-editor-styles';

/**
 * Largeur réservée aux numéros de ligne. Les deux couches partagent ce retrait : c'est lui qui
 * garantit que le repli se produit aux mêmes endroits dans le texte coloré et dans la saisie.
 */
const gutterWidth = 52;

const styles = `
/* Le thème applique un reset très large - .tox :not(svg):not(rect) - qui remet à zéro fond,
   bordure et largeur : chaque règle est donc préfixée par .tox pour passer devant lui.

   Les dialogues vivent dans le document de la page d'accueil, pas dans un cadre à part : une
   règle de cette page écrite sur un nom d'élément — pre, textarea — atteint donc l'éditeur de
   code. C'est arrivé : la page de démonstration bornait ses blocs pre à 340 pixels pour son
   propre panneau « html enregistré », et le code source de la page s'en trouvait coupé à la
   dix-septième ligne, sans pouvoir défiler — la couche colorée était tronquée, et la zone de
   saisie posée dessus n'était pas plus haute.

   Les deux couches déclarent donc elles-mêmes leur hauteur et leur débordement, au lieu de les
   laisser au hasard de la feuille de style qui les entoure. La seule qui défile est le cadre. */
.tox .onlc-code { display: block; box-sizing: border-box; width: 100%; min-height: 240px; max-height: 100%; overflow-x: hidden; overflow-y: auto; border: 1px solid rgba(34, 47, 62, 0.2); border-radius: 6px; background: #1f2430; color: #e6e6e6; }
.tox .onlc-code__stack { position: relative; box-sizing: border-box; min-height: 240px; height: auto; max-height: none; overflow: visible; }
.tox .onlc-code__view, .tox .onlc-code__input {
  box-sizing: border-box; display: block; width: 100%; margin: 0;
  padding: 12px 12px 12px ${gutterWidth}px; border: 0; font: inherit; white-space: pre-wrap;
  word-break: break-word; overflow-wrap: anywhere; tab-size: 2;
  min-height: 0; max-height: none;
}
.tox .onlc-code__view { position: relative; height: auto; overflow: visible; background: transparent; pointer-events: none; }
.tox .onlc-code__input { position: absolute; top: 0; right: 0; bottom: 0; left: 0; width: 100%; height: 100%; overflow: hidden; color: transparent; background: transparent; caret-color: #ffffff; outline: none; resize: none; }
.tox .onlc-code__input::selection { color: transparent; background: rgba(0, 108, 231, 0.45); }
.tox .onlc-code__line { position: relative; display: block; min-height: 1.5em; }
.tox .onlc-code--numbered .onlc-code__stack { background: linear-gradient(to right, rgba(0, 0, 0, 0.18) 0, rgba(0, 0, 0, 0.18) ${gutterWidth - 8}px, transparent ${gutterWidth - 8}px); }
.tox .onlc-code--numbered .onlc-code__line::before { content: attr(data-line); position: absolute; left: -${gutterWidth - 12}px; width: ${gutterWidth - 24}px; text-align: right; color: rgba(230, 230, 230, 0.35); user-select: none; }
.tox .onlc-code--plain .onlc-code__view, .tox .onlc-code--plain .onlc-code__input { padding-left: 12px; }
.tox .onlc-code, .tox .onlc-code__view, .tox .onlc-code__input { font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace; font-size: 13px; line-height: 1.5; }
.tox .onlc-code__t--comment { color: #7f8c9b; font-style: italic; }
.tox .onlc-code__t--string { color: #a3d977; }
.tox .onlc-code__t--number { color: #e6b673; }
.tox .onlc-code__t--keyword { color: #6cb6ff; }
.tox .onlc-code__t--atom { color: #d19aff; }
.tox .onlc-code__t--function { color: #f2c7ff; }
.tox .onlc-code__t--operator, .tox .onlc-code__t--punctuation { color: #b7c2cf; }
.tox .onlc-code__t--tag { color: #ff8b8b; }
.tox .onlc-code__t--attribute { color: #ffd479; }
.tox .onlc-code__hint { margin: 6px 2px 0; font-size: 12px; color: #5a6570; }
`;

const injectStyles = (doc: Document): void => {
  if (doc.getElementById(styleId) === null) {
    const style = doc.createElement('style');
    style.id = styleId;
    style.textContent = styles;
    doc.head.appendChild(style);
  }
};

/**
 * Builds the `init` function expected by the `customeditor` dialog component.
 */
const create = (spec: CodeEditorSpec) => (element: HTMLElement): Promise<Dialog.CustomEditorInit> => {
  const doc = element.ownerDocument;
  injectStyles(doc);

  element.className = `onlc-code ${spec.lineNumbers ? 'onlc-code--numbered' : 'onlc-code--plain'}`;
  element.innerHTML = '';

  const stack = doc.createElement('div');
  stack.className = 'onlc-code__stack';

  const view = doc.createElement('pre');
  view.className = 'onlc-code__view';
  view.setAttribute('aria-hidden', 'true');

  const input = doc.createElement('textarea');
  input.className = 'onlc-code__input';
  input.spellcheck = false;
  input.setAttribute('autocapitalize', 'off');
  input.setAttribute('autocomplete', 'off');
  input.setAttribute('autocorrect', 'off');
  input.setAttribute('data-onlc-language', spec.language);
  if (Type.isString(spec.label)) {
    input.setAttribute('aria-label', spec.label);
  }

  stack.appendChild(view);
  stack.appendChild(input);
  element.appendChild(stack);

  const indent = new Array(Math.max(1, spec.tabSize) + 1).join(' ');

  const render = () => {
    // Une ligne vide finale garde de la place sous la dernière ligne saisie.
    const lines = Highlight.highlightLines(input.value + '\n', spec.language);
    view.innerHTML = Arr.map(lines, (line, index) =>
      `<span class="onlc-code__line" data-line="${index + 1}">${line}</span>`).join('');
    // La zone de saisie fait exactement la hauteur du texte : elle ne doit jamais défiler
    // pour son propre compte, sinon les deux couches se décalent.
    input.scrollTop = 0;
    input.scrollLeft = 0;
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab' || e.ctrlKey || e.metaKey || e.altKey) {
      return;
    }
    e.preventDefault();
    const start = input.selectionStart;
    const end = input.selectionEnd;
    input.value = input.value.substring(0, start) + indent + input.value.substring(end);
    input.selectionStart = input.selectionEnd = start + indent.length;
    render();
  };

  input.addEventListener('input', render);
  input.addEventListener('keydown', onKeyDown);

  render();

  return Promise.resolve({
    getValue: () => input.value,
    setValue: (value: string) => {
      input.value = value;
      render();
    },
    destroy: () => {
      input.removeEventListener('input', render);
      input.removeEventListener('keydown', onKeyDown);
      element.innerHTML = '';
    }
  });
};

/**
 * Ready to use dialog item for a code field.
 */
const field = (name: string, label: string, spec: CodeEditorSpec): Dialog.BodyComponentSpec => ({
  type: 'customeditor',
  name,
  tag: 'div',
  init: create({ ...spec, label })
});

export {
  create,
  field
};
