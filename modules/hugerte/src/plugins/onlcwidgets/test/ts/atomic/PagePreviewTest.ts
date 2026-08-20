import { describe, it } from '@ephox/bedrock-client';
import { assert } from 'chai';

import { PreviewValue } from 'hugerte/plugins/onlcwidgets/api/Types';
import * as PagePreview from 'hugerte/plugins/onlcwidgets/core/PagePreview';

/**
 * Remplissage du gabarit de l'aperçu visiteur.
 *
 * Deux règles se contredisent en apparence et sont pourtant toutes les deux nécessaires : dans
 * le **gabarit**, les codes courts vivent souvent dans des attributs — `<meta content="[X]">` —
 * et doivent y être remplacés ; dans le **contenu**, l'intérieur des balises doit au contraire
 * être laissé tranquille, sans quoi un `alt="[2] la suite"` casserait le markup autour.
 */

const values: Record<string, PreviewValue> = {
  TitreSite: 'Ma boutique',
  Copyrights: '© 2026',
  MenuSite: (attributs) => `<ul class="${attributs.classparent ?? ''}"><li>Accueil</li></ul>`
};

describe('atomic.hugerte.plugins.onlcwidgets.PagePreviewTest', () => {
  it('remplace [ContenuPage] par le contenu', () => {
    const out = PagePreview.fill('<body>[ContenuPage]</body>', '<p>Bonjour</p>', {});
    assert.equal(out, '<body><p>Bonjour</p></body>');
  });

  it('reconnaît le code du contenu quelle que soit la casse', () => {
    assert.equal(PagePreview.fill('[contenupage]', '<p>x</p>', {}), '<p>x</p>');
  });

  it('remplace les codes du gabarit par les valeurs configurées', () => {
    const out = PagePreview.fill('<title>[TitreSite]</title><p>[Copyrights]</p>', '', values);
    assert.equal(out, '<title>Ma boutique</title><p>© 2026</p>');
  });

  it('remplace un code écrit dans un attribut du gabarit', () => {
    // Un gabarit place ses codes dans des attributs à dessein : les sauter ne remplacerait rien.
    const out = PagePreview.fill('<meta name="TITLE" content="[TitreSite]" />', '', values);
    assert.equal(out, '<meta name="TITLE" content="Ma boutique" />');
  });

  it('passe les attributs du code à une valeur fonction', () => {
    const out = PagePreview.fill('[MenuSite classparent="nav navbar-nav"]', '', values);
    assert.equal(out, '<ul class="nav navbar-nav"><li>Accueil</li></ul>');
  });

  it('efface un code sans valeur configurée', () => {
    // Le but est de montrer la page, pas de rappeler ce qui reste à régler côté site.
    assert.equal(PagePreview.fill('avant [Inconnu attribut="x"] après', '', values), 'avant  après');
  });

  it('résout aussi les codes courts présents dans le contenu', () => {
    const out = PagePreview.fill('<main>[ContenuPage]</main>', '<p>[Copyrights]</p>', values);
    assert.equal(out, '<main><p>© 2026</p></main>');
  });

  it('laisse tranquille l’intérieur des balises du contenu', () => {
    // « [TitreSite] » est ici un texte alternatif, pas un code court.
    const content = '<img alt="[TitreSite]" src="/a.png"><p>[TitreSite]</p>';
    const out = PagePreview.fill('[ContenuPage]', content, values);
    assert.equal(out, '<img alt="[TitreSite]" src="/a.png"><p>Ma boutique</p>');
  });

  it('ne réinterprète pas le contenu déjà résolu', () => {
    // Le contenu passe une seule fois : une valeur qui produit des crochets n'est pas relue.
    const out = PagePreview.fill('[ContenuPage]', '<p>[Piege]</p>', { Piege: '[TitreSite]', ...values });
    assert.equal(out, '<p>[TitreSite]</p>');
  });

  it('remplace plusieurs occurrences du même code', () => {
    const out = PagePreview.fill('<a>[Copyrights]</a><b>[Copyrights]</b>', '', values);
    assert.equal(out, '<a>© 2026</a><b>© 2026</b>');
  });

  it('laisse un gabarit sans code intact', () => {
    const template = '<html><body><p>Rien à remplacer ici.</p></body></html>';
    assert.equal(PagePreview.fill(template, '', values), template);
  });

  it('le gabarit de repli porte le contenu et le nom de la page', () => {
    assert.include(PagePreview.fallbackTemplate, '[ContenuPage]');
    assert.include(PagePreview.fallbackTemplate, '[NomPage]');
  });

  it('accepte une valeur nulle ou d’un autre type sans planter', () => {
    const odd = { A: null, B: 42, C: undefined } as unknown as Record<string, PreviewValue>;
    assert.equal(PagePreview.fill('[A][B][C]', '', odd), '');
  });

  it('trouve la valeur quelle que soit la casse du nom', () => {
    assert.equal(PagePreview.fill('[titresite]', '', values), 'Ma boutique');
  });

  describe('feuilles de style de la page', () => {
    const styles = [ '/assets/grille.css', '/assets/site.css' ];

    it('les pose à la fin du head, après celles du gabarit', () => {
      // Après, parce que ce sont celles que la zone d'écriture charge : l'aperçu doit ressembler
      // à ce qu'on vient d'écrire, pas à ce que le gabarit imagine.
      const page = '<html><head><link rel="stylesheet" href="/gabarit.css"></head><body>x</body></html>';
      const out = PagePreview.withStyles(page, styles);

      assert.isBelow(out.indexOf('/gabarit.css'), out.indexOf('/assets/grille.css'));
      assert.isBelow(out.indexOf('/assets/site.css'), out.indexOf('</head>'));
    });

    it('les pose en tête quand le gabarit n’a pas de head', () => {
      const out = PagePreview.withStyles('<body>x</body>', styles);
      assert.isBelow(out.indexOf('/assets/grille.css'), out.indexOf('<body>'));
    });

    it('ne touche à rien sans feuille à poser', () => {
      const page = '<html><head></head><body>x</body></html>';
      assert.equal(PagePreview.withStyles(page, []), page);
    });

    it('refuse une adresse exécutable', () => {
      // Les adresses viennent de la configuration, mais elles finissent dans du html écrit à la
      // main : un `javascript:` ne doit pas en ressortir.
      const out = PagePreview.withStyles('<head></head>', [ 'javascript:alert(1)' ]);
      assert.notInclude(out, 'javascript:');
    });

    it('échappe les guillemets d’une adresse', () => {
      const out = PagePreview.withStyles('<head></head>', [ '/a.css" onload="x' ]);
      assert.notInclude(out, 'onload="x"');
    });
  });
});
