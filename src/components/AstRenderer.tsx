import React, { useState } from 'react';
import { Check, Copy, Sparkles, StickyNote } from 'lucide-react';
import { AstBlock, parseToAst } from '../parsers/setextCustomParser';
import { NoteAnnotation } from '../services/storageService';
import { ANNOTATION_COLOR_STYLES } from '../services/codeAnnotations';

interface AstRendererProps {
  content: string;
  dir?: 'ltr' | 'rtl';
  onExplainCode?: (code: string, language: string) => void;
  annotations?: NoteAnnotation[];
  onSelectAnnotation?: (annotationId: string) => void;
}

function renderInline(text: string): React.ReactNode[] {
  const tokens = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return tokens.map((tok, idx) => {
    if (tok.startsWith('`') && tok.endsWith('`') && tok.length >= 2) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 mx-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-[0.86em] border border-slate-200 dark:border-slate-700"
        >
          {tok.slice(1, -1)}
        </code>
      );
    }
    if (tok.startsWith('**') && tok.endsWith('**') && tok.length >= 4) {
      return (
        <strong key={idx} className="font-semibold text-slate-900 dark:text-white">
          {tok.slice(2, -2)}
        </strong>
      );
    }
    if (tok.startsWith('*') && tok.endsWith('*') && tok.length >= 2) {
      return (
        <em key={idx} className="italic">
          {tok.slice(1, -1)}
        </em>
      );
    }
    return <React.Fragment key={idx}>{tok}</React.Fragment>;
  });
}

const CodeBlockView: React.FC<{
  code: string;
  language: string;
  onExplainCode?: (code: string, language: string) => void;
  annotations?: NoteAnnotation[];
  onSelectAnnotation?: (annotationId: string) => void;
}> = ({ code, language, onExplainCode, annotations = [], onSelectAnnotation }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore clipboard errors
    }
  };

  const codeLines = code.split('\n');
  const findLineAnnotations = (line: string): NoteAnnotation[] => {
    const trimmed = line.trim();
    if (!trimmed || annotations.length === 0) return [];
    return annotations.filter((ann) => {
      const anchor = ann.anchorText.replace(/\.\.\.$/, '').trim();
      if (!anchor || anchor.startsWith('Line ')) return false;
      return trimmed === anchor || (anchor.length >= 3 && trimmed.includes(anchor));
    });
  };
  const hasMatchedAnnotations = codeLines.some(
    (line) => findLineAnnotations(line).length > 0
  );

  return (
    <div
      dir="ltr"
      className="my-4 rounded-lg border border-slate-800 bg-slate-950 text-slate-100 overflow-visible"
    >
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-slate-800 rounded-t-lg text-xs">
        <span className="font-mono font-medium text-slate-300">{language}</span>
        <div className="flex items-center gap-2">
          {onExplainCode && (
            <button
              type="button"
              onClick={() => onExplainCode(code, language)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium text-blue-300 hover:text-white hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Explain
            </button>
          )}
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
      {hasMatchedAnnotations ? (
        <pre className="py-3 overflow-x-auto text-[13px] leading-relaxed font-mono text-slate-100">
          <code>
            {codeLines.map((line, i) => {
              const lineAnns = findLineAnnotations(line);
              const primary = lineAnns[0];
              if (!primary) {
                return (
                  <div key={i} className="px-3.5 min-h-[1.35em]">
                    {line || ' '}
                  </div>
                );
              }
              return (
                <div
                  key={i}
                  className="group relative flex items-start justify-between gap-3 px-3.5 bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
                >
                  <span className="whitespace-pre">{line || ' '}</span>
                  <button
                    type="button"
                    onClick={() => onSelectAnnotation?.(primary.id)}
                    title={primary.text}
                    className={`my-0.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-sans shrink-0 ${
                      ANNOTATION_COLOR_STYLES[primary.color].marker
                    }`}
                  >
                    <StickyNote className="w-2.5 h-2.5" />
                    <span className="max-w-[140px] truncate">{primary.text}</span>
                  </button>
                </div>
              );
            })}
          </code>
        </pre>
      ) : (
        <pre className="p-3.5 overflow-x-auto text-[13px] leading-relaxed font-mono text-slate-100">
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
};

export const AstRenderer: React.FC<AstRendererProps> = ({
  content,
  dir = 'ltr',
  onExplainCode,
  annotations,
  onSelectAnnotation,
}) => {
  const blocks: AstBlock[] = parseToAst(content);

  if (blocks.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Start typing, paste a .txt/.md/.mdx file, or recognize handwriting to preview structured blocks.
      </p>
    );
  }

  return (
    <div dir={dir} className="space-y-3 text-slate-800 dark:text-slate-200 leading-relaxed">
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'h1':
            return (
              <h1
                key={idx}
                className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white pt-2 pb-1"
              >
                {renderInline(block.text)}
              </h1>
            );
          case 'h2':
            return (
              <h2
                key={idx}
                className="text-lg font-semibold text-slate-900 dark:text-white pt-3 pb-1 border-b border-slate-200 dark:border-slate-800"
              >
                {renderInline(block.text)}
              </h2>
            );
          case 'h3':
            return (
              <h3
                key={idx}
                className="text-base font-semibold text-slate-800 dark:text-slate-100 pt-2"
              >
                {renderInline(block.text)}
              </h3>
            );
          case 'paragraph':
            return (
              <p key={idx} className="text-[15px] leading-7 text-slate-700 dark:text-slate-300">
                {renderInline(block.text)}
              </p>
            );
          case 'blockquote':
            return (
              <blockquote
                key={idx}
                className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/70 text-sm text-slate-700 dark:text-slate-300 italic"
              >
                {renderInline(block.text)}
              </blockquote>
            );
          case 'list':
            if (block.ordered) {
              return (
                <ol
                  key={idx}
                  className="list-decimal ps-6 space-y-1.5 text-[15px] text-slate-700 dark:text-slate-300"
                >
                  {block.items.map((item, li) => (
                    <li key={li}>{renderInline(item)}</li>
                  ))}
                </ol>
              );
            }
            return (
              <ul
                key={idx}
                className="list-disc ps-6 space-y-1.5 text-[15px] text-slate-700 dark:text-slate-300"
              >
                {block.items.map((item, li) => (
                  <li key={li}>{renderInline(item)}</li>
                ))}
              </ul>
            );
          case 'code':
            return (
              <CodeBlockView
                key={idx}
                code={block.code}
                language={String(block.language)}
                onExplainCode={onExplainCode}
                annotations={annotations}
                onSelectAnnotation={onSelectAnnotation}
              />
            );
          case 'table':
            return (
              <div
                key={idx}
                className="my-4 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800"
              >
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                      {block.headers.map((h, hi) => (
                        <th
                          key={hi}
                          className="text-start px-3 py-2 font-semibold text-slate-900 dark:text-slate-100"
                        >
                          {renderInline(h)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {block.rows.map((row, ri) => (
                      <tr key={ri} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                        {row.map((cell, ci) => (
                          <td
                            key={ci}
                            className="px-3 py-2 text-slate-700 dark:text-slate-300 tabular-nums"
                          >
                            {renderInline(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case 'hr':
            return <hr key={idx} className="my-4 border-slate-200 dark:border-slate-800" />;
        }
      })}
    </div>
  );
};
