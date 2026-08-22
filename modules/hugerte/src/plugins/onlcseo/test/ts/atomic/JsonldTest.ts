import { describe, it } from '@ephox/bedrock-client';
import { assert } from 'chai';

import * as FilterContent from 'hugerte/plugins/onlcseo/core/FilterContent';
import * as Jsonld from 'hugerte/plugins/onlcseo/core/Jsonld';

/**
 * La fiche de microdonnées : ce qu'on lit d'une page publiée, ce qu'on y réécrit.
 *
 * Deux exigences se croisent ici. La fiche doit **repartir telle qu'elle est arrivée** — une page
 * ouverte puis enregistrée sans y toucher ne doit pas changer de fiche. Et elle doit rester du
 * json valide dans un élément à contenu brut, ce qui demande de neutraliser la seule séquence qui
 * pourrait en sortir prématurément.
 */

describe('atomic.hugerte.plugins.onlcseo.JsonldTest', () => {
  it('lit le type, écrit comme chaîne ou comme liste', () => {
    assert.equal(Jsonld.typeOf({ '@type': 'Product' }), 'Product');
    assert.equal(Jsonld.typeOf({ '@type': [ 'Product', 'Thing' ] }), 'Product');
    assert.equal(Jsonld.typeOf({}), '', 'une fiche sans type ne prétend rien');
  });

  it('résume une fiche en trois valeurs', () => {
    const resume = Jsonld.summarize({
      '@type': 'Product',
      name: 'Coque de carte',
      sku: 'LM-001',
      color: 'Rouge',
      material: 'Ignoré, au-delà de trois'
    });
    assert.include(resume, 'Coque de carte');
    assert.include(resume, 'LM-001');
    assert.notInclude(resume, 'Ignoré', 'le résumé tient sur une ligne');
  });

  it('résume un objet imbriqué par son nom', () => {
    assert.equal(Jsonld.flatten({ '@type': 'Organization', name: 'LM Parts' }), 'LM Parts');
    assert.equal(Jsonld.flatten({ '@type': 'Offer', value: '28' }), '28',
      'à défaut de nom, la valeur');
  });

  it('compte les propriétés sans compter le vocabulaire', () => {
    assert.equal(Jsonld.countProperties({ '@context': 'x', '@type': 'Product', name: 'a', sku: 'b' }), 2);
  });

  it('écrit le contexte et le type en tête', () => {
    const json = Jsonld.toJson({ name: 'Coque', '@type': 'Product' });
    const cles = Object.keys(JSON.parse(json));
    assert.deepEqual(cles, [ '@context', '@type', 'name' ]);
  });

  it('accepte un vocabulaire choisi par le projet', () => {
    assert.include(Jsonld.toJson({ '@type': 'Product' }, 'https://exemple.tld/vocab'),
      '"@context": "https://exemple.tld/vocab"');
  });

  it('encode et décode une fiche sans la perdre', () => {
    const fiche = { '@type': 'Product', name: 'Coque « spéciale » & <balise>' };
    assert.deepEqual(Jsonld.decode(Jsonld.encode(fiche)), fiche);
  });

  it('rend une fiche vide plutôt que d’échouer sur des données abîmées', () => {
    assert.deepEqual(Jsonld.decode('pas du json'), {});
    assert.deepEqual(Jsonld.decode(null), {});
    assert.deepEqual(Jsonld.decode(''), {});
  });
});

describe('atomic.hugerte.plugins.onlcseo.FilterContentTest', () => {
  it('reconnaît une fiche dans du html publié', () => {
    const html = '<script type="application/ld+json">{"@type":"Product"}</script><p>a</p>';
    assert.isTrue(FilterContent.jsonldRegExp.test(html));
    FilterContent.jsonldRegExp.lastIndex = 0;
  });

  it('ne prend pas un script ordinaire pour une fiche', () => {
    FilterContent.jsonldRegExp.lastIndex = 0;
    assert.isFalse(FilterContent.jsonldRegExp.test('<script>var a = 1;</script>'));
    FilterContent.jsonldRegExp.lastIndex = 0;
    assert.isFalse(FilterContent.jsonldRegExp.test('<script type="text/javascript">a()</script>'));
    FilterContent.jsonldRegExp.lastIndex = 0;
  });

  it('reconnaît la fiche quels que soient les guillemets et l’ordre des attributs', () => {
    FilterContent.jsonldRegExp.lastIndex = 0;
    assert.isTrue(FilterContent.jsonldRegExp.test(`<script id="a" type='application/ld+json'>{}</script>`));
    FilterContent.jsonldRegExp.lastIndex = 0;
  });
});
