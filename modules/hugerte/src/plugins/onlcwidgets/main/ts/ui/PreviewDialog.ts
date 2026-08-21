import { Arr, Fun } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import { Dialog } from 'hugerte/core/api/ui/Ui';

import * as Options from '../api/Options';
import * as Multilang from '../core/Multilang';
import * as PagePreview from '../core/PagePreview';

/**
 * Fenêtre d'aperçu : la page entière, dans un cadre.
 *
 * ## Pourquoi la page n'est plus passée par `srcdoc`
 *
 * `srcdoc` transporte le document dans un **attribut**. Dès que le cadre est isolé dans une
 * origine à part, il est peint par un autre processus, et l'attribut doit lui être transmis d'un
 * processus à l'autre : passé une dizaine de milliers de caractères, il arrive **tronqué**. Ce
 * n'est pas une erreur visible — l'analyseur referme simplement les balises ouvertes et rend une
 * page complète, amputée de sa fin. Une page de démonstration y perdait sept blocs sur treize,
 * dont la visionneuse de pdf et la vidéo : ils n'étaient pas cassés, ils n'existaient pas.
 *
 * Le document est donc servi par une adresse `blob:`, que le navigateur charge comme n'importe
 * quelle page. Rien n'est écrit sur le serveur pour autant : l'adresse ne vit que dans l'onglet,
 * et elle est révoquée dès que l'aperçu change ou se ferme.
 *
 * ## Ce que le bac à sable laisse passer
 *
 * Les jetons viennent de `onlc_preview_sandbox`. Ils comprennent `allow-same-origin` par défaut,
 * et c'est un choix qu'il faut connaître : une page **sans origine** ne peut ni charger une police
 * — le chargement d'une police est toujours soumis au contrôle d'origine —, ni lire un fichier du
 * site, ni loger une intégration tierce, qui hériterait de son isolement. Sans ce jeton, l'aperçu
 * montre une page dont les icônes sont vides, le pdf absent et la vidéo noire : il ne montre plus
 * la page du visiteur, ce qui est sa seule raison d'être.
 *
 * En contrepartie, l'aperçu partage l'origine du back-office. Le commentaire de l'option dit
 * comment retrouver les deux à la fois — en servant le site depuis une autre origine — et comment
 * revenir à l'isolement strict.
 */

const styleId = 'onlc-preview-styles';

const styles = `
/* Préfixé par .tox pour passer devant le reset très large du thème. */
.tox .onlc-pagepreview { display: flex; flex-direction: column; width: 100%; height: 100%; min-height: 480px; }
.tox .onlc-pagepreview__bar { display: flex; gap: 8px; align-items: center; padding: 0 0 8px; font-size: 13px; color: #5a6570; }
.tox .onlc-pagepreview__device {
  display: inline-flex; align-items: center; justify-content: center; min-width: 50px; min-height: 44px;
  padding: 0 14px; border: 1px solid rgba(34, 47, 62, 0.18); border-radius: 8px;
  background: #ffffff; font: inherit; color: #22303c; cursor: pointer;
}
.tox .onlc-pagepreview__device:hover { background: #eef2f6; }
.tox .onlc-pagepreview__device[aria-pressed="true"] { border-color: transparent; background: #006ce7; color: #ffffff; font-weight: 600; }
.tox .onlc-pagepreview__stage { display: flex; flex: 1 1 auto; justify-content: center; min-height: 0; background: #eef1f4; border-radius: 8px; padding: 12px; }
.tox .onlc-pagepreview__frame { width: 100%; max-width: 100%; height: 100%; border: 0; border-radius: 6px; background: #ffffff; box-shadow: 0 1px 6px rgba(0, 0, 0, .18); }
.tox .onlc-pagepreview__message { margin: auto; padding: 24px; color: #5a6570; text-align: center; }
/* Posé par-dessus le cadre pendant qu'il charge : le sortir du flux évite de déplacer l'iframe,
   ce qui rechargerait sa page et rejouerait tous ses scripts. */
.tox .onlc-pagepreview__stage { position: relative; }
.tox .onlc-pagepreview__message--over { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: #eef1f4; border-radius: 8px; }
.tox .onlc-pagepreview__spacer { flex: 1 1 auto; }
.tox .onlc-pagepreview__group { display: flex; gap: 8px; align-items: center; }
.tox .onlc-pagepreview__legend { color: #5a6570; }
`;

