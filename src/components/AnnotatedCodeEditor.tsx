import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Code2,
  CornerDownRight,
  Plus,
  StickyNote,
  Trash2,
  X,
} from 'lucide-react';
import { NoteAnnotation, NoteAnnotationColor } from '../services/storageService';
import {
  ANNOTATION_COLOR_STYLES,
  getCodeBlockLineNumbers,
  getLineAndAnchorAtSelection,
  getLineCharRange,
} from '../services/codeAnnotations';

interface AnnotatedCodeEditorProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  dir: 'ltr' | 'rtl';
  isReadOnly: boolean;
  focusMode: boolean;
  annotations: NoteAnnotation[];
  composerSignal: number;
  focusedAnnotationId: string | null;
  onChangeFocusedAnnotationId: (id: string | null) => void;
  onChangeContent: (
    nextContent: string,
    selectionStart: number | null,
    selectionEnd: number | null
  ) => void;
  onCursorActivity: (
    content: string,
    selectionStart: number | null,
    selectionEnd: number | null
  ) => void;
  onKeyDownTextarea: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onAddAnnotation: (
    draft: Omit<NoteAnnotation, 'id' | 'createdAt'>
  ) => NoteAnnotation | null;
  onUpdateAnnotation: (
    id: string,
    patch: Partial<Pick<NoteAnnotation, 'text' | 'color' | 'anchorText'>>
  ) => void;
  onDeleteAnnotation: (id: string) => void;
}

const COLOR_OPTIONS: NoteAnnotationColor[] = ['amber', 'sky', 'emerald'];

