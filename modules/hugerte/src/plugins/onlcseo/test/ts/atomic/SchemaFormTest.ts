import { describe, it } from '@ephox/bedrock-client';
import { assert } from 'chai';

import * as SchemaForm from 'hugerte/plugins/onlcseo/ui/SchemaForm';

/**
 * Le nettoyage de la fiche avant écriture.
 *
 * Une propriété laissée en blanc ne doit pas figurer dans la fiche : les outils de test des
 * moteurs la signalent comme une erreur, et elle n'apprend rien à personne. Le nettoyage doit
 * traverser les objets imbriqués et les listes, sans quoi une offre vide dans un produit rempli
 * ferait échouer la fiche entière.
 */

describe('atomic.hugerte.plugins.onlcseo.SchemaFormTest', () => {
  it('reconnaît ce qui est vide', () => {
    assert.isTrue(SchemaForm.isBlank(''));
    assert.isTrue(SchemaForm.isBlank('   '));
    assert.isTrue(SchemaForm.isBlank([]));
    assert.isTrue(SchemaForm.isBlank([ '', '  ' ]));
    assert.isTrue(SchemaForm.isBlank({ '@type': 'Offer' }), 'un objet qui n’a que son type est vide');
    assert.isFalse(SchemaForm.isBlank('a'));
    assert.isFalse(SchemaForm.isBlank({ '@type': 'Offer', price: '28' }));
  });

  it('retire les propriétés vides, y compris imbriquées', () => {
    assert.deepEqual(SchemaForm.prune({
      '@type': 'Product',
      name: 'Coque',
      sku: '   ',
      offers: { '@type': 'Offer', price: '28', priceCurrency: '' },
      brand: { '@type': 'Brand', name: '' }
    }), {
      '@type': 'Product',
      name: 'Coque',
      offers: { '@type': 'Offer', price: '28' }
    });
  });

  it('ramène une liste d’une seule valeur à cette valeur', () => {
    assert.deepEqual(SchemaForm.prune({ image: [ 'a.jpg', '' ] }), { image: 'a.jpg' });
    assert.deepEqual(SchemaForm.prune({ image: [ 'a.jpg', 'b.jpg' ] }), { image: [ 'a.jpg', 'b.jpg' ] });
  });

  it('lit une valeur comme une liste, qu’elle en soit une ou non', () => {
    assert.deepEqual(SchemaForm.asList('a'), [ 'a' ]);
    assert.deepEqual(SchemaForm.asList([ 'a', 'b' ]), [ 'a', 'b' ]);
    assert.deepEqual(SchemaForm.asList(undefined), []);
  });
});
