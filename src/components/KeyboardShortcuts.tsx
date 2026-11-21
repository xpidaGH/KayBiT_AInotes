import React, { useEffect, useState } from 'react';
import { Keyboard, RotateCcw } from 'lucide-react';

export interface ShortcutItem {
  id: string;
  action: string;
  keys: string;
}

export const DEFAULT_SHORTCUTS: ShortcutItem[] = [
  { id: 'global-search', action: 'Open Global Search', keys: 'Ctrl+K' },
  { id: 'scan-capture', action: 'Open Scan / Upload HTR', keys: 'Ctrl+Shift+U' },
  { id: 'export-pdf', action: 'Export Multilingual PDF', keys: 'Ctrl+E' },
  { id: 'ai-quiz', action: 'Jump to AI Study Lab', keys: 'Ctrl+Alt+Q' },
  { id: 'user-guide', action: 'Open Localized User Guide', keys: 'F1' },
];

const SHORTCUTS_STORAGE_KEY = 'ainotes_keybindings';

export function loadKeybindings(): ShortcutItem[] {
  try {
    const saved = localStorage.getItem(SHORTCUTS_STORAGE_KEY);
    if (!saved) return DEFAULT_SHORTCUTS;
    const parsed = JSON.parse(saved) as ShortcutItem[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_SHORTCUTS;
  } catch {
    return DEFAULT_SHORTCUTS;
  }
}

export function formatKeyCombo(e: KeyboardEvent | React.KeyboardEvent): string | null {
  if (['Control', 'Meta', 'Alt', 'Shift'].includes(e.key)) return null;
  const parts: string[] = [];
  if (e.ctrlKey) parts.push('Ctrl');
  if (e.metaKey) parts.push('Cmd');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');
  const keyLabel =
    e.key === ' '
      ? 'Space'
      : e.key.length === 1
      ? e.key.toUpperCase()
      : e.key;
  parts.push(keyLabel);
  return parts.join('+');
}

interface KeyboardShortcutsProps {
  shortcuts: ShortcutItem[];
  onChange: (next: ShortcutItem[]) => void;
}

export const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({
  shortcuts,
  onChange,
}) => {
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [conflictMsg, setConflictMsg] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(SHORTCUTS_STORAGE_KEY, JSON.stringify(shortcuts));
    } catch {
      // ignore storage errors
    }
  }, [shortcuts]);

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const combo = formatKeyCombo(e);
    if (!combo) return;

    const duplicate = shortcuts.find((s) => s.id !== id && s.keys === combo);
    if (duplicate) {
      setConflictMsg(`"${combo}" is already bound to "${duplicate.action}".`);
      setRecordingId(null);
      return;
    }

    setConflictMsg(null);
    onChange(shortcuts.map((item) => (item.id === id ? { ...item, keys: combo } : item)));
    setRecordingId(null);
  };

  return (
    <div className="max-w-2xl p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Keyboard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Rebindable Keyboard Shortcuts
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Click any key binding badge and press your preferred key combination. Saved automatically to localStorage.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setConflictMsg(null);
            onChange(DEFAULT_SHORTCUTS);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset Defaults
        </button>
      </div>

      {conflictMsg && (
        <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-xs text-amber-800 dark:text-amber-200">
          {conflictMsg}
        </div>
      )}

      <ul className="divide-y divide-slate-200 dark:divide-slate-800">
        {shortcuts.map((sc) => (
          <li key={sc.id} className="py-3 flex items-center justify-between gap-4">
            <span className="text-sm text-slate-800 dark:text-slate-200">{sc.action}</span>
            {recordingId === sc.id ? (
              <input
                autoFocus
                readOnly
                placeholder="Press key combo..."
                onKeyDown={(e) => handleKeyDown(e, sc.id)}
                onBlur={() => setRecordingId(null)}
                className="px-3 py-1.5 w-40 text-center rounded-lg border border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-xs font-mono text-blue-700 dark:text-blue-300 focus:outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => setRecordingId(sc.id)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 hover:border-blue-500 text-xs font-mono text-slate-800 dark:text-slate-200 transition-colors tabular-nums"
              >
                {sc.keys}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};
