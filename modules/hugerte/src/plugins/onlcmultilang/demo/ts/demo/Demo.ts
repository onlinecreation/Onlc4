import { HugeRTE } from 'hugerte/core/api/PublicApi';

declare let hugerte: HugeRTE;

/** Un contenu qui mélange les deux écritures, sur du texte comme sur des blocs. */
const content =
  '<h1>[LG="fr"]Nos horaires[/LG][LG="en"]Opening hours[/LG][LG="nl"]Openingstijden[/LG]</h1>' +
  '<p>Ce paragraphe n’est marqué dans aucune langue : il s’affiche pour tout le monde.</p>' +
  '<multilang lang="fr"><h2>Boutique</h2><p>Ouvert du mardi au samedi.</p></multilang>' +
  '<multilang lang="en"><h2>Shop</h2><p>Open Tuesday to Saturday.</p></multilang>' +
  '<p>Téléphone : 01 23 45 67 89</p>';

hugerte.init({
  selector: 'textarea.hugerte',
  plugins: 'onlcmultilang code',
  toolbar: 'onlcmultilang | code',
  menubar: 'file edit insert format',
  onlc_multilang_languages: [ 'fr', 'en', 'nl' ],
  height: 600,
  setup: (editor) => {
    editor.on('init', () => editor.setContent(content));
  }
});

export {};
