import { describe, it } from '@ephox/bedrock-client';
import { assert } from 'chai';

import * as LinkFields from 'hugerte/plugins/onlcshared/link/LinkFields';
import { LinkContext } from 'hugerte/plugins/onlcshared/link/LinkTypes';

/**
 * Les trois sortes de lien, et l'adresse qui en sort.
 *
 * Un lien mène **soit** à une page du site, **soit** à une ancre de la page courante, **soit** à
 * une adresse écrite à la main. C'est la liste de gauche qui tranche, et elle seule : sans cette
 * règle, une adresse restée dans un champ masqué écrasait la page qu'on venait de choisir.
 */
describe('browser.hugerte.plugins.onlcshared.LinkFieldsTest', () => {
  const context: LinkContext = {
    links: [
      { text: 'Accueil', value: '/' },
      { text: 'Nos offres', items: [{ text: 'Conseil', value: '/services/conseil' }] }
    ],
    anchors: [{ text: 'Tarifs (#tarifs)', value: '#tarifs' }]
  };

  it('reconnaît une page du site, une ancre et une adresse libre', () => {
    assert.equal(LinkFields.kindOf(context, '/'), '/', 'une page du site vaut pour elle-même');
    assert.equal(LinkFields.kindOf(context, '/services/conseil'), '/services/conseil',
      'y compris au fond d’un groupe');
    assert.equal(LinkFields.kindOf(context, '#tarifs'), LinkFields.kinds.anchor);
    assert.equal(LinkFields.kindOf(context, '#autre'), LinkFields.kinds.anchor,
      'toute adresse qui commence par un croisillon est une ancre');
    assert.equal(LinkFields.kindOf(context, 'https://exemple.tld'), LinkFields.kinds.custom);
    assert.equal(LinkFields.kindOf(context, ''), LinkFields.kinds.custom,
      'un lien vide s’écrit à la main');
  });

  it('ne retient que le champ de la sorte choisie', () => {
    const rempli = {
      [LinkFields.fields.url]: { value: 'https://exemple.tld', meta: {}},
      [LinkFields.fields.anchor]: '#tarifs'
    };

    assert.equal(LinkFields.toAttributes({ ...rempli, [LinkFields.fields.predefined]: '/' }).href, '/',
      'la page choisie l’emporte sur les deux autres champs');
    assert.equal(
      LinkFields.toAttributes({ ...rempli, [LinkFields.fields.predefined]: LinkFields.kinds.custom }).href,
      'https://exemple.tld');
    assert.equal(
      LinkFields.toAttributes({ ...rempli, [LinkFields.fields.predefined]: LinkFields.kinds.anchor }).href,
      '#tarifs');
  });

  /**
   * Ce qui atteint l'attribut ne doit dépendre d'aucun composant d'interface, si soigneux
   * soit-il : les noms sont revalidés ici, et pas seulement à la saisie.
   */
  it('refuse les noms de classe qui n’en sont pas', () => {
    const attributs = LinkFields.toAttributes({
      [LinkFields.fields.predefined]: LinkFields.kinds.custom,
      [LinkFields.fields.url]: { value: '/', meta: {}},
      [LinkFields.fields.classes]: 'btn a"onmouseover=alert(1) 2mauvais bon-nom btn',
      [LinkFields.fields.cls]: 'btn-primary'
    });

    assert.equal(attributs.classes, 'btn bon-nom btn-primary',
      'les noms impossibles sont écartés, les doublons aussi, et la liste s’ajoute au champ');
  });

  it('rend l’action au clic telle qu’elle a été écrite', () => {
    const attributs = LinkFields.toAttributes({
      [LinkFields.fields.predefined]: LinkFields.kinds.custom,
      [LinkFields.fields.url]: { value: '/', meta: {}},
      [LinkFields.fields.click]: '  return confirm(\'Partir ?\')  ',
      [LinkFields.fields.style]: '  color: #c0392b  '
    });

    assert.equal(attributs.click, 'return confirm(\'Partir ?\')');
    assert.equal(attributs.style, 'color: #c0392b');
  });

  it('dit quand la sorte de lien vient de changer', () => {
    assert.isTrue(LinkFields.isKindChange(LinkFields.fields.predefined));
    assert.isFalse(LinkFields.isKindChange(LinkFields.fields.url));
  });
});