/**
 * Délai au bout duquel l'aperçu s'affiche, même incomplet.
 *
 * Deux secondes et demie : assez pour qu'une page correcte arrive entière et n'apparaisse qu'une
 * fois, trop peu pour qu'on croie l'aperçu bloqué.
 */
const revealDelay = 2500;

/** Largeurs d'aperçu, en pixels. Zéro vaut « toute la place disponible ». */
const devices: Array<{ label: string; width: number }> = [
  { label: 'Ordinateur', width: 0 },
  { label: 'Tablette', width: 820 },
  { label: 'Téléphone', width: 390 }
];

const injectStyles = (doc: Document): void => {
  if (doc.getElementById(styleId) === null) {
    const style = doc.createElement('style');
    style.id = styleId;
    style.textContent = styles;
    doc.head.appendChild(style);
  }
};

const create = (editor: Editor) => (element: HTMLElement): Promise<Dialog.CustomEditorInit> => {
  const doc = element.ownerDocument;
  injectStyles(doc);

  const t = (text: string): string => editor.translate(text) as string;

  element.className = 'onlc-pagepreview';
  element.innerHTML = '';

  const bar = doc.createElement('div');
  bar.className = 'onlc-pagepreview__bar';

  const stage = doc.createElement('div');
  stage.className = 'onlc-pagepreview__stage';

  element.appendChild(bar);
  element.appendChild(stage);

  let width = 0;
  let frame: HTMLIFrameElement | null = null;

  const buttons = devices.map((device) => {
    const button = doc.createElement('button');
    button.type = 'button';
    button.className = 'onlc-pagepreview__device';
    button.textContent = t(device.label);
    button.addEventListener('click', () => {
      width = device.width;
      apply();
    });
    bar.appendChild(button);
    return button;
  });

  /**
   * Les langues de la page, quand elle en porte plusieurs.
   *
   * Un visiteur ne voit qu'une langue : l'aperçu en montre donc une seule, et dit laquelle.
   * Sans le plugin polyglotte — ou sur une page monolingue — la bande reste telle qu'elle était.
   */
  const languages = Multilang.languagesOf(editor);
  let language = languages.length === 0 ? '' : languages[0].code;

  const languageButtons = languages.length < 2 ? [] : Arr.map(languages, (entry) => {
    const button = doc.createElement('button');
    button.type = 'button';
    button.className = 'onlc-pagepreview__device';
    button.textContent = entry.label;
    button.addEventListener('click', () => {
      language = entry.code;
      apply();
      rebuild();
    });
    return button;
  });

  if (languageButtons.length > 0) {
    const spacer = doc.createElement('span');
    spacer.className = 'onlc-pagepreview__spacer';

    const legend = doc.createElement('span');
    legend.className = 'onlc-pagepreview__legend';
    legend.textContent = `${t('Langue du visiteur')} :`;

    const group = doc.createElement('span');
    group.className = 'onlc-pagepreview__group';
    group.appendChild(legend);
    languageButtons.forEach((button) => group.appendChild(button));

    bar.appendChild(spacer);
    bar.appendChild(group);
  }

  const apply = () => {
    if (frame !== null) {
      frame.style.maxWidth = width === 0 ? '100%' : `${width}px`;
    }
    buttons.forEach((button, index) => {
      button.setAttribute('aria-pressed', devices[index].width === width ? 'true' : 'false');
    });
    languageButtons.forEach((button, index) => {
      button.setAttribute('aria-pressed', languages[index].code === language ? 'true' : 'false');
    });
  };

  const message = (text: string) => {
    const paragraph = doc.createElement('p');
    paragraph.className = 'onlc-pagepreview__message';
    paragraph.textContent = t(text);
    stage.innerHTML = '';
    stage.appendChild(paragraph);
  };

  /** Adresse `blob:` du document affiché, révoquée dès qu'une autre prend sa place. */
  let objectUrl = '';

  const releaseUrl = () => {
    if (objectUrl !== '') {
      URL.revokeObjectURL(objectUrl);
      objectUrl = '';
    }
  };

  /**
   * Le cadre est construit **une fois la page prête**, avec son adresse déjà posée.
   *
   * Il n'est attaché qu'une seule fois et n'est plus jamais déplacé : sortir un iframe du dom puis
   * l'y remettre recharge son document, ce qui rejouerait tous les scripts de la page. Le message
   * d'attente est donc un élément à part, posé par-dessus, que l'on retire au lieu de vider la
   * scène.
   */
  const show = (html: string) => {
    releaseUrl();
    objectUrl = URL.createObjectURL(new Blob([ html ], { type: 'text/html;charset=utf-8' }));

    const created = doc.createElement('iframe');
    created.className = 'onlc-pagepreview__frame';
    created.setAttribute('sandbox', Options.getPreviewSandbox(editor));
    created.setAttribute('title', t('Aperçu de la page'));
    // Le gabarit charge ses feuilles et ses scripts depuis les serveurs du site : le référent
    // n'a pas à leur apprendre d'où l'on écrit.
    created.setAttribute('referrerpolicy', 'no-referrer');
    created.setAttribute('src', objectUrl);

    // Le cadre est adopté tout de suite, avant même d'avoir peint : une largeur choisie pendant
    // le chargement doit s'appliquer, pas se perdre.
    frame = created;

    // Le gabarit charge ses feuilles de style avant de peindre quoi que ce soit : sur une
    // connexion lente, le cadre reste blanc plusieurs secondes. Le message d'attente reste donc
    // affiché par-dessus, et le cadre travaille dessous.
    const waiting = doc.createElement('p');
    waiting.className = 'onlc-pagepreview__message onlc-pagepreview__message--over';
    waiting.textContent = t('Construction de l’aperçu…');

    stage.innerHTML = '';
    stage.appendChild(created);
    stage.appendChild(waiting);
    apply();

    let shown = false;
    const reveal = () => {
      if (shown) {
        return;
      }
      shown = true;
      if (waiting.parentNode !== null) {
        waiting.parentNode.removeChild(waiting);
      }
    };

    created.addEventListener('load', reveal, { once: true });

    // `load` attend **toutes** les ressources du gabarit — chaque feuille, chaque police, chaque
    // image. Une seule qui ne répond pas, et l'aperçu ne s'affiche jamais : c'est ce qui arrive
    // derrière un filtrage d'entreprise ou quand un cdn est injoignable. Passé ce délai, on
    // montre donc ce qui est là. Les feuilles du site, elles, sont servies par le site : ce qui
    // manque à l'écran est ce qui manquerait aussi au visiteur.
    const deadline = element.ownerDocument.defaultView?.setTimeout(reveal, revealDelay);
    created.addEventListener('load', () => {
      element.ownerDocument.defaultView?.clearTimeout(deadline);
    }, { once: true });
  };

  /** Construit — ou reconstruit — l'aperçu pour la langue choisie. */
  const rebuild = (): void => {
    frame = null;
    message('Construction de l’aperçu…');

    PagePreview.render(editor, language === '' ? undefined : language).then(show, (err: unknown) => {
      releaseUrl();
      message(`${t('L’aperçu n’a pas pu être construit')} : ${err instanceof Error ? err.message : String(err)}`);
    });
  };

  // L'état des trois largeurs est posé d'emblée : il ne dépend pas du chargement de la page, et
  // une bande de boutons dont aucun n'est marqué ne dit rien de ce qui est affiché.
  apply();
  rebuild();

  return Promise.resolve({
    // La fenêtre ne renvoie rien : c'est un aperçu, pas un formulaire.
    getValue: Fun.constant(''),
    setValue: Fun.noop,
    destroy: () => {
      releaseUrl();
      element.innerHTML = '';
    }
  });
};

const open = (editor: Editor): void => {
  editor.windowManager.open({
    title: 'Aperçu comme un visiteur',
    size: 'large',
    body: {
      type: 'panel',
      items: [
        { type: 'customeditor', name: 'preview', tag: 'div', init: create(editor) }
      ]
    },
    buttons: [
      { type: 'cancel', name: 'close', text: 'Fermer', primary: true }
    ]
  });
};

export {
  devices,
  revealDelay,
  styles,
  create,
  open
};
