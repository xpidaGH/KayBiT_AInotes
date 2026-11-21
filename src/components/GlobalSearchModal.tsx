import React, { useEffect, useMemo, useState } from 'react';
import { FileCode2, Search, X } from 'lucide-react';
import { NoteRecord } from '../services/storageService';
import { parseToAst } from '../parsers/setextCustomParser';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: NoteRecord[];
  onSelectNote: (noteId: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  notes,
  onSelectNote,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (isOpen) setQuery('');
  }, [isOpen]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes
      .map((note) => {
        const blocks = parseToAst(note.content);
        const codeLangs = blocks
          .filter((b) => b.type === 'code')
          .map((b) => (b.type === 'code' ? String(b.language) : ''));

        const haystack = `${note.title}\n${note.tags.join(' ')}\n${codeLangs.join(' ')}\n${note.content}`.toLowerCase();
        if (q && !haystack.includes(q)) return null;

        let snippet = note.content.slice(0, 140).replace(/\s+/g, ' ');
        if (q) {
          const idx = note.content.toLowerCase().indexOf(q);
          if (idx >= 0) {
            const start = Math.max(0, idx - 40);
            snippet = note.content.slice(start, start + 140).replace(/\s+/g, ' ');
          }
        }
        return {
          note,
          codeLangs: Array.from(new Set(codeLangs)),
          snippet,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
  }, [notes, query]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 bg-slate-950/60 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Global Search"
    >
      <div className="w-full max-w-2xl rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              if (e.key === 'Enter' && results.length > 0) {
                onSelectNote(results[0].note.id);
                onClose();
              }
            }}
            placeholder="Search handwritten notes, .txt/.md/.mdx files, or 20 programming languages..."
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800">
          {results.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
              No matching notes or code blocks found for "{query}".
            </div>
          ) : (
            results.map(({ note, codeLangs, snippet }) => (
              <button
                key={note.id}
                type="button"
                onClick={() => {
                  onSelectNote(note.id);
                  onClose();
                }}
                className="w-full text-start px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {note.title}
                  </span>
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0">
                    {note.archived ? 'ARCHIVED · ' : ''}
                    {note.sourceType.toUpperCase()} · {note.language}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                  {snippet}
                </p>
                {(codeLangs.length > 0 || note.tags.length > 0) && (
                  <div className="flex flex-wrap items-center gap-2 text-xs pt-0.5">
                    {codeLangs.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400">
                        <FileCode2 className="w-3.5 h-3.5 shrink-0" />
                        <span>{codeLangs.join(' · ')}</span>
                      </span>
                    )}
                    {note.tags.length > 0 && (
                      <span className="text-slate-500 dark:text-slate-400">
                        {note.tags.map((t) => `#${t}`).join(' · ')}
                      </span>
                    )}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
