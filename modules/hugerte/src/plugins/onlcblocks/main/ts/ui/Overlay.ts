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
  '<div class="onlc-blocks-indicator" data-onlc-part="indicator"></div>';

/**
 * Les zones d'ajout de début et de fin sont posées dans le flux du document, avant le premier
 * bloc et après le dernier : elles ne recouvrent jamais le contenu.
 */
const edgeZoneHtml = (position: 'start' | 'end'): string =>
  `<button type="button" class="onlc-blocks-edge" data-onlc-action="insert-${position}">` +
  `<span class="onlc-blocks-edge__plus">+</span>` +
  `<span>Ajouter un bloc ${position === 'start' ? 'au début' : 'à la fin'}</span></button>`;

/** Diamètre des boutons « + », en pixels. Doit rester synchronisé avec onlcblocks.css. */
const addButtonSize = 28;

const create = (editor: Editor, handlers: OverlayHandlers): Overlay => {
  let active = Optional.none<HTMLElement>();
  let layer: HTMLElement | null = null;
  const edges: Record<'start' | 'end', HTMLElement | null> = { start: null, end: null };

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

  /** Un seul jeu de gestionnaires pour l'overlay et pour les zones d'ajout. */
  const bindActions = (root: HTMLElement) => {
    const buttonOf = (e: MouseEvent): HTMLElement | null => {
      const target = e.target as HTMLElement | null;
      return Type.isNonNullable(target) ? target.closest<HTMLElement>('[data-onlc-action]') : null;
    };

    editor.dom.bind(root, 'mousedown', (e: MouseEvent) => {
      const button = buttonOf(e);
      if (!Type.isNonNullable(button)) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();

      if ((button.getAttribute('data-onlc-action') ?? '') === 'drag') {
        active.each((block) => handlers.onDragStart(e, block));
      }
    });

    editor.dom.bind(root, 'click', (e: MouseEvent) => {
      const button = buttonOf(e);
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

      bindActions(layer);
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

  /**
   * Crée les zones d'ajout et les maintient en première et dernière position du document,
   * quelles que soient les modifications du contenu.
   */
  const ensureEdges = () => {
    const body = editor.getBody();
    if (!Type.isNonNullable(body)) {
      return;
    }

    Arr.each([ 'start', 'end' ] as Array<'start' | 'end'>, (position) => {
      const existing = edges[position];
      if (!Type.isNonNullable(existing) || !body.contains(existing)) {
        const zone = editor.dom.create('div', {
          class: `onlc-blocks-edge-zone onlc-blocks-edge-zone--${position}`,
          'data-onlc-ui': '1',
          'data-onlc-part': `edge-${position}`,
          'data-mce-bogus': 'all',
          contenteditable: 'false'
        }, edgeZoneHtml(position));
        edges[position] = zone;
        bindActions(zone);
      }

      const zone = edges[position] as HTMLElement;
      if (position === 'start') {
        if (body.firstChild !== zone) {
          body.insertBefore(zone, body.firstChild);
        }
      } else if (body.lastChild !== zone) {
        body.appendChild(zone);
      }
    });
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
    // Les boutons + sont centrés sur le bord haut et sur le bord bas du bloc. Celui du haut
    // n'apparaît que sur le premier bloc d'un conteneur : ailleurs, le bouton du bas du bloc
    // précédent occupe déjà le même espace.
    const half = addButtonSize / 2;
    const siblings = Blocks.siblingBlocks(editor, block);
    const isFirst = siblings.length === 0 || siblings[0] === block;
    setPosition(part('add-before'), {
      top: `${Math.max(0, rect.y - half)}px`,
      left: `${rect.x + rect.width / 2 - half}px`
    });
    setPosition(part('add-after'), {
      top: `${rect.y + rect.height - half}px`,
      left: `${rect.x + rect.width / 2 - half}px`
    });

    Arr.each([ 'outline', 'toolbar', 'add-after' ], (name) => setVisible(part(name), true));
    setVisible(part('add-before'), isFirst);
  };

  const show = (block: HTMLElement) => {
    if (!Type.isNonNullable(ensureLayer())) {
      return;
    }
    active = Optional.some(block);
    positionForBlock(block);
    ensureEdges();
  };

  const hide = () => {
    active = Optional.none();
    Arr.each([ 'outline', 'toolbar', 'add-before', 'add-after', 'indicator' ], (name) => setVisible(part(name), false));
  };

  const refresh = () => {
    if (!Type.isNonNullable(ensureLayer())) {
      return;
    }
    ensureEdges();
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
    Arr.each([ 'start', 'end' ] as Array<'start' | 'end'>, (position) => {
      const zone = edges[position];
      if (Type.isNonNullable(zone)) {
        editor.dom.remove(zone);
        edges[position] = null;
      }
    });
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
