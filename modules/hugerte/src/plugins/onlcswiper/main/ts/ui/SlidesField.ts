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
.tox .onlc-slides { display: flex; flex-direction: column; gap: 10px; width: 100%; }
.tox .onlc-slides__empty {
  padding: 14px; border: 1px dashed rgba(34, 47, 62, 0.3); border-radius: 8px;
  color: #5a6570; font-size: 13px; text-align: center;
}
.tox .onlc-slides__item {
  display: flex; gap: 12px; padding: 10px;
  border: 1px solid rgba(34, 47, 62, 0.16); border-radius: 8px; background: #fff;
}
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
.tox .onlc-slides__free { margin: 0; color: #22303c; font-size: 13px; line-height: 1.5; }
.tox .onlc-slides__actions { display: flex; flex: 0 0 auto; flex-direction: column; gap: 4px; }
.tox .onlc-slides__btn {
  min-width: 40px; min-height: 40px; padding: 0 8px; border: 1px solid rgba(34, 47, 62, 0.18);
  border-radius: 6px; background: #fff; font: inherit; color: #22303c; cursor: pointer;
}
.tox .onlc-slides__btn:hover { background: #eef2f6; }
.tox .onlc-slides__btn:disabled { opacity: 0.4; cursor: default; }
.tox .onlc-slides__btn--danger:hover { background: #fdecec; color: #b4241f; }
.tox .onlc-slides__bar { display: flex; flex-wrap: wrap; gap: 8px; }
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

    const list = doc.createElement('div');
    list.className = 'onlc-slides';

    const bar = doc.createElement('div');
    bar.className = 'onlc-slides__bar';

    element.appendChild(list);
    element.appendChild(bar);

    const publish = () => onChange(slides);

    const replace = (index: number, slide: Slides.Slide) => {
      slides = Arr.map(slides, (candidate, at) => at === index ? slide : candidate);
      publish();
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

    const renderImageFields = (slide: Slides.Slide, index: number, fields: HTMLElement) => {
      Arr.each(slide.images, (image, position) => {
        const src = doc.createElement('input');
        src.type = 'text';
        src.className = 'onlc-slides__input';
        src.value = image.src;
        src.placeholder = t('Adresse de l’image');
        src.setAttribute('aria-label', t('Adresse de l’image'));
        src.addEventListener('input', () => {
          const images = slide.images.slice();
          images[position] = { ...images[position], src: src.value };
          replace(index, { ...slide, images });
        });

        const alt = doc.createElement('input');
        alt.type = 'text';
        alt.className = 'onlc-slides__input';
        alt.value = image.alt;
        alt.placeholder = t('Ce que montre l’image, en une phrase');
        alt.setAttribute('aria-label', t('Texte de remplacement'));
        alt.addEventListener('input', () => {
          const images = slide.images.slice();
          images[position] = { ...images[position], alt: alt.value };
          replace(index, { ...slide, images });
        });

        fields.appendChild(src);
        fields.appendChild(alt);
      });

      const hint = doc.createElement('p');
      hint.className = 'onlc-slides__hint';
      hint.textContent = t('La seconde ligne décrit l’image : elle est lue à voix haute par les ' +
        'lecteurs d’écran et reprise par les moteurs de recherche.');
      fields.appendChild(hint);
    };

    const renderSlide = (slide: Slides.Slide, index: number): HTMLElement => {
      const item = doc.createElement('div');
      item.className = 'onlc-slides__item';

      const thumb = doc.createElement('span');
      thumb.className = 'onlc-slides__thumb';
      const first = slide.images[0];
      if (Type.isNonNullable(first) && first.src !== '') {
        thumb.style.backgroundImage = backgroundUrl(editor.documentBaseURI.toAbsolute(first.src));
      } else {
        thumb.textContent = t(slide.custom ? 'contenu' : 'vide');
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
          ? t('Cette vue contient autre chose que des images. Elle se modifie directement dans la page.')
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

    /** Ajoute des vues d'un coup depuis la médiathèque : c'est le geste attendu. */
    const addFromLibrary = () => {
      const handled = editor.execCommand('OnlcPickMedia', false, {
        multiple: true,
        accept: 'image/',
        onSelect: (files: Array<{ url: string }>) => {
          slides = slides.concat(Arr.map(files, (file) => ({
            element: null,
            images: [{ src: file.url, alt: '' }],
            classes: '',
            custom: false
          })));
          publish();
          render();
        }
      });
      if (handled === false) {
        slides = slides.concat([ Slides.empty() ]);
        publish();
        render();
      }
    };

    const render = () => {
      list.innerHTML = '';
      bar.innerHTML = '';

      if (slides.length === 0) {
        const empty = doc.createElement('p');
        empty.className = 'onlc-slides__empty';
        empty.textContent = t('Ce diaporama n’a aucune vue. Ajoutez-en une pour qu’il montre quelque chose.');
        list.appendChild(empty);
      } else {
        Arr.each(slides, (slide, index) => list.appendChild(renderSlide(slide, index)));
      }

      const add = doc.createElement('button');
      add.type = 'button';
      add.className = 'onlc-slides__add';
      add.textContent = t('Ajouter des images…');
      add.addEventListener('click', addFromLibrary);

      const manual = doc.createElement('button');
      manual.type = 'button';
      manual.className = 'onlc-slides__secondary';
      manual.textContent = t('Ajouter une vue vide');
      manual.addEventListener('click', () => {
        slides = slides.concat([ Slides.empty() ]);
        publish();
        render();
      });

      bar.appendChild(add);
      bar.appendChild(manual);
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
