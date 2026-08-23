import { describe, it } from '@ephox/bedrock-client';
import { TinyHooks } from '@ephox/wrap-mcagar';
import { assert } from 'chai';

import Editor from 'hugerte/core/api/Editor';
import * as PublishedCss from 'hugerte/plugins/onlcshared/PublishedCss';
import * as Anim from 'hugerte/plugins/onlcanimtext/core/Anim';
import * as Markup from 'hugerte/plugins/onlcanimtext/core/Markup';
import * as Styles from 'hugerte/plugins/onlcanimtext/core/Styles';
import AnimTextPlugin from 'hugerte/plugins/onlcanimtext/Plugin';

/**
 * Le texte animé : ce qu'il reconnaît, ce qu'il écrit, et ce qu'il laisse dans la page.
 *
 * Les épreuves portent sur la formulation **française** des intitulés : l'option « language » vaut
 * « en » par défaut, et l'éditeur charge alors le paquet anglais.
 */
describe('browser.hugerte.plugins.onlcanimtext.AnimTextTest', () => {
  const hook = TinyHooks.bddSetupLight<Editor>({
    plugins: 'onlcanimtext',
    language: 'fr',
    base_url: '/project/hugerte/js/hugerte'
  }, [ AnimTextPlugin ], true);

  /** L'écriture d'une page qui animait ses mots avant ce module. */
  const ancienne =
    '<p>La carte de votre <span class="alternate-brands-container">' +
    '<span class="alternate-brands alternate-brands-1">Renault</span>' +
    '<span class="alternate-brands alternate-brands-2">Dacia</span>' +
    '<span class="alternate-brands alternate-brands-3">Alpine</span></span></p>';

  const premier = (editor: Editor): HTMLElement => Anim.all(editor)[0];

  it('reconnaît l’écriture d’origine et en lit les mots', () => {
    const editor = hook.editor();
    editor.setContent(ancienne);

    const trouves = Anim.all(editor);
    assert.lengthOf(trouves, 1, 'le passage est reconnu');

    const settings = Anim.settingsOf(editor, trouves[0]);
    assert.equal(settings.kind, 'rotate', 'des mots qui se relaient');
    assert.deepEqual(settings.items, [ 'Renault', 'Dacia', 'Alpine' ]);
  });

  /**
   * Les classes de l'ancienne écriture portaient une largeur devinée — `min-width: 5em`. Les
   * garder ferait ce que le module vient supprimer : réserver une place qui n'est pas celle du
   * plus long mot.
   */
  it('reprend le passage à son compte, sans garder l’ancienne présentation', () => {
    const editor = hook.editor();
    editor.setContent(ancienne);
    Markup.apply(editor, premier(editor), Anim.settingsOf(editor, premier(editor)));

    const html = editor.getContent();
    assert.include(html, 'onlc-animtext--rotate');
    assert.notInclude(html, 'alternate-brands', 'les classes de l’ancienne technique s’en vont');
    assert.include(html, '>Renault<', 'les mots, eux, restent');
    assert.include(html, '>Alpine<');
  });

  it('écrit un passage lisible même sans la feuille', () => {
    const editor = hook.editor();
    editor.setContent('<p>x</p>');
    const element = Markup.create(editor, { kind: 'rotate', duration: 6, items: [ 'Un', 'Deux' ]});

    assert.equal(element.textContent, 'UnDeux',
      'les mots se suivent en texte ordinaire : un lecteur d’écran les lit');
  });

  it('pose la feuille en tête de la page, et une seule fois', () => {
    const editor = hook.editor();
    editor.setContent(ancienne);
    Markup.apply(editor, premier(editor), Anim.settingsOf(editor, premier(editor)));

    const html = editor.getContent();
    assert.isTrue(html.indexOf(`<style ${Styles.marker}`) === 0, 'la feuille ouvre la page');
    assert.lengthOf(html.match(/<style /g) ?? [], 1, 'il n’y en a qu’une');
    assert.include(html, '@keyframes onlc-animtext-rotate-3', 'les images-clés d’une ronde de trois');
  });

  it('ne pose aucune feuille sur une page qui n’anime rien', () => {
    const editor = hook.editor();
    editor.setContent('<p>Rien d’animé ici.</p>');
    assert.notInclude(editor.getContent(), '<style');
  });

  /**
   * La feuille est entièrement déduite du contenu : elle est retirée à l'ouverture et réécrite à
   * l'enregistrement. Deux allers-retours doivent donc donner le même html — sans quoi une page
   * rouverte cinq fois porterait cinq feuilles.
   */
  it('ne s’empile pas d’un aller-retour à l’autre', () => {
    const editor = hook.editor();
    editor.setContent(ancienne);
    Markup.apply(editor, premier(editor), Anim.settingsOf(editor, premier(editor)));

    const premierTour = editor.getContent();
    editor.setContent(premierTour);
    const secondTour = editor.getContent();

    assert.equal(secondTour, premierTour, 'le second tour rend exactement le premier');
    assert.lengthOf(secondTour.match(/<style /g) ?? [], 1);
  });

  it('borne une durée que personne ne pourrait voir', () => {
    assert.equal(Anim.clampDuration(0), 0.1, 'un scintillement est refusé');
    assert.equal(Anim.clampDuration(-4), 0.1);
    assert.equal(Anim.clampDuration(10000), 300);
    assert.equal(Anim.clampDuration(NaN), 1);
    assert.equal(Anim.clampDuration(2.5), 2.5);
  });

  it('donne à chaque mot son rang dans la ronde', () => {
    const editor = hook.editor();
    editor.setContent('<p>x</p>');
    const element = Markup.create(editor, { kind: 'rotate', duration: 4, items: [ 'A', 'B', 'C' ]});

    const mots = element.querySelectorAll<HTMLElement>(`.${Anim.itemClass}`);
    assert.lengthOf(mots, 3);
    assert.equal(mots[0].style.getPropertyValue('--onlc-animtext-index').trim(), '0');
    assert.equal(mots[2].style.getPropertyValue('--onlc-animtext-index').trim(), '2');
    assert.equal(element.getAttribute(Styles.countAttribute), '3');
  });

  it('n’écrit d’images-clés que pour les rondes qui en ont besoin', () => {
    assert.notInclude(Styles.sheet([ 1 ]), '@keyframes onlc-animtext-rotate-',
      'un seul mot n’a rien à faire tourner');
    assert.include(Styles.sheet([ 3 ]), '@keyframes onlc-animtext-rotate-3');
    assert.notInclude(Styles.sheet([ 3 ]), '@keyframes onlc-animtext-rotate-4');

    const deux = Styles.sheet([ 3, 3, 4 ]);
    assert.lengthOf(deux.match(/@keyframes onlc-animtext-rotate-/g) ?? [], 2,
      'une ronde de trois vue deux fois ne produit qu’un jeu');
  });

  it('arrête tout pour qui a demandé à réduire les animations', () => {
    assert.include(Styles.base, '@media (prefers-reduced-motion: reduce)');
    assert.include(Styles.base, '.onlc-animtext--rotate > .onlc-animtext__item:first-child { opacity: 1; }',
      'et le premier mot reste lisible');
  });

  /**
   * L'aperçu visiteur ne relit pas la page enregistrée : il assemble le contenu et les feuilles
   * déclarées pour la publication. Le module déclare donc les siennes là aussi, sans quoi
   * l'aperçu montrerait des mots empilés et immobiles.
   */
  it('déclare sa feuille pour l’aperçu visiteur', () => {
    const editor = hook.editor();
    const declarees = PublishedCss.rules(editor).join('\n');

    assert.include(declarees, '.onlc-animtext--rotate', 'la règle des rondes');
    assert.include(declarees, '@keyframes onlc-animtext-blink', 'celle du clignotant');
    assert.include(declarees, '@keyframes onlc-animtext-rotate-3',
      'et les images-clés des rondes que le rédacteur peut composer');
  });

  it('habille aussi la zone d’écriture : ce qui tourne sur le site tourne pendant qu’on écrit', () => {
    const editor = hook.editor();
    const feuilles = editor.contentStyles.join('\n');
    assert.include(feuilles, '@keyframes onlc-animtext-rotate-3');
  });

  it('le formulaire s’ouvre sur le passage visé', () => {
    const editor = hook.editor();
    editor.setContent(ancienne);
    editor.plugins.onlcanimtext.openDialog(premier(editor));

    const titre = document.querySelector('.tox-dialog__title');
    assert.equal(titre?.textContent, 'Modifier le texte animé');
    editor.windowManager.close();
  });

  it('retrouve le passage animé qui contient un nœud', () => {
    const editor = hook.editor();
    editor.setContent(ancienne);
    const mot = editor.dom.select('.alternate-brands', editor.getBody())[1];

    assert.isTrue(Anim.at(editor, mot).isSome());
    assert.isTrue(Anim.at(editor, editor.dom.select('p', editor.getBody())[0]).isNone(),
      'un paragraphe ordinaire n’en est pas un');
    assert.isTrue(Anim.at(editor, null).isNone(), 'et un nœud absent non plus');
  });
});
