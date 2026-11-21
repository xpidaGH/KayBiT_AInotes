import { ProgrammingLanguage } from '../i18n/languages';
import { detectProgrammingLanguage } from '../parsers/setextCustomParser';

export interface NoteFormatResult {
  formattedContent: string;
  blocksFormatted: number;
  detectedLanguages: ProgrammingLanguage[];
}

interface TokenSegment {
  type: 'code' | 'string' | 'comment';
  text: string;
}

function splitStringsAndComments(
  source: string,
  options: { hashComments?: boolean; dashComments?: boolean; slashComments?: boolean; backticks?: boolean }
): TokenSegment[] {
  const segments: TokenSegment[] = [];
  let i = 0;
  let buffer = '';

  const flushCode = () => {
    if (buffer) {
      segments.push({ type: 'code', text: buffer });
      buffer = '';
    }
  };

  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1] ?? '';

    if (options.slashComments && ch === '/' && next === '/') {
      flushCode();
      const end = source.indexOf('\n', i);
      const commentEnd = end === -1 ? source.length : end;
      segments.push({ type: 'comment', text: source.slice(i, commentEnd) });
      i = commentEnd;
      continue;
    }

    if (options.slashComments && ch === '/' && next === '*') {
      flushCode();
      const end = source.indexOf('*/', i + 2);
      const commentEnd = end === -1 ? source.length : end + 2;
      segments.push({ type: 'comment', text: source.slice(i, commentEnd) });
      i = commentEnd;
      continue;
    }

    if (options.hashComments && ch === '#') {
      flushCode();
      const end = source.indexOf('\n', i);
      const commentEnd = end === -1 ? source.length : end;
      segments.push({ type: 'comment', text: source.slice(i, commentEnd) });
      i = commentEnd;
      continue;
    }

    if (options.dashComments && ch === '-' && next === '-') {
      flushCode();
      const end = source.indexOf('\n', i);
      const commentEnd = end === -1 ? source.length : end;
      segments.push({ type: 'comment', text: source.slice(i, commentEnd) });
      i = commentEnd;
      continue;
    }

    if (
      ch === '"' ||
      ch === "'" ||
      (options.backticks && ch === '`')
    ) {
      flushCode();
      const quote = ch;
      let j = i + 1;
      const isTriple =
        (quote === '"' || quote === "'") &&
        source[i + 1] === quote &&
        source[i + 2] === quote;
      if (isTriple) {
        j = i + 3;
        while (j < source.length) {
          if (
            source[j] === quote &&
            source[j + 1] === quote &&
            source[j + 2] === quote
          ) {
            j += 3;
            break;
          }
          if (source[j] === '\\') j++;
          j++;
        }
      } else {
        while (j < source.length) {
          if (source[j] === '\\') {
            j += 2;
            continue;
          }
          if (source[j] === quote) {
            j++;
            break;
          }
          if (quote !== '`' && source[j] === '\n') {
            break;
          }
          j++;
        }
      }
      segments.push({ type: 'string', text: source.slice(i, j) });
      i = j;
      continue;
    }

    buffer += ch;
    i++;
  }

  flushCode();
  return segments;
}

function cleanupBlankLines(lines: string[]): string[] {
  const result: string[] = [];
  let prevBlank = false;
  for (const raw of lines) {
    const trimmedRight = raw.replace(/\s+$/g, '');
    const isBlank = trimmedRight.length === 0;
    if (isBlank && (result.length === 0 || prevBlank)) {
      continue;
    }
    result.push(trimmedRight);
    prevBlank = isBlank;
  }
  while (result.length > 0 && result[result.length - 1] === '') {
    result.pop();
  }
  return result;
}

