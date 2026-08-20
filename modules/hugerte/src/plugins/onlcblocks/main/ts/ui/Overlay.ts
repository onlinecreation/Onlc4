import { Arr, Optional, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

import * as Blocks from '../core/Blocks';
import * as Multilang from '../core/Multilang';

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
  readonly toggleLanguageMenu: () => void;
  readonly closeLanguageMenu: () => void;
  readonly destroy: () => void;
}

interface ToolbarButton {
  readonly action: string;
  readonly icon: string;
  readonly label: string;
}

/** Globe dessiné : les glyphes de globe manquent dans beaucoup de polices de contenu. */
const globeIcon = (size: number): string =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" focusable="false" aria-hidden="true">` +
  '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"></circle>' +
  '<path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9S14.5 18.4 12 21C9.5 18.4 8.2 15.4 8.2 12S9.5 5.6 12 3z"' +
  ' fill="none" stroke="currentColor" stroke-width="1.6"></path></svg>';

const baseButtons: ToolbarButton[] = [
  { action: 'drag', icon: '⠿', label: 'Déplacer le bloc' },
  { action: 'up', icon: '↑', label: 'Monter le bloc' },
  { action: 'down', icon: '↓', label: 'Descendre le bloc' },
  { action: 'parent', icon: '⤒', label: 'Sélectionner le bloc parent' },
  { action: 'duplicate', icon: '⧉', label: 'Dupliquer le bloc' },
  { action: 'remove', icon: '✕', label: 'Supprimer le bloc' }
];

/**
 * Le bouton de langue ne s'ajoute que si le plugin polyglotte est chargé.
 *
 * Sur un site monolingue, un bouton qui ne mène qu'à une liste vide n'apprend rien à personne et
 * occupe une place que la barre n'a pas.
 */
const buttonsFor = (editor: Editor): ToolbarButton[] =>
  Multilang.isAvailable(editor) && Multilang.languages(editor).length > 0
    ? baseButtons.concat([{ action: 'lang', icon: globeIcon(20), label: 'Langue du bloc' }])
    : baseButtons;

/** Croix dessinée : un « + » textuel dépend de la police du contenu et se décentre. */
const plusIcon = (size: number): string =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" focusable="false" aria-hidden="true">` +
  '<path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"></path></svg>';

const buttonHtml = (button: ToolbarButton): string =>
  `<button type="button" class="onlc-blocks-btn" data-onlc-action="${button.action}" title="${button.label}" aria-label="${button.label}">${button.icon}</button>`;

const layerHtml = (editor: Editor): string =>
  '<div class="onlc-blocks-outline" data-onlc-part="outline"></div>' +
  `<div class="onlc-blocks-toolbar" data-onlc-part="toolbar">${Arr.map(buttonsFor(editor), buttonHtml).join('')}</div>` +
  '<div class="onlc-blocks-langmenu onlc-blocks-hidden" data-onlc-part="langmenu"></div>' +
  `<button type="button" class="onlc-blocks-add onlc-blocks-add--before" data-onlc-part="add-before" data-onlc-action="insert-before" title="Ajouter un bloc avant" aria-label="Ajouter un bloc avant">${plusIcon(16)}</button>` +
  `<button type="button" class="onlc-blocks-add onlc-blocks-add--after" data-onlc-part="add-after" data-onlc-action="insert-after" title="Ajouter un bloc après" aria-label="Ajouter un bloc après">${plusIcon(16)}</button>` +
  '<div class="onlc-blocks-indicator" data-onlc-part="indicator"></div>';

/**
 * Les zones d'ajout de début et de fin sont posées dans le flux du document, avant le premier
 * bloc et après le dernier : elles ne recouvrent jamais le contenu.
 */
const edgeZoneHtml = (position: 'start' | 'end'): string =>
  `<button type="button" class="onlc-blocks-edge" data-onlc-action="insert-${position}">` +
  `<span class="onlc-blocks-edge__plus">${plusIcon(14)}</span>` +
  `<span>Ajouter un bloc ${position === 'start' ? 'au début' : 'à la fin'}</span></button>`;

/** Diamètre des boutons « + », en pixels. Doit rester synchronisé avec onlcblocks.css. */
const addButtonSize = 28;

/** Dernier code de langue dessiné sur le bouton, pour ne le redessiner qu'au changement. */
const languageStateAttribute = 'data-onlc-lang-state';

