import { Arr, Fun, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

import * as Dom from './Dom';
import * as Languages from './Languages';
import * as Parse from './Parse';

/**
 * Voir la page comme un visiteur, dans une langue.
 *
 * Une page polyglotte montre tout en même temps : la version française, l'anglaise et la
 * néerlandaise empilées, alors qu'aucun visiteur ne verra jamais cela. Choisir une langue rend
 * l'écran à ce qui sera publié.
 *
 * Le filtrage est **entièrement en css** : une classe posée sur le corps du document, et des
 * règles qui masquent les sections des autres langues. Rien n'est déplacé, rien n'est retiré ;
 * revenir à « toutes les langues » n'a donc rien à reconstruire, et une fausse manœuvre pendant
 * un aperçu ne peut pas faire disparaître un paragraphe.
 */

export const previewClass = 'onlc-lang-preview';

const onlyClass = (code: string): string => `onlc-lang-only-${code}`;

/**
 * Règles de masquage, une par langue déclarée.
 *
 * `:not([data-onlc-lang="fr"])` masque aussi les langues non déclarées — c'est exactement ce que
 * fait le site, qui ne publie que ce qui porte la langue demandée.
 *
 * En mode aperçu la pastille et le cadre s'effacent : ce qui reste à l'écran est ce que verra
 * le visiteur, sans le décor de l'éditeur.
 */
const styles = (editor: Editor): string => {
  const rules = Arr.map(Languages.list(editor), (language) =>
    `body.${onlyClass(language.code)} .${Dom.blockClass}:not([${Dom.codeAttribute}="${language.code}"])` +
    ` { display: none !important; }`);

  return rules.concat([
    `body.${previewClass} .${Dom.blockClass}::before { display: none; }`,
    `body.${previewClass} .${Dom.blockClass}` +
      ' { padding: 0; margin: 0; background: none; border: 0; border-radius: 0; }'
  ]).join('\n');
};

const bodyOf = (editor: Editor): HTMLElement | null => editor.getBody();

/** Langue actuellement affichée seule, ou chaîne vide quand tout est visible. */
const current = (editor: Editor): string => {
  const body = bodyOf(editor);
  if (!Type.isNonNullable(body)) {
    return '';
  }

  return Arr.find(Arr.from(body.classList), (name) => name.indexOf('onlc-lang-only-') === 0)
    .fold(Fun.constant(''), (name) => name.substring('onlc-lang-only-'.length));
};

/**
 * N'affiche plus qu'une langue, ou les rend toutes.
 *
 * Un code vide — ou inconnu — remet tout à l'écran : mieux vaut trop montrer que cacher du
 * contenu sans que personne sache comment le retrouver.
 */
const show = (editor: Editor, code: string): void => {
  const body = bodyOf(editor);
  if (!Type.isNonNullable(body)) {
    return;
  }

  const wanted = String(code ?? '').trim().toLowerCase();

  Arr.each(Arr.from(body.classList), (name) => {
    if (name.indexOf('onlc-lang-only-') === 0) {
      body.classList.remove(name);
    }
  });
  body.classList.remove(previewClass);

  if (Parse.isCode(wanted) && Languages.isKnown(editor, wanted)) {
    body.classList.add(onlyClass(wanted));
    body.classList.add(previewClass);
  }
};

export {
  onlyClass,
  styles,
  current,
  show
};
