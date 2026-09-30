import { HugeRTE } from 'hugerte/core/api/PublicApi';

declare let hugerte: HugeRTE;

/** Une page qui porte déjà une fiche, pour vérifier qu'elle revient telle quelle. */
const content =
  '<script type="application/ld+json">' +
  JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'Coque de carte Renault',
    image: 'https://exemple.tld/coque.jpg',
    offers: { '@type': 'Offer', price: '28', priceCurrency: 'EUR', availability: 'https://schema.org/InStock' }
  }) +
  '<\/script>' +
  '<h1>Coque de carte Renault</h1>' +
  '<p>Peinte à la teinte exacte de votre véhicule.</p>';

hugerte.init({
  selector: 'textarea.hugerte',
  plugins: 'onlcseo onlcwidgets code',
  toolbar: 'onlcseo | onlcwidget | code',
  menubar: 'file edit insert format',
  height: 600,
  setup: (editor) => {
    editor.on('init', () => editor.setContent(content));
  }
});

export {};
