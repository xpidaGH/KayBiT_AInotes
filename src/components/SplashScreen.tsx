import React from 'react';
import {
  ArrowRight,
  BookOpen,
  Download,
  FileUp,
  Globe,
  PenTool,
  ScanLine,
} from 'lucide-react';
import {
  getLanguageMeta,
  getUiStrings,
  PROGRAMMING_LANGUAGES,
  SUPPORTED_LANGUAGES,
  SupportedLangCode,
} from '../i18n/languages';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface SplashScreenProps {
  language: SupportedLangCode;
  onLanguageChange: (lang: SupportedLangCode) => void;
  onOpenUserGuide: () => void;
  onOpenInstallModal: () => void;
  onEnterWorkspace: (initialTab: 'studio' | 'canvas' | 'scanner' | 'study' | 'shortcuts') => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  language,
  onLanguageChange,
  onOpenUserGuide,
  onOpenInstallModal,
  onEnterWorkspace,
}) => {
  const meta = getLanguageMeta(language);
  const strings = getUiStrings(language);
  const { isInstallable, isInstalled, install } = usePWAInstall();

  return (
    <div
      dir={meta.dir}
      lang={meta.code}
      className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col"
    >
      {/* Top 3-Zone Header */}
      <header className="w-full border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => onEnterWorkspace('studio')}
            className="text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 font-display"
          >
            AInotes
          </button>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
            <button
              type="button"
              onClick={() => onEnterWorkspace('studio')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              {strings.studioTab}
            </button>
            <button
              type="button"
              onClick={() => onEnterWorkspace('canvas')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              {strings.canvasTab}
            </button>
            <button
              type="button"
              onClick={() => onEnterWorkspace('scanner')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              {strings.scannerTab}
            </button>
            <button
              type="button"
              onClick={() => onEnterWorkspace('study')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              {strings.studyTab}
            </button>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onOpenUserGuide}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors whitespace-nowrap shrink-0"
            >
              <BookOpen className="w-3.5 h-3.5" />
              {strings.userGuide}
            </button>
          </div>
        </div>
      </header>

      {/* Main Launchpad Hero */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10 flex flex-col justify-center gap-10">
        <div className="grid lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Narrative & Actions */}
          <div className="lg:col-span-6 flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span>20 Programming Languages</span>
                <span aria-hidden="true">·</span>
                <span>26 International Languages</span>
                <span aria-hidden="true">·</span>
                <span>Local-First + Cloud HTR</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-bold tracking-tight text-slate-900 dark:text-white leading-[1.15] [text-wrap:balance]">
                {strings.splashHeadline}
              </h1>

              <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
                {strings.splashSubtitle}
              </p>

              {/* Language Selector */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                  <Globe className="w-4 h-4 text-slate-500" />
                  <span>Workspace & OCR Language</span>
                </label>
                <select
                  value={language}
                  onChange={(e) => onLanguageChange(e.target.value as SupportedLangCode)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.nativeName} ({l.name})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Primary Launch Actions including Prominent User Guide Button */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => onEnterWorkspace('studio')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 text-sm font-medium transition-colors whitespace-nowrap shrink-0"
              >
                {strings.enterWorkspace}
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onOpenUserGuide}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-blue-600 dark:border-blue-500 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-sm font-medium transition-colors whitespace-nowrap shrink-0"
              >
                <BookOpen className="w-4 h-4" />
                {strings.userGuide}
              </button>

              {isInstallable && !isInstalled ? (
                <button
                  type="button"
                  onClick={() => void install()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium transition-colors whitespace-nowrap shrink-0"
                >
                  <Download className="w-4 h-4" />
                  {strings.installApp}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenInstallModal}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium transition-colors whitespace-nowrap shrink-0"
                >
                  <Download className="w-4 h-4" />
                  Downloads & Install
                </button>
              )}
            </div>
          </div>

          {/* Right Architectural Image Frame */}
          <div className="lg:col-span-6 flex">
            <div className="w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 relative min-h-[260px]">
              <img
                src="/src/assets/images/hero_splash_workspace_1795241888879.jpg"
                alt="AInotes stylus handwriting workspace with algorithm diagrams and Python code"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-transparent text-white">
                <p className="text-xs text-slate-200">
                  MyScript Ink · Pen to Print Cursive · Transkribus Custom Vocab · Document AI / Textract · Noto PDF
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick-Start Action Strip */}
        <div className="grid sm:grid-cols-3 gap-4 pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => onEnterWorkspace('canvas')}
            className="text-start p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-400 dark:hover:border-blue-600 transition-colors"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white mb-1">
              <PenTool className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              01. Stylus Ink Canvas
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Write algorithms or math freehand with pressure support and convert strokes to syntax-highlighted code.
            </p>
          </button>

          <button
            type="button"
            onClick={() => onEnterWorkspace('scanner')}
            className="text-start p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-400 dark:hover:border-blue-600 transition-colors"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white mb-1">
              <ScanLine className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              02. Scan Photos, Cursive & PDFs
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Upload handwritten pages or test built-in cursive and grid-paper algorithm samples via Gemini Vision HTR.
            </p>
          </button>

          <button
            type="button"
            onClick={() => onEnterWorkspace('studio')}
            className="text-start p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-400 dark:hover:border-blue-600 transition-colors"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white mb-1">
              <FileUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              03. Import .txt / .md / .mdx & Export PDF
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Parse `***`, `===`, `---` headings and 3-space code blocks, listen via TTS, and export Noto-shaped PDFs.
            </p>
          </button>
        </div>

        {/* Supported 20 CS Languages Reference Line */}
        <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            Supported Code Classifiers:{' '}
          </span>
          {PROGRAMMING_LANGUAGES.join(' · ')}
        </div>
      </main>
    </div>
  );
};
