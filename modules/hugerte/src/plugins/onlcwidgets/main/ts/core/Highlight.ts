import { Arr, Optional } from '@ephox/katamari';

import { CodeLanguage } from '../api/Types';

/**
 * Tiny syntax highlighter used by the code fields of the plugin. It is deliberately small and
 * dependency free: it only has to make a script or a piece of html readable, not to be a
 * complete parser.
 */

interface Rule {
  readonly type: string;
  readonly pattern: RegExp;
}

const escape = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Un jeton ne contient jamais de saut de ligne : les jetons multilignes - commentaires en bloc,
 * gabarits - sont coupés en un span par ligne. L'appelant peut alors découper le html produit
 * sur `\n` pour obtenir exactement une ligne logique par morceau, sans casser de balise.
 */
const token = (type: string, value: string): string =>
  Arr.map(value.split('\n'), (line) => `<span class="onlc-code__t onlc-code__t--${type}">${escape(line)}</span>`).join('\n');

const sticky = (rules: Array<{ type: string; pattern: RegExp }>): Rule[] =>
  Arr.map(rules, (rule) => ({ type: rule.type, pattern: new RegExp(rule.pattern.source, 'y' + (rule.pattern.ignoreCase ? 'i' : '')) }));

const jsRules = sticky([
  { type: 'comment', pattern: /\/\/[^\n]*|\/\*[\s\S]*?\*\// },
  { type: 'string', pattern: /"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`/ },
  { type: 'number', pattern: /\b(?:0[xX][\da-fA-F]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b/ },
  { type: 'keyword', pattern: /\b(?:async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|export|extends|finally|for|function|if|import|in|instanceof)\b/ },
  { type: 'keyword', pattern: /\b(?:let|new|of|return|static|super|switch|this|throw|try|typeof|var|void|while|with|yield)\b/ },
  { type: 'atom', pattern: /\b(?:true|false|null|undefined|NaN|Infinity)\b/ },
  { type: 'function', pattern: /[A-Za-z_$][\w$]*(?=\s*\()/ },
  { type: 'operator', pattern: /=>|[+\-*/%=<>!&|^~?:]+/ },
  { type: 'punctuation', pattern: /[{}[\];(),.]/ }
]);

const cssRules = sticky([
  { type: 'comment', pattern: /\/\*[\s\S]*?\*\// },
  { type: 'string', pattern: /"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'/ },
  { type: 'keyword', pattern: /@[\w-]+/ },
  { type: 'attribute', pattern: /[-a-zA-Z]+(?=\s*:)/ },
  { type: 'number', pattern: /#[\da-fA-F]{3,8}\b|\b\d+(?:\.\d+)?(?:px|em|rem|%|vh|vw|s|ms|deg|fr)?\b/ },
  { type: 'punctuation', pattern: /[{}();:,]/ }
]);

const tokenize = (value: string, rules: Rule[]): string => {
  let index = 0;
  let plain = '';
  let out = '';

  while (index < value.length) {
    const matched = Arr.findMap(rules, (rule) => {
      rule.pattern.lastIndex = index;
      const result = rule.pattern.exec(value);
      return result === null || result[0].length === 0 ? Optional.none<{ type: string; text: string }>() : Optional.some({ type: rule.type, text: result[0] });
    });

    matched.fold(
      () => {
        plain += value.charAt(index);
        index += 1;
      },
      (match) => {
        out += escape(plain) + token(match.type, match.text);
        plain = '';
        index += match.text.length;
      }
    );
  }

  return out + escape(plain);
};

const attributesOf = (value: string): string => {
  const pattern = /([\w:.-]+)(\s*=\s*)("[^"]*"|'[^']*'|[^\s"'>]+)|([\w:.-]+)/g;
  let lastIndex = 0;
  let out = '';
  let match = pattern.exec(value);

  while (match !== null) {
    out += escape(value.substring(lastIndex, match.index));
    out += match[4] === undefined
      ? token('attribute', match[1]) + escape(match[2]) + token('string', match[3])
      : token('attribute', match[4]);
    lastIndex = match.index + match[0].length;
    match = pattern.exec(value);
  }

  return out + escape(value.substring(lastIndex));
};

const highlightHtml = (value: string): string => {
  const commentOrTag = /<!--[\s\S]*?-->|<!DOCTYPE[^>]*>|<\/?[a-zA-Z][^>]*>/gi;
  let lastIndex = 0;
  let out = '';
  let match = commentOrTag.exec(value);

  while (match !== null) {
    out += escape(value.substring(lastIndex, match.index));
    const chunk = match[0];

    if (chunk.indexOf('<!--') === 0 || chunk.toLowerCase().indexOf('<!doctype') === 0) {
      out += token('comment', chunk);
    } else {
      const nameMatch = /^<\/?[\w:.-]+/.exec(chunk);
      const name = nameMatch === null ? chunk : nameMatch[0];
      const rest = chunk.substring(name.length);
      const closing = rest.endsWith('/>') ? '/>' : '>';
      const attributes = rest.substring(0, rest.length - closing.length);
      out += token('tag', name) + attributesOf(attributes) + token('tag', closing);
    }

    lastIndex = match.index + chunk.length;
    match = commentOrTag.exec(value);
  }

  return out + escape(value.substring(lastIndex));
};

/**
 * Returns the highlighted markup of `value`, ready to be injected in the preview layer of the
 * code editor. Everything it outputs is escaped.
 */
const highlight = (value: string, language: CodeLanguage): string => {
  switch (language) {
    case 'html':
      return highlightHtml(value);
    case 'css':
      return tokenize(value, cssRules);
    default:
      return tokenize(value, jsRules);
  }
};

/**
 * Coloration ligne par ligne : chaque entrée du tableau correspond exactement à une ligne
 * logique du texte d'origine, ce qui permet d'afficher un numéro en face de chacune d'elles
 * même quand la ligne est repliée sur plusieurs lignes visuelles.
 */
const highlightLines = (value: string, language: CodeLanguage): string[] =>
  highlight(value, language).split('\n');

export {
  escape,
  highlight,
  highlightLines
};
