import PluginManager from 'hugerte/core/api/PluginManager';
import * as Anchors from 'hugerte/plugins/onlcshared/link/Anchors';
import * as LinkActions from 'hugerte/plugins/onlcshared/link/LinkActions';
import * as LinkApi from 'hugerte/plugins/onlcshared/link/LinkApi';
import { LinkAttributes, LinkListItem, LinkListOption } from 'hugerte/plugins/onlcshared/link/LinkTypes';
import * as LinkOptions from 'hugerte/plugins/onlcshared/link/Options';
import * as DialogStyles from 'hugerte/plugins/onlcshared/ui/DialogStyles';

import * as Commands from './api/Commands';
import * as FilterContent from './core/FilterContent';
import * as Buttons from './ui/Buttons';
import * as Dialog from './ui/Dialog';

/**
 * Link management: predefined links coming from an api, custom urls, in page anchors,
 * target and the most common rel values.
 *
 * @class hugerte.onlclink.Plugin
 * @private
 */

export interface OnlcLinkApi {
  readonly openDialog: () => void;
  readonly getLinkList: () => Promise<LinkListOption[]>;
  readonly getAnchors: () => LinkListItem[];
  readonly applyLink: (attributes: Partial<LinkAttributes>, text?: string) => void;
  readonly unlink: () => void;
  readonly refresh: () => void;
}

export default (): void => {
  PluginManager.add('onlclink', (editor): OnlcLinkApi => {
    LinkOptions.register(editor);

    DialogStyles.setup(editor);

    Commands.register(editor);
    FilterContent.setup(editor);
    Buttons.register(editor);

    return {
      openDialog: () => Dialog.open(editor),
      getLinkList: () => LinkApi.getLinks(editor),
      getAnchors: () => Anchors.getAnchors(editor),
      applyLink: (attributes: Partial<LinkAttributes>, text?: string) =>
        LinkActions.applyToSelection(editor, { ...LinkActions.emptyAttributes, ...attributes }, text),
      unlink: () => LinkActions.unlink(editor),
      refresh: () => LinkApi.invalidate(editor)
    };
  });
};
