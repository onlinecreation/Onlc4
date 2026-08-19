import { describe, it } from '@ephox/bedrock-client';
import { assert } from 'chai';

import * as FinderPanel from 'hugerte/plugins/onlcmedia/ui/FinderPanel';

/**
 * Filtrage des fichiers à l'envoi, et affichage des dates de version.
 *
 * Le contrôle des types épargne un aller-retour inutile ; il ne remplace pas celui du serveur.
 * Il doit donc être **prévisible** plutôt que malin : une famille (`image/`), un type complet
 * (`image/png`) ou une extension (`.pdf`), et rien d'autre.
 */

const file = (name: string, type: string): File =>
  ({ name, type, size: 1024 } as File);

describe('atomic.hugerte.plugins.onlcmedia.UploadFilterTest', () => {
  it('accepte tout quand la liste est vide', () => {
    assert.isTrue(FinderPanel.matchesMimeList(file('a.exe', 'application/x-msdownload'), []));
    assert.isTrue(FinderPanel.matchesMimeList(file('a.exe', ''), undefined as unknown as string[]));
  });

  it('accepte une famille entière', () => {
    const allowed = [ 'image/' ];
    assert.isTrue(FinderPanel.matchesMimeList(file('a.png', 'image/png'), allowed));
    assert.isTrue(FinderPanel.matchesMimeList(file('a.svg', 'image/svg+xml'), allowed));
    assert.isFalse(FinderPanel.matchesMimeList(file('a.pdf', 'application/pdf'), allowed));
  });

  it('accepte un type complet et lui seul', () => {
    const allowed = [ 'image/png' ];
    assert.isTrue(FinderPanel.matchesMimeList(file('a.png', 'image/png'), allowed));
    assert.isFalse(FinderPanel.matchesMimeList(file('a.jpg', 'image/jpeg'), allowed));
  });

  it('accepte une extension quand le navigateur ne donne pas de type', () => {
    const allowed = [ '.pdf' ];
    assert.isTrue(FinderPanel.matchesMimeList(file('rapport.pdf', ''), allowed));
    assert.isTrue(FinderPanel.matchesMimeList(file('RAPPORT.PDF', ''), allowed));
    assert.isFalse(FinderPanel.matchesMimeList(file('rapport.doc', ''), allowed));
  });

  it('ne confond pas une extension avec un nom qui s’y termine sans point', () => {
    assert.isFalse(FinderPanel.matchesMimeList(file('pdf', ''), [ '.pdf' ]));
  });

  it('ignore la casse du type', () => {
    assert.isTrue(FinderPanel.matchesMimeList(file('a.png', 'IMAGE/PNG'), [ 'image/png' ]));
    assert.isTrue(FinderPanel.matchesMimeList(file('a.png', 'Image/Png'), [ 'IMAGE/' ]));
  });

  it('accepte dès qu’une entrée de la liste correspond', () => {
    const allowed = [ 'image/', 'application/pdf' ];
    assert.isTrue(FinderPanel.matchesMimeList(file('a.png', 'image/png'), allowed));
    assert.isTrue(FinderPanel.matchesMimeList(file('a.pdf', 'application/pdf'), allowed));
    assert.isFalse(FinderPanel.matchesMimeList(file('a.zip', 'application/zip'), allowed));
  });

  it('ignore les entrées vides de la liste', () => {
    assert.isFalse(FinderPanel.matchesMimeList(file('a.zip', 'application/zip'), [ '', '   ' ]));
  });

  it('met en forme une date de version, et garde la valeur brute si elle est illisible', () => {
    assert.notEqual(FinderPanel.humanDate('2026-04-18T09:12:00Z'), '2026-04-18T09:12:00Z');
    assert.equal(FinderPanel.humanDate('pas une date'), 'pas une date');
    assert.equal(FinderPanel.humanDate(''), '');
    assert.equal(FinderPanel.humanDate(undefined), '');
  });

  it('n’affiche dans la grille que les fichiers du type demandé', () => {
    const png = { name: 'a.png', path: '/a.png', url: '/a.png', mime: 'image/png' };
    const pdf = { name: 'b.pdf', path: '/b.pdf', url: '/b.pdf', mime: 'application/pdf' };

    assert.isTrue(FinderPanel.matchesAccept(png, undefined));
    assert.isTrue(FinderPanel.matchesAccept(png, 'image/'));
    assert.isFalse(FinderPanel.matchesAccept(pdf, 'image/'));
    assert.isTrue(FinderPanel.matchesAccept(pdf, 'application/pdf'));
  });

  it('reconnaît une image à son type comme à son extension', () => {
    assert.isTrue(FinderPanel.isImage({ name: 'a.png', path: '/a.png', url: '/a.png', mime: 'image/png' }));
    assert.isTrue(FinderPanel.isImage({ name: 'a.jpg', path: '/a.jpg', url: '/a.jpg' }));
    assert.isFalse(FinderPanel.isImage({ name: 'a.pdf', path: '/a.pdf', url: '/a.pdf', mime: 'application/pdf' }));
  });
});
