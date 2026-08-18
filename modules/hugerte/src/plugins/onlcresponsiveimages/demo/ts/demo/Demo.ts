import { HugeRTE } from 'hugerte/core/api/PublicApi';

declare let hugerte: HugeRTE;

hugerte.init({
  selector: 'textarea.hugerte',
  plugins: 'onlcresponsiveimages image code',
  toolbar: 'image code',
  height: 600
});

export {};
