import { HugeRTE } from 'hugerte/core/api/PublicApi';

declare let hugerte: HugeRTE;

hugerte.init({
  selector: 'textarea.hugerte',
  plugins: 'onlcicons code',
  toolbar: 'onlcemoji onlcicons onlcmaterialicons | code',
  height: 600
});

export {};
