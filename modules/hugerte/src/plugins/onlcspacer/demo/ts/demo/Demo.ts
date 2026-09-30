import { HugeRTE } from 'hugerte/core/api/PublicApi';

declare let hugerte: HugeRTE;

hugerte.init({
  selector: 'textarea.hugerte',
  plugins: 'onlcspacer code',
  toolbar: 'onlcspacer onlcspacerquick | code',
  height: 600
});

export {};
