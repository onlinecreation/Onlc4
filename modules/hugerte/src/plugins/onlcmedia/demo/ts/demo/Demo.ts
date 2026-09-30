import { HugeRTE } from 'hugerte/core/api/PublicApi';

declare let hugerte: HugeRTE;

hugerte.init({
  selector: 'textarea.hugerte',
  plugins: 'onlcmedia onlcresponsiveimages code',
  toolbar: 'onlcimage onlcmedialibrary | code',
  height: 600,
  // Renseignez l'URL de votre API média pour tester l'explorateur
  onlc_media_api_url: '/api/media'
});

export {};