function normalizeBraceOperators(codePart: string): string {
  return codePart
    .replace(/\b(if|for|while|switch|catch|match)\(/g, '$1 (')
    .replace(/\)\{/g, ') {')
    .replace(/\}\s*(else|catch|finally)\b/g, '} $1')
    .replace(/\belse\{/g, 'else {')
    .replace(/,\s*/g, ', ')
    .replace(/[ \t]+$/gm, '');
}

function formatBraceLanguage(code: string, indentSize: number): string {
  const normalized = code.replace(/\r\n/g, '\n').trim();
  if (!normalized) return '';

  // Expand single-line compressed statements outside strings/comments
  const segments = splitStringsAndComments(normalized, {
    slashComments: true,
    backticks: true,
  });

  let expanded = '';
  let parenDepth = 0;

  for (const seg of segments) {
    if (seg.type !== 'code') {
      expanded += seg.text;
      continue;
    }

    const part = normalizeBraceOperators(seg.text);
    for (let i = 0; i < part.length; i++) {
      const ch = part[i];
      if (ch === '(') parenDepth++;
      else if (ch === ')' && parenDepth > 0) parenDepth--;

      if (ch === '{') {
        expanded = expanded.replace(/[ \t]+$/g, '');
        if (expanded.length > 0 && !expanded.endsWith('\n') && !expanded.endsWith(' ')) {
          expanded += ' ';
        }
        expanded += '{\n';
        continue;
      }

      if (ch === '}') {
        expanded = expanded.replace(/[ \t]+$/g, '');
        if (!expanded.endsWith('\n')) {
          expanded += '\n';
        }
        expanded += '}';
        const rest = part.slice(i + 1).trimStart();
        if (
          rest.length > 0 &&
          !rest.startsWith(';') &&
          !rest.startsWith(',') &&
          !rest.startsWith(')') &&
          !rest.startsWith('else') &&
          !rest.startsWith('catch') &&
          !rest.startsWith('finally') &&
          !rest.startsWith('while')
        ) {
          expanded += '\n';
        }
        continue;
      }

      if (ch === ';' && parenDepth === 0) {
        const upcoming = part.slice(i + 1);
        const isTrailingLineComment = /^[ \t]*\/\/.*/.test(upcoming.split('\n')[0] ?? '');
        expanded += isTrailingLineComment ? ';' : ';\n';
        continue;
      }

      expanded += ch;
    }
  }

  const rawLines = expanded.split('\n');
  const formattedLines: string[] = [];
  let indentLevel = 0;
  let inBlockComment = false;

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      formattedLines.push('');
      continue;
    }

    if (inBlockComment) {
      formattedLines.push(`${' '.repeat(indentLevel * indentSize)} ${trimmed}`);
      if (trimmed.includes('*/')) {
        inBlockComment = false;
      }
      continue;
    }

    if (trimmed.startsWith('/*') && !trimmed.includes('*/')) {
      formattedLines.push(`${' '.repeat(indentLevel * indentSize)}${trimmed}`);
      inBlockComment = true;
      continue;
    }

    // Count leading closing braces before applying line indent
    let leadingCloses = 0;
    for (const ch of trimmed) {
      if (ch === '}' || ch === ']' || ch === ')') leadingCloses++;
      else break;
    }

    const lineIndent = Math.max(0, indentLevel - leadingCloses);
    const isCaseLabel = /^(case\b.*:|default\s*:)/.test(trimmed);
    const effectiveIndent = isCaseLabel ? Math.max(0, lineIndent - 1) : lineIndent;
    const cleanContent = trimmed.replace(/[ \t]{2,}/g, ' ');
    formattedLines.push(`${' '.repeat(effectiveIndent * indentSize)}${cleanContent}`);

    // Update indentLevel for subsequent lines using code-only braces/brackets
    const lineSegments = splitStringsAndComments(trimmed, {
      slashComments: true,
      backticks: true,
    });
    let delta = 0;
    for (const s of lineSegments) {
      if (s.type !== 'code') continue;
      for (const ch of s.text) {
        if (ch === '{' || ch === '[' || ch === '(') delta++;
        else if (ch === '}' || ch === ']' || ch === ')') delta--;
      }
    }
    indentLevel = Math.max(0, indentLevel + delta);
  }

  return cleanupBlankLines(formattedLines).join('\n');
}

function formatPython(code: string): string {
  const lines = code.replace(/\r\n/g, '\n').replace(/\t/g, '    ').split('\n');
  const indentStack: number[] = [0];
  const out: string[] = [];

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      out.push('');
      continue;
    }

    const leadingSpaces = rawLine.length - rawLine.trimStart().length;
    while (indentStack.length > 1 && leadingSpaces < indentStack[indentStack.length - 1]) {
      indentStack.pop();
    }
    if (leadingSpaces > indentStack[indentStack.length - 1]) {
      indentStack.push(leadingSpaces);
    }

    const level = indentStack.length - 1;
    const segments = splitStringsAndComments(trimmed, { hashComments: true });
    const rebuilt = segments
      .map((seg) => {
        if (seg.type === 'comment') {
          return seg.text.replace(/^#([^\s!])/, '# $1');
        }
        if (seg.type !== 'code') return seg.text;
        return seg.text
          .replace(/,\s*/g, ', ')
          .replace(/[ \t]{2,}/g, ' ');
      })
      .join('')
      .trimEnd();

    // Ensure 2 blank lines before top-level def/class if preceded by non-blank non-decorator line
    if (
      level === 0 &&
      /^(async\s+)?def\s+|^class\s+/.test(rebuilt) &&
      out.length > 0 &&
      out[out.length - 1] !== '' &&
      !out[out.length - 1].trimStart().startsWith('@')
    ) {
      out.push('');
    }

    out.push(`${'    '.repeat(level)}${rebuilt}`);
  }

  return cleanupBlankLines(out).join('\n');
}

