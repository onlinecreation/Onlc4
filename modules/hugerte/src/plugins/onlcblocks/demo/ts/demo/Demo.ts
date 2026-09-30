import { HugeRTE } from 'hugerte/core/api/PublicApi';

declare let hugerte: HugeRTE;

hugerte.init({
  selector: 'textarea.hugerte',
  plugins: 'onlcblocks onlcspacer code',
  toolbar: 'onlcblocksinsert onlcblocksrow onlcblocks onlcspacer | code',
  height: 700,
  content_css: [ 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css' ]
});

export {};
