import { HugeRTE } from 'hugerte/core/api/PublicApi';

declare let hugerte: HugeRTE;

hugerte.init({
  selector: 'textarea.hugerte',
  plugins: 'onlclink code',
  toolbar: 'onlclink onlcunlink | code',
  height: 600,
  onlc_link_list: [
    { title: 'Accueil', url: '/' },
    { title: 'Services', url: '/services', children: [
      { title: 'Conseil', url: '/services/conseil' },
      { title: 'Formation', url: '/services/formation' }
    ] }
  ]
});

export {};