const SQL_KEYWORDS = [
  'INSERT INTO',
  'DELETE FROM',
  'CREATE TABLE',
  'ALTER TABLE',
  'INNER JOIN',
  'LEFT JOIN',
  'RIGHT JOIN',
  'FULL JOIN',
  'CROSS JOIN',
  'GROUP BY',
  'ORDER BY',
  'IS NOT NULL',
  'IS NULL',
  'SELECT',
  'DISTINCT',
  'FROM',
  'WHERE',
  'HAVING',
  'LIMIT',
  'OFFSET',
  'VALUES',
  'UPDATE',
  'SET',
  'JOIN',
  'ON',
  'AND',
  'OR',
  'NOT',
  'IN',
  'AS',
  'WITH',
  'UNION',
  'CASE',
  'WHEN',
  'THEN',
  'ELSE',
  'END',
  'ASC',
  'DESC',
];

const SQL_MAJOR_CLAUSES = [
  'WITH',
  'SELECT',
  'FROM',
  'INNER JOIN',
  'LEFT JOIN',
  'RIGHT JOIN',
  'FULL JOIN',
  'CROSS JOIN',
  'JOIN',
  'WHERE',
  'GROUP BY',
  'HAVING',
  'ORDER BY',
  'LIMIT',
  'OFFSET',
  'INSERT INTO',
  'VALUES',
  'UPDATE',
  'SET',
  'DELETE FROM',
  'UNION',
];

function formatSql(code: string): string {
  const segments = splitStringsAndComments(code.replace(/\r\n/g, '\n').trim(), {
    dashComments: true,
    slashComments: true,
  });

  let normalized = segments
    .map((seg) => {
      if (seg.type !== 'code') return seg.text;
      let text = seg.text.replace(/\s+/g, ' ');
      for (const kw of SQL_KEYWORDS) {
        const regex = new RegExp(`\\b${kw.replace(/\s+/g, '\\s+')}\\b`, 'gi');
        text = text.replace(regex, kw);
      }
      for (const clause of SQL_MAJOR_CLAUSES) {
        const regex = new RegExp(`\\s+\\b(${clause})\\b`, 'g');
        text = text.replace(regex, `\n$1`);
      }
      text = text
        .replace(/\s+\b(AND|OR)\b/g, '\n  $1')
        .replace(/,\s*/g, ', ')
        .replace(/;\s*/g, ';\n\n');
      return text;
    })
    .join('');

  normalized = normalized
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n');

  return cleanupBlankLines(normalized.split('\n')).join('\n');
}

function formatBlockKeywordLanguage(
  code: string,
  indentSize: number,
  openRegex: RegExp,
  midRegex: RegExp,
  closeRegex: RegExp
): string {
  const lines = code.replace(/\r\n/g, '\n').replace(/\t/g, ' '.repeat(indentSize)).split('\n');
  const out: string[] = [];
  let indent = 0;

  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed) {
      out.push('');
      continue;
    }

    const isClose = closeRegex.test(trimmed);
    const isMid = midRegex.test(trimmed);

    if (isClose) {
      indent = Math.max(0, indent - 1);
    }

    const lineIndent = isMid ? Math.max(0, indent - 1) : indent;
    out.push(`${' '.repeat(lineIndent * indentSize)}${trimmed}`);

    if (!isClose && openRegex.test(trimmed)) {
      indent++;
    }
  }

  return cleanupBlankLines(out).join('\n');
}

export function formatCodeSnippet(code: string, language: ProgrammingLanguage): string {
  const trimmed = code.replace(/\r\n/g, '\n').trim();
  if (!trimmed) return '';

  switch (language) {
    case 'Python':
      return formatPython(trimmed);
    case 'SQL':
      return formatSql(trimmed);
    case 'JavaScript':
    case 'TypeScript':
    case 'Dart/Flutter':
    case 'Scala':
      return formatBraceLanguage(trimmed, 2);
    case 'Java':
    case 'C#':
    case 'Kotlin':
    case 'Rust':
    case 'Go':
    case 'C++':
    case 'C':
    case 'PHP':
    case 'PowerShell':
      return formatBraceLanguage(trimmed, 4);
    case 'Ruby':
      return formatBlockKeywordLanguage(
        trimmed,
        2,
        /^(def|class|module|if|unless|while|until|for|begin|case)\b|\bdo\b(\s*\|[^|]*\|)?\s*$/,
        /^(else|elsif|when|rescue|ensure)\b/,
        /^end\b/
      );
    case 'MATLAB':
      return formatBlockKeywordLanguage(
        trimmed,
        4,
        /^(function|if|for|while|switch|try|parfor)\b/,
        /^(else|elseif|case|otherwise|catch)\b/,
        /^(end|endfunction)\b/
      );
    case 'Bash/Shell':
      return formatBlockKeywordLanguage(
        trimmed,
        2,
        /(\bthen|\bdo|\{)\s*$/,
        /^(else|elif)\b/,
        /^(fi|done|\})\b/
      );
    case 'R':
      return formatBraceLanguage(trimmed, 2);
    case 'COBOL/Assembly':
      return cleanupBlankLines(trimmed.split('\n').map((l) => l.replace(/[ \t]+$/g, ''))).join('\n');
    default:
      return formatBraceLanguage(trimmed, 2);
  }
}