const create = (editor: Editor, handlers: OverlayHandlers): Overlay => {
  let active = Optional.none<HTMLElement>();

  /**
   * Bloc visé par le geste en cours, figé au `mousedown`.
   *
   * Cliquer dans la barre fait passer l'éditeur par un `NodeChange`, et le bloc actif redevient
   * alors celui du curseur — pas celui qu'on survole. Sans ce gel, choisir une langue dans la
   * barre d'un bloc la posait sur un autre : celui où le curseur se trouvait resté.
   */
  let pinned = Optional.none<HTMLElement>();
  let layer: HTMLElement | null = null;
  const edges: Record<'start' | 'end', HTMLElement | null> = { start: null, end: null };

  /** Le bloc sur lequel agir : celui du geste en cours, à défaut celui qui est survolé. */
  const targetOf = (): Optional<HTMLElement> => pinned.or(active);

  const isLanguageMenuOpen = (): boolean => {
    const menu = layer === null ? null : layer.querySelector<HTMLElement>('[data-onlc-part="langmenu"]');
    return Type.isNonNullable(menu) && !editor.dom.hasClass(menu, 'onlc-blocks-hidden');
  };

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
      pinned = active;

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
        handlers.onAction(action, targetOf());
      }
      // Le gel ne survit pas au geste, sauf tant que le menu des langues reste ouvert : c'est
      // le même bloc qu'on vient de désigner et dont on va choisir la langue.
      if (!isLanguageMenuOpen()) {
        pinned = Optional.none();
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
      }, layerHtml(editor));
      body.appendChild(layer);

      bindActions(layer);

      // Un clic ailleurs referme le menu des langues, comme n'importe quel menu contextuel.
      editor.dom.bind(body, 'mousedown', (e: MouseEvent) => {
        const target = e.target as HTMLElement | null;
        const inside = Type.isNonNullable(target) && Type.isNonNullable(target.closest('[data-onlc-ui]'));
        if (!inside && isLanguageMenuOpen()) {
          closeLanguageMenu();
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

  /**
   * Garde une bande horizontale à l'intérieur de la zone d'édition.
   *
   * Sur un téléphone, la barre d'un bloc étroit ou décalé à droite sortait du cadre : ses
   * derniers boutons devenaient inatteignables. Elle est donc ramenée dans les bords, quitte à
   * ne plus être alignée sur le bloc — mieux vaut décalée que hors d'atteinte.
   */
  const clampLeft = (left: number, width: number): number => {
    const body = editor.getBody();
    const available = Type.isNonNullable(body) ? body.clientWidth : 0;
    return available <= 0 || width <= 0 ? Math.max(0, left) : Math.max(0, Math.min(left, available - width));
  };

  const positionForBlock = (block: HTMLElement) => {
    const rect = rectOf(block);

    setPosition(part('outline'), {
      top: `${rect.y}px`,
      left: `${rect.x}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`
    });

    // Les tailles viennent de la feuille de styles, qui les augmente sur écran tactile : on les
    // mesure au lieu de les redire ici, pour que les deux ne puissent pas diverger.
    const toolbar = part('toolbar');
    if (Type.isNonNullable(toolbar)) {
      setVisible(toolbar, true);
      const height = toolbar.offsetHeight > 0 ? toolbar.offsetHeight : 30;
      setPosition(toolbar, {
        top: `${Math.max(0, rect.y - height - 2)}px`,
        left: `${clampLeft(rect.x, toolbar.offsetWidth)}px`
      });
    }

    // Les boutons + sont centrés sur le bord haut et sur le bord bas du bloc. Celui du haut
    // n'apparaît que sur le premier bloc d'un conteneur : ailleurs, le bouton du bas du bloc
    // précédent occupe déjà le même espace.
    const before = part('add-before');
    const measured = Type.isNonNullable(before) && before.offsetWidth > 0 ? before.offsetWidth : addButtonSize;
    const half = measured / 2;
    const siblings = Blocks.siblingBlocks(editor, block);
    const isFirst = siblings.length === 0 || siblings[0] === block;
    const centre = clampLeft(rect.x + rect.width / 2 - half, measured);

    setPosition(before, {
      top: `${Math.max(0, rect.y - half)}px`,
      left: `${centre}px`
    });
    setPosition(part('add-after'), {
      top: `${rect.y + rect.height - half}px`,
      left: `${centre}px`
    });

    Arr.each([ 'outline', 'toolbar', 'add-after' ], (name) => setVisible(part(name), true));
    setVisible(part('add-before'), isFirst);

    // Le bouton porte le code de la langue posée sur le bloc : on voit d'un coup d'œil, sans
    // ouvrir le menu, si ce bloc est réservé à une langue.
    //
    // Il n'est redessiné que lorsque ce code **change**. Le repositionnement tourne à chaque
    // mouvement de souris ; remplacer le contenu du bouton à chaque passage détachait le nœud
    // visé par le `mousedown` avant que le `mouseup` n'arrive, et le navigateur n'émettait alors
    // aucun `click` — le bouton restait inerte sans que rien ne le signale.
    const lang = Type.isNonNullable(toolbar) ? toolbar.querySelector<HTMLElement>('[data-onlc-action="lang"]') : null;
    if (Type.isNonNullable(lang)) {
      const code = Multilang.codeOf(editor, block);
      if (lang.getAttribute(languageStateAttribute) !== code) {
        lang.setAttribute(languageStateAttribute, code);
        editor.dom.toggleClass(lang, 'onlc-blocks-btn--on', code !== '');
        lang.innerHTML = code === '' ? globeIcon(20) : editor.dom.encode(code.toUpperCase());
      }
    }
  };

  /**
   * Le menu des langues, dessiné dans la couche de l'overlay.
   *
   * Il vit là plutôt que dans l'interface du thème parce que la barre des blocs elle-même y vit :
   * un menu du thème s'ouvrirait par-dessus l'iframe, à un autre endroit que le bouton qui vient
   * d'être cliqué, et se refermerait au premier mouvement de souris qui sort de la zone d'édition.
   */
  const languageMenuHtml = (block: HTMLElement): string => {
    const current = Multilang.codeOf(editor, block);

    const item = (code: string, label: string): string =>
      `<button type="button" class="onlc-blocks-langitem${code === current ? ' onlc-blocks-langitem--current' : ''}"` +
      ` data-onlc-action="lang:${code}" role="menuitemradio" aria-checked="${code === current}">${editor.dom.encode(label)}</button>`;

    return `<div class="onlc-blocks-langmenu__title">${editor.dom.encode(editor.translate('Langue du bloc') as string)}</div>` +
      item('', editor.translate('Aucune — visible par tous') as string) +
      Arr.map(Multilang.languages(editor), (language) => item(language.code, language.label)).join('');
  };

  const closeLanguageMenu = () => {
    setVisible(part('langmenu'), false);
    pinned = Optional.none();
  };

  const toggleLanguageMenu = () => {
    const menu = part('langmenu');
    const toolbar = part('toolbar');

    if (!Type.isNonNullable(menu) || !Type.isNonNullable(toolbar)) {
      return;
    }
    if (isLanguageMenuOpen()) {
      closeLanguageMenu();
      return;
    }

    targetOf().each((block) => {
      menu.innerHTML = languageMenuHtml(block);
      setVisible(menu, true);

      // Sous la barre, aligné sur son bord gauche, et ramené dans le cadre s'il déborde.
      const top = parseInt(editor.dom.getStyle(toolbar, 'top') || '0', 10) + toolbar.offsetHeight + 2;
      const left = parseInt(editor.dom.getStyle(toolbar, 'left') || '0', 10);
      setPosition(menu, {
        top: `${top}px`,
        left: `${clampLeft(left, menu.offsetWidth)}px`
      });
    });
  };

  const show = (block: HTMLElement) => {
    if (!Type.isNonNullable(ensureLayer())) {
      return;
    }
    // Tant que le menu des langues est ouvert, l'overlay reste ancré sur le bloc qui l'a ouvert.
    // Le clic sur le bouton fait passer l'éditeur par un `NodeChange` — donc par ici, avec le
    // bloc du curseur : suivre ce mouvement déplacerait le menu sous les doigts de celui qui
    // vient de l'ouvrir, ou le refermerait aussitôt.
    if (isLanguageMenuOpen()) {
      return;
    }
    active = Optional.some(block);
    positionForBlock(block);
    ensureEdges();
  };

  const hide = () => {
    active = Optional.none();
    Arr.each([ 'outline', 'toolbar', 'add-before', 'add-after', 'indicator', 'langmenu' ],
      (name) => setVisible(part(name), false));
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
    toggleLanguageMenu,
    closeLanguageMenu,
    destroy
  };
};

export {
  create
};
