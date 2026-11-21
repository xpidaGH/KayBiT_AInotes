import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  ArchiveRestore,
  ArrowUpDown,
  BookOpen,
  Camera,
  ChevronDown,
  ClipboardList,
  Code2,
  Copy,
  Cpu,
  Download,
  FileDown,
  FilePlus,
  FileText,
  FileUp,
  Globe,
  History,
  Loader2,
  Lock,
  Maximize2,
  Minimize2,
  Moon,
  Pause,
  Pin,
  Play,
  Plus,
  Printer,
  Search,
  Share2,
  Sparkles,
  Square,
  StickyNote,
  Sun,
  Tag,
  Trash2,
  Unlock,
  Volume2,
  Wand2,
  WifiOff,
  X,
} from 'lucide-react';
import {
  getLanguageMeta,
  getUiStrings,
  SUPPORTED_LANGUAGES,
  SupportedLangCode,
} from './i18n/languages';
import {
  inferSourceType,
  loadNotes,
  NoteAnnotation,
  NoteRecord,
  NoteSnapshot,
  readFileAsText,
  saveNotes,
} from './services/storageService';
import {
  exportConsolidatedStudyGuidePdf,
  exportNoteAsMarkdown,
  exportNotesAsZip,
  exportStructuredPdf,
  exportTypstSource,
  printVectorPdf,
} from './services/pdfExporter';
import { useOnlineStatus, usePWAInstall } from './hooks/usePWAInstall';
import { SplashScreen } from './components/SplashScreen';
import { UserGuideModal } from './components/UserGuideModal';
import { InstallModal } from './components/InstallModal';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { AstRenderer } from './components/AstRenderer';
import { AnnotatedCodeEditor } from './components/AnnotatedCodeEditor';
import { InkCanvas } from './components/InkCanvas';
import { DocumentScanner } from './components/DocumentScanner';
import { StudyLabPanel } from './components/StudyLabPanel';
import {
  formatKeyCombo,
  KeyboardShortcuts,
  loadKeybindings,
  ShortcutItem,
} from './components/KeyboardShortcuts';
import { CS_NOTE_TEMPLATES, NoteTemplate } from './data/noteTemplates';
import { prettifyCodeInNote } from './services/codeFormatter';
import { suggestTagsForNote } from './services/autoTagger';
import {
  AutocompleteSuggestion,
  getAutocompleteSuggestions,
} from './services/csAutocomplete';
import { extractPlainTextForTts } from './parsers/setextCustomParser';
import { TtsProgress, ttsService } from './services/ttsService';

type WorkspaceTab = 'studio' | 'canvas' | 'scanner' | 'study' | 'shortcuts';
type NoteSortOption = 'updated-desc' | 'updated-asc' | 'alpha-asc' | 'alpha-desc';

const VALID_SORT_OPTIONS: readonly NoteSortOption[] = [
  'updated-desc',
  'updated-asc',
  'alpha-asc',
  'alpha-desc',
];

function buildShareableNoteUrl(note: NoteRecord): string {
  const payload = JSON.stringify({
    t: note.title,
    c: note.content,
    l: note.language,
    s: note.sourceType,
    g: note.tags ?? [],
  });
  const bytes = new TextEncoder().encode(payload);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const encoded = btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `${window.location.origin}${window.location.pathname}#share=${encoded}`;
}

