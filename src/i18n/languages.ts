export type SupportedLangCode =
  | 'en'
  | 'fr'
  | 'de'
  | 'it'
  | 'es'
  | 'pt'
  | 'id'
  | 'sw'
  | 'am'
  | 'ha'
  | 'tr'
  | 'ru'
  | 'zh'
  | 'ja'
  | 'ko'
  | 'ar'
  | 'ur'
  | 'fa'
  | 'pa-PK'
  | 'tl'
  | 'vi'
  | 'hi'
  | 'mr'
  | 'bn'
  | 'ta'
  | 'te';

export interface LanguageMeta {
  code: SupportedLangCode;
  name: string;
  nativeName: string;
  dir: 'ltr' | 'rtl';
  bcp47Candidates: string[];
}

export const SUPPORTED_LANGUAGES: LanguageMeta[] = [
  { code: 'en', name: 'English', nativeName: 'English', dir: 'ltr', bcp47Candidates: ['en-US', 'en-GB', 'en'] },
  { code: 'fr', name: 'French', nativeName: 'Français', dir: 'ltr', bcp47Candidates: ['fr-FR', 'fr-CA', 'fr'] },
  { code: 'de', name: 'German', nativeName: 'Deutsch', dir: 'ltr', bcp47Candidates: ['de-DE', 'de-AT', 'de'] },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', dir: 'ltr', bcp47Candidates: ['it-IT', 'it'] },
  { code: 'es', name: 'Spanish', nativeName: 'Español', dir: 'ltr', bcp47Candidates: ['es-ES', 'es-MX', 'es-419', 'es'] },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', dir: 'ltr', bcp47Candidates: ['pt-BR', 'pt-PT', 'pt'] },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', dir: 'ltr', bcp47Candidates: ['id-ID', 'id', 'ms-MY'] },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', dir: 'ltr', bcp47Candidates: ['sw-KE', 'sw-TZ', 'sw'] },
  { code: 'am', name: 'Amharic', nativeName: 'አማርኛ', dir: 'ltr', bcp47Candidates: ['am-ET', 'am'] },
  { code: 'ha', name: 'Hausa', nativeName: 'Hausa', dir: 'ltr', bcp47Candidates: ['ha-NG', 'ha'] },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', dir: 'ltr', bcp47Candidates: ['tr-TR', 'tr'] },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', dir: 'ltr', bcp47Candidates: ['ru-RU', 'ru'] },
  { code: 'zh', name: 'Chinese', nativeName: '中文', dir: 'ltr', bcp47Candidates: ['zh-CN', 'zh-TW', 'zh-HK', 'zh'] },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', dir: 'ltr', bcp47Candidates: ['ja-JP', 'ja'] },
  { code: 'ko', name: 'Korean', nativeName: '한국어', dir: 'ltr', bcp47Candidates: ['ko-KR', 'ko'] },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', dir: 'rtl', bcp47Candidates: ['ar-SA', 'ar-EG', 'ar-AE', 'ar'] },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', dir: 'rtl', bcp47Candidates: ['ur-PK', 'ur-IN', 'ur'] },
  { code: 'fa', name: 'Farsi / Persian', nativeName: 'فارسی', dir: 'rtl', bcp47Candidates: ['fa-IR', 'fa'] },
  { code: 'pa-PK', name: 'Western Punjabi', nativeName: 'پنجابی (شاہ مکھی)', dir: 'rtl', bcp47Candidates: ['pa-PK', 'pa-Arab-PK', 'ur-PK', 'pa-IN', 'pa'] },
  { code: 'tl', name: 'Tagalog / Filipino', nativeName: 'Tagalog', dir: 'ltr', bcp47Candidates: ['fil-PH', 'tl-PH', 'tl', 'fil'] },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', dir: 'ltr', bcp47Candidates: ['vi-VN', 'vi'] },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', dir: 'ltr', bcp47Candidates: ['hi-IN', 'hi'] },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', dir: 'ltr', bcp47Candidates: ['mr-IN', 'mr', 'hi-IN'] },
  { code: 'bn', name: 'Bangla / Bengali', nativeName: 'বাংলা', dir: 'ltr', bcp47Candidates: ['bn-BD', 'bn-IN', 'bn'] },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', dir: 'ltr', bcp47Candidates: ['ta-IN', 'ta-SG', 'ta'] },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', dir: 'ltr', bcp47Candidates: ['te-IN', 'te'] },
];

export const PROGRAMMING_LANGUAGES = [
  'Python',
  'JavaScript',
  'TypeScript',
  'Java',
  'C#',
  'Kotlin',
  'Dart/Flutter',
  'Bash/Shell',
  'Rust',
  'Go',
  'C++',
  'C',
  'PHP',
  'Ruby',
  'PowerShell',
  'SQL',
  'R',
  'Scala',
  'MATLAB',
  'COBOL/Assembly',
] as const;

