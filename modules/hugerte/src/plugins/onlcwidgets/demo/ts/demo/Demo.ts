import { HugeRTE } from 'hugerte/core/api/PublicApi';

declare let hugerte: HugeRTE;

hugerte.init({
  selector: 'textarea.hugerte',
  plugins: 'onlcwidgets onlcblocks onlcspacer onlcicons code',
  toolbar: 'onlcwidget onlcscript onlcsource | onlcblocksinsert onlcspacer onlcicons | code',
  height: 700,
  content_style: 'body { font-family: system-ui, sans-serif; margin: 24px; }'
});

export {};
