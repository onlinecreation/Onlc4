import { describe, it } from '@ephox/bedrock-client';
import { assert } from 'chai';

import * as MonthField from 'hugerte/plugins/onlcwidgets/core/MonthField';

/**
 * Lecture et écriture du mois du bloc calendrier.
 *
 * La valeur échangée avec le bloc reste `AAAA-MM`. Une valeur illisible doit rendre `null` et
 * non un mois arbitraire : c'est ce qui fait retomber le calendrier sur « le mois en cours »
 * plutôt que sur janvier de l'an zéro.
 */
describe('atomic.hugerte.plugins.onlcwidgets.MonthFieldTest', () => {
  it('lit une valeur bien formée', () => {
    assert.deepEqual(MonthField.parse('2026-04'), [ 2026, 3 ]);
    assert.deepEqual(MonthField.parse('1999-01'), [ 1999, 0 ]);
    assert.deepEqual(MonthField.parse('2026-12'), [ 2026, 11 ]);
  });

  it('tolère les espaces autour', () => {
    assert.deepEqual(MonthField.parse('  2026-04 '), [ 2026, 3 ]);
  });

  it('rend null sur une valeur vide ou absente', () => {
    assert.isNull(MonthField.parse(''));
    assert.isNull(MonthField.parse('   '));
    assert.isNull(MonthField.parse(undefined as unknown as string));
  });

  it('rend null sur un mois hors des douze', () => {
    assert.isNull(MonthField.parse('2026-00'));
    assert.isNull(MonthField.parse('2026-13'));
  });

  it('rend null sur un format approchant mais faux', () => {
    assert.isNull(MonthField.parse('2026-4'));
    assert.isNull(MonthField.parse('26-04'));
    assert.isNull(MonthField.parse('2026/04'));
    assert.isNull(MonthField.parse('avril 2026'));
    assert.isNull(MonthField.parse('2026-04-18'));
  });

  it('écrit le mois sur deux chiffres', () => {
    assert.equal(MonthField.format(2026, 0), '2026-01');
    assert.equal(MonthField.format(2026, 3), '2026-04');
    assert.equal(MonthField.format(2026, 11), '2026-12');
  });

  it('fait l’aller-retour sans perte', () => {
    const value = '2026-07';
    const parsed = MonthField.parse(value);
    assert.isNotNull(parsed);
    const [ year, month ] = parsed as [ number, number ];
    assert.equal(MonthField.format(year, month), value);
  });
});