function toFenceTag(language: ProgrammingLanguage, existingHint: string): string {
  const hint = existingHint.trim();
  if (hint && hint.toLowerCase() !== 'auto') {
    return hint;
  }
  const map: Record<ProgrammingLanguage, string> = {
    Python: 'python',
    JavaScript: 'javascript',
    TypeScript: 'typescript',
    Java: 'java',
    'C#': 'csharp',
    Kotlin: 'kotlin',
    'Dart/Flutter': 'dart',
    'Bash/Shell': 'bash',
    Rust: 'rust',
    Go: 'go',
    'C++': 'cpp',
    C: 'c',
    PHP: 'php',
    Ruby: 'ruby',
    PowerShell: 'powershell',
    SQL: 'sql',
    R: 'r',
    Scala: 'scala',
    MATLAB: 'matlab',
    'COBOL/Assembly': 'asm',
  };
  return map[language] ?? 'text';
}

function looksLikeStandaloneCode(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  return (
    /^(import|export|package|using|#include|SELECT|WITH|CREATE|INSERT|UPDATE|DELETE|def |class |fn |func |fun |public |private |function |const |let |var |#!\/)/m.test(
      trimmed
    ) || /[;{}]$/.test(trimmed.split('\n')[0]?.trim() ?? '')
  );
}

export function prettifyCodeInNote(
  rawContent: string,
  noteSourceType?: string
): NoteFormatResult {
  const lines = rawContent.replace(/\r\n/g, '\n').split('\n');
  const output: string[] = [];
  const detectedLanguages: ProgrammingLanguage[] = [];
  let blocksFormatted = 0;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Fenced code block (```lang ... ```)
    if (trimmed.startsWith('```')) {
      const langHint = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      const hasClosingFence = i < lines.length && lines[i].trim().startsWith('```');
      if (hasClosingFence) i++;

      const rawCode = codeLines.join('\n');
      const detected = detectProgrammingLanguage(rawCode, langHint);
      const formatted = formatCodeSnippet(rawCode, detected);
      const fenceTag = toFenceTag(detected, langHint);

      output.push(`\`\`\`${fenceTag}`);
      if (formatted) {
        output.push(formatted);
      }
      output.push('```');

      blocksFormatted++;
      if (!detectedLanguages.includes(detected)) {
        detectedLanguages.push(detected);
      }
      continue;
    }

    // 2. Custom Setext 3-space indented code block
    if (/^ {3}\S/.test(line)) {
      const codeLines: string[] = [];
      while (i < lines.length && (lines[i].startsWith('   ') || lines[i].trim() === '')) {
        if (lines[i].trim() === '' && (i + 1 >= lines.length || !lines[i + 1].startsWith('   '))) {
          break;
        }
        codeLines.push(lines[i].startsWith('   ') ? lines[i].slice(3) : '');
        i++;
      }

      const rawCode = codeLines.join('\n');
      const detected = detectProgrammingLanguage(rawCode);
      const formatted = formatCodeSnippet(rawCode, detected);
      for (const formattedLine of formatted.split('\n')) {
        output.push(formattedLine === '' ? '' : `   ${formattedLine}`);
      }

      blocksFormatted++;
      if (!detectedLanguages.includes(detected)) {
        detectedLanguages.push(detected);
      }
      continue;
    }

    output.push(line);
    i++;
  }

  // 3. Fallback if note itself is raw code without fences/indentation
  if (
    blocksFormatted === 0 &&
    (noteSourceType === 'code' || looksLikeStandaloneCode(rawContent))
  ) {
    const detected = detectProgrammingLanguage(rawContent);
    const formatted = formatCodeSnippet(rawContent, detected);
    return {
      formattedContent: formatted,
      blocksFormatted: 1,
      detectedLanguages: [detected],
    };
  }

  return {
    formattedContent: output.join('\n'),
    blocksFormatted,
    detectedLanguages,
  };
}
