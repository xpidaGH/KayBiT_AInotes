import { parseToAst } from '../parsers/setextCustomParser';
import { NoteCardColor, NoteRecord } from './storageService';

export interface NoteCompletionStatus {
  mode: 'tasks' | 'sections' | 'note';
  completed: number;
  total: number;
  percent: number;
  label: string;
}

const PROGRESS_WIDTH_CLASSES: Record<number, string> = {
  0: 'w-0',
  5: 'w-[5%]',
  10: 'w-[10%]',
  15: 'w-[15%]',
  20: 'w-1/5',
  25: 'w-1/4',
  30: 'w-[30%]',
  35: 'w-[35%]',
  40: 'w-2/5',
  45: 'w-[45%]',
  50: 'w-1/2',
  55: 'w-[55%]',
  60: 'w-3/5',
  65: 'w-[65%]',
  70: 'w-[70%]',
  75: 'w-3/4',
  80: 'w-4/5',
  85: 'w-[85%]',
  90: 'w-[90%]',
  95: 'w-[95%]',
  100: 'w-full',
};

export function getProgressBarWidthClass(percent: number): string {
  const clamped = Math.max(0, Math.min(100, percent));
  if (clamped > 0 && clamped < 5) return 'w-[5%]';
  const bucket = Math.round(clamped / 5) * 5;
  return PROGRESS_WIDTH_CLASSES[bucket] ?? 'w-0';
}

const TASK_LINE_REGEX = /^(\s*(?:[-*]|\d+\.)\s+\[)([ xX])(\]\s+.*)$/;

function collectTasksOutsideCode(content: string): {
  total: number;
  completed: number;
  lineIndices: number[];
} {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  let total = 0;
  let completed = 0;
  const lineIndices: number[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^```/.test(line.trim())) {
      i++;
      while (i < lines.length && !/^```/.test(lines[i].trim())) {
        i++;
      }
      if (i < lines.length) i++;
      continue;
    }
    if (/^ {3}\S/.test(line)) {
      while (
        i < lines.length &&
        (lines[i].startsWith('   ') || lines[i].trim() === '')
      ) {
        if (
          lines[i].trim() === '' &&
          (i + 1 >= lines.length || !lines[i + 1].startsWith('   '))
        ) {
          break;
        }
        i++;
      }
      continue;
    }

    const match = line.match(TASK_LINE_REGEX);
    if (match) {
      total++;
      lineIndices.push(i);
      if (match[2].toLowerCase() === 'x') {
        completed++;
      }
    }
    i++;
  }

  return { total, completed, lineIndices };
}

export function toggleTaskCheckboxInContent(
  content: string,
  targetTaskIndex: number
): string {
  const normalized = content.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  const { lineIndices } = collectTasksOutsideCode(normalized);
  const lineIndex = lineIndices[targetTaskIndex];
  if (lineIndex === undefined) return content;

  const match = lines[lineIndex].match(TASK_LINE_REGEX);
  if (!match) return content;

  const nextMark = match[2].toLowerCase() === 'x' ? ' ' : 'x';
  lines[lineIndex] = `${match[1]}${nextMark}${match[3]}`;
  return lines.join('\n');
}

export function getNoteCompletionStatus(note: NoteRecord): NoteCompletionStatus {
  const tasks = collectTasksOutsideCode(note.content);
  if (tasks.total > 0) {
    const percent = Math.round((tasks.completed / tasks.total) * 100);
    return {
      mode: 'tasks',
      completed: tasks.completed,
      total: tasks.total,
      percent,
      label: `${tasks.completed}/${tasks.total} ${
        tasks.total === 1 ? 'task' : 'tasks'
      }`,
    };
  }

  const sections = parseToAst(note.content)
    .filter((b): b is { type: 'h2' | 'h3'; text: string } =>
      b.type === 'h2' || b.type === 'h3'
    )
    .map((b) => b.text.trim())
    .filter(Boolean);

  if (sections.length > 0) {
    const completedSet = new Set(
      (note.completedSections ?? []).map((s) => s.trim().toLowerCase())
    );
    const completed = sections.filter((s) =>
      completedSet.has(s.toLowerCase())
    ).length;
    const percent = Math.round((completed / sections.length) * 100);
    return {
      mode: 'sections',
      completed,
      total: sections.length,
      percent,
      label: `${completed}/${sections.length} ${
        sections.length === 1 ? 'section' : 'sections'
      }`,
    };
  }

  const isDone = Boolean(note.completed);
  return {
    mode: 'note',
    completed: isDone ? 1 : 0,
    total: 1,
    percent: isDone ? 100 : 0,
    label: isDone ? 'Completed' : 'In progress',
  };
}

