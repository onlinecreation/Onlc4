import Editor from 'hugerte/core/api/Editor';

import { WidgetDefinition } from '../api/Types';
import * as Advanced from './widgets/Advanced';
import * as Calendar from './widgets/Calendar';
import * as Common from './widgets/Common';
import * as Content from './widgets/Content';
import * as Maps from './widgets/Maps';
import * as Media from './widgets/Media';

/**
 * The predefined blocks shipped with the plugin. `getBuiltIns` binds them to an editor so that
 * the renderers can read the options - video ratio, cdn base and so on.
 *
 * Les définitions elles-mêmes sont réparties par famille dans `core/widgets`, pour que chaque
 * fichier reste lisible d'un bout à l'autre.
 */

const getBuiltIns = (editor: Editor): WidgetDefinition[] =>
  ([] as WidgetDefinition[])
    .concat(Content.all)
    .concat(Media.all(editor))
    .concat(Maps.all(editor))
    .concat(Calendar.all(editor))
    .concat(Advanced.all);

export {
  getBuiltIns
};

export const targets = Common.targets;
export const rels = Common.rels;
export const alignments = Common.alignments;
export const ratios = Common.ratios;
