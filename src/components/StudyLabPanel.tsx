import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Code2,
  FileText,
  HelpCircle,
  Layers,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Shuffle,
  Sparkles,
  Square,
  Volume2,
  XCircle,
} from 'lucide-react';
import { getLanguageMeta, SupportedLangCode } from '../i18n/languages';
import { extractPlainTextForTts } from '../parsers/setextCustomParser';
import {
  extractFlashcardsFromNote,
  FlashcardCategory,
  StudyFlashcard,
} from '../services/flashcardExtractor';
import { TtsProgress, ttsService } from '../services/ttsService';

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface SummaryResult {
  summary: string;
  keyConcepts: string[];
  complexityNotes: string;
}

export interface CodeExplanationResult {
  detectedLanguage: string;
  timeComplexity: string;
  spaceComplexity: string;
  walkthrough: string;
  lineByLine: Array<{ line: string; note: string }>;
}

interface StudyLabPanelProps {
  noteId?: string;
  noteTitle: string;
  noteContent: string;
  targetLanguage: SupportedLangCode;
  pendingCodeSnippet: { code: string; language: string } | null;
  onClearPendingCode: () => void;
}

export const StudyLabPanel: React.FC<StudyLabPanelProps> = ({
  noteId,
  noteTitle,
  noteContent,
  targetLanguage,
  pendingCodeSnippet,
  onClearPendingCode,
}) => {
  const [tts, setTts] = useState<TtsProgress>(ttsService.getProgress());
  const [rate, setRate] = useState(1.0);

  const [activeTool, setActiveTool] = useState<'summary' | 'quiz' | 'code' | 'flashcards'>('summary');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [summaryData, setSummaryData] = useState<SummaryResult | null>(null);
  const [quizData, setQuizData] = useState<QuizQuestion[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [codeExplainData, setCodeExplainData] = useState<CodeExplanationResult | null>(null);
  const [codeInput, setCodeInput] = useState('');

  const [aiFlashcards, setAiFlashcards] = useState<StudyFlashcard[] | null>(null);
  const [shuffleOrder, setShuffleOrder] = useState<string[] | null>(null);
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [cardStatuses, setCardStatuses] = useState<Record<string, 'mastered' | 'review'>>({});
  const [reviewOnly, setReviewOnly] = useState(false);

  const extractedFlashcards = useMemo(
    () => extractFlashcardsFromNote(noteTitle, noteContent),
    [noteTitle, noteContent]
  );

  const baseFlashcards = aiFlashcards ?? extractedFlashcards;

  const orderedFlashcards = useMemo(() => {
    let deck = baseFlashcards;
    if (shuffleOrder && shuffleOrder.length > 0) {
      const rank = new Map(shuffleOrder.map((id, idx) => [id, idx]));
      deck = [...deck].sort((a, b) => (rank.get(a.id) ?? 999) - (rank.get(b.id) ?? 999));
    }
    if (reviewOnly) {
      deck = deck.filter((c) => cardStatuses[c.id] !== 'mastered');
    }
    return deck;
  }, [baseFlashcards, shuffleOrder, reviewOnly, cardStatuses]);

  useEffect(() => {
    setAiFlashcards(null);
    setShuffleOrder(null);
    setCardIndex(0);
    setIsFlipped(false);
    setCardStatuses({});
    setReviewOnly(false);
    setQuizData([]);
    setSelectedAnswers({});
  }, [noteId, noteTitle]);

  useEffect(() => {
    if (orderedFlashcards.length === 0) {
      setCardIndex(0);
      setIsFlipped(false);
    } else if (cardIndex >= orderedFlashcards.length) {
      setCardIndex(orderedFlashcards.length - 1);
      setIsFlipped(false);
    }
  }, [orderedFlashcards.length, cardIndex]);

  useEffect(() => {
    return ttsService.subscribe(setTts);
  }, []);

  useEffect(() => {
    if (pendingCodeSnippet) {
      setCodeInput(pendingCodeSnippet.code);
      setActiveTool('code');
      void handleExplainCode(pendingCodeSnippet.code, pendingCodeSnippet.language);
      onClearPendingCode();
    }
  }, [pendingCodeSnippet]);

  const langMeta = getLanguageMeta(targetLanguage);

  const handlePlayTts = () => {
    if (tts.state === 'paused') {
      ttsService.resume();
    } else {
      const plain = extractPlainTextForTts(noteContent);
      void ttsService.speak(plain, targetLanguage, { rate, title: noteTitle });
    }
  };

  const handleSummarize = async () => {
    setActiveTool('summary');
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/study/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: noteTitle,
          content: noteContent,
          targetLanguageName: langMeta.name,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate summary.');
      setSummaryData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Summary failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQuiz = async () => {
    setActiveTool('quiz');
    setLoading(true);
    setError(null);
    setSelectedAnswers({});
    try {
      const res = await fetch('/api/study/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: noteTitle,
          content: noteContent,
          targetLanguageName: langMeta.name,
          questionCount: 5,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate quiz.');
      setQuizData(Array.isArray(data.questions) ? data.questions.slice(0, 5) : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Quiz generation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleExplainCode = async (snippet?: string, langHint = 'auto') => {
    const targetCode = snippet ?? codeInput;
    if (!targetCode.trim()) return;
    setActiveTool('code');
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/study/explain-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: targetCode,
          language: langHint,
          targetLanguageName: langMeta.name,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to explain code.');
      setCodeExplainData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Code walkthrough failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAiFlashcards = async () => {
    setActiveTool('flashcards');
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/study/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: noteTitle,
          content: noteContent,
          targetLanguageName: langMeta.name,
          cardCount: 8,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate AI flashcards.');
      const allowedCategories: FlashcardCategory[] = [
        'Definition',
        'Concept',
        'Complexity',
        'Code',
        'Terminology',
      ];
      const normalized: StudyFlashcard[] = Array.isArray(data.flashcards)
        ? data.flashcards
            .filter(
              (item: { term?: unknown; definition?: unknown }) =>
                typeof item?.term === 'string' &&
                typeof item?.definition === 'string' &&
                item.term.trim() &&
                item.definition.trim()
            )
            .map(
              (
                item: { term: string; definition: string; category?: string },
                idx: number
              ) => ({
                id: `ai-fc-${idx + 1}`,
                term: item.term.trim(),
                definition: item.definition.trim(),
                category: allowedCategories.includes(
                  item.category as FlashcardCategory
                )
                  ? (item.category as FlashcardCategory)
                  : 'Terminology',
                source: 'ai' as const,
              })
            )
        : [];
      if (normalized.length > 0) {
        setAiFlashcards(normalized);
        setShuffleOrder(null);
        setCardStatuses({});
        setReviewOnly(false);
        setCardIndex(0);
        setIsFlipped(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Flashcard synthesis failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleShuffleFlashcards = () => {
    const ids = baseFlashcards.map((c) => c.id);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    setShuffleOrder(ids);
    setCardIndex(0);
    setIsFlipped(false);
  };

  const handleResetFlashcardProgress = () => {
    setCardStatuses({});
    setReviewOnly(false);
    setCardIndex(0);
    setIsFlipped(false);
  };

  const handleMarkFlashcard = (status: 'mastered' | 'review') => {
    const activeCard = orderedFlashcards[cardIndex];
    if (!activeCard) return;
    setCardStatuses((prev) => ({ ...prev, [activeCard.id]: status }));
    setIsFlipped(false);
    if (orderedFlashcards.length > 1) {
      setCardIndex((prev) => (prev + 1) % orderedFlashcards.length);
    }
  };

  const masteredCount = baseFlashcards.filter(
    (c) => cardStatuses[c.id] === 'mastered'
  ).length;
  const reviewCount = baseFlashcards.filter(
    (c) => cardStatuses[c.id] === 'review'
  ).length;
  const activeFlashcard = orderedFlashcards[cardIndex] ?? null;

  const quizScore = quizData.reduce((acc, q, idx) => {
    return acc + (selectedAnswers[idx] === q.correctIndex ? 1 : 0);
  }, 0);

  return (
    <div className="space-y-4">
      {/* Native window.speechSynthesis TTS Audio Deck */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Native TTS Playback ({langMeta.nativeName})
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums">
            {tts.matchedVoiceName} ({tts.matchedLangTag})
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {tts.state === 'playing' ? (
            <button
              type="button"
              onClick={() => ttsService.pause()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium whitespace-nowrap shrink-0"
            >
              <Pause className="w-3.5 h-3.5" />
              Pause
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePlayTts}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium whitespace-nowrap shrink-0"
            >
              <Play className="w-3.5 h-3.5" />
              {tts.state === 'paused' ? 'Resume' : 'Speak Note'}
            </button>
          )}

          <button
            type="button"
            onClick={() => ttsService.stop()}
            disabled={tts.state === 'idle'}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            <Square className="w-3.5 h-3.5" />
            Stop
          </button>

          <label className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 ms-auto tabular-nums">
            <span>Speed {rate.toFixed(2)}x</span>
            <input
              type="range"
              min={0.75}
              max={1.75}
              step={0.25}
              value={rate}
              onChange={(e) => {
                const next = Number(e.target.value);
                setRate(next);
                ttsService.setRate(next);
              }}
              className="w-20 accent-blue-600"
            />
          </label>
        </div>

        {tts.totalChunks > 0 && (
          <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            Segment {Math.min(tts.currentChunk + 1, tts.totalChunks)} of {tts.totalChunks} · Media Session active
          </div>
        )}
        {tts.error && (
          <p className="text-xs text-rose-600 dark:text-rose-400">{tts.error}</p>
        )}
      </div>

      {/* AI Study Tools Selector & Actions */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            AI Study Suite ({langMeta.nativeName})
          </h3>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => void handleSummarize()}
              disabled={loading}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeTool === 'summary'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Summarize
            </button>
            <button
              type="button"
              onClick={() => void handleGenerateQuiz()}
              disabled={loading || !noteContent.trim()}
              title="Generate a 5-question multiple-choice quiz from this note"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 disabled:opacity-40 ${
                activeTool === 'quiz'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              AI Quiz
            </button>
            <button
              type="button"
              onClick={() => setActiveTool('code')}
              disabled={loading}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeTool === 'code'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              Explain Code
            </button>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setActiveTool('flashcards');
              }}
              disabled={loading}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeTool === 'flashcards'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Flashcards
            </button>
          </div>
        </div>

        {loading && (
          <div className="flex items-center gap-2 py-6 justify-center text-xs text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            Generating study materials in {langMeta.nativeName}...
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        {/* Summary View */}
        {!loading && activeTool === 'summary' && (
          <div dir={langMeta.dir} className="space-y-3 text-sm">
            {!summaryData ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Click <strong>Summarize</strong> to extract key concepts, proofs, and algorithmic bounds from the active note.
              </p>
            ) : (
              <>
                <p className="text-slate-700 dark:text-slate-200 leading-relaxed">
                  {summaryData.summary}
                </p>
                {summaryData.keyConcepts?.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-slate-900 dark:text-white mb-1.5">
                      Key Concepts
                    </div>
                    <ul className="list-disc ps-5 space-y-1 text-xs text-slate-700 dark:text-slate-300">
                      {summaryData.keyConcepts.map((c, idx) => (
                        <li key={idx}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {summaryData.complexityNotes && (
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300">
                    {summaryData.complexityNotes}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Interactive AI Quiz View */}
        {!loading && activeTool === 'quiz' && (
          <div dir={langMeta.dir} className="space-y-4">
            {quizData.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Click <strong>AI Quiz</strong> to generate a 5-question multiple-choice quiz from this note.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 tabular-nums">
                    <span>
                      Score: {quizScore} / {quizData.length}
                    </span>
                    <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                      ·
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      Answered {Object.keys(selectedAnswers).length} / {quizData.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {Object.keys(selectedAnswers).length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedAnswers({})}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Retake
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void handleGenerateQuiz()}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-blue-200 dark:border-blue-800/80 bg-blue-50/70 dark:bg-blue-950/30 text-[11px] font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 whitespace-nowrap shrink-0"
                    >
                      <Sparkles className="w-3 h-3" />
                      New Quiz
                    </button>
                  </div>
                </div>
                {quizData.map((q, qIdx) => {
                  const chosen = selectedAnswers[qIdx];
                  const answered = chosen !== undefined;
                  return (
                    <div
                      key={qIdx}
                      className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2.5"
                    >
                      <div className="text-xs font-semibold text-slate-900 dark:text-white">
                        {qIdx + 1}. {q.question}
                      </div>
                      <div className="space-y-1.5">
                        {q.options.map((opt, oIdx) => {
                          const isSelected = chosen === oIdx;
                          const isCorrect = q.correctIndex === oIdx;
                          let style =
                            'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200';
                          if (answered) {
                            if (isCorrect) {
                              style =
                                'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200';
                            } else if (isSelected) {
                              style =
                                'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200';
                            }
                          }
                          return (
                            <button
                              key={oIdx}
                              type="button"
                              onClick={() =>
                                setSelectedAnswers((prev) => ({ ...prev, [qIdx]: oIdx }))
                              }
                              className={`w-full text-start px-3 py-2 rounded-lg border text-xs flex items-center justify-between gap-2 transition-colors ${style}`}
                            >
                              <span>{opt}</span>
                              {answered && isCorrect && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              )}
                              {answered && isSelected && !isCorrect && (
                                <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                      {answered && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 pt-1">
                          {q.explanation}
                        </p>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {/* Code Walkthrough View */}
        {!loading && activeTool === 'code' && (
          <div className="space-y-3">
            <textarea
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              placeholder="Paste any snippet across the 20 supported languages, or click 'Explain' on a code block in the preview..."
              className="w-full h-28 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-xs text-slate-900 dark:text-slate-100"
            />
            <button
              type="button"
              onClick={() => void handleExplainCode()}
              disabled={!codeInput.trim()}
              className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-medium"
            >
              Analyze Complexity & Walkthrough
            </button>

            {codeExplainData && (
              <div dir={langMeta.dir} className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex flex-wrap gap-3 text-xs font-mono text-slate-600 dark:text-slate-300">
                  <span>Lang: {codeExplainData.detectedLanguage}</span>
                  <span>·</span>
                  <span>Time: {codeExplainData.timeComplexity}</span>
                  <span>·</span>
                  <span>Space: {codeExplainData.spaceComplexity}</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {codeExplainData.walkthrough}
                </p>
                {codeExplainData.lineByLine?.length > 0 && (
                  <div dir="ltr" className="divide-y divide-slate-200 dark:divide-slate-800 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                    {codeExplainData.lineByLine.map((item, idx) => (
                      <div key={idx} className="p-2.5 text-xs bg-slate-50 dark:bg-slate-950">
                        <div className="font-mono text-slate-900 dark:text-slate-100">
                          {item.line}
                        </div>
                        <div className="text-slate-600 dark:text-slate-400 mt-0.5">
                          {item.note}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Flashcard Study Mode */}
        {!loading && activeTool === 'flashcards' && (
          <div dir={langMeta.dir} className="space-y-3.5">
            {baseFlashcards.length === 0 ? (
              <div className="p-5 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2.5">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Add headings, term definitions (e.g. <code className="font-mono">Term: meaning</code>), tables, or code snippets to extract study flashcards automatically.
                </p>
                <button
                  type="button"
                  onClick={() => void handleGenerateAiFlashcards()}
                  disabled={!noteContent.trim()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-medium whitespace-nowrap shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Synthesize AI Flashcards
                </button>
              </div>
            ) : (
              <>
                {/* Deck Header & Action Controls */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 tabular-nums">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {orderedFlashcards.length > 0
                        ? `Card ${cardIndex + 1} of ${orderedFlashcards.length}`
                        : 'Deck Complete'}
                    </span>
                    <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                      ·
                    </span>
                    <span>
                      {masteredCount} / {baseFlashcards.length} mastered
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {baseFlashcards.length > 1 && (
                      <button
                        type="button"
                        onClick={handleShuffleFlashcards}
                        title="Shuffle flashcard order"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
                      >
                        <Shuffle className="w-3 h-3" />
                        Shuffle
                      </button>
                    )}
                    {(masteredCount > 0 || reviewCount > 0) && (
                      <button
                        type="button"
                        onClick={handleResetFlashcardProgress}
                        title="Reset memorization progress"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Reset
                      </button>
                    )}
                    {aiFlashcards ? (
                      <button
                        type="button"
                        onClick={() => {
                          setAiFlashcards(null);
                          setShuffleOrder(null);
                          setCardIndex(0);
                          setIsFlipped(false);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
                      >
                        Note Extract
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleGenerateAiFlashcards()}
                        title="Generate AI-refined study flashcards from this note"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-blue-200 dark:border-blue-800/80 bg-blue-50/70 dark:bg-blue-950/30 text-[11px] font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 whitespace-nowrap shrink-0"
                      >
                        <Sparkles className="w-3 h-3" />
                        AI Cards
                      </button>
                    )}
                  </div>
                </div>

                {/* Deck Filter Switcher when progress is tracked */}
                {(masteredCount > 0 || reviewCount > 0) && (
                  <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 w-fit">
                    <button
                      type="button"
                      onClick={() => {
                        setReviewOnly(false);
                        setCardIndex(0);
                        setIsFlipped(false);
                      }}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                        !reviewOnly
                          ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      All Cards ({baseFlashcards.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setReviewOnly(true);
                        setCardIndex(0);
                        setIsFlipped(false);
                      }}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                        reviewOnly
                          ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Needs Review ({baseFlashcards.length - masteredCount})
                    </button>
                  </div>
                )}

                {/* Active Interactive Flip-Card */}
                {activeFlashcard ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsFlipped((prev) => !prev)}
                      aria-label={
                        isFlipped
                          ? `Showing definition for ${activeFlashcard.term}. Click to show term.`
                          : `Showing term ${activeFlashcard.term}. Click to reveal definition.`
                      }
                      className="w-full text-start rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 [perspective:1000px]"
                    >
                      <div
                        className={`relative w-full min-h-[210px] transition-transform duration-300 [transform-style:preserve-3d] ${
                          isFlipped ? '[transform:rotateY(180deg)]' : ''
                        }`}
                      >
                        {/* Card Front: Terminology */}
                        <div className="w-full min-h-[210px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-950 p-5 flex flex-col justify-between [backface-visibility:hidden]">
                          <div className="flex items-center justify-between gap-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            <span>
                              Term · {activeFlashcard.category}
                            </span>
                            {cardStatuses[activeFlashcard.id] === 'mastered' && (
                              <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                                <CheckCircle2 className="w-3 h-3" />
                                Mastered
                              </span>
                            )}
                            {cardStatuses[activeFlashcard.id] === 'review' && (
                              <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
                                <RotateCcw className="w-3 h-3" />
                                Still Learning
                              </span>
                            )}
                          </div>

                          <div className="py-4 text-center">
                            <div
                              dir={activeFlashcard.category === 'Code' ? 'ltr' : undefined}
                              className={`font-semibold text-slate-900 dark:text-white break-words ${
                                activeFlashcard.category === 'Code'
                                  ? 'font-mono text-sm'
                                  : 'text-base sm:text-lg'
                              }`}
                            >
                              {activeFlashcard.term}
                            </div>
                          </div>

                          <div className="text-center text-[11px] text-slate-400 dark:text-slate-500">
                            Click card to reveal definition
                          </div>
                        </div>

                        {/* Card Back: Definition */}
                        <div className="absolute inset-0 w-full h-full rounded-xl border border-blue-200 dark:border-blue-800/80 bg-blue-50/60 dark:bg-blue-950/35 p-5 flex flex-col justify-between overflow-y-auto [backface-visibility:hidden] [transform:rotateY(180deg)]">
                          <div className="flex items-center justify-between gap-2 text-[11px] font-medium text-blue-700 dark:text-blue-300">
                            <span className="truncate">
                              Definition · {activeFlashcard.term}
                            </span>
                            <span className="shrink-0 text-slate-500 dark:text-slate-400">
                              {activeFlashcard.source === 'ai' ? 'AI' : 'Note'}
                            </span>
                          </div>

                          <p className="py-3 text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-100 whitespace-pre-wrap break-words">
                            {activeFlashcard.definition}
                          </p>

                          <div className="text-center text-[11px] text-blue-600/80 dark:text-blue-400/80">
                            Click to flip back to term
                          </div>
                        </div>
                      </div>
                    </button>

                    {/* Segmented Per-Card Progress Strip */}
                    <div
                      className="flex items-center gap-1 pt-0.5"
                      role="group"
                      aria-label="Flashcard deck progress"
                    >
                      {orderedFlashcards.map((card, idx) => {
                        const status = cardStatuses[card.id];
                        const isCurrent = idx === cardIndex;
                        return (
                          <button
                            key={card.id}
                            type="button"
                            onClick={() => {
                              setCardIndex(idx);
                              setIsFlipped(false);
                            }}
                            title={`Jump to card ${idx + 1}: ${card.term}`}
                            aria-label={`Card ${idx + 1}: ${card.term}`}
                            className={`h-1.5 flex-1 rounded-full transition-colors ${
                              status === 'mastered'
                                ? 'bg-emerald-500'
                                : status === 'review'
                                ? 'bg-amber-400'
                                : 'bg-slate-200 dark:bg-slate-800'
                            } ${
                              isCurrent
                                ? 'ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-slate-900'
                                : 'opacity-75 hover:opacity-100'
                            }`}
                          />
                        );
                      })}
                    </div>

                    {/* Navigation & Active Recall Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setIsFlipped(false);
                            setCardIndex(
                              (prev) =>
                                (prev - 1 + orderedFlashcards.length) %
                                orderedFlashcards.length
                            );
                          }}
                          disabled={orderedFlashcards.length <= 1}
                          aria-label="Previous flashcard"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 whitespace-nowrap shrink-0"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                          Prev
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsFlipped(false);
                            setCardIndex(
                              (prev) => (prev + 1) % orderedFlashcards.length
                            );
                          }}
                          disabled={orderedFlashcards.length <= 1}
                          aria-label="Next flashcard"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 whitespace-nowrap shrink-0"
                        >
                          Next
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleMarkFlashcard('review')}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-xs font-medium text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors whitespace-nowrap shrink-0"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Still Learning
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMarkFlashcard('mastered')}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-xs font-medium text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors whitespace-nowrap shrink-0"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Got It
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="p-5 rounded-xl border border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/60 dark:bg-emerald-950/25 text-center space-y-2.5">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mx-auto" />
                    <div className="text-xs font-semibold text-slate-900 dark:text-white">
                      All flashcards mastered!
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      Switch back to all cards or reset progress for another study pass.
                    </p>
                    <div className="flex justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setReviewOnly(false);
                          setCardIndex(0);
                          setIsFlipped(false);
                        }}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200"
                      >
                        Show All Cards
                      </button>
                      <button
                        type="button"
                        onClick={handleResetFlashcardProgress}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-medium"
                      >
                        Study Again
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
