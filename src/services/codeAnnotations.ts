import { NoteAnnotationColor } from './storageService';

/**
 * Identifies 1-indexed line numbers inside a note that belong to fenced (```)
 * or 3-space indented Setext code blocks.
 */
export function getCodeBlockLineNumbers(content: string): Set<number> {
  const codeLines = new Set<number>();
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  let i = 0;

  while (i < lines.length) {
    const current = lines[i];

    // Fenced code block: ```lang ... ```
    if (/^```/.test(current.trim())) {
      const startIdx = i;
      i++;
      while (i < lines.length && !/^```/.test(lines[i].trim())) {
        codeLines.add(i + 1);
        i++;
      }
      if (i > startIdx && i < lines.length && /^```/.test(lines[i].trim())) {
        i++;
      }
      continue;
    }

    // Setext 3-space indented code block
    if (/^ {3}\S/.test(current)) {
      while (i < lines.length && (lines[i].startsWith('   ') || lines[i].trim() === '')) {
        if (lines[i].trim() === '' && (i + 1 >= lines.length || !lines[i + 1].startsWith('   '))) {
          break;
        }
        if (lines[i].startsWith('   ')) {
          codeLines.add(i + 1);
        }
        i++;
      }
      continue;
    }

    i++;
  }

  return codeLines;
}

/**
 * Resolves the 1-indexed line number and trimmed anchor snippet at the user's
 * current textarea cursor or text selection.
 */
export function getLineAndAnchorAtSelection(
  content: string,
  selectionStart: number | null,
  selectionEnd: number | null
): { lineNumber: number; anchorText: string } {
  const safeStart = Math.max(0, Math.min(content.length, selectionStart ?? 0));
  const safeEnd = Math.max(safeStart, Math.min(content.length, selectionEnd ?? safeStart));

  const lineNumber = content.slice(0, safeStart).split('\n').length;
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const rawLine = (lines[lineNumber - 1] ?? '').trim();

  const selectedText = content
    .slice(safeStart, safeEnd)
    .replace(/\s+/g, ' ')
    .trim();

  const anchorSource = selectedText.length > 0 ? selectedText : rawLine;
  const anchorText =
    anchorSource.length > 64 ? `${anchorSource.slice(0, 61)}...` : anchorSource;

  return {
    lineNumber,
    anchorText: anchorText || `Line ${lineNumber}`,
  };
}

/**
 * Returns the character start and end index for a 1-indexed line in content.
 */
export function getLineCharRange(
  content: string,
  lineNumber: number
): { start: number; end: number } {
  const lines = content.split('\n');
  const clampedLine = Math.max(1, Math.min(lines.length, lineNumber));
  let start = 0;
  for (let i = 0; i < clampedLine - 1; i++) {
    start += lines[i].length + 1;
  }
  const end = start + (lines[clampedLine - 1]?.length ?? 0);
  return { start, end };
}

export const ANNOTATION_COLOR_STYLES: Record<
  NoteAnnotationColor,
  {
    label: string;
    marker: string;
    card: string;
    swatch: string;
    accentText: string;
  }
> = {
  amber: {
    label: 'Amber',
    marker:
      'bg-amber-100 dark:bg-amber-950/80 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 hover:bg-amber-200/80 dark:hover:bg-amber-900',
    card:
      'bg-amber-50/95 dark:bg-amber-950/95 border-amber-300 dark:border-amber-700/80 text-slate-900 dark:text-amber-50',
    swatch: 'bg-amber-400',
    accentText: 'text-amber-700 dark:text-amber-300',
  },
  sky: {
    label: 'Blue',
    marker:
      'bg-sky-100 dark:bg-sky-950/80 border-sky-300 dark:border-sky-700 text-sky-800 dark:text-sky-200 hover:bg-sky-200/80 dark:hover:bg-sky-900',
    card:
      'bg-sky-50/95 dark:bg-sky-950/95 border-sky-300 dark:border-sky-700/80 text-slate-900 dark:text-sky-50',
    swatch: 'bg-sky-400',
    accentText: 'text-sky-700 dark:text-sky-300',
  },
  emerald: {
    label: 'Mint',
    marker:
      'bg-emerald-100 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-200/80 dark:hover:bg-emerald-900',
    card:
      'bg-emerald-50/95 dark:bg-emerald-950/95 border-emerald-300 dark:border-emerald-700/80 text-slate-900 dark:text-emerald-50',
    swatch: 'bg-emerald-400',
    accentText: 'text-emerald-700 dark:text-emerald-300',
  },
};
