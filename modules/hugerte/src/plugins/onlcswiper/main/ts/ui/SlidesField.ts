import { Arr, Fun, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import { Dialog } from 'hugerte/core/api/ui/Ui';

import * as Slides from '../core/Slides';

/**
 * La liste des vues d'un diaporama, avec leurs images.
 *
 * Un diaporama se règle par ses vues avant tout : en ajouter une, en retirer une, changer leur
 * ordre. Le composant présente donc chaque vue en clair — sa vignette, l'adresse de son image, son
 * texte de remplacement — avec les deux flèches qui la déplacent et la croix qui la retire.
 *
 * Les vues **libres** (celles qui contiennent autre chose que des images) sont montrées comme
 * telles, avec un extrait de leur texte, et sans champ à remplir : leur contenu se modifie
 * directement dans la page. Les masquer ferait croire qu'elles n'existent pas, et les déplacer
 * deviendrait impossible.
 *
 * Le texte de remplacement n'est pas facultatif dans l'esprit : c'est ce que lit un lecteur
 * d'écran, et ce que les moteurs de recherche indexent. Il est demandé pour chaque image, avec
 * l'explication qui va avec, plutôt que caché derrière un bouton « avancé ».
 */

const styleId = 'onlc-swiper-slides-styles';

const styles = `
/**
 * La liste des vues **défile**.
 *
 * Le dialogue place un composant libre dans un cadre en overflow:hidden, dont la hauteur vient du
 * flex : un diaporama de huit vues n'en montrait que trois, et les cinq autres étaient hors
 * d'atteinte, sans barre de défilement pour le dire.
 *
 * Le composant prend donc la hauteur de son cadre, et c'est la liste — et elle seule — qui
 * défile : les deux boutons d'ajout restent visibles en haut et en bas.
 */
.tox .onlc-slides {
  display: flex; flex-direction: column; gap: 10px;
  box-sizing: border-box; width: 100%; height: 100%; max-height: 100%; min-height: 240px;
  padding: 2px;
}
.tox .onlc-slides__scroll {
  display: flex; flex: 1 1 auto; flex-direction: column; gap: 10px;
  min-height: 80px; overflow-y: auto; overflow-x: hidden; padding-right: 4px;
}
.tox .onlc-slides__empty {
  padding: 14px; border: 1px dashed rgba(34, 47, 62, 0.3); border-radius: 8px;
  color: #5a6570; font-size: 13px; text-align: center;
}
.tox .onlc-slides__item {
  display: flex; gap: 12px; padding: 10px; align-items: center;
  border: 1px solid rgba(34, 47, 62, 0.16); border-radius: 8px; background: #fff;
}
.tox .onlc-slides__item--dragged { opacity: 0.4; }
.tox .onlc-slides__item--over { border-color: #006ce7; box-shadow: inset 0 3px 0 #006ce7; }

/** La poignée : c'est elle qu'on saisit, et elle seule — un champ de texte doit rester saisissable. */
.tox .onlc-slides__grip {
  flex: 0 0 auto; display: flex; align-items: center; justify-content: center;
  width: 28px; align-self: stretch; border: 0; border-radius: 6px; padding: 0;
  background: transparent; color: #8a949e; font-size: 16px; line-height: 1; cursor: grab;
}
.tox .onlc-slides__grip:hover { background: #eef2f6; color: #22303c; }
.tox .onlc-slides__grip:active { cursor: grabbing; }
.tox .onlc-slides__thumb {
  flex: 0 0 auto; width: 72px; height: 72px; border-radius: 6px;
  background: #eef1f4 center/cover no-repeat; display: flex; align-items: center; justify-content: center;
  color: #8a949e; font-size: 11px; text-align: center;
}
.tox .onlc-slides__fields { display: flex; flex: 1 1 auto; min-width: 0; flex-direction: column; gap: 6px; }
.tox .onlc-slides__rank { font-size: 12px; font-weight: 600; color: #5a6570; }
.tox .onlc-slides__input {
  box-sizing: border-box; width: 100%; min-height: 40px; padding: 6px 10px;
  border: 1px solid rgba(34, 47, 62, 0.2); border-radius: 6px; font: inherit; color: #22303c;
}
.tox .onlc-slides__hint { margin: 0; color: #5a6570; font-size: 12px; }
.tox .onlc-slides__thumb--action { border: 0; padding: 0; cursor: pointer; }
.tox .onlc-slides__thumb--action:hover { outline: 2px solid #006ce7; outline-offset: 1px; }
.tox .onlc-slides__imageactions { display: flex; flex-wrap: wrap; gap: 6px; }
.tox .onlc-slides__free { margin: 0; color: #22303c; font-size: 13px; line-height: 1.5; }
.tox .onlc-slides__actions {
  display: flex; flex: 0 0 auto; flex-direction: column; gap: 4px;
  align-items: center; justify-content: center; align-self: center;
}
.tox .onlc-slides__btn {
  min-width: 40px; min-height: 40px; padding: 0 8px; border: 1px solid rgba(34, 47, 62, 0.18);
  border-radius: 6px; background: #fff; font: inherit; color: #22303c; cursor: pointer;
}
.tox .onlc-slides__btn:hover { background: #eef2f6; }
.tox .onlc-slides__btn:disabled { opacity: 0.4; cursor: default; }
.tox .onlc-slides__btn--danger:hover { background: #fdecec; color: #b4241f; }
.tox .onlc-slides__btn--wide { min-width: 0; padding: 0 12px; font-size: 13px; min-height: 36px; }
.tox .onlc-slides__bar { display: flex; flex: 0 0 auto; flex-wrap: wrap; gap: 8px; }
.tox .onlc-slides__add {
  min-height: 44px; padding: 0 14px; border: 1px solid transparent; border-radius: 8px;
  background: #006ce7; color: #fff; font: inherit; font-weight: 600; cursor: pointer;
}
.tox .onlc-slides__add:hover { background: #0059c1; }
.tox .onlc-slides__secondary {
  min-height: 44px; padding: 0 14px; border: 1px solid rgba(34, 47, 62, 0.18); border-radius: 8px;
  background: #fff; font: inherit; color: #22303c; cursor: pointer;
}
.tox .onlc-slides__secondary:hover { background: #eef2f6; }
`;

const ensureStyles = (doc: Document): void => {
  if (doc.getElementById(styleId) === null) {
    const style = doc.createElement('style');
    style.id = styleId;
    style.textContent = styles;
    doc.head.appendChild(style);
  }
};

/** Adresse posée en fond, avec les caractères qui refermeraient la déclaration encodés. */
const backgroundUrl = (url: string): string => {
  const escapes: Record<string, string> = { '\\': '%5C', '"': '%22', '\'': '%27', '(': '%28', ')': '%29' };
  return /^\s*(javascript|vbscript)\s*:/i.test(url)
    ? ''
    : `url(${url.trim().replace(/[\\"'()]|\s/g, (character) => escapes[character] ?? '%20')})`;
};

const create = (editor: Editor, initial: Slides.Slide[], onChange: (slides: Slides.Slide[]) => void) =>
  (element: HTMLElement): Promise<Dialog.CustomEditorInit> => {
    const doc = element.ownerDocument;
    ensureStyles(doc);

    const t = (text: string): string => editor.translate(text) as string;

    let slides: Slides.Slide[] = initial.slice();

    element.className = 'onlc-slides';

    // Une barre d'ajout en haut, la liste défilante au milieu, une seconde barre en bas : on
    // ajoute une vue là où on la veut sans avoir à parcourir toute la liste.
    const barreHaut = doc.createElement('div');
    barreHaut.className = 'onlc-slides__bar';

    const list = doc.createElement('div');
    list.className = 'onlc-slides__scroll';

    const bar = doc.createElement('div');
    bar.className = 'onlc-slides__bar';

    element.appendChild(barreHaut);
    element.appendChild(list);
    element.appendChild(bar);

    const publish = () => onChange(slides);

    const replace = (index: number, slide: Slides.Slide) => {
      slides = Arr.map(slides, (candidate, at) => at === index ? slide : candidate);
      publish();
    };

    /** Vue saisie à la poignée, le temps du geste. */
    let saisie: number | null = null;

    /** Déplace une vue à une position donnée, en gardant l'ordre des autres. */
    const moveTo = (from: number, to: number) => {
      if (from === to || to < 0 || to >= slides.length) {
        return;
      }
      const updated = slides.slice();
      const [ deplacee ] = updated.splice(from, 1);
      updated.splice(to, 0, deplacee);
      slides = updated;
      publish();
      render();
    };

    const move = (index: number, delta: number) => {
      const target = index + delta;
      if (target < 0 || target >= slides.length) {
        return;
      }
      const updated = slides.slice();
      const [ moved ] = updated.splice(index, 1);
      updated.splice(target, 0, moved);
      slides = updated;
      publish();
      render();
    };

    const button = (label: string, title: string, cls: string, onClick: () => void): HTMLButtonElement => {
      const node = doc.createElement('button');
      node.type = 'button';
      node.className = `onlc-slides__btn ${cls}`;
      node.textContent = label;
      node.title = t(title);
      node.setAttribute('aria-label', node.title);
      node.addEventListener('click', onClick);
      return node;
    };

    /**
     * Une image se choisit dans la médiathèque, jamais en tapant son adresse.
     *
     * Personne n'écrit de mémoire `https://static.exemple.tld/…/178069794252.webp`, et une
     * adresse recopiée de travers donne une vue vide sans rien dire. Le champ d'adresse a donc
     * disparu au profit de la vignette et du bouton, qui ouvrent l'explorateur.
     *
     * Il ne réapparaît que si l'explorateur n'est **pas** chargé : mieux vaut un champ austère
     * que pas de moyen du tout d'indiquer une image.
     */
    /** Ouvre la médiathèque pour la vue donnée. Rend `false` si l'explorateur n'est pas chargé. */
    const pickInto = (slide: Slides.Slide, index: number): boolean => {
      const image = slide.images[0] ?? { src: '', alt: '' };
      return editor.execCommand('OnlcPickMedia', false, {
        multiple: false,
        accept: 'image/',
        onSelect: (files: Array<{ url: string }>) => {
          Arr.head(files).each((file) => {
            replace(index, { ...slide, images: [{ ...image, src: file.url }] });
            render();
          });
        }
      }) !== false;
    };

    /**
     * Champ d'adresse de secours, posé une seule fois, quand l'explorateur n'a pas répondu.
     *
     * Personne n'écrit de mémoire l'adresse d'une photo, et une adresse recopiée de travers donne
     * une vue vide sans rien dire : le champ n'apparaît donc que faute d'explorateur, où mieux
     * vaut un champ austère que pas de moyen du tout d'indiquer une image.
     */
    const fallbackUrl = (fields: HTMLElement, value: string, onSet: (next: string) => void) => {
      if (fields.querySelector('.onlc-slides__fallback') !== null) {
        return;
      }
      const input = doc.createElement('input');
      input.type = 'text';
      input.className = 'onlc-slides__input onlc-slides__fallback';
      input.value = value;
      input.placeholder = t('Adresse de l’image');
      input.setAttribute('aria-label', t('Adresse de l’image'));
      input.addEventListener('change', () => onSet(input.value));
      fields.appendChild(input);
      input.focus();
    };

    /**
     * Les champs d'une vue d'image : son texte de remplacement, et le bouton qui la remplace.
     *
     * La vignette n'est pas ici : c'est celle de la vue, à gauche, qui sert de bouton. Il y en
     * avait deux côte à côte, montrant la même image — une vue ne portant plus qu'une seule
     * image, la seconde n'apprenait rien.
     */
    const renderImageFields = (slide: Slides.Slide, index: number, fields: HTMLElement) => {
      const image = slide.images[0] ?? { src: '', alt: '' };

      const alt = doc.createElement('input');
      alt.type = 'text';
      alt.className = 'onlc-slides__input';
      alt.value = image.alt;
      alt.placeholder = t('Ce que montre l’image, en une phrase');
      alt.setAttribute('aria-label', t('Texte de remplacement'));
      alt.addEventListener('input', () => {
        replace(index, { ...slide, images: [{ ...image, alt: alt.value }] });
      });
      fields.appendChild(alt);

      const actions = doc.createElement('div');
      actions.className = 'onlc-slides__imageactions';
      actions.appendChild(button(
        t(image.src === '' ? 'Choisir une image…' : 'Changer l’image…'),
        'Choisir cette image dans la médiathèque', 'onlc-slides__btn--wide', () => {
          if (!pickInto(slide, index)) {
            fallbackUrl(fields, image.src, (src) => {
              replace(index, { ...slide, images: [{ ...image, src }] });
              render();
            });
          }
        }));
      fields.appendChild(actions);

      const hint = doc.createElement('p');
      hint.className = 'onlc-slides__hint';
      hint.textContent = t('Le texte décrit l’image : il est lu à voix haute par les ' +
        'lecteurs d’écran et repris par les moteurs de recherche.');
      fields.appendChild(hint);
    };

    /**
     * La poignée de déplacement.
     *
     * Elle est **seule** à porter `draggable` : rendre la vue entière saisissable empêcherait de
     * sélectionner le texte de remplacement à la souris, qui est pourtant un champ ordinaire.
     */
    const grip = (index: number, item: HTMLElement): HTMLElement => {
      const node = doc.createElement('button');
      node.type = 'button';
      node.className = 'onlc-slides__grip';
      node.draggable = true;
      node.textContent = '⠿';
      node.title = t('Déplacer cette vue');
      node.setAttribute('aria-label', node.title);

      node.addEventListener('dragstart', (e) => {
        saisie = index;
        item.classList.add('onlc-slides__item--dragged');
        // Sans donnée transportée, Firefox refuse d'engager le geste.
        e.dataTransfer?.setData('text/plain', String(index));
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = 'move';
        }
      });
      node.addEventListener('dragend', () => {
        saisie = null;
        item.classList.remove('onlc-slides__item--dragged');
      });
      return node;
    };

    const renderSlide = (slide: Slides.Slide, index: number): HTMLElement => {
      const item = doc.createElement('div');
      item.className = 'onlc-slides__item';

      item.addEventListener('dragover', (e) => {
        if (saisie !== null && saisie !== index) {
          e.preventDefault();
          item.classList.add('onlc-slides__item--over');
        }
      });
      item.addEventListener('dragleave', () => item.classList.remove('onlc-slides__item--over'));
      item.addEventListener('drop', (e) => {
        e.preventDefault();
        item.classList.remove('onlc-slides__item--over');
        if (saisie !== null) {
          const depuis = saisie;
          saisie = null;
          moveTo(depuis, index);
        }
      });

      item.appendChild(grip(index, item));

      // Une vue d'image : la vignette **est** le bouton qui ouvre la médiathèque. Une vue libre :
      // elle ne fait que montrer ce qu'il y a dedans, son contenu n'étant jamais réécrit.
      const thumb = doc.createElement(slide.custom ? 'span' : 'button');
      thumb.className = 'onlc-slides__thumb';
      const first = slide.images[0];
      if (Type.isNonNullable(first) && first.src !== '') {
        thumb.style.backgroundImage = backgroundUrl(editor.documentBaseURI.toAbsolute(first.src));
      } else {
        thumb.textContent = t(slide.custom ? 'contenu' : 'vide');
      }
      if (!slide.custom) {
        const bouton = thumb as HTMLButtonElement;
        bouton.type = 'button';
        bouton.title = t('Changer cette image');
        bouton.setAttribute('aria-label', bouton.title);
        bouton.className = 'onlc-slides__thumb onlc-slides__thumb--action';
        bouton.addEventListener('click', () => pickInto(slide, index));
      }

      const fields = doc.createElement('div');
      fields.className = 'onlc-slides__fields';

      const rank = doc.createElement('span');
      rank.className = 'onlc-slides__rank';
      rank.textContent = `${t('Vue')} ${index + 1}`;
      fields.appendChild(rank);

      if (slide.custom) {
        const free = doc.createElement('p');
        free.className = 'onlc-slides__free';
        const excerpt = (slide.element?.textContent ?? '').trim().replace(/\s+/g, ' ');
        free.textContent = excerpt === ''
          ? t('Cette vue ne contient pas qu’une image — plusieurs images, ou une mise en page. Elle est déplaçable, mais son contenu n’est pas réécrit.')
          : `${t('Contenu libre :')} ${excerpt.substring(0, 90)}${excerpt.length > 90 ? '…' : ''}`;
        fields.appendChild(free);
      } else {
        renderImageFields(slide, index, fields);
      }

      const actions = doc.createElement('div');
      actions.className = 'onlc-slides__actions';

      const up = button('↑', 'Monter cette vue', '', () => move(index, -1));
      up.disabled = index === 0;
      const down = button('↓', 'Descendre cette vue', '', () => move(index, 1));
      down.disabled = index === slides.length - 1;

      actions.appendChild(up);
      actions.appendChild(down);
      actions.appendChild(button('✕', 'Retirer cette vue', 'onlc-slides__btn--danger', () => {
        slides = Arr.filter(slides, (_slide, at) => at !== index);
        publish();
        render();
      }));

      item.appendChild(thumb);
      item.appendChild(fields);
      item.appendChild(actions);
      return item;
    };

    /**
     * Ajoute des vues d'un coup depuis la médiathèque : c'est le geste attendu.
     *
     * Il n'y a plus de « vue vide » : une vue sans image n'affiche rien sur le site, et l'ajouter
     * revenait à créer un trou dans le diaporama qu'il fallait ensuite penser à combler. On part
     * donc des images, qui sont la matière du bloc.
     */
    const addFromLibrary = (ou: 'debut' | 'fin') => {
      editor.execCommand('OnlcPickMedia', false, {
        multiple: true,
        accept: 'image/',
        onSelect: (files: Array<{ url: string }>) => {
          const neuves = Arr.map(files, (file): Slides.Slide => ({
            element: null,
            images: [{ src: file.url, alt: '' }],
            classes: '',
            custom: false
          }));
          slides = ou === 'debut' ? neuves.concat(slides) : slides.concat(neuves);
          publish();
          render();
          if (ou === 'debut') {
            list.scrollTop = 0;
          } else {
            list.scrollTop = list.scrollHeight;
          }
        }
      });
    };

    const render = () => {
      list.innerHTML = '';
      bar.innerHTML = '';
      barreHaut.innerHTML = '';

      if (slides.length === 0) {
        const empty = doc.createElement('p');
        empty.className = 'onlc-slides__empty';
        empty.textContent = t('Ce diaporama n’a aucune vue. Ajoutez-en une pour qu’il montre quelque chose.');
        list.appendChild(empty);
      } else {
        Arr.each(slides, (slide, index) => list.appendChild(renderSlide(slide, index)));
      }

      const ajout = (ou: 'debut' | 'fin', libelle: string): HTMLButtonElement => {
        const node = doc.createElement('button');
        node.type = 'button';
        node.className = 'onlc-slides__add';
        node.textContent = t(libelle);
        node.addEventListener('click', () => addFromLibrary(ou));
        return node;
      };

      // Un diaporama d'accueil compte huit vues : sans bouton en tête, ajouter une image au début
      // demandait de dérouler toute la liste, puis de la remonter cran par cran.
      barreHaut.appendChild(ajout('debut', 'Ajouter des images au début…'));
      bar.appendChild(ajout('fin', 'Ajouter des images à la fin…'));
    };

    render();
    publish();

    /**
     * Les vues ne transitent pas par la valeur du champ.
     *
     * Un composant libre échange une **chaîne** avec le dialogue ; or une vue porte un nœud du
     * document — celui d'une vue libre, qu'on déplace sans le reconstruire — et un nœud ne survit
     * pas à un aller-retour par du texte. Le dialogue reçoit donc les vues par `onChange`, et la
     * valeur du champ ne sert qu'à donner un état non vide au formulaire.
     */
    return Promise.resolve({
      getValue: () => String(slides.length),
      setValue: Fun.noop,
      destroy: () => {
        element.innerHTML = '';
      }
    });
  };

/** Spec du composant, à placer dans un dialogue. */
const field = (
  editor: Editor,
  name: string,
  initial: Slides.Slide[],
  onChange: (slides: Slides.Slide[]) => void
): Dialog.CustomEditorSpec => ({
  type: 'customeditor',
  name,
  tag: 'div',
  init: create(editor, initial, onChange)
});

export {
  styles,
  ensureStyles,
  backgroundUrl,
  create,
  field
};
