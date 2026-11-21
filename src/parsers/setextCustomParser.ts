import { ProgrammingLanguage } from '../i18n/languages';

export type AstBlock =
  | { type: 'h1'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'blockquote'; text: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'code'; language: ProgrammingLanguage | string; code: string }
  | { type: 'hr' };

/**
 * Heuristic classifier tagging code blocks across all 20 supported CS languages:
 * Python, JavaScript, TypeScript, Java, C#, Kotlin, Dart/Flutter, Bash/Shell,
 * Rust, Go, C++, C, PHP, Ruby, PowerShell, SQL, R, Scala, MATLAB, COBOL/Assembly.
 */
export function detectProgrammingLanguage(code: string, hint?: string): ProgrammingLanguage {
  const normalizedHint = (hint ?? '').trim().toLowerCase();
  const aliasMap: Record<string, ProgrammingLanguage> = {
    py: 'Python',
    python: 'Python',
    js: 'JavaScript',
    javascript: 'JavaScript',
    jsx: 'JavaScript',
    ts: 'TypeScript',
    typescript: 'TypeScript',
    tsx: 'TypeScript',
    java: 'Java',
    cs: 'C#',
    csharp: 'C#',
    'c#': 'C#',
    kt: 'Kotlin',
    kotlin: 'Kotlin',
    dart: 'Dart/Flutter',
    flutter: 'Dart/Flutter',
    sh: 'Bash/Shell',
    bash: 'Bash/Shell',
    zsh: 'Bash/Shell',
    shell: 'Bash/Shell',
    rs: 'Rust',
    rust: 'Rust',
    go: 'Go',
    golang: 'Go',
    cpp: 'C++',
    'c++': 'C++',
    cc: 'C++',
    c: 'C',
    php: 'PHP',
    rb: 'Ruby',
    ruby: 'Ruby',
    ps1: 'PowerShell',
    powershell: 'PowerShell',
    sql: 'SQL',
    r: 'R',
    scala: 'Scala',
    matlab: 'MATLAB',
    m: 'MATLAB',
    cobol: 'COBOL/Assembly',
    cbl: 'COBOL/Assembly',
    asm: 'COBOL/Assembly',
    assembly: 'COBOL/Assembly',
    x86: 'COBOL/Assembly',
  };

  if (normalizedHint && normalizedHint !== 'auto' && aliasMap[normalizedHint]) {
    return aliasMap[normalizedHint];
  }

  const src = code.trim();
  if (/IDENTIFICATION DIVISION|PROCEDURE DIVISION|WORKING-STORAGE SECTION|MOV\s+[RE]?[A-Z]{2},|JMP\s+|SYSCALL|SECTION\s+\.text/i.test(src)) {
    return 'COBOL/Assembly';
  }
  if (/^\s*(SELECT|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM|CREATE\s+TABLE|WITH\s+\w+\s+AS)\b/im.test(src)) {
    return 'SQL';
  }
  if (/\bfn\s+\w+\s*\(.*\)\s*(->\s*[\w<>]+)?\s*\{|\blet\s+mut\b|println!\(|impl\s+\w+/m.test(src)) {
    return 'Rust';
  }
  if (/\bpackage\s+main\b|\bfunc\s+\w+\s*\(.*\)|fmt\.Println\(|:=\s*/m.test(src)) {
    return 'Go';
  }
  if (/^<\?php|\$\w+\s*=|echo\s+["']/m.test(src)) {
    return 'PHP';
  }
  if (/^\s*#!\/usr\/bin\/(env\s+)?(ba)?sh|\becho\s+["$]|\bfi\b|\bdone\b|\bgrep\b|\bawk\b/m.test(src)) {
    return 'Bash/Shell';
  }
  if (/\$PSVersionTable|Write-Host|Get-ChildItem|\bparam\s*\(|-eq\b|-ne\b/i.test(src)) {
    return 'PowerShell';
  }
  if (/\bdef\s+\w+\s*\(.*\):|\belif\b|from\s+\w+\s+import\b|__name__\s*==\s*['"]__main__['"]/m.test(src)) {
    return 'Python';
  }
  if (/\bWidget\s+build\s*\(BuildContext|\bStatelessWidget\b|\bStatefulWidget\b|void\s+main\(\)\s*=>\s*runApp/m.test(src)) {
    return 'Dart/Flutter';
  }
  if (/\bfun\s+\w+\s*\(.*\)|val\s+\w+\s*[:=]|data\s+class\b/m.test(src)) {
    return 'Kotlin';
  }
  if (/\bobject\s+\w+\s+extends|\bcase\s+class\b|\bdef\s+\w+\(.*\)\s*:\s*\w+\s*=/m.test(src)) {
    return 'Scala';
  }
  if (/\bnamespace\s+\w+|Console\.WriteLine\(|public\s+async\s+Task\b|using\s+System;/m.test(src)) {
    return 'C#';
  }
  if (/public\s+static\s+void\s+main|System\.out\.println\(|@Override\b/m.test(src)) {
    return 'Java';
  }
  if (/#include\s*<iostream>|std::(cout|vector|string)|template\s*<typename/m.test(src)) {
    return 'C++';
  }
  if (/#include\s*<(stdio|stdlib)\.h>|printf\s*\(|malloc\s*\(/m.test(src)) {
    return 'C';
  }
  if (/<-|\blibrary\s*\(|\bdata\.frame\s*\(|ggplot\s*\(/m.test(src)) {
    return 'R';
  }
  if (/\bfunction\s+\[.*\]\s*=|\bendfunction\b|\bdisp\s*\(|\bzeros\s*\(|\blinespace\b/m.test(src)) {
    return 'MATLAB';
  }
  if (/\bdef\s+\w+.*\n[\s\S]*\bend\b|\bputs\s+|\battr_accessor\b/m.test(src)) {
    return 'Ruby';
  }
  if (/interface\s+\w+|type\s+\w+\s*=|:\s*(string|number|boolean|Promise<)/m.test(src)) {
    return 'TypeScript';
  }
  if (/\bconst\s+\w+\s*=|\blet\s+\w+\s*=|=>\s*\{|console\.log\(/m.test(src)) {
    return 'JavaScript';
  }
  return 'Python';
}

/**
 * Normalizes custom lightweight underline headings (***, ===, ---) and
 * 3-space indented code blocks into standard Markdown with detected language tags.
 */
export function parseCustomLightweightMarkup(raw: string): string {
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  const output: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const current = lines[i];
    const next = lines[i + 1] ?? '';

    if (current.trim().length > 0 && /^\*{3,}$/.test(next.trim())) {
      output.push(`# ${current.trim()}`);
      i += 2;
      continue;
    }
    if (current.trim().length > 0 && /^={3,}$/.test(next.trim())) {
      output.push(`## ${current.trim()}`);
      i += 2;
      continue;
    }
    if (current.trim().length > 0 && /^-{3,}$/.test(next.trim())) {
      output.push(`### ${current.trim()}`);
      i += 2;
      continue;
    }
    if (/^ {3}\S/.test(current)) {
      const codeLines: string[] = [];
      while (i < lines.length && (lines[i].startsWith('   ') || lines[i].trim() === '')) {
        if (lines[i].trim() === '' && (i + 1 >= lines.length || !lines[i + 1].startsWith('   '))) {
          break;
        }
        codeLines.push(lines[i].startsWith('   ') ? lines[i].slice(3) : '');
        i++;
      }
      const codeBody = codeLines.join('\n').trimEnd();
      const lang = detectProgrammingLanguage(codeBody);
      output.push(`\`\`\`${lang}\n${codeBody}\n\`\`\``);
      continue;
    }

    output.push(current);
    i++;
  }

  return output.join('\n');
}

export function parseToAst(raw: string): AstBlock[] {
  const normalized = parseCustomLightweightMarkup(raw);
  const lines = normalized.split('\n');
  const blocks: AstBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    if (/^(\*{3,}|-{3,}|_{3,})$/.test(trimmed) && !line.startsWith('```')) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    if (trimmed.startsWith('```')) {
      const langHint = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      const codeStr = codeLines.join('\n');
      const detected = detectProgrammingLanguage(codeStr, langHint);
      blocks.push({ type: 'code', language: detected, code: codeStr });
      continue;
    }

    if (trimmed.startsWith('# ')) {
      blocks.push({ type: 'h1', text: trimmed.slice(2).trim() });
      i++;
      continue;
    }
    if (trimmed.startsWith('## ')) {
      blocks.push({ type: 'h2', text: trimmed.slice(3).trim() });
      i++;
      continue;
    }
    if (trimmed.startsWith('### ')) {
      blocks.push({ type: 'h3', text: trimmed.slice(4).trim() });
      i++;
      continue;
    }

    if (trimmed.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('> ')) {
        quoteLines.push(lines[i].trim().slice(2));
        i++;
      }
      blocks.push({ type: 'blockquote', text: quoteLines.join(' ') });
      continue;
    }

    if (
      trimmed.startsWith('|') &&
      i + 1 < lines.length &&
      /^\|?[\s:-]+\|/.test(lines[i + 1].trim())
    ) {
      const parseRow = (r: string) =>
        r
          .trim()
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map((c) => c.trim());
      const headers = parseRow(trimmed);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(parseRow(lines[i]));
        i++;
      }
      blocks.push({ type: 'table', headers, rows });
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ''));
        i++;
      }
      blocks.push({ type: 'list', ordered: false, items });
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i++;
      }
      blocks.push({ type: 'list', ordered: true, items });
      continue;
    }

    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].trim().startsWith('#') &&
      !lines[i].trim().startsWith('```') &&
      !lines[i].trim().startsWith('> ') &&
      !/^[-*]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i].trim());
      i++;
    }
    blocks.push({ type: 'paragraph', text: paraLines.join(' ') });
  }

  return blocks;
}

export function extractPlainTextForTts(raw: string): string {
  const ast = parseToAst(raw);
  return ast
    .map((block) => {
      switch (block.type) {
        case 'h1':
        case 'h2':
        case 'h3':
        case 'paragraph':
        case 'blockquote':
          return block.text.replace(/[`*_]/g, '');
        case 'list':
          return block.items.map((item) => item.replace(/[`*_]/g, '')).join('. ');
        case 'code':
          return `${block.language} code block.`;
        case 'table':
          return block.headers.join(', ');
        default:
          return '';
      }
    })
    .filter(Boolean)
    .join('. ');
}
