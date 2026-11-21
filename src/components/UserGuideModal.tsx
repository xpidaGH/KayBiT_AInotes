import React, { useEffect, useState } from 'react';
import { BookOpen, Globe, Volume2, Square, X } from 'lucide-react';
import {
  getLanguageMeta,
  SUPPORTED_LANGUAGES,
  SupportedLangCode,
} from '../i18n/languages';
import { extractPlainTextForTts } from '../parsers/setextCustomParser';
import { ttsService } from '../services/ttsService';
import { AstRenderer } from './AstRenderer';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialLang: SupportedLangCode;
}

export const UserGuideModal: React.FC<UserGuideModalProps> = ({
  isOpen,
  onClose,
  initialLang,
}) => {
  const [guideLang, setGuideLang] = useState<SupportedLangCode>(initialLang);
  const [markdown, setMarkdown] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    setGuideLang(initialLang);
  }, [initialLang]);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setLoading(true);
    setError(null);

    fetch(`/docs/user-guides/USER_GUIDE.${guideLang}.md`)
      .then((res) => {
        if (!res.ok) throw new Error(`Could not load USER_GUIDE.${guideLang}.md`);
        return res.text();
      })
      .then((text) => {
        if (active) {
          setMarkdown(text);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load user guide.');
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [isOpen, guideLang]);

  useEffect(() => {
    const unsub = ttsService.subscribe((p) => {
      setSpeaking(p.state !== 'idle');
    });
    return unsub;
  }, []);

  if (!isOpen) return null;

  const langMeta = getLanguageMeta(guideLang);

  const handleToggleRead = () => {
    if (speaking) {
      ttsService.stop();
    } else if (markdown) {
      void ttsService.speak(extractPlainTextForTts(markdown), guideLang, {
        title: `AInotes User Guide (${langMeta.nativeName})`,
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-guide-modal-title"
    >
      <div className="w-full max-w-3xl max-h-[88vh] flex flex-col rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Top Modal Header with 26-Language Dropdown on Top Right */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
            <div>
              <h2
                id="user-guide-modal-title"
                className="text-base font-semibold text-slate-900 dark:text-white"
              >
                AInotes User Guide
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                docs/user-guides/USER_GUIDE.{guideLang}.md · {langMeta.dir.toUpperCase()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleToggleRead}
              disabled={!markdown || loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
              title="Listen to User Guide in selected language"
            >
              {speaking ? (
                <>
                  <Square className="w-3.5 h-3.5 text-rose-500" />
                  Stop Audio
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  Listen
                </>
              )}
            </button>

            <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
              <Globe className="w-4 h-4 text-slate-500 shrink-0" />
              <select
                aria-label="Select User Guide Language"
                value={guideLang}
                onChange={(e) => setGuideLang(e.target.value as SupportedLangCode)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.nativeName} ({l.name} · {l.code})
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close User Guide"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Localized Guide Body */}
        <div
          dir={langMeta.dir}
          lang={langMeta.code}
          className="flex-1 overflow-y-auto px-6 py-5"
        >
          {loading && (
            <div className="space-y-3 animate-pulse">
              <div className="h-6 w-1/3 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-full rounded bg-slate-100 dark:bg-slate-800/70" />
              <div className="h-4 w-5/6 rounded bg-slate-100 dark:bg-slate-800/70" />
              <div className="h-28 w-full rounded bg-slate-100 dark:bg-slate-800/70" />
            </div>
          )}

          {error && (
            <div className="p-4 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-sm text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          {!loading && !error && <AstRenderer content={markdown} dir={langMeta.dir} />}
        </div>
      </div>
    </div>
  );
};
