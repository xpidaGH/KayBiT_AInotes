import React, { useEffect, useRef, useState } from 'react';
import { Eraser, Loader2, PenTool, RotateCcw, Sparkles, Trash2 } from 'lucide-react';
import { getLanguageMeta, SupportedLangCode } from '../i18n/languages';

interface InkCanvasProps {
  targetLanguage: SupportedLangCode;
  onRecognizedText: (text: string, titleHint: string, detectedLangs: string[]) => void;
}

type PaperStyle = 'grid' | 'lined' | 'blank';

export const InkCanvas: React.FC<InkCanvasProps> = ({
  targetLanguage,
  onRecognizedText,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const historyRef = useRef<ImageData[]>([]);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const [penColor, setPenColor] = useState('#0f172a');
  const [penWidth, setPenWidth] = useState(3);
  const [eraserMode, setEraserMode] = useState(false);
  const [paperStyle, setPaperStyle] = useState<PaperStyle>('grid');
  const [profile, setProfile] = useState('hybrid_ink_code');
  const [customVocab, setCustomVocab] = useState('');
  const [recognizing, setRecognizing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const drawPaperBackground = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    if (paperStyle === 'grid') {
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      for (let x = 28; x < w; x += 28) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 28; y < h; y += 28) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    } else if (paperStyle === 'lined') {
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      for (let y = 36; y < h; y += 34) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    }
    ctx.restore();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (historyRef.current.length === 0) {
      drawPaperBackground(ctx, canvas.width, canvas.height);
      historyRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    }
  }, []);

  const handlePaperChange = (next: PaperStyle) => {
    setPaperStyle(next);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawPaperBackground(ctx, canvas.width, canvas.height);
    historyRef.current = [ctx.getImageData(0, 0, canvas.width, canvas.height)];
  };

  const getCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    isDrawingRef.current = true;
    const pt = getCoords(e);
    lastPointRef.current = pt;

    const pressure = e.pressure && e.pressure > 0 ? e.pressure : 0.5;
    ctx.beginPath();
    ctx.arc(
      pt.x,
      pt.y,
      (eraserMode ? penWidth * 3 : penWidth * (0.6 + pressure)) / 2,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = eraserMode ? '#ffffff' : penColor;
    ctx.fill();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !lastPointRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const pt = getCoords(e);
    const pressure = e.pressure && e.pressure > 0 ? e.pressure : 0.5;
    ctx.save();
    ctx.strokeStyle = eraserMode ? '#ffffff' : penColor;
    ctx.lineWidth = eraserMode ? penWidth * 4 : penWidth * (0.65 + pressure * 0.85);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    ctx.restore();
    lastPointRef.current = pt;
  };

  const handlePointerUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    lastPointRef.current = null;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      historyRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
      if (historyRef.current.length > 25) {
        historyRef.current.shift();
      }
    }
  };

  const handleUndo = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || historyRef.current.length <= 1) return;
    historyRef.current.pop();
    const prev = historyRef.current[historyRef.current.length - 1];
    ctx.putImageData(prev, 0, 0);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    drawPaperBackground(ctx, canvas.width, canvas.height);
    historyRef.current = [ctx.getImageData(0, 0, canvas.width, canvas.height)];
    setStatusMsg(null);
    setErrorMsg(null);
  };

  const handleRecognize = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setRecognizing(true);
    setErrorMsg(null);
    setStatusMsg(null);

    try {
      const dataUrl = canvas.toDataURL('image/png');
      const meta = getLanguageMeta(targetLanguage);
      const res = await fetch('/api/htr/recognize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: dataUrl,
          mimeType: 'image/png',
          targetLanguage,
          targetLanguageName: meta.name,
          recognitionProfile: profile,
          customVocabulary: customVocab,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Handwriting recognition failed.');
      }
      setStatusMsg(
        data.recognitionSummary ||
          `Recognized in ${data.detectedLanguage || meta.name}. Appended to active note.`
      );
      onRecognizedText(
        data.extractedText || '',
        'Handwritten Stylus Note',
        Array.isArray(data.detectedCodeLanguages) ? data.detectedCodeLanguages : []
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Recognition failed.');
    } finally {
      setRecognizing(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Canvas Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setEraserMode(false)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              !eraserMode
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            Pen
          </button>
          <button
            type="button"
            onClick={() => setEraserMode(true)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              eraserMode
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            <Eraser className="w-3.5 h-3.5" />
            Eraser
          </button>

          <div className="flex items-center gap-1.5 px-2 border-s border-slate-200 dark:border-slate-800">
            {['#0f172a', '#1d4ed8', '#b91c1c', '#047857'].map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Ink color ${c}`}
                onClick={() => {
                  setPenColor(c);
                  setEraserMode(false);
                }}
                style={{ backgroundColor: c }}
                className={`w-5 h-5 rounded-full border-2 transition-transform ${
                  penColor === c && !eraserMode
                    ? 'border-blue-500 scale-110'
                    : 'border-slate-300 dark:border-slate-600'
                }`}
              />
            ))}
          </div>

          <label className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 ps-2">
            <span>Stroke: {penWidth}px</span>
            <input
              type="range"
              min={1}
              max={8}
              value={penWidth}
              onChange={(e) => setPenWidth(Number(e.target.value))}
              className="w-20 accent-blue-600"
            />
          </label>

          <select
            aria-label="Paper Style"
            value={paperStyle}
            onChange={(e) => handlePaperChange(e.target.value as PaperStyle)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
          >
            <option value="grid">Engineering Grid</option>
            <option value="lined">Lined Paper</option>
            <option value="blank">Blank Sheet</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleUndo}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Undo
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
          <button
            type="button"
            onClick={handleRecognize}
            disabled={recognizing}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-medium transition-colors whitespace-nowrap shrink-0"
          >
            {recognizing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            {recognizing ? 'Recognizing...' : 'Recognize Handwriting'}
          </button>
        </div>
      </div>

      {/* Recognition Profile & Custom Student Vocabulary */}
      <div className="grid sm:grid-cols-2 gap-3">
        <select
          aria-label="HTR Recognition Profile"
          value={profile}
          onChange={(e) => setProfile(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200"
        >
          <option value="hybrid_ink_code">MyScript Ink & Code (Stylus + Math + Indentation)</option>
          <option value="cursive_pentoprint">Pen to Print / InkReadable (Messy & Cursive)</option>
          <option value="transkribus_multilingual">Transkribus Multilingual Academic</option>
          <option value="docai_textract_form">Document AI / Textract (Forms & Tables)</option>
          <option value="quick_capture">Quick Capture (Live Text / OneNote)</option>
        </select>

        <input
          type="text"
          value={customVocab}
          onChange={(e) => setCustomVocab(e.target.value)}
          placeholder="Custom vocabulary hints (e.g., Dijkstra, RAX, fn mut, O(log n))..."
          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
        />
      </div>

      {errorMsg && (
        <div className="p-3 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-700 dark:text-rose-300">
          {errorMsg}
        </div>
      )}
      {statusMsg && (
        <div className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 text-xs text-emerald-800 dark:text-emerald-300">
          {statusMsg}
        </div>
      )}

      {/* Stylus Drawing Surface */}
      <div className="flex-1 min-h-[380px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white overflow-hidden relative touch-none">
        <canvas
          ref={canvasRef}
          width={1200}
          height={680}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="w-full h-full cursor-crosshair block touch-none"
        />
      </div>
    </div>
  );
};