function formatAnnotationTime(ts: number): string {
  return new Date(ts).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const AnnotatedCodeEditor: React.FC<AnnotatedCodeEditorProps> = ({
  textareaRef,
  value,
  dir,
  isReadOnly,
  focusMode,
  annotations,
  composerSignal,
  focusedAnnotationId,
  onChangeFocusedAnnotationId,
  onChangeContent,
  onCursorActivity,
  onKeyDownTextarea,
  onAddAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const composerInputRef = useRef<HTMLTextAreaElement>(null);
  const [hoveredAnnotationId, setHoveredAnnotationId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{
    lineNumber: number;
    anchorText: string;
    text: string;
    color: NoteAnnotationColor;
    isCodeLine: boolean;
  } | null>(null);
  const [editingText, setEditingText] = useState('');

  const lines = useMemo(() => value.replace(/\r\n/g, '\n').split('\n'), [value]);
  const codeLineNumbers = useMemo(() => getCodeBlockLineNumbers(value), [value]);

  const annotationsByLine = useMemo(() => {
    const map = new Map<number, NoteAnnotation[]>();
    for (const ann of annotations) {
      const clampedLine = Math.max(1, Math.min(lines.length, ann.lineNumber));
      const list = map.get(clampedLine) ?? [];
      list.push(ann);
      map.set(clampedLine, list);
    }
    return map;
  }, [annotations, lines.length]);

  const activeAnnotation = useMemo(
    () => annotations.find((a) => a.id === focusedAnnotationId) ?? null,
    [annotations, focusedAnnotationId]
  );

  useEffect(() => {
    if (activeAnnotation) {
      setEditingText(activeAnnotation.text);
    }
  }, [activeAnnotation]);

  // Open composer when triggered from the editor header "+ Sticky Note" button
  const lastSignalRef = useRef(composerSignal);
  useEffect(() => {
    if (composerSignal === lastSignalRef.current) return;
    lastSignalRef.current = composerSignal;
    if (isReadOnly) return;

    const textarea = textareaRef.current;
    const { lineNumber, anchorText } = getLineAndAnchorAtSelection(
      value,
      textarea?.selectionStart ?? 0,
      textarea?.selectionEnd ?? 0
    );
    onChangeFocusedAnnotationId(null);
    setDraft({
      lineNumber,
      anchorText,
      text: '',
      color: 'amber',
      isCodeLine: codeLineNumbers.has(lineNumber),
    });
  }, [composerSignal, isReadOnly, value, textareaRef, codeLineNumbers, onChangeFocusedAnnotationId]);

  useEffect(() => {
    if (draft) {
      window.requestAnimationFrame(() => {
        composerInputRef.current?.focus();
      });
    }
  }, [draft !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  const openComposerForLine = (lineNumber: number) => {
    if (isReadOnly) return;
    const rawLine = (lines[lineNumber - 1] ?? '').trim();
    const anchorText =
      rawLine.length > 64
        ? `${rawLine.slice(0, 61)}...`
        : rawLine || `Line ${lineNumber}`;
    onChangeFocusedAnnotationId(null);
    setDraft({
      lineNumber,
      anchorText,
      text: '',
      color: 'amber',
      isCodeLine: codeLineNumbers.has(lineNumber),
    });
  };

  const handleSaveDraft = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!draft || isReadOnly) return;
    const trimmed = draft.text.trim();
    if (!trimmed) return;
    const created = onAddAnnotation({
      lineNumber: draft.lineNumber,
      anchorText: draft.anchorText,
      text: trimmed,
      color: draft.color,
    });
    setDraft(null);
    if (created) {
      onChangeFocusedAnnotationId(created.id);
    }
  };

  const jumpToLine = (lineNumber: number) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const { start, end } = getLineCharRange(value, lineNumber);
    textarea.focus();
    textarea.setSelectionRange(start, end);

    const rowEl = scrollContainerRef.current?.querySelector(
      `[data-editor-line="${lineNumber}"]`
    );
    if (rowEl instanceof HTMLElement) {
      rowEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  };

  const activeLineHighlightSet = useMemo(() => {
    const highlighted = new Set<number>();
    if (hoveredAnnotationId) {
      const hovered = annotations.find((a) => a.id === hoveredAnnotationId);
      if (hovered) {
        highlighted.add(Math.max(1, Math.min(lines.length, hovered.lineNumber)));
      }
    }
    if (activeAnnotation) {
      highlighted.add(
        Math.max(1, Math.min(lines.length, activeAnnotation.lineNumber))
      );
    }
    if (draft) {
      highlighted.add(Math.max(1, Math.min(lines.length, draft.lineNumber)));
    }
    return highlighted;
  }, [annotations, hoveredAnnotationId, activeAnnotation, draft, lines.length]);

  const textSizeClass = focusMode ? 'text-sm leading-7' : 'text-xs leading-5';
  const paddingXClass = focusMode ? 'px-6' : 'px-4';
  const paddingYClass = focusMode ? 'py-6' : 'py-4';
  const spacerHeightClass = focusMode ? 'h-6' : 'h-4';

  return (
    <div dir={dir} className="relative flex-1 flex flex-col min-h-[420px]">
      {/* Scrollable Editor Surface: synchronized line-gutter + invisible wrap mirror + textarea */}
      <div
        ref={scrollContainerRef}
        className={`relative flex-1 overflow-y-auto ${
          focusMode ? 'max-h-[600px]' : 'max-h-[520px]'
        }`}
      >
        {/* Full-height gutter backdrop strip */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 start-0 w-[44px] border-e border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-950/60"
        />

        <div className="relative min-h-full grid grid-cols-[44px_1fr] content-start">
          <div aria-hidden="true" className={`col-span-2 ${spacerHeightClass}`} />

          {lines.map((lineText, idx) => {
            const lineNumber = idx + 1;
            const lineAnns = annotationsByLine.get(lineNumber) ?? [];
            const hasAnns = lineAnns.length > 0;
            const primaryAnn = lineAnns[0];
            const isCodeLine = codeLineNumbers.has(lineNumber);
            const isHighlighted = activeLineHighlightSet.has(lineNumber);
            const flipTooltipUp = idx >= lines.length - 4 && lines.length > 5;

            const lineTintClass = isHighlighted
              ? primaryAnn
                ? primaryAnn.color === 'sky'
                  ? 'bg-sky-200/35 dark:bg-sky-500/20'
                  : primaryAnn.color === 'emerald'
                  ? 'bg-emerald-200/35 dark:bg-emerald-500/20'
                  : 'bg-amber-200/40 dark:bg-amber-500/20'
                : 'bg-amber-200/35 dark:bg-amber-500/15'
              : hasAnns
              ? primaryAnn.color === 'sky'
                ? 'bg-sky-100/45 dark:bg-sky-900/20'
                : primaryAnn.color === 'emerald'
                ? 'bg-emerald-100/45 dark:bg-emerald-900/20'
                : 'bg-amber-100/50 dark:bg-amber-900/20'
              : '';

            return (
              <React.Fragment key={lineNumber}>
                {/* Column 1: Line Number & Sticky-Note Side-Marker Rail */}
                <div
                  data-editor-line={lineNumber}
                  className={`relative z-20 flex items-start justify-center select-none group ${
                    focusMode ? 'pt-0.5' : 'pt-0'
                  }`}
                >
                  {hasAnns ? (
                    <div className="relative">
                      <button
                        type="button"
                        onMouseEnter={() => setHoveredAnnotationId(primaryAnn.id)}
                        onMouseLeave={() =>
                          setHoveredAnnotationId((prev) =>
                            prev === primaryAnn.id ? null : prev
                          )
                        }
                        onClick={() => {
                          setDraft(null);
                          onChangeFocusedAnnotationId(
                            focusedAnnotationId === primaryAnn.id
                              ? null
                              : primaryAnn.id
                          );
                        }}
                        aria-label={`Sticky note on line ${lineNumber}: ${primaryAnn.text}`}
                        className={`inline-flex items-center justify-center gap-0.5 min-w-[26px] h-5 px-1 rounded border text-[10px] font-mono tabular-nums transition-colors ${
                          ANNOTATION_COLOR_STYLES[primaryAnn.color].marker
                        } ${
                          focusedAnnotationId === primaryAnn.id
                            ? 'ring-2 ring-blue-500/70'
                            : ''
                        }`}
                      >
                        <StickyNote className="w-2.5 h-2.5 shrink-0" />
                        {lineAnns.length > 1 && <span>{lineAnns.length}</span>}
                      </button>

                      {/* Floating Hover Tooltip beside the code line */}
                      {hoveredAnnotationId === primaryAnn.id &&
                        focusedAnnotationId !== primaryAnn.id && (
                          <div
                            role="tooltip"
                            className={`pointer-events-none absolute start-10 z-40 w-64 rounded-lg border p-2.5 shadow-lg backdrop-blur-sm ${
                              flipTooltipUp ? 'bottom-0' : 'top-0'
                            } ${ANNOTATION_COLOR_STYLES[primaryAnn.color].card}`}
                          >
                            <div className="flex items-center justify-between gap-2 text-[10px] font-medium opacity-80 mb-1">
                              <span className="font-mono tabular-nums">
                                Line {lineNumber}
                                {isCodeLine ? ' · Code' : ''}
                              </span>
                              {lineAnns.length > 1 && (
                                <span>+{lineAnns.length - 1} more</span>
                              )}
                            </div>
                            <p className="text-[11px] font-mono truncate opacity-75 mb-1">
                              {primaryAnn.anchorText}
                            </p>
                            <p className="text-xs leading-snug whitespace-pre-wrap break-words">
                              {primaryAnn.text}
                            </p>
                          </div>
                        )}
                    </div>
                  ) : isCodeLine && !isReadOnly ? (
                    <button
                      type="button"
                      onClick={() => openComposerForLine(lineNumber)}
                      title={`Add sticky note on code line ${lineNumber}`}
                      aria-label={`Add sticky note on line ${lineNumber}`}
                      className="w-7 h-5 flex items-center justify-center rounded text-[10px] font-mono tabular-nums text-slate-400 dark:text-slate-500 hover:bg-amber-100 hover:text-amber-800 dark:hover:bg-amber-950 dark:hover:text-amber-200 transition-colors"
                    >
                      <span className="group-hover:hidden">{lineNumber}</span>
                      <Plus className="w-3 h-3 hidden group-hover:block" />
                    </button>
                  ) : (
                    <span className="h-5 flex items-center text-[10px] font-mono tabular-nums text-slate-300 dark:text-slate-700">
                      {lineNumber}
                    </span>
                  )}
                </div>

                {/* Column 2: Exact Wrapping Mirror + Line Highlight Surface */}
                <div
                  aria-hidden="true"
                  className={`${paddingXClass} ${textSizeClass} font-mono whitespace-pre-wrap break-words pointer-events-none select-none transition-colors ${lineTintClass}`}
                >
                  <span className="invisible">{lineText || '\u200b'}</span>
                </div>
              </React.Fragment>
            );
          })}

          <div aria-hidden="true" className={`col-span-2 ${spacerHeightClass}`} />

          {/* Interactive Textarea overlaid cleanly over Column 2 */}
          <textarea
            ref={textareaRef}
            aria-label="Note Content Editor"
            dir={dir}
            value={value}
            disabled={isReadOnly}
            readOnly={isReadOnly}
            onChange={(e) =>
              onChangeContent(
                e.target.value,
                e.target.selectionStart,
                e.target.selectionEnd
              )
            }
            onClick={(e) =>
              onCursorActivity(
                value,
                e.currentTarget.selectionStart,
                e.currentTarget.selectionEnd
              )
            }
            onKeyUp={(e) => {
              if (
                e.key === 'ArrowUp' ||
                e.key === 'ArrowDown' ||
                e.key === 'Escape' ||
                e.key === 'Tab'
              ) {
                return;
              }
              onCursorActivity(
                value,
                e.currentTarget.selectionStart,
                e.currentTarget.selectionEnd
              );
            }}
            onKeyDown={onKeyDownTextarea}
            className={`absolute inset-y-0 start-[44px] w-[calc(100%-44px)] min-h-full z-10 bg-transparent font-mono text-slate-900 dark:text-slate-100 resize-none overflow-hidden focus:outline-none disabled:bg-slate-50/40 dark:disabled:bg-slate-950/30 disabled:text-slate-700 dark:disabled:text-slate-300 disabled:cursor-not-allowed ${paddingXClass} ${paddingYClass} ${textSizeClass}`}
          />
        </div>
      </div>

      {/* Floating Sticky Note Composer Popover */}
      {draft && !isReadOnly && (
        <form
          onSubmit={handleSaveDraft}
          className={`absolute top-3 end-3 z-40 w-72 rounded-xl border p-3 shadow-xl ${
            ANNOTATION_COLOR_STYLES[draft.color].card
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <StickyNote className="w-3.5 h-3.5 shrink-0" />
              <span>New Sticky Note</span>
              <span className="font-mono text-[11px] font-normal opacity-75 tabular-nums">
                · L{draft.lineNumber}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setDraft(null)}
              aria-label="Cancel sticky note"
              className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 mb-2 px-2 py-1 rounded bg-white/60 dark:bg-black/25 border border-black/10 dark:border-white/10 text-[11px] font-mono">
            {draft.isCodeLine && (
              <Code2 className="w-3 h-3 shrink-0 opacity-70" />
            )}
            <span className="truncate">{draft.anchorText}</span>
          </div>

          <textarea
            ref={composerInputRef}
            rows={3}
            value={draft.text}
            onChange={(e) =>
              setDraft((prev) => (prev ? { ...prev, text: e.target.value } : null))
            }
            placeholder="Write a floating note about time complexity, edge cases, or invariants..."
            className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-white/85 dark:bg-slate-950/75 px-2.5 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />

          <div className="flex items-center justify-between gap-2 mt-2.5">
            <div className="flex items-center gap-1.5" role="group" aria-label="Sticky note color">
              {COLOR_OPTIONS.map((colorKey) => (
                <button
                  key={colorKey}
                  type="button"
                  onClick={() =>
                    setDraft((prev) => (prev ? { ...prev, color: colorKey } : null))
                  }
                  aria-label={`${ANNOTATION_COLOR_STYLES[colorKey].label} note color`}
                  aria-pressed={draft.color === colorKey}
                  className={`w-4 h-4 rounded-full ${
                    ANNOTATION_COLOR_STYLES[colorKey].swatch
                  } ${
                    draft.color === colorKey
                      ? 'ring-2 ring-offset-1 ring-slate-900 dark:ring-white'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setDraft(null)}
                className="px-2.5 py-1 rounded-md text-[11px] font-medium hover:bg-black/5 dark:hover:bg-white/10 whitespace-nowrap shrink-0"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!draft.text.trim()}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[11px] font-medium disabled:opacity-40 whitespace-nowrap shrink-0"
              >
                <Check className="w-3 h-3" />
                Pin Note
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Floating Active Sticky Note Viewer / Editor Card */}
      {activeAnnotation && !draft && (
        <div
          className={`absolute top-3 end-3 z-40 w-72 rounded-xl border p-3 shadow-xl ${
            ANNOTATION_COLOR_STYLES[activeAnnotation.color].card
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <button
              type="button"
              onClick={() => jumpToLine(activeAnnotation.lineNumber)}
              title="Jump editor cursor to this line"
              className="inline-flex items-center gap-1 text-xs font-semibold hover:underline"
            >
              <StickyNote className="w-3.5 h-3.5 shrink-0" />
              <span className="font-mono tabular-nums">
                Line {activeAnnotation.lineNumber}
              </span>
              <CornerDownRight className="w-3 h-3 opacity-70" />
            </button>
            <div className="flex items-center gap-1">
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() => {
                    onDeleteAnnotation(activeAnnotation.id);
                    onChangeFocusedAnnotationId(null);
                  }}
                  title="Delete sticky note"
                  aria-label="Delete sticky note"
                  className="p-1 rounded hover:bg-red-500/15 text-red-700 dark:text-red-300"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => onChangeFocusedAnnotationId(null)}
                aria-label="Close sticky note"
                className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="px-2 py-1 mb-2 rounded bg-white/60 dark:bg-black/25 border border-black/10 dark:border-white/10 text-[11px] font-mono truncate">
            {activeAnnotation.anchorText}
          </div>

          {isReadOnly ? (
            <p className="text-xs leading-relaxed whitespace-pre-wrap break-words">
              {activeAnnotation.text}
            </p>
          ) : (
            <textarea
              rows={3}
              value={editingText}
              onChange={(e) => setEditingText(e.target.value)}
              onBlur={() => {
                const trimmed = editingText.trim();
                if (trimmed && trimmed !== activeAnnotation.text) {
                  onUpdateAnnotation(activeAnnotation.id, { text: trimmed });
                }
              }}
              aria-label="Edit sticky note text"
              className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-white/85 dark:bg-slate-950/75 px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          )}

          {/* Switch among multiple sticky notes on the same line if present */}
          {(annotationsByLine.get(
            Math.max(1, Math.min(lines.length, activeAnnotation.lineNumber))
          )?.length ?? 0) > 1 && (
            <div className="flex flex-wrap items-center gap-1 mt-2 pt-2 border-t border-black/10 dark:border-white/10 text-[10px]">
              <span className="opacity-70">On this line:</span>
              {annotationsByLine
                .get(Math.max(1, Math.min(lines.length, activeAnnotation.lineNumber)))
                ?.map((sibling, i) => (
                  <button
                    key={sibling.id}
                    type="button"
                    onClick={() => onChangeFocusedAnnotationId(sibling.id)}
                    className={`px-1.5 py-0.5 rounded font-mono ${
                      sibling.id === activeAnnotation.id
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                        : 'bg-white/60 dark:bg-black/25 hover:bg-white'
                    }`}
                  >
                    #{i + 1}
                  </button>
                ))}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-black/10 dark:border-white/10 text-[10px] opacity-80">
            <span>{formatAnnotationTime(activeAnnotation.createdAt)}</span>
            {!isReadOnly ? (
              <div className="flex items-center gap-1.5">
                {COLOR_OPTIONS.map((colorKey) => (
                  <button
                    key={colorKey}
                    type="button"
                    onClick={() =>
                      onUpdateAnnotation(activeAnnotation.id, { color: colorKey })
                    }
                    aria-label={`Change note color to ${ANNOTATION_COLOR_STYLES[colorKey].label}`}
                    className={`w-3.5 h-3.5 rounded-full ${
                      ANNOTATION_COLOR_STYLES[colorKey].swatch
                    } ${
                      activeAnnotation.color === colorKey
                        ? 'ring-2 ring-offset-1 ring-slate-900 dark:ring-white'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  />
                ))}
                {editingText.trim() && editingText.trim() !== activeAnnotation.text && (
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateAnnotation(activeAnnotation.id, {
                        text: editingText.trim(),
                      })
                    }
                    className="ms-1 px-2 py-0.5 rounded bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium"
                  >
                    Save
                  </button>
                )}
              </div>
            ) : (
              <span>Read-Only</span>
            )}
          </div>
        </div>
      )}

      {/* Compact Sticky Notes Bar when annotations exist so users can jump/inspect any pinned note */}
      {annotations.length > 0 && (
        <div className="px-3.5 py-2 border-t border-slate-200 dark:border-slate-800 bg-amber-50/40 dark:bg-amber-950/15 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 dark:text-amber-300 shrink-0 me-1">
            <StickyNote className="w-3 h-3" />
            Sticky Notes ({annotations.length}):
          </span>
          {annotations.map((ann) => (
            <button
              key={ann.id}
              type="button"
              onMouseEnter={() => setHoveredAnnotationId(ann.id)}
              onMouseLeave={() =>
                setHoveredAnnotationId((prev) => (prev === ann.id ? null : prev))
              }
              onClick={() => {
                setDraft(null);
                onChangeFocusedAnnotationId(
                  focusedAnnotationId === ann.id ? null : ann.id
                );
                jumpToLine(ann.lineNumber);
              }}
              title={`${ann.anchorText} — ${ann.text}`}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] max-w-[190px] transition-colors ${
                ANNOTATION_COLOR_STYLES[ann.color].marker
              } ${
                focusedAnnotationId === ann.id
                  ? 'ring-1 ring-blue-500'
                  : ''
              }`}
            >
              <span className="font-mono text-[10px] tabular-nums shrink-0">
                L{ann.lineNumber}
              </span>
              <span aria-hidden="true">·</span>
              <span className="truncate">{ann.text}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