function parseSharedNoteFromHash(hash: string): Partial<NoteRecord> | null {
  if (!hash.startsWith('#share=')) return null;
  try {
    const raw = hash.slice('#share='.length).replace(/-/g, '+').replace(/_/g, '/');
    const padded = raw + '='.repeat((4 - (raw.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as {
      t?: unknown;
      c?: unknown;
      l?: unknown;
      s?: unknown;
      g?: unknown;
    };
    if (typeof parsed.c !== 'string') return null;
    const validLang = SUPPORTED_LANGUAGES.some((lang) => lang.code === parsed.l)
      ? (parsed.l as SupportedLangCode)
      : 'en';
    const validSource: NoteRecord['sourceType'] =
      parsed.s === 'canvas' ||
      parsed.s === 'scan' ||
      parsed.s === 'md' ||
      parsed.s === 'mdx' ||
      parsed.s === 'txt'
        ? parsed.s
        : 'md';
    return {
      title: typeof parsed.t === 'string' && parsed.t.trim() ? parsed.t : 'Shared Note',
      content: parsed.c,
      language: validLang,
      sourceType: validSource,
      tags: Array.isArray(parsed.g)
        ? parsed.g.filter((tag): tag is string => typeof tag === 'string' && Boolean(tag.trim()))
        : [],
    };
  } catch {
    return null;
  }
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('studio');
  const [language, setLanguage] = useState<SupportedLangCode>(() => {
    const saved = localStorage.getItem('ainotes_lang') as SupportedLangCode | null;
    return saved && SUPPORTED_LANGUAGES.some((l) => l.code === saved) ? saved : 'en';
  });
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('ainotes_theme') === 'dark';
  });

  const [notes, setNotes] = useState<NoteRecord[]>(() => loadNotes());
  const [activeNoteId, setActiveNoteId] = useState<string>(
    () => loadNotes().find((n) => !n.archived)?.id ?? loadNotes()[0]?.id ?? ''
  );
  const [archiveFilter, setArchiveFilter] = useState<'active' | 'archived'>('active');
  const [sortOrder, setSortOrder] = useState<NoteSortOption>(() => {
    const saved = localStorage.getItem('ainotes_sort_order') as NoteSortOption | null;
    return saved && VALID_SORT_OPTIONS.includes(saved) ? saved : 'updated-desc';
  });
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [shortcuts, setShortcuts] = useState<ShortcutItem[]>(() => loadKeybindings());

  const [userGuideOpen, setUserGuideOpen] = useState(false);
  const [installModalOpen, setInstallModalOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const newMenuRef = useRef<HTMLDivElement>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [exportingAll, setExportingAll] = useState<'zip' | 'pdf' | null>(null);
  const [isReadOnly, setIsReadOnly] = useState<boolean>(() => {
    return localStorage.getItem('ainotes_editor_readonly') === 'true';
  });
  const [focusMode, setFocusMode] = useState<boolean>(() => {
    return localStorage.getItem('ainotes_focus_mode') === 'true';
  });
  const [snapshotMenuOpen, setSnapshotMenuOpen] = useState(false);
  const snapshotMenuRef = useRef<HTMLDivElement>(null);
  const [snapshotFeedback, setSnapshotFeedback] = useState<string | null>(null);
  const snapshotTimerRef = useRef<number | null>(null);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const shareTimerRef = useRef<number | null>(null);
  const [newlyCreatedNoteId, setNewlyCreatedNoteId] = useState<string | null>(null);
  const [dismissedSuggestionsByNote, setDismissedSuggestionsByNote] = useState<
    Record<string, string[]>
  >({});
  const [prettifyStatus, setPrettifyStatus] = useState<string | null>(null);
  const prettifyTimerRef = useRef<number | null>(null);
  const editorTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [stickyComposerSignal, setStickyComposerSignal] = useState(0);
  const [focusedAnnotationId, setFocusedAnnotationId] = useState<string | null>(null);
  const [autocompleteState, setAutocompleteState] = useState<{
    prefix: string;
    startIndex: number;
    endIndex: number;
    suggestions: AutocompleteSuggestion[];
    selectedIndex: number;
  } | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [pendingCodeSnippet, setPendingCodeSnippet] = useState<{
    code: string;
    language: string;
  } | null>(null);
  const [toolbarTts, setToolbarTts] = useState<TtsProgress>(() =>
    ttsService.getProgress()
  );
  const [ttsSpeakingNoteId, setTtsSpeakingNoteId] = useState<string | null>(null);

  const isOnline = useOnlineStatus();
  const { isInstallable, isInstalled, install } = usePWAInstall();

  useEffect(() => {
    return ttsService.subscribe((next) => {
      setToolbarTts(next);
      if (next.state === 'idle') {
        setTtsSpeakingNoteId(null);
      }
    });
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('ainotes_theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('ainotes_lang', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('ainotes_editor_readonly', String(isReadOnly));
  }, [isReadOnly]);

  useEffect(() => {
    localStorage.setItem('ainotes_focus_mode', String(focusMode));
  }, [focusMode]);

  useEffect(() => {
    saveNotes(notes);
  }, [notes]);

  useEffect(() => {
    setFocusedAnnotationId(null);
  }, [activeNoteId]);

  useEffect(() => {
    localStorage.setItem('ainotes_sort_order', sortOrder);
  }, [sortOrder]);

  const activeCount = useMemo(() => notes.filter((n) => !n.archived).length, [notes]);
  const archivedCount = useMemo(() => notes.filter((n) => Boolean(n.archived)).length, [notes]);

  const viewNotes = useMemo(() => {
    const filtered = notes.filter((n) =>
      archiveFilter === 'archived' ? Boolean(n.archived) : !n.archived
    );
    return [...filtered].sort((a, b) => {
      const aPinned = Boolean(a.pinned);
      const bPinned = Boolean(b.pinned);
      if (aPinned !== bPinned) {
        return aPinned ? -1 : 1;
      }

      if (sortOrder === 'updated-desc') {
        return (
          (b.updatedAt ?? 0) - (a.updatedAt ?? 0) ||
          a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
        );
      }
      if (sortOrder === 'updated-asc') {
        return (
          (a.updatedAt ?? 0) - (b.updatedAt ?? 0) ||
          a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
        );
      }
      if (sortOrder === 'alpha-asc') {
        return (
          a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }) ||
          (b.updatedAt ?? 0) - (a.updatedAt ?? 0)
        );
      }
      return (
        b.title.localeCompare(a.title, undefined, { sensitivity: 'base' }) ||
        (b.updatedAt ?? 0) - (a.updatedAt ?? 0)
      );
    });
  }, [notes, archiveFilter, sortOrder]);

  const nonArchivedNotes = useMemo(() => {
    const active = notes.filter((n) => !n.archived);
    return [...active].sort((a, b) => {
      const aPinned = Boolean(a.pinned);
      const bPinned = Boolean(b.pinned);
      if (aPinned !== bPinned) {
        return aPinned ? -1 : 1;
      }
      if (sortOrder === 'updated-desc') {
        return (
          (b.updatedAt ?? 0) - (a.updatedAt ?? 0) ||
          a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
        );
      }
      if (sortOrder === 'updated-asc') {
        return (
          (a.updatedAt ?? 0) - (b.updatedAt ?? 0) ||
          a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
        );
      }
      if (sortOrder === 'alpha-asc') {
        return (
          a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }) ||
          (b.updatedAt ?? 0) - (a.updatedAt ?? 0)
        );
      }
      return (
        b.title.localeCompare(a.title, undefined, { sensitivity: 'base' }) ||
        (b.updatedAt ?? 0) - (a.updatedAt ?? 0)
      );
    });
  }, [notes, sortOrder]);

  const activeNote = useMemo(() => {
    const exact = notes.find((n) => n.id === activeNoteId);
    if (exact && (archiveFilter === 'archived' ? Boolean(exact.archived) : !exact.archived)) {
      return exact;
    }
    return viewNotes[0] ?? null;
  }, [notes, activeNoteId, archiveFilter, viewNotes]);

  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const note of viewNotes) {
      for (const rawTag of note.tags ?? []) {
        const clean = rawTag.trim();
        if (!clean) continue;
        counts.set(clean, (counts.get(clean) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  }, [viewNotes]);

  const filteredNotes = useMemo(() => {
    if (!selectedTagFilter) return viewNotes;
    return viewNotes.filter((n) =>
      (n.tags ?? []).some((t) => t.toLowerCase() === selectedTagFilter.toLowerCase())
    );
  }, [viewNotes, selectedTagFilter]);

  const editorStats = useMemo(() => {
    const text = activeNote?.content ?? '';
    const trimmed = text.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const chars = text.length;
    const charsNoSpaces = text.replace(/\s/g, '').length;
    return { words, chars, charsNoSpaces };
  }, [activeNote?.content]);

  const libraryTagNames = useMemo(() => {
    const seen = new Map<string, string>();
    for (const note of notes) {
      for (const rawTag of note.tags ?? []) {
        const clean = rawTag.trim();
        if (!clean) continue;
        const lower = clean.toLowerCase();
        if (!seen.has(lower)) {
          seen.set(lower, clean);
        }
      }
    }
    return Array.from(seen.values());
  }, [notes]);

  const suggestedTags = useMemo(() => {
    if (!activeNote) return [];
    const dismissed = new Set(
      (dismissedSuggestionsByNote[activeNote.id] ?? []).map((t) => t.toLowerCase())
    );
    return suggestTagsForNote(
      activeNote.title,
      activeNote.content,
      activeNote.tags ?? []
    ).filter((tag) => !dismissed.has(tag.toLowerCase()));
  }, [activeNote, dismissedSuggestionsByNote]);

  useEffect(() => {
    setTagInput('');
    setPrettifyStatus(null);
    setSnapshotMenuOpen(false);
    setSnapshotFeedback(null);
    setShareFeedback(null);
    setAutocompleteState(null);
  }, [activeNoteId, isReadOnly]);

  useEffect(() => {
    return () => {
      if (prettifyTimerRef.current !== null) {
        window.clearTimeout(prettifyTimerRef.current);
      }
      if (snapshotTimerRef.current !== null) {
        window.clearTimeout(snapshotTimerRef.current);
      }
      if (shareTimerRef.current !== null) {
        window.clearTimeout(shareTimerRef.current);
      }
    };
  }, []);

  // Import shared note automatically when opened via a #share= link
  useEffect(() => {
    const shared = parseSharedNoteFromHash(window.location.hash);
    if (!shared || typeof shared.content !== 'string') return;
    const imported: NoteRecord = {
      id: `note-shared-${Date.now()}`,
      title: shared.title || 'Shared Note',
      content: shared.content,
      sourceType: shared.sourceType || 'md',
      language: shared.language || 'en',
      tags: shared.tags ?? [],
      updatedAt: Date.now(),
      archived: false,
    };
    setNotes((prev) => [imported, ...prev]);
    setArchiveFilter('active');
    setActiveNoteId(imported.id);
    setShowSplash(false);
    setActiveTab('studio');
    window.history.replaceState(
      null,
      '',
      window.location.pathname + window.location.search
    );
  }, []);

  const langMeta = getLanguageMeta(language);
  const strings = getUiStrings(language);

  const handleExportPdf = useCallback(async () => {
    if (!activeNote) return;
    setExportingPdf(true);
    try {
      await exportStructuredPdf(
        activeNote.title,
        activeNote.content,
        activeNote.language || language,
        activeNote.sourceType
      );
    } finally {
      setExportingPdf(false);
    }
  }, [activeNote, language]);

  const handleExportAllZip = async () => {
    if (nonArchivedNotes.length === 0) return;
    setExportMenuOpen(false);
    setExportingAll('zip');
    try {
      await exportNotesAsZip(nonArchivedNotes);
    } finally {
      setExportingAll(null);
    }
  };

  const handleExportAllPdf = async () => {
    if (nonArchivedNotes.length === 0) return;
    setExportMenuOpen(false);
    setExportingAll('pdf');
    try {
      await exportConsolidatedStudyGuidePdf(nonArchivedNotes);
    } finally {
      setExportingAll(null);
    }
  };

  const showShareNotice = (msg: string) => {
    if (shareTimerRef.current !== null) {
      window.clearTimeout(shareTimerRef.current);
    }
    setShareFeedback(msg);
    shareTimerRef.current = window.setTimeout(() => {
      setShareFeedback(null);
    }, 2600);
  };

  const handleShareNote = async () => {
    if (!activeNote) return;
    const shareUrl = buildShareableNoteUrl(activeNote);
    const sharePayload: ShareData = {
      title: activeNote.title,
      text: activeNote.content,
      url: shareUrl,
    };

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share(sharePayload);
        showShareNotice('Note shared');
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        // Fall through to clipboard fallback if blocked by iframe or unsupported URL size
      }
    }

    try {
      await navigator.clipboard.writeText(
        `${activeNote.title}\n\n${activeNote.content}\n\nShareable Link: ${shareUrl}`
      );
      showShareNotice('Copied snippet & link');
    } catch {
      showShareNotice('Share unavailable');
    }
  };

  // Global Rebindable Keyboard Shortcut Dispatcher
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const combo = formatKeyCombo(e);
      if (!combo) return;

      const matched = shortcuts.find((s) => s.keys === combo);
      if (!matched) return;

      const target = e.target as HTMLElement | null;
      const isEditingText =
        target &&
        (target.tagName === 'TEXTAREA' ||
          (target.tagName === 'INPUT' && !(target as HTMLInputElement).readOnly));

      if (matched.id === 'user-guide') {
        e.preventDefault();
        setUserGuideOpen(true);
        return;
      }

      if (isEditingText && !e.ctrlKey && !e.metaKey) return;

      if (matched.id === 'global-search') {
        e.preventDefault();
        setSearchModalOpen(true);
      } else if (matched.id === 'scan-capture') {
        e.preventDefault();
        setShowSplash(false);
        setActiveTab('scanner');
      } else if (matched.id === 'export-pdf') {
        e.preventDefault();
        void handleExportPdf();
      } else if (matched.id === 'ai-quiz') {
        e.preventDefault();
        setShowSplash(false);
        setActiveTab('study');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [shortcuts, handleExportPdf]);

  useEffect(() => {
    if (!newMenuOpen && !exportMenuOpen && !snapshotMenuOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (
        newMenuOpen &&
        newMenuRef.current &&
        !newMenuRef.current.contains(e.target as Node)
      ) {
        setNewMenuOpen(false);
      }
      if (
        exportMenuOpen &&
        exportMenuRef.current &&
        !exportMenuRef.current.contains(e.target as Node)
      ) {
        setExportMenuOpen(false);
      }
      if (
        snapshotMenuOpen &&
        snapshotMenuRef.current &&
        !snapshotMenuRef.current.contains(e.target as Node)
      ) {
        setSnapshotMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setNewMenuOpen(false);
        setExportMenuOpen(false);
        setSnapshotMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [newMenuOpen, exportMenuOpen, snapshotMenuOpen]);

  const handleCreateNote = (
    title = 'Untitled CS Note',
    content = `${title}\n${'*'.repeat(Math.max(3, title.length))}\n\nNotes\n=====\n`,
    sourceType: NoteRecord['sourceType'] = 'md',
    tags: string[] = []
  ) => {
    const initialTags =
      tags.length > 0 ? tags : selectedTagFilter ? [selectedTagFilter] : [];
    const created: NoteRecord = {
      id: `note-${Date.now()}`,
      title,
      content,
      sourceType,
      language,
      updatedAt: Date.now(),
      tags: initialTags,
      archived: false,
    };
    setNotes((prev) => [created, ...prev]);
    setArchiveFilter('active');
    setActiveNoteId(created.id);
    setNewlyCreatedNoteId(created.id);
    setShowSplash(false);
    setActiveTab('studio');
  };

  const handleCreateFromTemplate = (template: NoteTemplate) => {
    if (
      selectedTagFilter &&
      !template.tags.some((t) => t.toLowerCase() === selectedTagFilter.toLowerCase())
    ) {
      setSelectedTagFilter(null);
    }
    handleCreateNote(template.title, template.content, 'md', template.tags);
    setNewMenuOpen(false);
  };

  const handleUpdateActiveNote = (patch: Partial<NoteRecord>) => {
    if (!activeNote || isReadOnly) return;
    setNotes((prev) =>
      prev.map((n) =>
        n.id === activeNote.id ? { ...n, ...patch, updatedAt: Date.now() } : n
      )
    );
  };

  const showSnapshotNotice = (msg: string) => {
    if (snapshotTimerRef.current !== null) {
      window.clearTimeout(snapshotTimerRef.current);
    }
    setSnapshotFeedback(msg);
    snapshotTimerRef.current = window.setTimeout(() => {
      setSnapshotFeedback(null);
    }, 2400);
  };

  const handleSaveSnapshot = () => {
    if (!activeNote) return;
    const newSnapshot: NoteSnapshot = {
      id: `snap-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: activeNote.title,
      content: activeNote.content,
      createdAt: Date.now(),
    };
    setNotes((prev) =>
      prev.map((n) =>
        n.id === activeNote.id
          ? {
              ...n,
              snapshots: [newSnapshot, ...(n.snapshots ?? [])].slice(0, 25),
            }
          : n
      )
    );
    showSnapshotNotice('Snapshot saved');
  };

  const handleRestoreSnapshot = (snapshot: NoteSnapshot) => {
    if (!activeNote || isReadOnly) return;
    setNotes((prev) =>
      prev.map((n) =>
        n.id === activeNote.id
          ? {
              ...n,
              title: snapshot.title,
              content: snapshot.content,
              updatedAt: Date.now(),
            }
          : n
      )
    );
    setSnapshotMenuOpen(false);
    showSnapshotNotice('Version restored');
  };

  const handleListenToNote = () => {
    if (!activeNote) return;
    const isReadingThisNote =
      toolbarTts.state !== 'idle' &&
      (ttsSpeakingNoteId === null || ttsSpeakingNoteId === activeNote.id);

    if (isReadingThisNote && toolbarTts.state === 'playing') {
      ttsService.pause();
      return;
    }
    if (isReadingThisNote && toolbarTts.state === 'paused') {
      ttsService.resume();
      return;
    }

    const plainText = extractPlainTextForTts(activeNote.content);
    if (!plainText.trim()) return;
    setTtsSpeakingNoteId(activeNote.id);
    void ttsService.speak(plainText, activeNote.language || language, {
      title: activeNote.title,
    });
  };

  const handleDeleteSnapshot = (snapshotId: string) => {
    if (!activeNote) return;
    setNotes((prev) =>
      prev.map((n) =>
        n.id === activeNote.id
          ? {
              ...n,
              snapshots: (n.snapshots ?? []).filter((s) => s.id !== snapshotId),
            }
          : n
      )
    );
  };

  const handleContentChangeWithAnnotations = (
    nextContent: string,
    selectionStart: number | null,
    selectionEnd: number | null
  ) => {
    if (!activeNote || isReadOnly) return;
    const currentAnns = activeNote.annotations ?? [];
    if (currentAnns.length > 0) {
      const oldLines = activeNote.content.replace(/\r\n/g, '\n').split('\n');
      const newLines = nextContent.replace(/\r\n/g, '\n').split('\n');
      const delta = newLines.length - oldLines.length;
      if (delta !== 0) {
        let firstDiff = 0;
        const minLen = Math.min(oldLines.length, newLines.length);
        while (firstDiff < minLen && oldLines[firstDiff] === newLines[firstDiff]) {
          firstDiff++;
        }
        const shifted = currentAnns.map((ann) => {
          if (ann.lineNumber - 1 > firstDiff) {
            return {
              ...ann,
              lineNumber: Math.max(
                1,
                Math.min(newLines.length, ann.lineNumber + delta)
              ),
            };
          }
          return {
            ...ann,
            lineNumber: Math.max(1, Math.min(newLines.length, ann.lineNumber)),
          };
        });
        handleUpdateActiveNote({ content: nextContent, annotations: shifted });
      } else {
        handleUpdateActiveNote({ content: nextContent });
      }
    } else {
      handleUpdateActiveNote({ content: nextContent });
    }
    updateAutocompleteForCursor(nextContent, selectionStart, selectionEnd);
  };

  const handleAddAnnotation = (
    draft: Omit<NoteAnnotation, 'id' | 'createdAt'>
  ): NoteAnnotation | null => {
    if (!activeNote || isReadOnly) return null;
    const created: NoteAnnotation = {
      ...draft,
      id: `ann-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: Date.now(),
    };
    handleUpdateActiveNote({
      annotations: [...(activeNote.annotations ?? []), created].sort(
        (a, b) => a.lineNumber - b.lineNumber
      ),
    });
    return created;
  };

  const handleUpdateAnnotation = (
    annotationId: string,
    patch: Partial<Pick<NoteAnnotation, 'text' | 'color' | 'anchorText'>>
  ) => {
    if (!activeNote || isReadOnly) return;
    handleUpdateActiveNote({
      annotations: (activeNote.annotations ?? []).map((ann) =>
        ann.id === annotationId ? { ...ann, ...patch } : ann
      ),
    });
  };

  const handleDeleteAnnotation = (annotationId: string) => {
    if (!activeNote || isReadOnly) return;
    handleUpdateActiveNote({
      annotations: (activeNote.annotations ?? []).filter(
        (ann) => ann.id !== annotationId
      ),
    });
  };

  const handlePrettifyCode = () => {
    if (!activeNote || isReadOnly) return;
    const { formattedContent, blocksFormatted, detectedLanguages } =
      prettifyCodeInNote(activeNote.content, activeNote.sourceType);

    if (prettifyTimerRef.current !== null) {
      window.clearTimeout(prettifyTimerRef.current);
    }

    if (blocksFormatted === 0) {
      setPrettifyStatus('No code blocks found');
    } else {
      if (formattedContent !== activeNote.content) {
        handleUpdateActiveNote({ content: formattedContent });
      }
      const langLabel = detectedLanguages.join(', ');
      setPrettifyStatus(
        formattedContent !== activeNote.content
          ? `Formatted ${langLabel}`
          : `${langLabel} already clean`
      );
    }

    prettifyTimerRef.current = window.setTimeout(() => {
      setPrettifyStatus(null);
    }, 2600);
  };

  const handleAddTagToActiveNote = (rawValue: string) => {
    if (!activeNote || isReadOnly) return;
    const candidates = rawValue
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    if (candidates.length === 0) return;

    const existing = activeNote.tags ?? [];
    const existingLower = new Set(existing.map((t) => t.toLowerCase()));
    const nextTags = [...existing];
    for (const c of candidates) {
      if (!existingLower.has(c.toLowerCase())) {
        nextTags.push(c);
        existingLower.add(c.toLowerCase());
      }
    }
    handleUpdateActiveNote({ tags: nextTags });
    setTagInput('');
  };

  const handleApplyAllSuggestedTags = () => {
    if (!activeNote || isReadOnly || suggestedTags.length === 0) return;
    const existing = activeNote.tags ?? [];
    const existingLower = new Set(existing.map((t) => t.toLowerCase()));
    const merged = [...existing];
    for (const s of suggestedTags) {
      if (!existingLower.has(s.toLowerCase())) {
        merged.push(s);
        existingLower.add(s.toLowerCase());
      }
    }
    handleUpdateActiveNote({ tags: merged });
  };

  const updateAutocompleteForCursor = (
    content: string,
    cursorStart: number | null,
    cursorEnd: number | null
  ) => {
    if (
      !activeNote ||
      isReadOnly ||
      cursorStart === null ||
      cursorEnd === null ||
      cursorStart !== cursorEnd
    ) {
      setAutocompleteState(null);
      return;
    }

    const textBefore = content.slice(0, cursorStart);
    const match = textBefore.match(/([\p{L}\p{N}_-]+)$/u);
    if (!match || match[1].length < 2) {
      setAutocompleteState(null);
      return;
    }

    const prefix = match[1];
    const startIndex = cursorStart - prefix.length;
    const suggestions = getAutocompleteSuggestions({
      prefix,
      noteLanguage: activeNote.language,
      noteTags: activeNote.tags ?? [],
      libraryTags: libraryTagNames,
      noteContent: content,
    });

    if (suggestions.length === 0) {
      setAutocompleteState(null);
      return;
    }

    setAutocompleteState({
      prefix,
      startIndex,
      endIndex: cursorStart,
      suggestions,
      selectedIndex: 0,
    });
  };

  const applyAutocompleteSuggestion = (suggestion: AutocompleteSuggestion) => {
    if (!activeNote || !autocompleteState || isReadOnly) return;
    const { startIndex, endIndex } = autocompleteState;
    const nextContent =
      activeNote.content.slice(0, startIndex) +
      suggestion.term +
      activeNote.content.slice(endIndex);
    const nextCaretPos = startIndex + suggestion.term.length;
    handleUpdateActiveNote({ content: nextContent });
    setAutocompleteState(null);

    window.requestAnimationFrame(() => {
      const textarea = editorTextareaRef.current;
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(nextCaretPos, nextCaretPos);
      }
    });
  };

  const handleDismissSuggestedTags = (tagsToDismiss: string[]) => {
    if (!activeNote || tagsToDismiss.length === 0) return;
    setDismissedSuggestionsByNote((prev) => ({
      ...prev,
      [activeNote.id]: Array.from(
        new Set([...(prev[activeNote.id] ?? []), ...tagsToDismiss])
      ),
    }));
  };

  const handleRemoveTagFromActiveNote = (tagToRemove: string) => {
    if (!activeNote) return;
    const nextTags = (activeNote.tags ?? []).filter((t) => t !== tagToRemove);
    handleUpdateActiveNote({ tags: nextTags });
  };

  const handleToggleTagFilter = (tag: string) => {
    setSelectedTagFilter((prev) =>
      prev && prev.toLowerCase() === tag.toLowerCase() ? null : tag
    );
  };

  const handleDuplicateNote = (id: string) => {
    const source = notes.find((n) => n.id === id);
    if (!source) return;
    const duplicate: NoteRecord = {
      ...source,
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: `${source.title} (Copy)`,
      tags: [...(source.tags ?? [])],
      annotations: (source.annotations ?? []).map((ann, idx) => ({
        ...ann,
        id: `ann-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 5)}`,
      })),
      pinned: false,
      updatedAt: Date.now(),
    };
    setNotes((prev) => [duplicate, ...prev]);
    setActiveNoteId(duplicate.id);
    setActiveTab('studio');
  };

  const handleTogglePinNote = (id: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n))
    );
  };

  const handleToggleArchiveNote = (id: string) => {
    const target = notes.find((n) => n.id === id);
    if (!target) return;
    const nextArchived = !target.archived;
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, archived: nextArchived, updatedAt: Date.now() } : n
      )
    );
    if (id === activeNote?.id) {
      const remainingInView = viewNotes.filter((n) => n.id !== id);
      if (remainingInView.length > 0) {
        setActiveNoteId(remainingInView[0].id);
      }
    }
  };

  const handleSwitchArchiveFilter = (nextView: 'active' | 'archived') => {
    setArchiveFilter(nextView);
    setSelectedTagFilter(null);
    const firstMatch = notes.find((n) =>
      nextView === 'archived' ? Boolean(n.archived) : !n.archived
    );
    if (firstMatch) {
      setActiveNoteId(firstMatch.id);
    }
  };

  const handleDeleteNote = (id: string) => {
    setNotes((prev) => {
      const next = prev.filter((n) => n.id !== id);
      if (id === activeNoteId && next.length > 0) {
        setActiveNoteId(next[0].id);
      }
      return next;
    });
  };

  const handleRecognizedText = (
    extractedText: string,
    titleHint: string,
    detectedLangs: string[]
  ) => {
    handleCreateNote(titleHint, extractedText, 'scan', detectedLangs);
  };

  const handleQuickTextFileUpload = async (file: File) => {
    const text = await readFileAsText(file);
    const title = file.name.replace(/\.[^/.]+$/, '');
    handleCreateNote(title, text, inferSourceType(file.name));
  };

  const handleExplainCodeFromPreview = (code: string, codeLang: string) => {
    setPendingCodeSnippet({ code, language: codeLang });
    setActiveTab('study');
  };

  const searchBinding = shortcuts.find((s) => s.id === 'global-search')?.keys ?? 'Ctrl+K';

  if (showSplash) {
    return (
      <>
        <SplashScreen
          language={language}
          onLanguageChange={setLanguage}
          onOpenUserGuide={() => setUserGuideOpen(true)}
          onOpenInstallModal={() => setInstallModalOpen(true)}
          onEnterWorkspace={(tab) => {
            setShowSplash(false);
            setActiveTab(tab);
          }}
        />
        <UserGuideModal
          isOpen={userGuideOpen}
          onClose={() => setUserGuideOpen(false)}
          initialLang={language}
        />
        <InstallModal
          isOpen={installModalOpen}
          onClose={() => setInstallModalOpen(false)}
        />
      </>
    );
  }

  return (
    <div
      dir={langMeta.dir}
      lang={langMeta.code}
      className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
    >
      {/* Top 3-Zone Navigation Bar */}
      <header className="w-full border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
        <div className="max-w-[1440px] mx-auto px-5 py-3 flex items-center justify-between gap-8">
          {/* Zone 1: Single-Line Wordmark */}
          <button
            type="button"
            onClick={() => setShowSplash(true)}
            className="text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 font-display"
          >
            AInotes
          </button>

          {/* Zone 2: 5 Concise Single-Line Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            {(
              [
                { id: 'studio', label: strings.studioTab },
                { id: 'canvas', label: strings.canvasTab },
                { id: 'scanner', label: strings.scannerTab },
                { id: 'study', label: strings.studyTab },
                { id: 'shortcuts', label: strings.shortcutsTab },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap shrink-0 transition-colors pb-0.5 ${
                  activeTab === tab.id
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => void handleExportPdf()}
              disabled={!activeNote || exportingPdf}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50 text-xs font-medium transition-colors whitespace-nowrap shrink-0"
            >
              {exportingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileDown className="w-3.5 h-3.5" />
              )}
              {strings.exportPdf}
            </button>
          </div>
        </div>

        {/* Mobile Nav Strip */}
        <div className="flex md:hidden items-center gap-2 px-4 pb-2.5 overflow-x-auto">
          {(
            [
              { id: 'studio', label: strings.studioTab },
              { id: 'canvas', label: strings.canvasTab },
              { id: 'scanner', label: strings.scannerTab },
              { id: 'study', label: strings.studyTab },
              { id: 'shortcuts', label: strings.shortcutsTab },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Secondary Workspace Utility Toolbar */}
      <div className="w-full border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/50">
        <div className="max-w-[1440px] mx-auto px-5 py-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSearchModalOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-600 dark:text-slate-300 hover:border-blue-500 transition-colors whitespace-nowrap shrink-0"
            >
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span>Search Notes & Code</span>
              <span className="font-mono text-[11px] text-slate-400">{searchBinding}</span>
            </button>

            <button
              type="button"
              onClick={() => handleCreateNote()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              {strings.newNote}
            </button>

            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap shrink-0">
              <FileUp className="w-3.5 h-3.5" />
              <span>{strings.importDocs}</span>
              <input
                type="file"
                accept=".txt,.md,.mdx,.markdown,.py,.ts,.js,.rs,.sql"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleQuickTextFileUpload(file);
                }}
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeNote && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    printVectorPdf(
                      activeNote.title,
                      activeNote.content,
                      activeNote.language || language,
                      activeNote.sourceType
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
                  title="Print or Save Selectable Vector PDF"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Vector PDF
                </button>
                <button
                  type="button"
                  onClick={() =>
                    exportTypstSource(
                      activeNote.title,
                      activeNote.content,
                      activeNote.language || language
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
                  title="Download Typst (.typ) source"
                >
                  .typ
                </button>
              </>
            )}

            <label className="inline-flex items-center gap-1.5 text-xs">
              <Globe className="w-3.5 h-3.5 text-slate-500" />
              <select
                aria-label="Workspace Language"
                value={language}
                onChange={(e) => setLanguage(e.target.value as SupportedLangCode)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100"
              >
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.nativeName} ({l.code})
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={() => setUserGuideOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 whitespace-nowrap shrink-0"
            >
              <BookOpen className="w-3.5 h-3.5" />
              {strings.userGuide}
            </button>

            <button
              type="button"
              onClick={() => {
                if (isInstallable && !isInstalled) {
                  void install();
                } else {
                  setInstallModalOpen(true);
                }
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              {isInstallable && !isInstalled ? strings.installApp : 'Install'}
            </button>

            <button
              type="button"
              onClick={() => setDarkMode((d) => !d)}
              aria-label="Toggle Light or Dark Theme"
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-5 py-5 flex flex-col gap-5">
        {activeTab === 'studio' && (
          <div className="grid lg:grid-cols-12 gap-5 flex-1">
            {/* Left Sidebar: Saved Notes Library + Active/Archived Filter + Tag Filters */}
            {(!focusMode || !activeNote) && (
              <aside className="lg:col-span-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col overflow-hidden max-h-[78vh]">
              <div className="px-3.5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-900 dark:text-white tabular-nums truncate min-w-0">
                  Notebook Library ({filteredNotes.length}
                  {selectedTagFilter ? ` / ${viewNotes.length}` : ''})
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <div ref={exportMenuRef} className="relative shrink-0">
                    <button
                      type="button"
                      aria-haspopup="menu"
                      aria-expanded={exportMenuOpen}
                      disabled={nonArchivedNotes.length === 0 || exportingAll !== null}
                      onClick={() => {
                        setNewMenuOpen(false);
                        setExportMenuOpen((prev) => !prev);
                      }}
                      title="Export All Notes (ZIP or Study Guide PDF)"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0"
                    >
                      {exportingAll ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Download className="w-3 h-3" />
                      )}
                      {exportingAll === 'pdf'
                        ? 'PDF...'
                        : exportingAll === 'zip'
                        ? 'ZIP...'
                        : 'Export All'}
                      <ChevronDown
                        className={`w-3 h-3 transition-transform ${
                          exportMenuOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {exportMenuOpen && (
                      <div
                        role="menu"
                        aria-label="Export all notes options"
                        className="absolute end-0 top-full mt-1.5 w-64 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg py-1.5 z-30"
                      >
                        <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                          Export All Active Notes ({nonArchivedNotes.length})
                        </div>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => void handleExportAllZip()}
                          className="w-full px-3 py-2 text-start flex items-start gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
                        >
                          <Download className="w-4 h-4 mt-0.5 text-blue-600 dark:text-blue-400 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold text-slate-900 dark:text-white">
                              ZIP Archive (.zip)
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              All non-archived notes + README index
                            </div>
                          </div>
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => void handleExportAllPdf()}
                          className="w-full px-3 py-2 text-start flex items-start gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
                        >
                          <FileDown className="w-4 h-4 mt-0.5 text-blue-600 dark:text-blue-400 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold text-slate-900 dark:text-white">
                              Consolidated PDF Study Guide
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              Cover TOC + formatted multi-page PDF
                            </div>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>

                  <div ref={newMenuRef} className="relative shrink-0">
                    <button
                      type="button"
                      aria-haspopup="menu"
                      aria-expanded={newMenuOpen}
                      onClick={() => {
                        setExportMenuOpen(false);
                        setNewMenuOpen((prev) => !prev);
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors whitespace-nowrap shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      New
                      <ChevronDown
                        className={`w-3 h-3 transition-transform ${
                          newMenuOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                  {newMenuOpen && (
                    <div
                      role="menu"
                      aria-label="New note templates"
                      className="absolute end-0 top-full mt-1.5 w-64 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg py-1.5 z-30"
                    >
                      <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Select Note Template
                      </div>
                      {CS_NOTE_TEMPLATES.map((template, index) => {
                        const TemplateIcon =
                          template.id === 'algorithm-analysis'
                            ? Cpu
                            : template.id === 'code-reference'
                            ? Code2
                            : template.id === 'lecture-notes'
                            ? BookOpen
                            : template.id === 'project-planning'
                            ? ClipboardList
                            : FilePlus;
                        return (
                          <React.Fragment key={template.id}>
                            {index === 1 && (
                              <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                            )}
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => handleCreateFromTemplate(template)}
                              className="w-full px-3 py-2 text-start flex items-start gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
                            >
                              <TemplateIcon className="w-4 h-4 mt-0.5 text-blue-600 dark:text-blue-400 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-semibold text-slate-900 dark:text-white">
                                  {template.name}
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                  {template.description}
                                </div>
                              </div>
                            </button>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  )}
                  </div>
                </div>
              </div>

              {/* Active vs Archived Filter View */}
              <div className="px-3.5 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
                <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => handleSwitchArchiveFilter('active')}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 tabular-nums ${
                      archiveFilter === 'active'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Active ({activeCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchArchiveFilter('archived')}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 tabular-nums inline-flex items-center justify-center gap-1.5 ${
                      archiveFilter === 'archived'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Archive className="w-3 h-3" />
                    Archived ({archivedCount})
                  </button>
                </div>
              </div>

              {/* Sort Order Dropdown */}
              <div className="px-3.5 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-2">
                <label
                  htmlFor="library-sort-select"
                  className="text-[11px] font-medium text-slate-500 dark:text-slate-400 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <ArrowUpDown className="w-3 h-3" />
                  Sort by
                </label>
                <select
                  id="library-sort-select"
                  aria-label="Sort notes"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as NoteSortOption)}
                  className="flex-1 min-w-0 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                >
                  <option value="updated-desc">Updated Date (Newest first)</option>
                  <option value="updated-asc">Updated Date (Oldest first)</option>
                  <option value="alpha-asc">Alphabetical (A–Z)</option>
                  <option value="alpha-desc">Alphabetical (Z–A)</option>
                </select>
              </div>

              {/* Clickable Tag Filter Bar */}
              {allTags.length > 0 && (
                <div className="px-3.5 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      Filter by label
                    </span>
                    {selectedTagFilter && (
                      <button
                        type="button"
                        onClick={() => setSelectedTagFilter(null)}
                        className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0"
                      >
                        Clear filter
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedTagFilter(null)}
                      className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 tabular-nums ${
                        selectedTagFilter === null
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                          : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400'
                      }`}
                    >
                      All ({viewNotes.length})
                    </button>
                    {allTags.map(({ tag, count }) => {
                      const isSelected =
                        selectedTagFilter?.toLowerCase() === tag.toLowerCase();
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleToggleTagFilter(tag)}
                          className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 tabular-nums ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-400'
                          }`}
                        >
                          {tag} ({count})
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800">
                {filteredNotes.length === 0 ? (
                  <div className="p-5 text-center space-y-2.5">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {selectedTagFilter
                        ? `No ${archiveFilter} notes labeled "${selectedTagFilter}".`
                        : archiveFilter === 'archived'
                        ? 'No archived notes yet. Move finished notes to Archive to keep your workspace focused.'
                        : 'All notes are currently archived.'}
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {selectedTagFilter ? (
                        <button
                          type="button"
                          onClick={() => setSelectedTagFilter(null)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          Show all {archiveFilter}
                        </button>
                      ) : archiveFilter === 'active' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleCreateNote()}
                            className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-medium"
                          >
                            + New Note
                          </button>
                          {archivedCount > 0 && (
                            <button
                              type="button"
                              onClick={() => handleSwitchArchiveFilter('archived')}
                              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                              View Archived ({archivedCount})
                            </button>
                          )}
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSwitchArchiveFilter('active')}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          Back to Active ({activeCount})
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  filteredNotes.map((n) => {
                    const isActive = n.id === activeNote?.id;
                    const noteTags = n.tags ?? [];
                    return (
                      <div
                        key={n.id}
                        className={`group px-4 py-3 transition-colors space-y-1.5 ${
                          isActive
                            ? 'bg-blue-50/70 dark:bg-blue-950/30'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setActiveNoteId(n.id)}
                            className="flex-1 text-start min-w-0"
                          >
                            <div className="text-xs font-semibold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                              {n.pinned && (
                                <Pin
                                  aria-hidden="true"
                                  className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0"
                                />
                              )}
                              <span className="truncate">{n.title}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                              {n.pinned && (
                                <>
                                  <span className="font-medium text-amber-600 dark:text-amber-400">
                                    Pinned
                                  </span>
                                  <span aria-hidden="true">·</span>
                                </>
                              )}
                              <span className="font-mono uppercase">{n.sourceType}</span>
                              <span aria-hidden="true">·</span>
                              <span>{n.language}</span>
                            </div>
                          </button>
                          <div
                            className={`flex items-center gap-0.5 shrink-0 transition-opacity ${
                              isActive || n.pinned
                                ? 'opacity-100'
                                : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'
                            }`}
                          >
                            <button
                              type="button"
                              aria-pressed={Boolean(n.pinned)}
                              onClick={() => handleTogglePinNote(n.id)}
                              title={n.pinned ? 'Unpin Note' : 'Pin Note to Top'}
                              aria-label={
                                n.pinned
                                  ? `Unpin ${n.title}`
                                  : `Pin ${n.title} to top`
                              }
                              className={`p-1 rounded transition-colors ${
                                n.pinned
                                  ? 'text-amber-500 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300'
                                  : 'text-slate-400 hover:text-amber-500 dark:hover:text-amber-400'
                              }`}
                            >
                              <Pin
                                className={`w-3.5 h-3.5 ${
                                  n.pinned ? 'fill-current' : ''
                                }`}
                              />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDuplicateNote(n.id)}
                              title="Duplicate Note"
                              aria-label={`Duplicate ${n.title}`}
                              className="p-1 rounded text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleArchiveNote(n.id)}
                              title={n.archived ? 'Restore from Archive' : 'Move to Archive'}
                              aria-label={
                                n.archived
                                  ? `Restore ${n.title} from Archive`
                                  : `Move ${n.title} to Archive`
                              }
                              className="p-1 rounded text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                            >
                              {n.archived ? (
                                <ArchiveRestore className="w-3.5 h-3.5" />
                              ) : (
                                <Archive className="w-3.5 h-3.5" />
                              )}
                            </button>
                            {notes.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleDeleteNote(n.id)}
                                title="Delete permanently"
                                aria-label={`Delete ${n.title}`}
                                className="p-1 rounded text-slate-400 hover:text-rose-600"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {noteTags.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {noteTags.map((tag) => {
                              const isTagActive =
                                selectedTagFilter?.toLowerCase() === tag.toLowerCase();
                              return (
                                <button
                                  key={tag}
                                  type="button"
                                  onClick={() => handleToggleTagFilter(tag)}
                                  title={`Filter notes by "${tag}"`}
                                  className={`px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                                    isTagActive
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950/50 dark:hover:text-blue-300'
                                  }`}
                                >
                                  #{tag}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </aside>
            )}

            {/* Center: Split Editor & Live AST Preview (or Distraction-Free Focus Mode) */}
            <section
              className={
                focusMode && activeNote
                  ? 'lg:col-span-12 max-w-4xl w-full mx-auto flex flex-col gap-3'
                  : 'lg:col-span-6 flex flex-col gap-3'
              }
            >
              {activeNote ? (
                <>
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                      <input
                        type="text"
                        aria-label="Note Title"
                        value={activeNote.title}
                        disabled={isReadOnly}
                        readOnly={isReadOnly}
                        onChange={(e) => handleUpdateActiveNote({ title: e.target.value })}
                        className="flex-1 min-w-[160px] bg-transparent text-sm font-semibold text-slate-900 dark:text-white focus:outline-none disabled:opacity-75 disabled:cursor-not-allowed"
                      />
                      <select
                        aria-label="Note Document Language"
                        value={activeNote.language}
                        disabled={isReadOnly}
                        onChange={(e) =>
                          handleUpdateActiveNote({
                            language: e.target.value as SupportedLangCode,
                          })
                        }
                        className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {SUPPORTED_LANGUAGES.map((l) => (
                          <option key={l.code} value={l.code}>
                            {l.nativeName} ({l.code})
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        aria-pressed={focusMode}
                        onClick={() => setFocusMode((prev) => !prev)}
                        title={
                          focusMode
                            ? 'Exit Focus Mode and show sidebar & AST preview'
                            : 'Hide sidebar and AST preview for distraction-free writing'
                        }
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                          focusMode
                            ? 'border-blue-500 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-950/60'
                            : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {focusMode ? (
                          <>
                            <Minimize2 className="w-3.5 h-3.5" />
                            Exit Focus Mode
                          </>
                        ) : (
                          <>
                            <Maximize2 className="w-3.5 h-3.5" />
                            Focus Mode
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        aria-pressed={isReadOnly}
                        onClick={() => setIsReadOnly((prev) => !prev)}
                        title={
                          isReadOnly
                            ? 'Unlock note for editing'
                            : 'Lock note as read-only while studying'
                        }
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                          isReadOnly
                            ? 'border-amber-500/70 text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-950/60'
                            : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {isReadOnly ? (
                          <>
                            <Lock className="w-3.5 h-3.5" />
                            Read-Only (Unlock)
                          </>
                        ) : (
                          <>
                            <Unlock className="w-3.5 h-3.5" />
                            Toggle Read-Only
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleSaveSnapshot}
                        title="Save a version snapshot of the current note"
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        Save Snapshot
                      </button>

                      <div ref={snapshotMenuRef} className="relative shrink-0">
                        <button
                          type="button"
                          aria-haspopup="menu"
                          aria-expanded={snapshotMenuOpen}
                          disabled={(activeNote.snapshots?.length ?? 0) === 0}
                          onClick={() => setSnapshotMenuOpen((prev) => !prev)}
                          title={
                            (activeNote.snapshots?.length ?? 0) === 0
                              ? 'Save a snapshot first to restore previous versions'
                              : 'Restore a previously saved snapshot'
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 tabular-nums"
                        >
                          <History className="w-3.5 h-3.5" />
                          Restore Snapshot ({activeNote.snapshots?.length ?? 0})
                          <ChevronDown
                            className={`w-3 h-3 transition-transform ${
                              snapshotMenuOpen ? 'rotate-180' : ''
                            }`}
                          />
                        </button>

                        {snapshotMenuOpen && (
                          <div
                            role="menu"
                            aria-label="Saved note snapshots"
                            className="absolute end-0 top-full mt-1.5 w-72 sm:w-80 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg py-1.5 z-30 max-h-72 overflow-y-auto"
                          >
                            <div className="px-3 py-1 flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                              <span>
                                Saved Versions ({activeNote.snapshots?.length ?? 0})
                              </span>
                              {isReadOnly && (
                                <span className="text-amber-600 dark:text-amber-400">
                                  Read-Only Locked
                                </span>
                              )}
                            </div>
                            {(activeNote.snapshots ?? []).map((snap, idx) => {
                              const formattedTime = new Date(
                                snap.createdAt
                              ).toLocaleString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              });
                              const wordLen = snap.content.trim()
                                ? snap.content.trim().split(/\s+/).length
                                : 0;
                              const versionNumber =
                                (activeNote.snapshots?.length ?? 0) - idx;
                              return (
                                <div
                                  key={snap.id}
                                  className="px-3 py-2 flex items-start justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/80 border-b last:border-b-0 border-slate-100 dark:border-slate-800/60"
                                >
                                  <button
                                    type="button"
                                    role="menuitem"
                                    disabled={isReadOnly}
                                    onClick={() => handleRestoreSnapshot(snap)}
                                    className="flex-1 text-start min-w-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    <div className="text-xs font-semibold text-slate-900 dark:text-white truncate flex items-center justify-between gap-2">
                                      <span className="truncate">
                                        v{versionNumber} · {snap.title || 'Untitled'}
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                                      {formattedTime} · {wordLen} words ·{' '}
                                      {snap.content.length} chars
                                    </div>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSnapshot(snap.id)}
                                    title="Delete snapshot"
                                    aria-label={`Delete snapshot v${versionNumber}`}
                                    className="p-1 rounded text-slate-400 hover:text-rose-600 shrink-0"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {snapshotFeedback && (
                        <span
                          role="status"
                          className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap shrink-0"
                        >
                          {snapshotFeedback}
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => void handleShareNote()}
                        title="Share note snippet or shareable link"
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        Share Note
                      </button>

                      {shareFeedback && (
                        <span
                          role="status"
                          className="text-[11px] font-medium text-blue-600 dark:text-blue-400 whitespace-nowrap shrink-0"
                        >
                          {shareFeedback}
                        </span>
                      )}

                      {(() => {
                        const isReadingActiveNote =
                          toolbarTts.state !== 'idle' &&
                          (ttsSpeakingNoteId === null ||
                            ttsSpeakingNoteId === activeNote.id);
                        const isPlayingThis =
                          isReadingActiveNote && toolbarTts.state === 'playing';
                        const isPausedThis =
                          isReadingActiveNote && toolbarTts.state === 'paused';

                        return (
                          <div className="inline-flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              aria-pressed={isReadingActiveNote}
                              onClick={handleListenToNote}
                              disabled={!activeNote.content.trim()}
                              title={
                                isPlayingThis
                                  ? 'Pause note audio playback'
                                  : isPausedThis
                                  ? 'Resume reading note aloud'
                                  : 'Listen to this note aloud using Web Speech API'
                              }
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
                                isReadingActiveNote
                                  ? 'border-blue-500 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-950/60'
                                  : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                            >
                              {isPlayingThis ? (
                                <>
                                  <Pause className="w-3.5 h-3.5" />
                                  Pause Audio
                                </>
                              ) : isPausedThis ? (
                                <>
                                  <Play className="w-3.5 h-3.5" />
                                  Resume Audio
                                </>
                              ) : (
                                <>
                                  <Volume2 className="w-3.5 h-3.5" />
                                  Listen to Note
                                </>
                              )}
                            </button>
                            {isReadingActiveNote && (
                              <button
                                type="button"
                                onClick={() => ttsService.stop()}
                                title="Stop reading note aloud"
                                aria-label="Stop reading note aloud"
                                className="inline-flex items-center justify-center p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                              >
                                <Square className="w-3 h-3" />
                              </button>
                            )}
                            {toolbarTts.error && (
                              <span
                                role="status"
                                className="text-[11px] font-medium text-rose-600 dark:text-rose-400 whitespace-nowrap"
                              >
                                {toolbarTts.error}
                              </span>
                            )}
                          </div>
                        );
                      })()}

                      <button
                        type="button"
                        onClick={() => exportNoteAsMarkdown(activeNote)}
                        title="Download this note, code blocks, and sticky annotations as a clean .md file"
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                        Export as Markdown
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleArchiveNote(activeNote.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                          activeNote.archived
                            ? 'border-blue-500 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-950/60'
                            : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {activeNote.archived ? (
                          <>
                            <ArchiveRestore className="w-3.5 h-3.5" />
                            Restore Note
                          </>
                        ) : (
                          <>
                            <Archive className="w-3.5 h-3.5" />
                            Move to Archive
                          </>
                        )}
                      </button>
                    </div>

                    {/* Custom Labels / Tags Manager for Active Note */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 shrink-0">
                        <Tag className="w-3.5 h-3.5" />
                        Labels:
                      </span>

                      {(activeNote.tags ?? []).map((tag) => {
                        const isFilteredByThis =
                          selectedTagFilter?.toLowerCase() === tag.toLowerCase();
                        return (
                          <span
                            key={tag}
                            className={`inline-flex items-center gap-1 rounded-md border text-xs transition-colors ${
                              isFilteredByThis
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => handleToggleTagFilter(tag)}
                              title={`Filter sidebar by "${tag}"`}
                              className={`py-0.5 font-medium hover:text-blue-600 dark:hover:text-blue-400 whitespace-nowrap ${
                                isReadOnly ? 'px-2' : 'ps-2'
                              }`}
                            >
                              {tag}
                            </button>
                            {!isReadOnly && (
                              <button
                                type="button"
                                onClick={() => handleRemoveTagFromActiveNote(tag)}
                                aria-label={`Remove label ${tag}`}
                                className="pe-1.5 py-0.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </span>
                        );
                      })}

                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleAddTagToActiveNote(tagInput);
                        }}
                        className="inline-flex items-center gap-1.5"
                      >
                        <input
                          type="text"
                          value={tagInput}
                          disabled={isReadOnly}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === ',') {
                              e.preventDefault();
                              handleAddTagToActiveNote(tagInput);
                            }
                          }}
                          placeholder={isReadOnly ? 'Editing locked' : 'Add label...'}
                          aria-label="Add custom label or tag"
                          className="w-28 sm:w-32 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <button
                          type="submit"
                          disabled={isReadOnly || !tagInput.trim()}
                          className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap shrink-0"
                        >
                          + Add
                        </button>
                      </form>

                      {/* Quick-apply existing tags not yet on this note */}
                      {!isReadOnly &&
                        allTags
                          .filter(
                            (item) =>
                              !(activeNote.tags ?? []).some(
                                (t) => t.toLowerCase() === item.tag.toLowerCase()
                              ) &&
                              !suggestedTags.some(
                                (s) => s.toLowerCase() === item.tag.toLowerCase()
                              )
                          )
                          .slice(0, 4)
                          .map((item) => (
                            <button
                              key={item.tag}
                              type="button"
                              onClick={() => handleAddTagToActiveNote(item.tag)}
                              title={`Apply existing label "${item.tag}"`}
                              className="px-2 py-0.5 rounded-md border border-dashed border-slate-300 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 whitespace-nowrap shrink-0"
                            >
                              + {item.tag}
                            </button>
                          ))}
                    </div>

                    {/* Auto-Tagging Keyword Suggestions */}
                    {!isReadOnly && suggestedTags.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/70">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 shrink-0">
                          <Sparkles className="w-3 h-3" />
                          {newlyCreatedNoteId === activeNote.id
                            ? 'Auto-suggested for new note:'
                            : 'Suggested labels:'}
                        </span>
                        {suggestedTags.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => handleAddTagToActiveNote(tag)}
                            title={`Apply auto-suggested label "${tag}"`}
                            className="px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800/70 bg-blue-50/70 dark:bg-blue-950/30 text-[11px] font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors whitespace-nowrap shrink-0"
                          >
                            + {tag}
                          </button>
                        ))}
                        {suggestedTags.length > 1 && (
                          <button
                            type="button"
                            onClick={handleApplyAllSuggestedTags}
                            className="px-2 py-0.5 rounded-md text-[11px] font-medium text-blue-700 dark:text-blue-300 hover:underline whitespace-nowrap shrink-0"
                          >
                            Apply all
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDismissSuggestedTags(suggestedTags)}
                          title="Dismiss current label suggestions"
                          className="px-1.5 py-0.5 rounded text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 whitespace-nowrap shrink-0"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                  </div>

                  <div
                    className={
                      focusMode
                        ? 'flex flex-col flex-1 min-h-[620px]'
                        : 'grid md:grid-cols-2 gap-3 flex-1 min-h-[520px]'
                    }
                  >
                    <div className="flex flex-col flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                      <div className="px-3.5 py-2 border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400 flex flex-wrap items-center justify-between gap-2">
                        <span>Lightweight Markup / .txt / .md / .mdx</span>
                        <div className="flex items-center gap-2 shrink-0">
                          {prettifyStatus && (
                            <span
                              role="status"
                              className="text-[11px] font-medium text-blue-600 dark:text-blue-400 whitespace-nowrap"
                            >
                              {prettifyStatus}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => setStickyComposerSignal((n) => n + 1)}
                            disabled={isReadOnly}
                            title={
                              isReadOnly
                                ? 'Unlock Read-Only mode to add sticky notes'
                                : 'Add a floating sticky note at the cursor or selected code line'
                            }
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800/70 bg-amber-50/70 dark:bg-amber-950/40 text-[11px] font-medium text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0"
                          >
                            <StickyNote className="w-3 h-3" />
                            + Sticky Note
                          </button>
                          <button
                            type="button"
                            onClick={handlePrettifyCode}
                            disabled={isReadOnly}
                            title={
                              isReadOnly
                                ? 'Unlock Read-Only mode to format code'
                                : 'Auto-format code snippets using detected language'
                            }
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 dark:hover:bg-blue-950/40 dark:hover:text-blue-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0"
                          >
                            <Wand2 className="w-3 h-3" />
                            Prettify Code
                          </button>
                          {isReadOnly ? (
                            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-amber-700 dark:text-amber-300 whitespace-nowrap shrink-0">
                              <Lock className="w-3 h-3" />
                              READ-ONLY
                            </span>
                          ) : (
                            <span className="font-mono text-[11px] hidden sm:inline">
                              *** === ---
                            </span>
                          )}
                        </div>
                      </div>
                      <AnnotatedCodeEditor
                        textareaRef={editorTextareaRef}
                        value={activeNote.content}
                        dir={getLanguageMeta(activeNote.language).dir}
                        isReadOnly={isReadOnly}
                        focusMode={focusMode}
                        annotations={activeNote.annotations ?? []}
                        composerSignal={stickyComposerSignal}
                        focusedAnnotationId={focusedAnnotationId}
                        onChangeFocusedAnnotationId={setFocusedAnnotationId}
                        onChangeContent={handleContentChangeWithAnnotations}
                        onCursorActivity={updateAutocompleteForCursor}
                        onKeyDownTextarea={(e) => {
                          if (!autocompleteState || autocompleteState.suggestions.length === 0) {
                            return;
                          }
                          if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            setAutocompleteState((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    selectedIndex:
                                      (prev.selectedIndex + 1) % prev.suggestions.length,
                                  }
                                : null
                            );
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            setAutocompleteState((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    selectedIndex:
                                      (prev.selectedIndex - 1 + prev.suggestions.length) %
                                      prev.suggestions.length,
                                  }
                                : null
                            );
                          } else if (e.key === 'Tab') {
                            e.preventDefault();
                            const chosen =
                              autocompleteState.suggestions[autocompleteState.selectedIndex];
                            if (chosen) {
                              applyAutocompleteSuggestion(chosen);
                            }
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            setAutocompleteState(null);
                          }
                        }}
                        onAddAnnotation={handleAddAnnotation}
                        onUpdateAnnotation={handleUpdateAnnotation}
                        onDeleteAnnotation={handleDeleteAnnotation}
                      />
                      {!isReadOnly &&
                        autocompleteState &&
                        autocompleteState.suggestions.length > 0 && (
                          <div
                            role="listbox"
                            aria-label="CS terminology autocomplete suggestions"
                            className="px-3.5 py-2 border-t border-slate-200 dark:border-slate-800 bg-blue-50/50 dark:bg-blue-950/20 flex flex-wrap items-center justify-between gap-2"
                          >
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0">
                                Complete &ldquo;{autocompleteState.prefix}&rdquo;:
                              </span>
                              {autocompleteState.suggestions.map((item, idx) => {
                                const isSelected = idx === autocompleteState.selectedIndex;
                                return (
                                  <button
                                    key={`${item.term}-${item.source}`}
                                    type="button"
                                    role="option"
                                    aria-selected={isSelected}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      applyAutocompleteSuggestion(item);
                                    }}
                                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-mono transition-colors whitespace-nowrap shrink-0 ${
                                      isSelected
                                        ? 'border-blue-500 bg-blue-600 text-white'
                                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:border-blue-400'
                                    }`}
                                  >
                                    <span>{item.term}</span>
                                    <span
                                      className={`text-[10px] font-sans ${
                                        isSelected
                                          ? 'text-blue-100'
                                          : 'text-slate-400 dark:text-slate-500'
                                      }`}
                                    >
                                      {item.source}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap shrink-0 hidden sm:inline">
                              Tab insert · ↑↓ cycle · Esc dismiss
                            </span>
                          </div>
                        )}
                      <div
                        aria-live="polite"
                        className="px-3.5 py-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center justify-between gap-3 tabular-nums"
                      >
                        <div className="flex items-center gap-2.5">
                          <span>
                            {editorStats.words.toLocaleString()}{' '}
                            {editorStats.words === 1 ? 'word' : 'words'}
                          </span>
                          <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                            ·
                          </span>
                          <span>
                            {editorStats.chars.toLocaleString()}{' '}
                            {editorStats.chars === 1 ? 'character' : 'characters'}
                          </span>
                        </div>
                        <span className="text-slate-400 dark:text-slate-500 whitespace-nowrap shrink-0">
                          {editorStats.charsNoSpaces.toLocaleString()} excl. spaces
                        </span>
                      </div>
                    </div>

                    {!focusMode && (
                      <div className="flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                        <div className="px-3.5 py-2 border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400">
                          Structured AST & 20-Language Code Preview
                        </div>
                        <div className="flex-1 p-5 overflow-y-auto max-h-[620px]">
                          <AstRenderer
                            content={activeNote.content}
                            dir={getLanguageMeta(activeNote.language).dir}
                            onExplainCode={handleExplainCodeFromPreview}
                            annotations={activeNote.annotations ?? []}
                            onSelectAnnotation={(id) => setFocusedAnnotationId(id)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 min-h-[420px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col items-center justify-center p-8 text-center gap-3">
                  <Archive className="w-7 h-7 text-slate-400" />
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    {archiveFilter === 'archived'
                      ? 'No archived notes selected'
                      : 'Your active workspace is clear'}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                    {archiveFilter === 'archived'
                      ? 'Move finished notes to Archive to declutter your active list without losing any content.'
                      : 'Create a new note or switch to Archived to restore previously archived notes.'}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {archiveFilter === 'archived' ? (
                      <button
                        type="button"
                        onClick={() => handleSwitchArchiveFilter('active')}
                        className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-medium"
                      >
                        Back to Active Notes ({activeCount})
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleCreateNote()}
                          className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-medium"
                        >
                          + Create Note
                        </button>
                        {archivedCount > 0 && (
                          <button
                            type="button"
                            onClick={() => handleSwitchArchiveFilter('archived')}
                            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200"
                          >
                            View Archived ({archivedCount})
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* Right: TTS Audio Deck & AI Study Tools */}
            {(!focusMode || !activeNote) && (
              <aside className="lg:col-span-3">
                {activeNote && (
                  <StudyLabPanel
                    noteId={activeNote.id}
                    noteTitle={activeNote.title}
                    noteContent={activeNote.content}
                    targetLanguage={activeNote.language || language}
                    pendingCodeSnippet={pendingCodeSnippet}
                    onClearPendingCode={() => setPendingCodeSnippet(null)}
                  />
                )}
              </aside>
            )}
          </div>
        )}

        {activeTab === 'canvas' && (
          <InkCanvas
            targetLanguage={language}
            onRecognizedText={handleRecognizedText}
          />
        )}

        {activeTab === 'scanner' && (
          <DocumentScanner
            targetLanguage={language}
            onRecognizedText={handleRecognizedText}
            onImportDocument={(title, content, sourceType) =>
              handleCreateNote(title, content, sourceType)
            }
          />
        )}

        {activeTab === 'study' && activeNote && (
          <div className="grid lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 max-h-[75vh] overflow-y-auto">
              <AstRenderer
                content={activeNote.content}
                dir={getLanguageMeta(activeNote.language).dir}
                onExplainCode={handleExplainCodeFromPreview}
                annotations={activeNote.annotations ?? []}
              />
            </div>
            <div className="lg:col-span-5">
              <StudyLabPanel
                noteId={activeNote.id}
                noteTitle={activeNote.title}
                noteContent={activeNote.content}
                targetLanguage={activeNote.language || language}
                pendingCodeSnippet={pendingCodeSnippet}
                onClearPendingCode={() => setPendingCodeSnippet(null)}
              />
            </div>
          </div>
        )}

        {activeTab === 'shortcuts' && (
          <div className="py-4">
            <KeyboardShortcuts shortcuts={shortcuts} onChange={setShortcuts} />
          </div>
        )}
      </main>

      {/* Non-intrusive Offline Indicator */}
      {!isOnline && (
        <div className="fixed bottom-4 left-4 z-40 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-medium shadow-lg">
          <WifiOff className="w-3.5 h-3.5" />
          Offline Mode — Local notes & cached guides active
        </div>
      )}

      {/* Modals */}
      <UserGuideModal
        isOpen={userGuideOpen}
        onClose={() => setUserGuideOpen(false)}
        initialLang={language}
      />
      <InstallModal
        isOpen={installModalOpen}
        onClose={() => setInstallModalOpen(false)}
      />
      <GlobalSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        notes={notes}
        onSelectNote={(id) => {
          const found = notes.find((n) => n.id === id);
          if (found) {
            setArchiveFilter(found.archived ? 'archived' : 'active');
          }
          setActiveNoteId(id);
          setActiveTab('studio');
        }}
      />
    </div>
  );
}
