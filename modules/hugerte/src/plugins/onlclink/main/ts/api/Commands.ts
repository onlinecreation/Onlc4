import { Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import * as LinkActions from 'hugerte/plugins/onlcshared/link/LinkActions';
import * as LinkApi from 'hugerte/plugins/onlcshared/link/LinkApi';
import { LinkAttributes } from 'hugerte/plugins/onlcshared/link/LinkTypes';

import * as Dialog from '../ui/Dialog';

const register = (editor: Editor): void => {
  editor.addCommand('OnlcLink', () => {
    Dialog.open(editor);
  });

  // Applies a link without any ui, for example from an external integration.
  editor.addCommand('OnlcApplyLink', (_ui, value?: Partial<LinkAttributes> & { text?: string }) => {
    if (!Type.isObject(value)) {
      return;
    }
    const attributes: LinkAttributes = {
      ...LinkActions.emptyAttributes,
      ...value
    };
    LinkActions.applyToSelection(editor, attributes, value.text);
  });

  editor.addCommand('OnlcUnlink', () => {
    LinkActions.unlink(editor);
  });

  // Drops the cached predefined links, for example after the site tree has been updated.
  editor.addCommand('OnlcRefreshLinkList', () => {
    LinkApi.invalidate(editor);
  });
};

export {
  register
};