export type ProgrammingLanguage = (typeof PROGRAMMING_LANGUAGES)[number];

export function getLanguageMeta(code: string): LanguageMeta {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code) ?? SUPPORTED_LANGUAGES[0];
}

export interface UiStrings {
  enterWorkspace: string;
  userGuide: string;
  installApp: string;
  newNote: string;
  importDocs: string;
  exportPdf: string;
  searchPlaceholder: string;
  recognizeInk: string;
  recognizeScan: string;
  summarize: string;
  generateQuiz: string;
  explainCode: string;
  listenTts: string;
  pause: string;
  resume: string;
  stop: string;
  shortcuts: string;
  splashHeadline: string;
  splashSubtitle: string;
  studioTab: string;
  canvasTab: string;
  scannerTab: string;
  studyTab: string;
  shortcutsTab: string;
}

const DEFAULT_EN: UiStrings = {
  enterWorkspace: 'Enter Workspace',
  userGuide: 'User Guide',
  installApp: 'Install App',
  newNote: 'New Note',
  importDocs: 'Import .txt / .md / .mdx',
  exportPdf: 'Export PDF',
  searchPlaceholder: 'Search notes, headings, and code (Ctrl+K)...',
  recognizeInk: 'Recognize Handwriting',
  recognizeScan: 'Recognize Document',
  summarize: 'Summarize Note',
  generateQuiz: 'Generate Quiz',
  explainCode: 'Explain Code',
  listenTts: 'Speak Note',
  pause: 'Pause',
  resume: 'Resume',
  stop: 'Stop',
  shortcuts: 'Keyboard Shortcuts',
  splashHeadline: 'Handwritten algorithms to structured code & study guides.',
  splashSubtitle:
    'Multi-platform HTR & OCR studio across 20 programming languages and 26 international languages with native TTS audio and Noto-shaped PDF export.',
  studioTab: 'Notes Studio',
  canvasTab: 'Ink Canvas',
  scannerTab: 'Scan & Upload',
  studyTab: 'AI Study Lab',
  shortcutsTab: 'Shortcuts',
};

