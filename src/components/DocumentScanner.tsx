import React, { useState } from 'react';
import { FileText, FileUp, Image as ImageIcon, Loader2, ScanLine, Sparkles } from 'lucide-react';
import { getLanguageMeta, SupportedLangCode } from '../i18n/languages';
import {
  inferSourceType,
  NoteRecord,
  readFileAsDataUrl,
  readFileAsText,
  urlToDataUrl,
} from '../services/storageService';

interface DocumentScannerProps {
  targetLanguage: SupportedLangCode;
  onRecognizedText: (text: string, titleHint: string, detectedLangs: string[]) => void;
  onImportDocument: (
    title: string,
    content: string,
    sourceType: NoteRecord['sourceType']
  ) => void;
}

export const DocumentScanner: React.FC<DocumentScannerProps> = ({
  targetLanguage,
  onRecognizedText,
  onImportDocument,
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [fileName, setFileName] = useState<string>('handwritten-page.jpg');
  const [profile, setProfile] = useState('cursive_pentoprint');
  const [customVocab, setCustomVocab] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const [pasteTitle, setPasteTitle] = useState('');
  const [pasteContent, setPasteContent] = useState('');

  const handleBinaryUpload = async (file: File) => {
    setError(null);
    setStatus(null);
    if (
      file.name.endsWith('.txt') ||
      file.name.endsWith('.md') ||
      file.name.endsWith('.mdx') ||
      file.type.startsWith('text/')
    ) {
      const content = await readFileAsText(file);
      const title = file.name.replace(/\.[^/.]+$/, '');
      onImportDocument(title, content, inferSourceType(file.name));
      setStatus(`Imported "${file.name}" directly into Notes Studio.`);
      return;
    }

    const dataUrl = await readFileAsDataUrl(file);
    setPreviewUrl(dataUrl);
    setMimeType(file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/png'));
    setFileName(file.name);
  };

  const handleLoadBuiltInSample = async (url: string, label: string, sampleProfile: string) => {
    setError(null);
    setStatus(null);
    setProfile(sampleProfile);
    const { dataUrl, mimeType: mt } = await urlToDataUrl(url);
    setPreviewUrl(dataUrl);
    setMimeType(mt);
    setFileName(label);
  };

  const handleRunOcr = async () => {
    if (!previewUrl) return;
    setLoading(true);
    setError(null);
    setStatus(null);

    try {
      const meta = getLanguageMeta(targetLanguage);
      const res = await fetch('/api/htr/recognize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: previewUrl,
          mimeType,
          targetLanguage,
          targetLanguageName: meta.name,
          recognitionProfile: profile,
          customVocabulary: customVocab,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Document OCR failed.');

      setStatus(
        data.recognitionSummary ||
          `Extracted structured text (${data.detectedLanguage || meta.name}).`
      );
      onRecognizedText(
        data.extractedText || '',
        fileName.replace(/\.[^/.]+$/, ''),
        Array.isArray(data.detectedCodeLanguages) ? data.detectedCodeLanguages : []
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan recognition failed.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasteImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteContent.trim()) return;
    onImportDocument(pasteTitle.trim() || 'Pasted CS Document', pasteContent, 'mdx');
    setPasteTitle('');
    setPasteContent('');
    setStatus('Pasted document added to Notes Studio.');
  };

  return (
    <div className="grid lg:grid-cols-12 gap-6">
      {/* Left: Image / Scanned PDF HTR Pipeline */}
      <div className="lg:col-span-7 space-y-4">
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <ScanLine className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Handwritten Image & PDF Scanner
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Supports neat print, cursive handwriting, whiteboards, forms, and scanned PDFs.
              </p>
            </div>
          </div>

          {/* Built-in Realistic Sample Loaders */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Try sample scan:
            </span>
            <button
              type="button"
              onClick={() =>
                void handleLoadBuiltInSample(
                  '/src/assets/images/sample_handwritten_algo_1795241889373.jpg',
                  'Binary_Search_Grid_Paper.jpg',
                  'hybrid_ink_code'
                )
              }
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Grid Paper Python Code
            </button>
            <button
              type="button"
              onClick={() =>
                void handleLoadBuiltInSample(
                  '/src/assets/images/sample_cursive_notes_1795241888192.jpg',
                  'Dijkstra_Cursive_Notes.jpg',
                  'cursive_pentoprint'
                )
              }
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cursive Graph Lecture
            </button>
          </div>

          {/* File Dropzone */}
          <label
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file) void handleBinaryUpload(file);
            }}
            className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 hover:border-blue-500 transition-colors cursor-pointer text-center"
          >
            <ImageIcon className="w-6 h-6 text-slate-400" />
            <div className="text-xs font-medium text-slate-700 dark:text-slate-200">
              Drop handwritten image (.png, .jpg, .webp), scanned .pdf, or .txt/.md/.mdx here
            </div>
            <span className="text-xs text-slate-500">or click to browse local files</span>
            <input
              type="file"
              accept="image/*,.pdf,.txt,.md,.mdx,.py,.ts,.js,.rs,.sql"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleBinaryUpload(file);
              }}
            />
          </label>

          {/* Engine Selector + Custom Vocabulary */}
          <div className="grid sm:grid-cols-2 gap-3">
            <select
              value={profile}
              onChange={(e) => setProfile(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-200"
            >
              <option value="cursive_pentoprint">Pen to Print / InkReadable (Cursive & Messy)</option>
              <option value="hybrid_ink_code">MyScript Ink & Code (Algorithms + Syntax)</option>
              <option value="transkribus_multilingual">Transkribus Multilingual Model</option>
              <option value="docai_textract_form">Google Document AI / AWS Textract (Forms)</option>
              <option value="quick_capture">Apple Live Text / Keep / OneNote</option>
            </select>

            <input
              type="text"
              value={customVocab}
              onChange={(e) => setCustomVocab(e.target.value)}
              placeholder="Custom training hints / domain terms..."
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-200"
            />
          </div>

          {previewUrl && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                <span className="font-mono truncate max-w-xs">{fileName}</span>
                <button
                  type="button"
                  onClick={handleRunOcr}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-medium transition-colors whitespace-nowrap shrink-0"
                >
                  {loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  {loading ? 'Extracting Text & Code...' : 'Recognize Document'}
                </button>
              </div>
              {mimeType.startsWith('image/') ? (
                <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 max-h-72 bg-slate-100 dark:bg-slate-950">
                  <img
                    src={previewUrl}
                    alt={fileName}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain max-h-72"
                  />
                </div>
              ) : (
                <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-mono text-slate-700 dark:text-slate-300">
                  PDF Document loaded ({fileName}) — ready for multimodal extraction.
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}
          {status && (
            <div className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 text-xs text-emerald-800 dark:text-emerald-300">
              {status}
            </div>
          )}
        </div>
      </div>

      {/* Right: Direct Paste & .txt / .md / .mdx Ingestor */}
      <div className="lg:col-span-5">
        <form
          onSubmit={handlePasteImport}
          className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 h-full flex flex-col"
        >
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Paste or Upload .txt / .md / .mdx
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Supports AInotes underline headings (`***`, `===`, `---`) and 3-space indented code blocks across 20 languages.
            </p>
          </div>

          <input
            type="text"
            value={pasteTitle}
            onChange={(e) => setPasteTitle(e.target.value)}
            placeholder="Document Title (e.g., Operating Systems Lab 04)"
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100"
          />

          <textarea
            value={pasteContent}
            onChange={(e) => setPasteContent(e.target.value)}
            placeholder={`Paste .txt, .md, .mdx, or code notes here...\n\nExample:\nKernel Scheduling\n*****************\n\nRound Robin\n===========\n   fn next_task(queue: &mut Vec<u32>) -> Option<u32> {\n       queue.pop()\n   }`}
            className="flex-1 min-h-[240px] px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-xs text-slate-900 dark:text-slate-100 resize-none"
          />

          <div className="flex items-center justify-between gap-3">
            <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap shrink-0">
              <FileUp className="w-3.5 h-3.5" />
              Upload .txt/.md/.mdx
              <input
                type="file"
                accept=".txt,.md,.mdx,.markdown,.csv,.json,.py,.ts,.js,.rs,.sql"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleBinaryUpload(file);
                }}
              />
            </label>

            <button
              type="submit"
              disabled={!pasteContent.trim()}
              className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 disabled:opacity-50 text-xs font-medium hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0"
            >
              Add to Notes Studio
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
