import { describe, it } from '@ephox/bedrock-client';
import { assert } from 'chai';

import * as Languages from 'hugerte/plugins/onlcmultilang/core/Languages';

/**
 * Des deux lettres du site à ce que lit le rédacteur.
 *
 * « fr » ne dit rien à personne ; c'est « Français » qui doit apparaître sur la pastille d'une
 * section. Les noms sont écrits dans la langue qu'ils désignent, comme dans tous les sélecteurs
 * de langue : on reconnaît « Nederlands » sans l'avoir appris.
 */
describe('atomic.hugerte.plugins.onlcmultilang.LanguagesTest', () => {
  describe('intitulés', () => {
    it('donne le nom usuel des trois langues du projet', () => {
      assert.equal(Languages.labelOf('fr'), 'Français');
      assert.equal(Languages.labelOf('en'), 'English');
      assert.equal(Languages.labelOf('nl'), 'Nederlands');
    });

    it('se rabat sur les deux lettres en capitales pour une langue inconnue', () => {
      // Une langue sans nom reste utilisable : c'est une étiquette qui manque, pas la section.
      assert.equal(Languages.labelOf('zz'), 'ZZ');
    });
  });

  describe('lecture de la configuration', () => {
    it('accepte la forme courte', () => {
      assert.deepEqual(Languages.toLanguage('fr').getOrDie(), { code: 'fr', label: 'Français' });
    });

    it('accepte la forme longue et son intitulé', () => {
      const language = Languages.toLanguage({ code: 'nl', label: 'Néerlandais' }).getOrDie();
      assert.deepEqual(language, { code: 'nl', label: 'Néerlandais' });
    });

    it('ramène le code en minuscules et enlève les espaces', () => {
      assert.equal(Languages.toLanguage(' FR ').getOrDie().code, 'fr');
    });

    it('écarte ce que le site ne saurait pas écrire', () => {
      // Le moteur du site n'accepte que deux lettres : laisser passer autre chose produirait
      // une section que rien ne pourrait plus interpréter.
      assert.isTrue(Languages.toLanguage('fra').isNone());
      assert.isTrue(Languages.toLanguage('f').isNone());
      assert.isTrue(Languages.toLanguage('').isNone());
      assert.isTrue(Languages.toLanguage({ code: 'fr-BE' }).isNone());
    });

    it('ignore un intitulé vide et reprend le nom usuel', () => {
      assert.equal(Languages.toLanguage({ code: 'fr', label: '   ' }).getOrDie().label, 'Français');
    });
  });
});
