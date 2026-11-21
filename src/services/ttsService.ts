import { getLanguageMeta, SupportedLangCode } from '../i18n/languages';

export type TtsPlaybackState = 'idle' | 'playing' | 'paused';

export interface TtsVoiceMatch {
  voice: SpeechSynthesisVoice | null;
  matchedTag: string;
  exactMatch: boolean;
}

export interface TtsProgress {
  state: TtsPlaybackState;
  currentChunk: number;
  totalChunks: number;
  matchedVoiceName: string;
  matchedLangTag: string;
  exactMatch: boolean;
  error?: string;
}

class TtsService {
  private chunks: string[] = [];
  private chunkIndex = 0;
  private state: TtsPlaybackState = 'idle';
  private rate = 1.0;
  private activeLang: SupportedLangCode = 'en';
  private listeners = new Set<(p: TtsProgress) => void>();
  private audioCtx: AudioContext | null = null;
  private keepAliveInterval: number | null = null;

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  public subscribe(listener: (p: TtsProgress) => void): () => void {
    this.listeners.add(listener);
    listener(this.getProgress());
    return () => this.listeners.delete(listener);
  }

  public async loadVoices(): Promise<SpeechSynthesisVoice[]> {
    if (!this.isSupported()) return [];
    const synth = window.speechSynthesis;
    const immediate = synth.getVoices();
    if (immediate.length > 0) return immediate;

    return new Promise((resolve) => {
      let resolved = false;
      const done = () => {
        if (!resolved) {
          resolved = true;
          synth.removeEventListener('voiceschanged', done);
          resolve(synth.getVoices());
        }
      };
      synth.addEventListener('voiceschanged', done);
      setTimeout(done, 800);
    });
  }

  public findClosestVoice(
    voices: SpeechSynthesisVoice[],
    langCode: SupportedLangCode
  ): TtsVoiceMatch {
    if (voices.length === 0) {
      return { voice: null, matchedTag: langCode, exactMatch: false };
    }

    const meta = getLanguageMeta(langCode);
    const normalizedVoices = voices.map((v) => ({
      v,
      tag: v.lang.replace(/_/g, '-').toLowerCase(),
    }));

    // 1. Exact candidate match
    for (const candidate of meta.bcp47Candidates) {
      const target = candidate.toLowerCase();
      const found = normalizedVoices.find((item) => item.tag === target);
      if (found) {
        return { voice: found.v, matchedTag: found.v.lang, exactMatch: true };
      }
    }

    // 2. Prefix match (e.g. 'ar' matches 'ar-EG')
    const basePrefix = langCode.split('-')[0].toLowerCase();
    const prefixFound = normalizedVoices.find(
      (item) => item.tag === basePrefix || item.tag.startsWith(`${basePrefix}-`)
    );
    if (prefixFound) {
      return {
        voice: prefixFound.v,
        matchedTag: prefixFound.v.lang,
        exactMatch: prefixFound.tag.startsWith(basePrefix),
      };
    }

    // 3. Cross-script/regional closest fallback
    const fallbackMap: Partial<Record<SupportedLangCode, string[]>> = {
      'pa-PK': ['ur', 'pa', 'hi', 'ar'],
      ur: ['hi', 'ar', 'en'],
      mr: ['hi', 'en'],
      am: ['ar', 'en'],
      ha: ['en-ng', 'en'],
      sw: ['en-ke', 'en'],
      tl: ['fil', 'en-ph', 'en'],
      fa: ['ar', 'en'],
    };

    for (const fb of fallbackMap[langCode] ?? ['en']) {
      const found = normalizedVoices.find(
        (item) => item.tag === fb || item.tag.startsWith(`${fb}-`)
      );
      if (found) {
        return { voice: found.v, matchedTag: found.v.lang, exactMatch: false };
      }
    }

    const defaultVoice = voices.find((v) => v.default) ?? voices[0];
    return {
      voice: defaultVoice,
      matchedTag: defaultVoice.lang,
      exactMatch: false,
    };
  }

