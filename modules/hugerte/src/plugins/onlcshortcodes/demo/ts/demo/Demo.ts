import { HugeRTE } from 'hugerte/core/api/PublicApi';

declare let hugerte: HugeRTE;

/**
 * Démonstration du plugin onlcshortcodes : les codes courts du contenu initial apparaissent
 * sous forme de blocs, et le bouton « Éléments du site » ouvre la bibliothèque.
 */
hugerte.init({
  selector: 'textarea.hugerte',
  plugins: 'onlcshortcodes onlcblocks code',
  toolbar: 'onlcshortcodes | code',
  height: 600,
  content_style: 'body { font-family: system-ui, sans-serif; margin: 24px; }'
});
