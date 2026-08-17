import { Optional, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

import { LinkAttributes } from './LinkTypes';

const emptyAttributes: LinkAttributes = {
  href: '',
  title: '',
  target: '',
  rel: '',
  classes: ''
};

const toAttributeMap = (attributes: LinkAttributes): Record<string, string | null> => ({
  href: attributes.href,
  title: attributes.title === '' ? null : attributes.title,
  target: attributes.target === '' ? null : attributes.target,
  rel: attributes.rel === '' ? null : attributes.rel,
  class: attributes.classes === '' ? null : attributes.classes
});

const readAttributes = (editor: Editor, anchor: HTMLAnchorElement): LinkAttributes => ({
  href: editor.dom.getAttrib(anchor, 'href'),
  title: editor.dom.getAttrib(anchor, 'title'),
  target: editor.dom.getAttrib(anchor, 'target'),
  rel: editor.dom.getAttrib(anchor, 'rel'),
  classes: editor.dom.getAttrib(anchor, 'class')
});

const getSelectedAnchor = (editor: Editor): Optional<HTMLAnchorElement> => {
  const node = editor.selection.getNode();
  const anchor = editor.dom.getParent<HTMLAnchorElement>(node, 'a[href]');
  return Optional.from(anchor);
};

/**
 * Wraps the given element - typically an image or a figure - into a link, or updates/removes
 * the link it is already wrapped into.
 */
const linkElement = (editor: Editor, element: HTMLElement, attributes: LinkAttributes): void => {
  const dom = editor.dom;
  const existing = dom.getParent<HTMLAnchorElement>(element, 'a[href]');

  if (attributes.href === '') {
    if (Type.isNonNullable(existing)) {
      dom.remove(existing, true);
    }
    return;
  }

  if (Type.isNonNullable(existing)) {
    dom.setAttribs(existing, toAttributeMap(attributes));
  } else {
    const anchor = dom.create('a', toAttributeMap(attributes));
    element.parentNode?.insertBefore(anchor, element);
    anchor.appendChild(element);
  }
};

/**
 * Applies a link to the current selection. When the selection is collapsed the link text is
 * inserted, using the given text or the url itself.
 */
const applyToSelection = (editor: Editor, attributes: LinkAttributes, text?: string): void => {
  const dom = editor.dom;

  editor.undoManager.transact(() => {
    const existing = getSelectedAnchor(editor);

    if (attributes.href === '') {
      existing.each(() => editor.execCommand('unlink'));
      return;
    }

    existing.fold(
      () => {
        if (editor.selection.isCollapsed()) {
          const label = Type.isString(text) && text.trim().length > 0 ? text : attributes.href;
          const anchor = dom.create('a', toAttributeMap(attributes), dom.encode(label));
          editor.insertContent(anchor.outerHTML);
        } else {
          editor.formatter.apply('link', { value: attributes.href });
          getSelectedAnchor(editor).each((anchor) => {
            dom.setAttribs(anchor, toAttributeMap(attributes));
          });
        }
      },
      (anchor) => {
        dom.setAttribs(anchor, toAttributeMap(attributes));
        if (Type.isString(text) && text.trim().length > 0 && anchor.textContent !== text) {
          anchor.textContent = text;
        }
      }
    );
  });

  editor.nodeChanged();
};

const unlink = (editor: Editor): void => {
  editor.undoManager.transact(() => {
    editor.execCommand('unlink');
  });
};

export {
  emptyAttributes,
  toAttributeMap,
  readAttributes,
  getSelectedAnchor,
  linkElement,
  applyToSelection,
  unlink
};
