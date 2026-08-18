import { Arr } from '@ephox/katamari';

/**
 * Conservative html formatter used by the source dialog. Only the boundaries between block
 * elements are touched: inline markup, and everything inside `pre`, `textarea` or `script`,
 * is left untouched so that no whitespace becomes visible in the page.
 */

const blockElements = [
  'address', 'article', 'aside', 'blockquote', 'body', 'div', 'dl', 'dd', 'dt', 'fieldset', 'figcaption', 'figure',
  'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header', 'hr', 'html', 'li', 'main', 'nav', 'ol',
  'p', 'section', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'ul', 'video', 'audio', 'iframe', 'script',
  'style', 'noscript', 'picture', 'source', 'canvas', 'details', 'summary'
];

const voidElements = [ 'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr' ];

const preserveElements = [ 'pre', 'textarea', 'script', 'style' ];

const isBlock = (name: string): boolean => Arr.contains(blockElements, name);

const format = (html: string, indentSize = 2): string => {
  const indent = new Array(Math.max(1, indentSize) + 1).join(' ');
  const tokens = html.split(/(<[^>]+>)/g);
  const lines: string[] = [];
  let depth = 0;
  let buffer = '';
  let preserved: string | null = null;

  const flush = () => {
    if (buffer.trim() !== '') {
      lines.push(new Array(depth + 1).join(indent) + buffer.trim());
    }
    buffer = '';
  };

  Arr.each(tokens, (token) => {
    if (token === '') {
      return;
    }

    const tagMatch = /^<\/?([\w:-]+)/.exec(token);
    const name = tagMatch === null ? '' : tagMatch[1].toLowerCase();
    const closing = token.indexOf('</') === 0;
    const selfClosing = /\/>$/.test(token) || Arr.contains(voidElements, name);

    if (preserved !== null) {
      if (closing && name === preserved) {
        flush();
        depth = Math.max(0, depth - 1);
        lines.push(new Array(depth + 1).join(indent) + token);
        preserved = null;
      } else {
        buffer += token;
      }
      return;
    }

    if (tagMatch === null || !isBlock(name)) {
      buffer += token;
      return;
    }

    if (closing) {
      flush();
      depth = Math.max(0, depth - 1);
      lines.push(new Array(depth + 1).join(indent) + token);
    } else {
      flush();
      lines.push(new Array(depth + 1).join(indent) + token);
      if (!selfClosing) {
        depth += 1;
        if (Arr.contains(preserveElements, name)) {
          preserved = name;
        }
      }
    }
  });

  flush();
  return lines.join('\n');
};

export {
  format
};