export interface NoteColorStyle {
  id: NoteCardColor;
  label: string;
  swatchClass: string;
  cardIdleClass: string;
  cardActiveClass: string;
  labelTextClass: string;
}

export const NOTE_COLOR_OPTIONS: NoteColorStyle[] = [
  {
    id: 'none',
    label: 'Default',
    swatchClass: 'bg-slate-300 dark:bg-slate-600',
    cardIdleClass: 'hover:bg-slate-50 dark:hover:bg-slate-800/50',
    cardActiveClass: 'bg-blue-50/70 dark:bg-blue-950/30',
    labelTextClass: 'text-slate-500 dark:text-slate-400',
  },
  {
    id: 'blue',
    label: 'Blue',
    swatchClass: 'bg-blue-500',
    cardIdleClass:
      'bg-blue-50/35 dark:bg-blue-950/15 hover:bg-blue-50/65 dark:hover:bg-blue-950/25',
    cardActiveClass:
      'bg-blue-50/85 dark:bg-blue-950/40 ring-1 ring-inset ring-blue-400/50 dark:ring-blue-700/60',
    labelTextClass: 'text-blue-700 dark:text-blue-300',
  },
  {
    id: 'emerald',
    label: 'Emerald',
    swatchClass: 'bg-emerald-500',
    cardIdleClass:
      'bg-emerald-50/35 dark:bg-emerald-950/15 hover:bg-emerald-50/65 dark:hover:bg-emerald-950/25',
    cardActiveClass:
      'bg-emerald-50/85 dark:bg-emerald-950/40 ring-1 ring-inset ring-emerald-400/50 dark:ring-emerald-700/60',
    labelTextClass: 'text-emerald-700 dark:text-emerald-300',
  },
  {
    id: 'amber',
    label: 'Amber',
    swatchClass: 'bg-amber-500',
    cardIdleClass:
      'bg-amber-50/40 dark:bg-amber-950/15 hover:bg-amber-50/75 dark:hover:bg-amber-950/25',
    cardActiveClass:
      'bg-amber-50/90 dark:bg-amber-950/40 ring-1 ring-inset ring-amber-400/50 dark:ring-amber-700/60',
    labelTextClass: 'text-amber-700 dark:text-amber-300',
  },
  {
    id: 'rose',
    label: 'Rose',
    swatchClass: 'bg-rose-500',
    cardIdleClass:
      'bg-rose-50/35 dark:bg-rose-950/15 hover:bg-rose-50/65 dark:hover:bg-rose-950/25',
    cardActiveClass:
      'bg-rose-50/85 dark:bg-rose-950/40 ring-1 ring-inset ring-rose-400/50 dark:ring-rose-700/60',
    labelTextClass: 'text-rose-700 dark:text-rose-300',
  },
  {
    id: 'violet',
    label: 'Violet',
    swatchClass: 'bg-violet-500',
    cardIdleClass:
      'bg-violet-50/35 dark:bg-violet-950/15 hover:bg-violet-50/65 dark:hover:bg-violet-950/25',
    cardActiveClass:
      'bg-violet-50/85 dark:bg-violet-950/40 ring-1 ring-inset ring-violet-400/50 dark:ring-violet-700/60',
    labelTextClass: 'text-violet-700 dark:text-violet-300',
  },
];

export function getNoteColorStyle(color?: NoteCardColor): NoteColorStyle {
  return (
    NOTE_COLOR_OPTIONS.find((opt) => opt.id === (color ?? 'none')) ??
    NOTE_COLOR_OPTIONS[0]
  );
}