const LOCALIZED_STRINGS: Partial<Record<SupportedLangCode, Partial<UiStrings>>> = {
  fr: {
    enterWorkspace: 'Ouvrir l’espace',
    userGuide: 'Guide utilisateur',
    installApp: 'Installer',
    newNote: 'Nouvelle note',
    importDocs: 'Importer .txt / .md / .mdx',
    exportPdf: 'Exporter PDF',
    recognizeInk: 'Reconnaître l’écriture',
    recognizeScan: 'Numériser le document',
    summarize: 'Résumer',
    generateQuiz: 'Générer un quiz',
    explainCode: 'Expliquer le code',
    listenTts: 'Lire (TTS)',
    pause: 'Pause',
    resume: 'Reprendre',
    stop: 'Arrêter',
    shortcuts: 'Raccourcis clavier',
    studioTab: 'Atelier Notes',
    canvasTab: 'Canevas Stylet',
    scannerTab: 'Scanner',
    studyTab: 'Étude IA',
    shortcutsTab: 'Raccourcis',
  },
  de: {
    enterWorkspace: 'Arbeitsbereich öffnen',
    userGuide: 'Benutzerhandbuch',
    installApp: 'App installieren',
    newNote: 'Neue Notiz',
    exportPdf: 'PDF exportieren',
    recognizeInk: 'Handschrift erkennen',
    summarize: 'Zusammenfassen',
    generateQuiz: 'Quiz erstellen',
    explainCode: 'Code erklären',
    listenTts: 'Vorlesen',
    pause: 'Pause',
    resume: 'Fortsetzen',
    stop: 'Stopp',
    shortcuts: 'Tastenkürzel',
  },
  es: {
    enterWorkspace: 'Entrar al estudio',
    userGuide: 'Guía de usuario',
    installApp: 'Instalar app',
    newNote: 'Nueva nota',
    exportPdf: 'Exportar PDF',
    recognizeInk: 'Reconocer escritura',
    summarize: 'Resumir nota',
    generateQuiz: 'Generar cuestionario',
    explainCode: 'Explicar código',
    listenTts: 'Escuchar (TTS)',
    pause: 'Pausar',
    resume: 'Reanudar',
    stop: 'Detener',
    shortcuts: 'Atajos',
  },
  it: {
    enterWorkspace: 'Apri spazio di lavoro',
    userGuide: 'Guida utente',
    newNote: 'Nuova nota',
    exportPdf: 'Esporta PDF',
    recognizeInk: 'Riconosci scrittura',
    summarize: 'Riassumi',
    generateQuiz: 'Crea quiz',
    explainCode: 'Spiega codice',
    listenTts: 'Ascolta',
    pause: 'Pausa',
    resume: 'Riprendi',
    stop: 'Stop',
  },
  pt: {
    enterWorkspace: 'Abrir espaço',
    userGuide: 'Guia do usuário',
    newNote: 'Nova nota',
    exportPdf: 'Exportar PDF',
    recognizeInk: 'Reconhecer escrita',
    summarize: 'Resumir',
    generateQuiz: 'Gerar quiz',
    explainCode: 'Explicar código',
    listenTts: 'Ouvir',
    pause: 'Pausar',
    resume: 'Retomar',
    stop: 'Parar',
  },
  ar: {
    enterWorkspace: 'دخول مساحة العمل',
    userGuide: 'دليل المستخدم',
    installApp: 'تثبيت التطبيق',
    newNote: 'ملاحظة جديدة',
    importDocs: 'استيراد .txt / .md / .mdx',
    exportPdf: 'تصدير PDF',
    recognizeInk: 'التعرف على خط اليد',
    recognizeScan: 'مسح المستند',
    summarize: 'تلخيص الملاحظة',
    generateQuiz: 'إنشاء اختبار',
    explainCode: 'شرح الكود',
    listenTts: 'استماع صوتي',
    pause: 'إيقاف مؤقت',
    resume: 'استئناف',
    stop: 'إيقاف',
    shortcuts: 'اختصارات لوحة المفاتيح',
    studioTab: 'محرر الملاحظات',
    canvasTab: 'لوحة القلم',
    scannerTab: 'ماسح الصور',
    studyTab: 'مختبر الدراسة',
    shortcutsTab: 'الاختصارات',
  },
  ur: {
    enterWorkspace: 'ورک اسپیس کھولیں',
    userGuide: 'صارف گائیڈ',
    newNote: 'نیا نوٹ',
    exportPdf: 'PDF ایکسپورٹ',
    recognizeInk: 'ہینڈ رائٹنگ شناخت',
    summarize: 'خلاصہ',
    generateQuiz: 'کوئز بنائیں',
    explainCode: 'کوڈ سمجھائیں',
    listenTts: 'سنیں',
    pause: 'وقفہ',
    resume: 'جاری رکھیں',
    stop: 'روکیں',
  },
  fa: {
    enterWorkspace: 'ورود به محیط کار',
    userGuide: 'راهنمای کاربر',
    newNote: 'یادداشت جدید',
    exportPdf: 'خروجی PDF',
    recognizeInk: 'تشخیص دست‌خط',
    summarize: 'خلاصه یادداشت',
    generateQuiz: 'ساخت آزمون',
    explainCode: 'توضیح کد',
    listenTts: 'خوانش صوتی',
    pause: 'مکث',
    resume: 'ادامه',
    stop: 'توقف',
  },
  'pa-PK': {
    enterWorkspace: 'ورک سپیس کھولو',
    userGuide: 'ورتوں گائیڈ',
    newNote: 'نواں نوٹ',
    exportPdf: 'PDF بناؤ',
    recognizeInk: 'ہتھ لکھت پچھان',
    summarize: 'خلاصہ',
    generateQuiz: 'کوئز بناؤ',
    listenTts: 'سنو',
  },
  zh: {
    enterWorkspace: '进入工作区',
    userGuide: '用户指南',
    installApp: '安装应用',
    newNote: '新建笔记',
    exportPdf: '导出 PDF',
    recognizeInk: '识别手写笔迹',
    summarize: '生成摘要',
    generateQuiz: '生成测验',
    explainCode: '代码解析',
    listenTts: '语音朗读',
    pause: '暂停',
    resume: '继续',
    stop: '停止',
    shortcuts: '快捷键',
  },
  ja: {
    enterWorkspace: 'ワークスペースを開く',
    userGuide: 'ユーザーガイド',
    newNote: '新規ノート',
    exportPdf: 'PDF 出力',
    recognizeInk: '手書き認識',
    summarize: '要約を作成',
    generateQuiz: 'クイズ作成',
    explainCode: 'コード解説',
    listenTts: '読み上げ',
    pause: '一時停止',
    resume: '再開',
    stop: '停止',
  },
  ko: {
    enterWorkspace: '작업 공간 열기',
    userGuide: '사용자 가이드',
    newNote: '새 노트',
    exportPdf: 'PDF 내보내기',
    recognizeInk: '필기 인식',
    summarize: '요약 생성',
    generateQuiz: '퀴즈 생성',
    explainCode: '코드 설명',
    listenTts: '음성 듣기',
    pause: '일시정지',
    resume: '재개',
    stop: '정지',
  },
  hi: {
    enterWorkspace: 'कार्यक्षेत्र खोलें',
    userGuide: 'उपयोगकर्ता मार्गदर्शिका',
    newNote: 'नया नोट',
    exportPdf: 'PDF निर्यात',
    recognizeInk: 'हस्तलेखन पहचानें',
    summarize: 'सारांश बनाएँ',
    generateQuiz: 'क्विज़ बनाएँ',
    explainCode: 'कोड समझाएँ',
    listenTts: 'सुनें (TTS)',
    pause: 'रोकें',
    resume: 'जारी रखें',
    stop: 'बंद करें',
  },
  ru: {
    enterWorkspace: 'Открыть рабочую область',
    userGuide: 'Руководство',
    newNote: 'Новая заметка',
    exportPdf: 'Экспорт PDF',
    recognizeInk: 'Распознать почерк',
    summarize: 'Конспект',
    generateQuiz: 'Создать тест',
    explainCode: 'Разобрать код',
    listenTts: 'Озвучить',
    pause: 'Пауза',
    resume: 'Продолжить',
    stop: 'Стоп',
  },
  tr: {
    enterWorkspace: 'Çalışma Alanını Aç',
    userGuide: 'Kullanım Kılavuzu',
    newNote: 'Yeni Not',
    exportPdf: 'PDF Dışa Aktar',
    recognizeInk: 'El Yazısını Tanı',
    summarize: 'Özetle',
    generateQuiz: 'Test Oluştur',
    explainCode: 'Kodu Açıkla',
    listenTts: 'Sesli Dinle',
  },
  vi: {
    enterWorkspace: 'Mở không gian làm việc',
    userGuide: 'Hướng dẫn sử dụng',
    newNote: 'Ghi chú mới',
    exportPdf: 'Xuất PDF',
    recognizeInk: 'Nhận dạng chữ viết tay',
    summarize: 'Tóm tắt',
    generateQuiz: 'Tạo trắc nghiệm',
    explainCode: 'Giải thích mã',
    listenTts: 'Đọc văn bản',
  },
  bn: {
    enterWorkspace: 'ওয়ার্কস্পেস খুলুন',
    userGuide: 'ব্যবহারকারী নির্দেশিকা',
    newNote: 'নতুন নোট',
    exportPdf: 'PDF এক্সপোর্ট',
    recognizeInk: 'হাতের লেখা শনাক্ত করুন',
    listenTts: 'শুনুন',
  },
  ta: {
    enterWorkspace: 'பணிமனையைத் திற',
    userGuide: 'பயனர் வழிகாட்டி',
    newNote: 'புதிய குறிப்பு',
    exportPdf: 'PDF ஏற்றுமதி',
    recognizeInk: 'கையெழுத்தை அடையாளம் காண்',
    listenTts: 'கேட்கவும்',
  },
  te: {
    enterWorkspace: 'వర్క్‌స్పేస్ తెరవండి',
    userGuide: 'వినియోగదారు మార్గదర్శి',
    newNote: 'కొత్త నోట్',
    exportPdf: 'PDF ఎగుమతి',
    recognizeInk: 'చేతివ్రాతను గుర్తించు',
    listenTts: 'వినండి',
  },
  am: {
    enterWorkspace: 'መስሪያ ቦታ ክፈት',
    userGuide: 'የተጠቃሚ መመሪያ',
    newNote: 'አዲስ ማስታወሻ',
    exportPdf: 'PDF አውርድ',
    listenTts: 'ያዳምጡ',
  },
  sw: {
    enterWorkspace: 'Fungua Nafasi',
    userGuide: 'Mwongozo wa Mtumiaji',
    newNote: 'Daftari Mpya',
    exportPdf: 'Hamisha PDF',
    listenTts: 'Sikiliza',
  },
  ha: {
    enterWorkspace: 'Buɗe Wurin Aiki',
    userGuide: 'Jagorar Mai Amfani',
    newNote: 'Sabon Rubutu',
    exportPdf: 'Fitar da PDF',
    listenTts: 'Saurara',
  },
  id: {
    enterWorkspace: 'Buka Ruang Kerja',
    userGuide: 'Panduan Pengguna',
    newNote: 'Catatan Baru',
    exportPdf: 'Ekspor PDF',
    listenTts: 'Dengarkan',
  },
  tl: {
    enterWorkspace: 'Buksan ang Workspace',
    userGuide: 'Gabay sa Gumagamit',
    newNote: 'Bagong Tala',
    exportPdf: 'I-export ang PDF',
    listenTts: 'Pakinggan',
  },
  mr: {
    enterWorkspace: 'कार्यक्षेत्र उघडा',
    userGuide: 'वापरकर्ता मार्गदर्शिका',
    newNote: 'नवीन नोंद',
    exportPdf: 'PDF निर्यात',
    listenTts: 'ऐका',
  },
};

export function getUiStrings(code: SupportedLangCode): UiStrings {
  return { ...DEFAULT_EN, ...(LOCALIZED_STRINGS[code] ?? {}) };
}
