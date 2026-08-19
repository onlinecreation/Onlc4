import { describe, it } from '@ephox/bedrock-client';
import { Arr } from '@ephox/katamari';
import { assert } from 'chai';

import { dedupe, IconEntry } from 'hugerte/plugins/onlcicons/core/IconDatabase';

/**
 * Dédoublonnage du catalogue d'icônes.
 *
 * « lock », « star » ou « folder » existent chez Material comme chez Font Awesome : la grille
 * montrait deux vignettes presque identiques côte à côte, sans rien pour les départager. Le
 * premier arrivé gagne, et l'ordre d'arrivée est celui de `onlc_icons_families` — c'est donc le
 * projet qui décide quelle famille l'emporte sur les noms communs.
 */

const entry = (name: string, family: IconEntry['family'], category = 'Général'): IconEntry =>
  ({ name, title: name, keywords: [ name ], category, family });

const names = (entries: IconEntry[]): string[] => Arr.map(entries, (e) => e.name);
const families = (entries: IconEntry[]): string[] => Arr.map(entries, (e) => e.family);

describe('atomic.hugerte.plugins.onlcicons.IconDedupeTest', () => {
  it('laisse un catalogue sans doublon intact', () => {
    const entries = [ entry('home', 'material'), entry('house', 'fontawesome') ];
    assert.deepEqual(names(dedupe(entries)), [ 'home', 'house' ]);
  });

  it('retire un nom présent dans deux familles', () => {
    const entries = [ entry('lock', 'material'), entry('lock', 'fontawesome'), entry('key', 'fontawesome') ];
    assert.deepEqual(names(dedupe(entries)), [ 'lock', 'key' ]);
  });

  it('garde la famille arrivée en premier', () => {
    const materialFirst = dedupe([ entry('star', 'material'), entry('star', 'fontawesome') ]);
    assert.deepEqual(families(materialFirst), [ 'material' ]);

    const awesomeFirst = dedupe([ entry('star', 'fontawesome'), entry('star', 'material') ]);
    assert.deepEqual(families(awesomeFirst), [ 'fontawesome' ]);
  });

  it('laisse les icônes du projet passer devant les familles livrées', () => {
    // `initDatabase` place les icônes ajoutées en tête : elles doivent gagner sur un nom commun.
    const entries = [ entry('logo', 'custom'), entry('logo', 'material') ];
    assert.deepEqual(families(dedupe(entries)), [ 'custom' ]);
  });

  it('retire aussi un doublon interne à une famille', () => {
    const entries = [ entry('home', 'material'), entry('home', 'material') ];
    assert.lengthOf(dedupe(entries), 1);
  });

  it('ne confond pas deux noms voisins', () => {
    const entries = [ entry('home', 'material'), entry('home_work', 'material'), entry('homepage', 'fontawesome') ];
    assert.lengthOf(dedupe(entries), 3);
  });

  it('accepte un catalogue vide', () => {
    assert.deepEqual(dedupe([]), []);
  });

  it('conserve l’ordre du catalogue', () => {
    const entries = [ entry('a', 'material'), entry('b', 'fontawesome'), entry('a', 'fontawesome'), entry('c', 'material') ];
    assert.deepEqual(names(dedupe(entries)), [ 'a', 'b', 'c' ]);
  });
});
