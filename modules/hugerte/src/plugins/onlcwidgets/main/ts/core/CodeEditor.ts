import { Type } from '@ephox/katamari';

import { Dialog } from 'hugerte/core/api/ui/Ui';

import { CodeLanguage } from '../api/Types';
import * as Highlight from './Highlight';

/**
 * A small code editor with syntax highlighting, plugged into dialogs through the
 * `customeditor` component. A transparent textarea is laid over a highlighted preview, which is
 * the simplest way to get colours without shipping a full editor library.
 */

export interface CodeEditorSpec {
  readonly language: CodeLanguage;
  readonly tabSize: number;
  readonly lineNumbers: boolean;
  readonly label?: string;
}

const styleId = 'onlc-code-editor-styles';

const styles = `
.onlc-code { position: relative; display: flex; width: 100%; min-height: 260px; max-height: 60vh; overflow: hidden; border: 1px solid rgba(34, 47, 62, 0.2); border-radius: 6px; background: #1f2430; color: #e6e6e6; }
.onlc-code__gutter { flex: 0 0 auto; padding: 12px 8px; text-align: right; color: rgba(230, 230, 230, 0.35); background: rgba(0, 0, 0, 0.15); user-select: none; overflow: hidden; }
.onlc-code__scroll { position: relative; flex: 1 1 auto; overflow: auto; }
.onlc-code__view, .onlc-code__input { margin: 0; padding: 12px; border: 0; font: inherit; white-space: pre; overflow-wrap: normal; tab-size: 2; }
.onlc-code__view { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
.onlc-code__input { position: relative; display: block; width: 100%; min-height: 100%; color: transparent; background: transparent; caret-color: #ffffff; outline: none; resize: none; }
.onlc-code__input::selection { background: rgba(0, 108, 231, 0.45); }
.onlc-code, .onlc-code__gutter, .onlc-code__view, .onlc-code__input { font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace; font-size: 13px; line-height: 1.5; }
.onlc-code__t--comment { color: #7f8c9b; font-style: italic; }
.onlc-code__t--string { color: #a3d977; }
.onlc-code__t--number { color: #e6b673; }
.onlc-code__t--keyword { color: #6cb6ff; }
.onlc-code__t--atom { color: #d19aff; }
.onlc-code__t--function { color: #f2c7ff; }
.onlc-code__t--operator, .onlc-code__t--punctuation { color: #b7c2cf; }
.onlc-code__t--tag { color: #ff8b8b; }
.onlc-code__t--attribute { color: #ffd479; }
`;

const injectStyles = (doc: Document): void => {
  if (doc.getElementById(styleId) === null) {
    const style = doc.createElement('style');
    style.id = styleId;
    style.textContent = styles;
    doc.head.appendChild(style);
  }
};

const countLines = (value: string): number => value.split('\n').length;

/**
 * Builds the `init` function expected by the `customeditor` dialog component.
 */
const create = (spec: CodeEditorSpec) => (element: HTMLElement): Promise<Dialog.CustomEditorInit> => {
  const doc = element.ownerDocument;
  injectStyles(doc);

  element.className = 'onlc-code';
  element.innerHTML = '';

  const gutter = doc.createElement('div');
  gutter.className = 'onlc-code__gutter';

  const scroll = doc.createElement('div');
  scroll.className = 'onlc-code__scroll';

  const view = doc.createElement('pre');
  view.className = 'onlc-code__view';
  view.setAttribute('aria-hidden', 'true');

  const input = doc.createElement('textarea');
  input.className = 'onlc-code__input';
  input.spellcheck = false;
  input.setAttribute('wrap', 'off');
  input.setAttribute('autocapitalize', 'off');
  input.setAttribute('autocomplete', 'off');
  input.setAttribute('data-onlc-language', spec.language);
  if (Type.isString(spec.label)) {
    input.setAttribute('aria-label', spec.label);
  }

  scroll.appendChild(view);
  scroll.appendChild(input);
  if (spec.lineNumbers) {
    element.appendChild(gutter);
  }
  element.appendChild(scroll);

  const indent = new Array(Math.max(1, spec.tabSize) + 1).join(' ');

  const renderGutter = (value: string) => {
    if (!spec.lineNumbers) {
      return;
    }
    const lines = countLines(value);
    let html = '';
    for (let i = 1; i <= lines; i++) {
      html += i + '\n';
    }
    gutter.textContent = html;
  };

  const render = () => {
    const value = input.value;
    // A trailing new line keeps the last line visible while scrolling
    view.innerHTML = Highlight.highlight(value + '\n', spec.language);
    renderGutter(value);
    input.style.height = 'auto';
    input.style.height = `${input.scrollHeight}px`;
  };

  const onScroll = () => {
    gutter.scrollTop = scroll.scrollTop;
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
  scroll.addEventListener('scroll', onScroll);
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
      scroll.removeEventListener('scroll', onScroll);
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
