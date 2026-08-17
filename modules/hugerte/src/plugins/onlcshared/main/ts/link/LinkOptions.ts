import { Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

import { LinkListEntry, LinkListItem } from './LinkTypes';

export type LinkListSetting = false | string | LinkListEntry[] | ((callback: (items: LinkListEntry[]) => void) => void);

const option = <T>(name: string) => (editor: Editor): T => editor.options.get(name) as T;

const defaultRelList: LinkListItem[] = [
  { text: 'Aucune', value: '' },
  { text: 'nofollow', value: 'nofollow' },
  { text: 'noopener', value: 'noopener' },
  { text: 'noreferrer', value: 'noreferrer' },
  { text: 'noopener noreferrer', value: 'noopener noreferrer' },
  { text: 'nofollow noopener noreferrer', value: 'nofollow noopener noreferrer' },
  { text: 'sponsored', value: 'sponsored' },
  { text: 'ugc', value: 'ugc' },
  { text: 'external', value: 'external' },
  { text: 'author', value: 'author' },
  { text: 'bookmark', value: 'bookmark' },
  { text: 'help', value: 'help' },
  { text: 'license', value: 'license' },
  { text: 'alternate', value: 'alternate' }
];

const defaultTargetList: LinkListItem[] = [
  { text: 'Même onglet', value: '' },
  { text: 'Nouvel onglet', value: '_blank' }
];

/**
 * Registers the link options. Several ONLC plugins expose the same link section, so the
 * registration is idempotent.
 */
const register = (editor: Editor): void => {
  // Several ONLC plugins share this section, the first one to load registers the options
  if (editor.options.isRegistered('onlc_link_api_url')) {
    return;
  }

  const registerOnce = editor.options.register;

  registerOnce('onlc_link_api_url', {
    processor: 'string',
    default: ''
  });

  registerOnce('onlc_link_api_headers', {
    processor: 'object',
    default: {}
  });

  registerOnce('onlc_link_api_credentials', {
    processor: 'string',
    default: 'same-origin'
  });

  registerOnce('onlc_link_list', {
    processor: (value) => {
      const valid = value === false || Type.isString(value) || Type.isArray(value) || Type.isFunction(value);
      return valid ? { value, valid } : { valid: false, message: 'Must be false, a string, an array or a function.' };
    },
    default: false
  });

  registerOnce('onlc_link_rel_list', {
    processor: 'object[]',
    default: defaultRelList
  });

  registerOnce('onlc_link_target_list', {
    processor: 'object[]',
    default: defaultTargetList
  });

  registerOnce('onlc_link_class_list', {
    processor: 'object[]',
    default: []
  });

  registerOnce('onlc_link_anchors', {
    processor: 'boolean',
    default: true
  });

  registerOnce('onlc_link_default_target', {
    processor: 'string',
    default: ''
  });

  registerOnce('onlc_link_default_rel', {
    processor: 'string',
    default: ''
  });
};

const getApiUrl = option<string>('onlc_link_api_url');
const getApiHeaders = option<Record<string, string>>('onlc_link_api_headers');
const getApiCredentials = option<RequestCredentials>('onlc_link_api_credentials');
const getLinkList = option<LinkListSetting>('onlc_link_list');
const getRelList = option<LinkListItem[]>('onlc_link_rel_list');
const getTargetList = option<LinkListItem[]>('onlc_link_target_list');
const getClassList = option<LinkListItem[]>('onlc_link_class_list');
const useAnchors = option<boolean>('onlc_link_anchors');
const getDefaultTarget = option<string>('onlc_link_default_target');
const getDefaultRel = option<string>('onlc_link_default_rel');

export {
  register,
  defaultRelList,
  defaultTargetList,
  getApiUrl,
  getApiHeaders,
  getApiCredentials,
  getLinkList,
  getRelList,
  getTargetList,
  getClassList,
  useAnchors,
  getDefaultTarget,
  getDefaultRel
};