  private unlockBackgroundAudioSession(title: string) {
    // Unlock WebAudio context on user gesture so mobile WebViews permit audio playback
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx && !this.audioCtx) {
        this.audioCtx = new AudioCtx();
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        void this.audioCtx.resume();
      }
    } catch {
      // Ignore if AudioContext is blocked
    }

    // Register Media Session controls for lock-screen / background playback
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: title || 'AInotes Study Audio',
          artist: 'AInotes TTS',
          album: getLanguageMeta(this.activeLang).nativeName,
        });
        navigator.mediaSession.playbackState = 'playing';
        navigator.mediaSession.setActionHandler('pause', () => this.pause());
        navigator.mediaSession.setActionHandler('play', () => this.resume());
        navigator.mediaSession.setActionHandler('stop', () => this.stop());
      } catch {
        // Some browsers limit MediaSession metadata
      }
    }
  }

  private splitIntoChunks(text: string): string[] {
    const cleaned = text.replace(/\s+/g, ' ').trim();
    if (!cleaned) return [];
    const rawParts = cleaned.split(/(?<=[.!?؟۔。\n])\s+/);
    const result: string[] = [];
    for (const part of rawParts) {
      if (part.length <= 220) {
        result.push(part);
      } else {
        const words = part.split(' ');
        let buf = '';
        for (const w of words) {
          if ((buf + ' ' + w).length > 200) {
            if (buf) result.push(buf.trim());
            buf = w;
          } else {
            buf = buf ? `${buf} ${w}` : w;
          }
        }
        if (buf) result.push(buf.trim());
      }
    }
    return result;
  }

  private emit(error?: string) {
    const voices = this.isSupported() ? window.speechSynthesis.getVoices() : [];
    const match = this.findClosestVoice(voices, this.activeLang);
    const payload: TtsProgress = {
      state: this.state,
      currentChunk: this.chunkIndex,
      totalChunks: this.chunks.length,
      matchedVoiceName: match.voice?.name ?? 'System Default',
      matchedLangTag: match.matchedTag,
      exactMatch: match.exactMatch,
      error,
    };
    this.listeners.forEach((fn) => fn(payload));
  }

  public getProgress(): TtsProgress {
    const voices = this.isSupported() ? window.speechSynthesis.getVoices() : [];
    const match = this.findClosestVoice(voices, this.activeLang);
    return {
      state: this.state,
      currentChunk: this.chunkIndex,
      totalChunks: this.chunks.length,
      matchedVoiceName: match.voice?.name ?? 'System Default',
      matchedLangTag: match.matchedTag,
      exactMatch: match.exactMatch,
    };
  }

  public async speak(
    text: string,
    langCode: SupportedLangCode,
    options?: { rate?: number; title?: string }
  ) {
    if (!this.isSupported()) {
      this.emit('window.speechSynthesis is not available in this browser.');
      return;
    }

    this.stop();
    this.activeLang = langCode;
    this.rate = options?.rate ?? this.rate;
    this.chunks = this.splitIntoChunks(text);
    this.chunkIndex = 0;

    if (this.chunks.length === 0) {
      this.emit('Nothing to read aloud.');
      return;
    }

    this.unlockBackgroundAudioSession(options?.title ?? 'AInotes');
    const voices = await this.loadVoices();
    const match = this.findClosestVoice(voices, langCode);

    this.state = 'playing';
    this.emit();
    this.speakCurrentChunk(match);
  }

  private speakCurrentChunk(match: TtsVoiceMatch) {
    if (!this.isSupported() || this.state !== 'playing') return;
    if (this.chunkIndex >= this.chunks.length) {
      this.stop();
      return;
    }

    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(this.chunks[this.chunkIndex]);
    const meta = getLanguageMeta(this.activeLang);
    utterance.lang = match.voice?.lang || meta.bcp47Candidates[0] || this.activeLang;
    if (match.voice) {
      utterance.voice = match.voice;
    }
    utterance.rate = this.rate;

    // Chrome Android/Desktop keepalive workaround for long chunks
    if (this.keepAliveInterval !== null) {
      window.clearInterval(this.keepAliveInterval);
    }
    this.keepAliveInterval = window.setInterval(() => {
      if (synth.speaking && !synth.paused && this.state === 'playing') {
        synth.pause();
        synth.resume();
      }
    }, 10000);

    utterance.onend = () => {
      if (this.keepAliveInterval !== null) {
        window.clearInterval(this.keepAliveInterval);
        this.keepAliveInterval = null;
      }
      if (this.state === 'playing') {
        this.chunkIndex += 1;
        if (this.chunkIndex < this.chunks.length) {
          this.emit();
          this.speakCurrentChunk(match);
        } else {
          this.stop();
        }
      }
    };

    utterance.onerror = (ev) => {
      if (this.keepAliveInterval !== null) {
        window.clearInterval(this.keepAliveInterval);
        this.keepAliveInterval = null;
      }
      if (ev.error === 'interrupted' || ev.error === 'canceled') return;
      this.state = 'idle';
      this.emit(`Speech error: ${ev.error}`);
    };

    synth.speak(utterance);
  }

  public pause() {
    if (!this.isSupported() || this.state !== 'playing') return;
    window.speechSynthesis.pause();
    this.state = 'paused';
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.playbackState = 'paused';
      } catch {
        // ignore
      }
    }
    this.emit();
  }

  public resume() {
    if (!this.isSupported() || this.state !== 'paused') return;
    window.speechSynthesis.resume();
    this.state = 'playing';
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.playbackState = 'playing';
      } catch {
        // ignore
      }
    }
    this.emit();
  }

  public stop() {
    if (this.keepAliveInterval !== null) {
      window.clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
    if (this.isSupported()) {
      window.speechSynthesis.cancel();
    }
    this.state = 'idle';
    this.chunkIndex = 0;
    this.chunks = [];
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.playbackState = 'none';
      } catch {
        // ignore
      }
    }
    this.emit();
  }

  public setRate(nextRate: number) {
    this.rate = Math.max(0.6, Math.min(2.0, nextRate));
  }
}

export const ttsService = new TtsService();
