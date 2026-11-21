# AInotes — Multi-Platform AI Handwriting Recognition & Computer Science Study Platform

AInotes transforms handwritten lecture notes, whiteboard snapshots, cursive pages, stylus ink, and plain-text technical documents (`.txt`, `.md`, `.mdx`) into structured, syntax-highlighted digital notes, interactive study tools, spoken audio via `window.speechSynthesis`, and Noto/HarfBuzz-shaped multilingual PDFs.

Designed for advanced computer science students across **20 programming languages** and **26 international languages**, AInotes uses a **Local-First + Cloud-Hybrid** architecture.

---

## Core Capabilities

### 1. Hybrid Handwriting Recognition (HTR / OCR)
Inspired by **MyScript Notes**, **Pen to Print**, **Transkribus**, **InkReadable**, **Google Document AI**, **AWS Textract**, and everyday capture tools (**Apple Live Text**, **Google Keep**, **Microsoft OneNote**):
- **Interactive Stylus & Pointer Canvas**: Pressure-sensitive ink capture with grid, lined, and blank paper presets.
- **Document & Photo Scanner**: Drag-and-drop images (`.png`, `.jpg`, `.webp`) or scanned `.pdf` pages for neat print, cursive script, structured forms/tables, and mathematical notation.
- **Custom Student Vocabulary & Calibration**: Provide course-specific identifiers, symbol hints, or handwriting quirks (inspired by Transkribus custom model conditioning) to boost accuracy on technical terms.
- **Server-Side Gemini Vision Pipeline + Optional FastAPI TrOCR/Document AI/Textract Microservice**.

### 2. 20 Programming Languages & Custom Lightweight Markup AST Parser
Automatically detects and syntax-highlights:
`Python`, `JavaScript`, `TypeScript`, `Java`, `C#`, `Kotlin`, `Dart/Flutter`, `Bash/Shell`, `Rust`, `Go`, `C++`, `C`, `PHP`, `Ruby`, `PowerShell`, `SQL`, `R`, `Scala`, `MATLAB`, and `COBOL/Assembly`.

Custom lightweight markup rules parsed before Markdown/MDX rendering:
- `***` underline (3+ asterisks) → `<h1>` Document Title
- `===` underline (3+ equals signs) → `<h2>` Section Heading
- `---` underline (3+ hyphens) → `<h3>` Subsection Heading
- `   ` (3 leading spaces) → Auto-detected fenced code block classified among the 20 supported languages.

### 3. 26 Internationalization Languages & RTL Support
Full UI localization, User Guides (`docs/user-guides/USER_GUIDE.<lang>.md`), HTR target language selection, TTS voice matching, and multilingual PDF rendering across:
English (`en`), French (`fr`), German (`de`), Italian (`it`), Spanish (`es`), Portuguese (`pt`), Indonesian (`id`), Swahili (`sw`), Amharic (`am`), Hausa (`ha`), Turkish (`tr`), Russian (`ru`), Chinese (`zh`), Japanese (`ja`), Korean (`ko`), Arabic (`ar` - RTL), Urdu (`ur` - RTL), Farsi/Persian (`fa` - RTL), Western Punjabi (`pa-PK` - RTL), Tagalog/Filipino (`tl`), Vietnamese (`vi`), Hindi (`hi`), Marathi (`mr`), Bangla/Bengali (`bn`), Tamil (`ta`), and Telugu (`te`).

### 4. Native Cross-Browser TTS (`window.speechSynthesis`)
- Closest system voice matcher across all 26 languages (exact BCP-47 match → language prefix → regional script fallback).
- Play, Pause/Resume, Stop, playback rate (`0.75x`–`1.75x`), sentence progress tracking, Chrome long-utterance keepalive, and Media Session API integration for background audio controls in modern browsers and mobile WebViews.

### 5. Structured Multilingual PDF Generation
- **Client-Side Direct `.pdf` Export**: High-resolution paginated A4 PDF generation optimized for `.txt`, `.md`, `.mdx`, and complex scripts (RTL Arabic/Urdu/Farsi/Shahmukhi Punjabi, Indic Devanagari/Bengali/Tamil/Telugu, Ethiopic, CJK) using browser HarfBuzz/Pango text shaping + Google Noto fonts.
- **Vector Print-to-PDF**: Zero-popup hidden iframe `@page` A4 layout for selectable vector text.
- **Typst Export (`.typ`) & FastAPI + Typst Backend**: Included in `services/htr-pipeline/` for server-grade Typst compilation with embedded Noto font families.

### 6. AI Study Studio
- **Note Summaries**: Concise algorithmic and conceptual breakdowns in your chosen international language.
- **Interactive Quizzes**: Multiple-choice questions with instant grading and explanations.
- **20-Language Code Walkthroughs**: Line-by-line explanations with time/space complexity analysis.

---

## Repository Structure

```text
ainotes/
├── README.md                              # Developer & architecture guide
├── INSTALLATION.md                        # Android APK/AAB, iOS PWA/IPA, Windows .exe/.msi, macOS .dmg guide
├── USER_GUIDE.md                          # Master English User Guide
├── server.ts                              # Express + Vite + @google/genai server (port 3000)
├── docker-compose.yml                     # Full-stack container orchestration (Web + FastAPI HTR + Typst)
├── docs/user-guides/                      # 26 localized Markdown User Guides
├── public/docs/user-guides/               # Served localized User Guides for the Splash/Modal reader
├── services/
│   ├── htr-pipeline/                      # Python FastAPI HTR + Typst multilingual PDF service
│   │   ├── main.py
│   │   ├── pdf_service.py
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   └── model-trainer/
│       └── trainer.py                     # TrOCR PyTorch fine-tuning worker
└── src/
    ├── components/                        # SplashModal, UserGuideModal, InkCanvas, HTRScanner, StudyLab, etc.
    ├── parsers/                           # setextCustomParser.ts (***, ===, ---, 3-space code + 20-lang classifier)
    ├── services/                          # pdfExporter.ts, ttsService.ts, storageService.ts
    └── i18n/                              # 26-language dictionary & RTL metadata
```

---

## Quick Start (Web & Full-Stack Server)

1. **Install dependencies**:
   ```bash
   npm install
   ```
2. **Set environment variables** (see `.env.example`):
   ```env
   GEMINI_API_KEY="your_gemini_api_key"
   ```
3. **Run development server** (port `3000`):
   ```bash
   npm run dev
   ```
4. **Build & run production server**:
   ```bash
   npm run build
   npm start
   ```

## Optional Python FastAPI HTR + Typst Microservice

To run the companion Python FastAPI HTR (TrOCR / Google Document AI / AWS Textract) + Typst multilingual PDF service:

```bash
docker-compose up --build
```
Or locally:
```bash
cd services/htr-pipeline
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```
See `INSTALLATION.md` for packaging native mobile/desktop installers (Android `.apk`/`.aab`, iOS PWA/App Store, Windows `.exe`/`.msi`, and macOS `.dmg`) and hosting direct student download links on your website.
