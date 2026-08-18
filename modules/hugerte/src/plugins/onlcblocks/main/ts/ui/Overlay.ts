import { Arr, Optional, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

import * as Blocks from '../core/Blocks';

/**
 * Editing overlay drawn inside the editable area: the outline of the hovered block, its toolbar
 * (move, duplicate, delete, add) and the buttons used to add a block at the very beginning or at
 * the very end of the document.
 *
 * Every node of the overlay carries `data-mce-bogus="all"`, so none of it ever reaches the
 * serialized content.
 */

export interface OverlayHandlers {
  readonly onAction: (action: string, block: Optional<HTMLElement>) => void;
  readonly onDragStart: (event: MouseEvent, block: HTMLElement) => void;
}

export interface Overlay {
  readonly show: (block: HTMLElement) => void;
  readonly hide: () => void;
  readonly refresh: () => void;
  readonly getActive: () => Optional<HTMLElement>;
  readonly showIndicator: (block: HTMLElement, position: 'before' | 'after' | 'append') => void;
  readonly hideIndicator: () => void;
  readonly destroy: () => void;
}

interface ToolbarButton {
  readonly action: string;
  readonly icon: string;
  readonly label: string;
}

const buttons: ToolbarButton[] = [
  { action: 'drag', icon: '⠿', label: 'Déplacer le bloc' },
  { action: 'up', icon: '↑', label: 'Monter le bloc' },
  { action: 'down', icon: '↓', label: 'Descendre le bloc' },
  { action: 'parent', icon: '⤒', label: 'Sélectionner le bloc parent' },
  { action: 'duplicate', icon: '⧉', label: 'Dupliquer le bloc' },
  { action: 'remove', icon: '✕', label: 'Supprimer le bloc' }
];

const buttonHtml = (button: ToolbarButton): string =>
  `<button type="button" class="onlc-blocks-btn" data-onlc-action="${button.action}" title="${button.label}" aria-label="${button.label}">${button.icon}</button>`;

const layerHtml = (): string =>
  '<div class="onlc-blocks-outline" data-onlc-part="outline"></div>' +
  `<div class="onlc-blocks-toolbar" data-onlc-part="toolbar">${Arr.map(buttons, buttonHtml).join('')}</div>` +
  '<button type="button" class="onlc-blocks-add onlc-blocks-add--before" data-onlc-part="add-before" data-onlc-action="insert-before" title="Ajouter un bloc avant">+</button>' +
  '<button type="button" class="onlc-blocks-add onlc-blocks-add--after" data-onlc-part="add-after" data-onlc-action="insert-after" title="Ajouter un bloc après">+</button>' +
  '<div class="onlc-blocks-indicator" data-onlc-part="indicator"></div>' +
  '<button type="button" class="onlc-blocks-edge" data-onlc-part="edge-start" data-onlc-action="insert-start">+ Ajouter un bloc au début</button>' +
  '<button type="button" class="onlc-blocks-edge" data-onlc-part="edge-end" data-onlc-action="insert-end">+ Ajouter un bloc à la fin</button>';

const create = (editor: Editor, handlers: OverlayHandlers): Overlay => {
  let active = Optional.none<HTMLElement>();
  let layer: HTMLElement | null = null;

  const part = (name: string): HTMLElement | null =>
    Type.isNonNullable(layer) ? layer.querySelector<HTMLElement>(`[data-onlc-part="${name}"]`) : null;

  const setPosition = (element: HTMLElement | null, styles: Record<string, string>) => {
    if (Type.isNonNullable(element)) {
      editor.dom.setStyles(element, styles);
    }
  };

  const setVisible = (element: HTMLElement | null, state: boolean) => {
    if (Type.isNonNullable(element)) {
      editor.dom.toggleClass(element, 'onlc-blocks-hidden', !state);
    }
  };

  const ensureLayer = (): HTMLElement | null => {
    const body = editor.getBody();
    if (!Type.isNonNullable(body)) {
      return null;
    }

    if (!Type.isNonNullable(layer) || !body.contains(layer)) {
      layer = editor.dom.create('div', {
        class: 'onlc-blocks-ui',
        'data-onlc-ui': '1',
        'data-mce-bogus': 'all',
        contenteditable: 'false'
      }, layerHtml());
      body.appendChild(layer);

      editor.dom.bind(layer, 'mousedown', (e: MouseEvent) => {
        const target = e.target as HTMLElement | null;
        const button = Type.isNonNullable(target) ? target.closest<HTMLElement>('[data-onlc-action]') : null;
        if (!Type.isNonNullable(button)) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();

        const action = button.getAttribute('data-onlc-action') ?? '';
        if (action === 'drag') {
          active.each((block) => handlers.onDragStart(e, block));
        }
      });

      editor.dom.bind(layer, 'click', (e: MouseEvent) => {
        const target = e.target as HTMLElement | null;
        const button = Type.isNonNullable(target) ? target.closest<HTMLElement>('[data-onlc-action]') : null;
        if (!Type.isNonNullable(button)) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();

        const action = button.getAttribute('data-onlc-action') ?? '';
        if (action !== 'drag') {
          handlers.onAction(action, active);
        }
      });
    }

    return layer;
  };

  const rectOf = (element: HTMLElement) => {
    const pos = editor.dom.getPos(element, editor.getBody());
    return {
      x: pos.x,
      y: pos.y,
      width: element.offsetWidth,
      height: element.offsetHeight
    };
  };

  const positionEdges = () => {
    const body = editor.getBody();
    if (!Type.isNonNullable(body)) {
      return;
    }
    const blocks = Blocks.topLevelBlocks(editor);
    const first = blocks[0];
    const last = blocks[blocks.length - 1];

    const start = part('edge-start');
    const end = part('edge-end');

    if (Type.isNonNullable(first)) {
      const rect = rectOf(first);
      setPosition(start, { top: `${Math.max(0, rect.y - 26)}px`, left: `${rect.x}px` });
    } else {
      setPosition(start, { top: '0px', left: '0px' });
    }

    if (Type.isNonNullable(last)) {
      const rect = rectOf(last);
      setPosition(end, { top: `${rect.y + rect.height + 6}px`, left: `${rect.x}px` });
    } else {
      setPosition(end, { top: '24px', left: '0px' });
    }

    setVisible(start, true);
    setVisible(end, true);
  };

  const positionForBlock = (block: HTMLElement) => {
    const rect = rectOf(block);

    setPosition(part('outline'), {
      top: `${rect.y}px`,
      left: `${rect.x}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`
    });
    setPosition(part('toolbar'), {
      top: `${Math.max(0, rect.y - 30)}px`,
      left: `${rect.x}px`
    });
    setPosition(part('add-before'), {
      top: `${Math.max(0, rect.y - 12)}px`,
      left: `${rect.x + rect.width / 2 - 12}px`
    });
    setPosition(part('add-after'), {
      top: `${rect.y + rect.height - 12}px`,
      left: `${rect.x + rect.width / 2 - 12}px`
    });

    Arr.each([ 'outline', 'toolbar', 'add-before', 'add-after' ], (name) => setVisible(part(name), true));
  };

  const show = (block: HTMLElement) => {
    if (!Type.isNonNullable(ensureLayer())) {
      return;
    }
    active = Optional.some(block);
    positionForBlock(block);
    positionEdges();
  };

  const hide = () => {
    active = Optional.none();
    Arr.each([ 'outline', 'toolbar', 'add-before', 'add-after', 'indicator' ], (name) => setVisible(part(name), false));
  };

  const refresh = () => {
    if (!Type.isNonNullable(ensureLayer())) {
      return;
    }
    positionEdges();
    active.each((block) => {
      if (editor.getBody().contains(block)) {
        positionForBlock(block);
      } else {
        hide();
      }
    });
  };

  const showIndicator = (block: HTMLElement, position: 'before' | 'after' | 'append') => {
    const indicator = part('indicator');
    const rect = rectOf(block);
    const top = position === 'before' ? rect.y : rect.y + rect.height;

    setPosition(indicator, {
      top: `${(position === 'append' ? rect.y + rect.height - 3 : top) - 1}px`,
      left: `${rect.x}px`,
      width: `${rect.width}px`
    });
    setVisible(indicator, true);
  };

  const hideIndicator = () => setVisible(part('indicator'), false);

  const destroy = () => {
    if (Type.isNonNullable(layer)) {
      editor.dom.remove(layer);
      layer = null;
    }
    active = Optional.none();
  };

  return {
    show,
    hide,
    refresh,
    getActive: () => active,
    showIndicator,
    hideIndicator,
    destroy
  };
};

export {
  create
};
